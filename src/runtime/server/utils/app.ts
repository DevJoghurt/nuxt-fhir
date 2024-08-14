import { defineEventHandler, createError, getRouterParams } from '#imports';
import type { IncomingMessage, ServerResponse } from "node:http";
import type { EventHandlerResponse } from 'h3';
import { getConfig } from '../medplum/config';
import { 
  closeRequestContext,	
  getLogger,
	getRequestContext,	
  AuthenticatedRequestContext,
	attachRequestContext 
} from '../medplum/context';
import { initRedis } from '../medplum/redis';
import { getRateLimiter } from '../medplum/ratelimit';
import express, { RequestHandler } from 'express';
import { NextFunction, Request, Response,text, urlencoded, json  } from 'express';
import { sendOutcome } from '../medplum/fhir/outcomes';
import type { OperationOutcome } from '@medplum/fhirtypes';
import { badRequest, ContentType } from '@medplum/core';
import cors from 'cors';
import compression from 'compression';
import { corsOptions } from "../medplum/cors";
import { hl7BodyParser } from '../medplum/hl7/parser';
import { verifyProjectAdmin } from '../medplum/admin/utils'
import { authenticateRequest } from '../medplum/oauth/middleware';
import { ValidationChain } from 'express-validator';


/**
 * Sets standard headers for all requests.
 * @param _req - The request.
 * @param res - The response.
 * @param next - The next handler.
 */
function standardHeaders(_req: Request, res: Response, next: NextFunction): void {
    // Disables all caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  
    if (getConfig().baseUrl.startsWith('https://')) {
      // Only connect to this site and subdomains via HTTPS for the next two years
      // and also include in the preload list
      res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
  
    // Set Content Security Policy
    // As an API server, block everything
    // See: https://stackoverflow.com/a/45631261/2051724
    res.set(
      'Content-Security-Policy',
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
    );
  
    // Disable browser features
    res.set(
      'Permission-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()'
    );
  
    // Never send the Referer header
    res.set('Referrer-Policy', 'no-referrer');
  
    // Prevent browsers from incorrectly detecting non-scripts as scripts
    res.set('X-Content-Type-Options', 'nosniff');
  
    // Disallow attempts to iframe site
    res.set('X-Frame-Options', 'DENY');
  
    // Block pages from loading when they detect reflected XSS attacks
    res.set('X-XSS-Protection', '1; mode=block');
    next();
}

  /**
 * Global error handler.
 * See: https://expressjs.com/en/guide/error-handling.html
 * @param err - Unhandled error.
 * @param req - The request.
 * @param res - The response.
 * @param next - The next handler.
 */
  function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
    closeRequestContext();
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err.outcome) {
      sendOutcome(res, err.outcome as OperationOutcome);
      return;
    }
    if (err.resourceType === 'OperationOutcome') {
      sendOutcome(res, err as OperationOutcome);
      return;
    }
    if (err.type === 'request.aborted') {
      return;
    }
    if (err.type === 'entity.parse.failed') {
      sendOutcome(res, badRequest('Content could not be parsed'));
      return;
    }
    if (err.type === 'entity.too.large') {
      sendOutcome(res, badRequest('File too large'));
      return;
    }
    getLogger().error('Unhandled error', err);
    res.status(500).json({ msg: 'Internal Server Error' });
  }

  const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const ctx = getRequestContext();
    const start = Date.now();
  
    res.on('finish', () => {
      const duration = Date.now() - start;
  
      let userProfile: string | undefined;
      let projectId: string | undefined;
      if (ctx instanceof AuthenticatedRequestContext) {
        userProfile = ctx.profile.reference;
        projectId = ctx.project.id;
      }
  
      ctx.logger.info('Request served', {
        duration: `${duration} ms`,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
        profile: userProfile,
        projectId,
        receivedAt: start,
        status: res.statusCode,
        ua: req.get('User-Agent'),
        mode: ctx instanceof AuthenticatedRequestContext ? ctx.repo.mode : undefined,
      });
    });
  
    next();
  };

  // OperationOutcome interceptor
