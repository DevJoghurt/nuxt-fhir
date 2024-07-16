import { LogLevel, Logger, ProfileResource, isUUID, parseLogLevel } from '@medplum/core';
import { Extension, Login, Project, ProjectMembership, Reference } from '@medplum/fhirtypes';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { useRuntimeConfig } from '#imports';
import { getRepoForLogin } from '../medplum/fhir/accesspolicy';
import { Repository, getSystemRepo } from '../medplum/fhir/repo';
import { AuthState, authenticateTokenImpl, isExtendedMode } from '../medplum/oauth/middleware';
import { parseTraceparent } from '../medplum/traceparent';

export class RequestContext {
  readonly requestId: string;
  readonly traceId: string;
  readonly logger: Logger;

  constructor(requestId: string, traceId: string, logger?: Logger) {
    this.requestId = requestId;
    this.traceId = traceId;
    this.logger = logger ?? new Logger(write, { requestId, traceId }, parseLogLevel(useRuntimeConfig().fhir?.logLevel ?? 'info'));
  }

  close(): void {
    // No-op, descendants may override
  }

  static empty(): RequestContext {
    return new RequestContext('', '');
  }
}

const systemLogger = new Logger(write, undefined, LogLevel.ERROR);

export class AuthenticatedRequestContext extends RequestContext {
  constructor(
    ctx: RequestContext,
    readonly authState: Readonly<AuthState>,
    readonly repo: Repository
  ) {
    super(ctx.requestId, ctx.traceId, ctx.logger);
  }

  get project(): Project {
    return this.authState.project;
  }

  get membership(): ProjectMembership {
    return this.authState.membership;
  }

  get login(): Login {
    return this.authState.login;
  }

  get profile(): Reference<ProfileResource> {
    return this.authState.membership.profile as Reference<ProfileResource>;
  }

  close(): void {
    this.repo.close();
  }

  static system(ctx?: { requestId?: string; traceId?: string }): AuthenticatedRequestContext {
    return new AuthenticatedRequestContext(
      new RequestContext(ctx?.requestId ?? '', ctx?.traceId ?? '', systemLogger),
      {} as unknown as AuthState,
      getSystemRepo()
    );
  }
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

export function tryGetRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}

export function getRequestContext(): RequestContext {
  const ctx = requestContextStore.getStore();
  if (!ctx) {
    throw new Error('No request context available');
  }
  return ctx;
}

export function getAuthenticatedContext(): AuthenticatedRequestContext {
  const ctx = getRequestContext();
  if (!(ctx instanceof AuthenticatedRequestContext)) {
    throw new Error('Request is not authenticated');
  }
  return ctx;
}

export async function attachRequestContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId, traceId } = requestIds(req);

    let ctx = new RequestContext(requestId, traceId);

    const authState = await authenticateTokenImpl(req);
    if (authState) {
      const repo = await getRepoForLogin(authState, isExtendedMode(req));
      ctx = new AuthenticatedRequestContext(ctx, authState, repo);
    }

    requestContextStore.run(ctx, () => next());
  } catch (err) {
    next(err);
  }
}

export function closeRequestContext(): void {
  const ctx = requestContextStore.getStore();
  if (ctx) {
    ctx.close();
  }
}

export function getLogger(): Logger {
  const ctx = requestContextStore.getStore();
  return ctx ? ctx.logger : systemLogger;
}

export function tryRunInRequestContext<T>(requestId: string | undefined, traceId: string | undefined, fn: () => T): T {
  if (requestId && traceId) {
    return requestContextStore.run(new RequestContext(requestId, traceId), fn);
  } else {
    return fn();
  }
}

export function getTraceId(req: Request): string | undefined {
  const xTraceId = req.header('x-trace-id');
  if (xTraceId && isUUID(xTraceId)) {
    return xTraceId;
  }

  const traceparent = req.header('traceparent');
  if (traceparent && parseTraceparent(traceparent)) {
    return traceparent;
  }

  return undefined;
}

export function buildTracingExtension(): Extension[] | undefined {
  const ctx = tryGetRequestContext();

  if (ctx === undefined) {
    return undefined;
  }

  const subExtensions: Extension[] = [];
  if (ctx.requestId) {
    subExtensions.push({ url: 'requestId', valueId: ctx.requestId });
  }

  if (ctx.traceId) {
    subExtensions.push({ url: 'traceId', valueId: ctx.traceId });
  }

  if (subExtensions.length === 0) {
    return undefined;
  }

  return [
    {
      url: 'https://medplum.com/fhir/StructureDefinition/tracing',
      extension: subExtensions,
    },
  ];
}

function requestIds(req: Request): { requestId: string; traceId: string } {
  const requestId = randomUUID();
  const traceId = getTraceId(req) ?? randomUUID();

  return { requestId, traceId };
}

function write(msg: string): void {
  process.stdout.write(msg + '\n');
}