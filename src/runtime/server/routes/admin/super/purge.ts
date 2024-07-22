import { createMedplumHandler } from '#imports';
import {
    allOk
  } from '@medplum/core';
import { asyncWrap } from '../../../medplum/async';
import { requireSuperAdmin } from './utils';
import { Request, Response } from 'express';
import { sendOutcome, invalidRequest } from '../../../medplum/fhir/outcomes';
import { body, validationResult } from 'express-validator';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const ctx = requireSuperAdmin();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendOutcome(res, invalidRequest(errors));
      return;
    }

    await ctx.repo.purgeResources(req.body.resourceType, req.body.before);
    sendOutcome(res, allOk);
}),{
    validation: [
        body('resourceType').isIn(['AuditEvent', 'Login']).withMessage('Invalid resource type'),
        body('before').isISO8601().withMessage('Invalid before date'),
    ]
})