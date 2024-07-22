import { createMedplumHandler,getAuthenticatedContext } from '#imports';
import { allOk, badRequest } from '@medplum/core';
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { invalidRequest, sendOutcome } from '../../../medplum/fhir/outcomes';
import { setPassword } from '../../../medplum/auth/setpassword';
import { getUserByEmailInProject } from '../../../medplum/oauth/utils';
import { asyncWrap } from '../../../medplum/async';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendOutcome(res, invalidRequest(errors));
      return;
    }

    const ctx = getAuthenticatedContext();
    const projectId = ctx.project.id;
    if (!projectId) {
      sendOutcome(res, badRequest('Project not found'));
      return;
    }

    const user = await getUserByEmailInProject(req.body.email, projectId);
    if (!user) {
      sendOutcome(res, badRequest('User not found'));
      return;
    }

    await setPassword(user, req.body.password as string);
    sendOutcome(res, allOk);
  }), {
    admin: true,
    validation: [
        body('email').isEmail().withMessage('Valid email address is required'),
        body('password').isLength({ min: 8 }).withMessage('Invalid password, must be at least 8 characters'),
    ]
});