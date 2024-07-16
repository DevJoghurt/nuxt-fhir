import { defineExpressHandler, getConfig, attachRequestContext, getRateLimiter, getRequestContext, AuthenticatedRequestContext, closeRequestContext, getLogger } from "#imports"
import { badRequest, ContentType } from '@medplum/core';
import { Express, json, NextFunction, Request, Response, Router, text, urlencoded } from 'express';
import cors from 'cors';
import compression from 'compression';
import { corsOptions } from "../medplum/cors";
import { binaryRouter } from '../medplum/fhir/binary';
import { hl7BodyParser } from '../medplum/hl7/parser';
import { sendOutcome } from '../medplum/fhir/outcomes';
import { OperationOutcome } from '@medplum/fhirtypes';

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

  const medplumRouter = () => {
    const app = Router();

    const config = getConfig();

    //app.set('etag', false);
    //app.set('trust proxy', 1);
    //app.set('x-powered-by', false);
    app.use(standardHeaders);
    app.use(cors(corsOptions));
    app.use(compression());
    app.use(attachRequestContext);
    app.use(getRateLimiter(config));
    app.use('/fhir/R4/Binary', binaryRouter);

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
    
      if (config.logRequests) {
        app.use(loggingMiddleware);
      }

      app.get('/', (_req, res) => res.sendStatus(200));
      app.use(errorHandler);
      return app;
  }

export default defineExpressHandler(medplumRouter());