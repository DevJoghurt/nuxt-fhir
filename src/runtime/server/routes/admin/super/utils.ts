import {
    badRequest,
    forbidden,
    OperationOutcomeError
  } from '@medplum/core';
import { getAuthenticatedContext, type AuthenticatedRequestContext} from '#imports'
import { Request } from 'express'

export function requireSuperAdmin(): AuthenticatedRequestContext {
    const ctx = getAuthenticatedContext();
    if (!ctx.project.superAdmin) {
      throw new OperationOutcomeError(forbidden);
    }
    return ctx;
  }
  
export function requireAsync(req: Request): void {
    if (req.header('Prefer') !== 'respond-async') {
      throw new OperationOutcomeError(badRequest('Operation requires "Prefer: respond-async"'));
    }
  }
  