import {
    forbidden,
    OperationOutcomeError,
  } from '@medplum/core';

import { AuthenticatedRequestContext, getAuthenticatedContext } from '../../utils/context';

export function requireSuperAdmin(): AuthenticatedRequestContext {
    const ctx = getAuthenticatedContext();
    if (!ctx.project.superAdmin) {
      throw new OperationOutcomeError(forbidden);
    }
    return ctx;
}