const fihrOOInterceptor = ((req: Request, res: Response, next: NextFunction) => {
  const oldJson = res.json;

  res.json = (data: any) => {
    // Restore the original json to avoid double response
    // See: https://stackoverflow.com/a/60817116
    res.json = oldJson;

    // FHIR "Prefer" header preferences
    // See: https://www.hl7.org/fhir/http.html#ops
    // Prefer: return=minimal
    // Prefer: return=representation
    // Prefer: return=OperationOutcome
    const prefer = req.get('Prefer');
    if (prefer === 'return=minimal') {
      return res.send();
    }

    // Unless already set, use the FHIR content type
    if (!res.get('Content-Type')) {
      res.contentType(ContentType.FHIR_JSON);
    }

    return res.json(data);
  };
  next();
});

export type NodeHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => unknown | Promise<unknown>;

export type NodeMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: Error) => void,
) => unknown | Promise<unknown>;

function callNodeHandler(
  handler: NodeHandler | NodeMiddleware,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const isMiddleware = handler.length > 2;
  return new Promise((resolve, reject) => {
    const next = (err?: Error) => {
      if (isMiddleware) {
        res.off("close", next);
        res.off("error", next);
      }
      return err ? reject(createError(err)) : resolve(undefined);
    };
    try {
      const returned = handler(req, res, next);
      if (isMiddleware && returned === undefined) {
        res.once("close", next);
        res.once("error", next);
      } else {
        resolve(returned);
      }
    } catch (error) {
      next(error as Error);
    }
  });
}


type HandlerOptions = {
  auth?: boolean;
  fhirRequest?: boolean;
  admin?: boolean;
  validation?: ValidationChain[] | RequestHandler[] | false;
  extendedHeaders?: boolean;
}

// Check if initializing express app once is more performant with h3
// Currently it is not global

export function createMedplumHandler(handler: RequestHandler, opts = {} as HandlerOptions){
  const { 
    auth = true, 
    fhirRequest = true, 
    admin = false, 
    validation = false, 
    extendedHeaders = true 
  } = opts;

  const app = express();

	const config = getConfig();

  initRedis(config.redis);
	
	app.set('etag', false);
  app.set('trust proxy', 1);
  app.set('x-powered-by', false);
  app.use(standardHeaders);
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(attachRequestContext);
  app.use(getRateLimiter(config));

  if (config.logRequests) {
    app.use(loggingMiddleware);
  }

  if(extendedHeaders){
    app.use(
      urlencoded({
        extended: false,
      })
    );
    app.use(
      text({
        type: [ContentType.TEXT, ContentType.HL7_V2],
      })
    );
    app.use(
      json({
        type: [ContentType.JSON, ContentType.FHIR_JSON, ContentType.JSON_PATCH, ContentType.SCIM_JSON],
        limit: config.maxJsonSize,
      })
    );
    app.use(
      hl7BodyParser({
        type: [ContentType.HL7_V2],
      })
    );
  }
  if (config.logRequests) {
    app.use(loggingMiddleware);
  }
  if(fhirRequest === true){
    app.use(fihrOOInterceptor);
  }
  if(auth === true || admin === true){
    app.use(authenticateRequest)
  }
  if(admin === true){
    app.use(verifyProjectAdmin)
  }
  if(validation){
    for(const val of validation){
      app.use(val)
    }
  }

  return defineEventHandler((event) => {
      if (!event.node) {
        throw new Error(
          "[h3] Executing Node.js middleware is not supported in this server!",
        );
      }
      const req = event.node.req as Request;
      req.h3params = getRouterParams(event);
      app.use(handler);
      app.use(errorHandler);
      return callNodeHandler(
        app,
        req,
        event.node.res,
      ) as EventHandlerResponse;
  })
}