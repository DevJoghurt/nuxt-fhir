import { createMedplumHandler } from '#imports';
import {
    allOk,
    badRequest
  } from '@medplum/core';
import { asyncWrap } from '../../../medplum/async';
import { requireSuperAdmin } from './utils';
import { Request, Response } from 'express';
import { sendOutcome, invalidRequest } from '../../../medplum/fhir/outcomes';
import { body, validationResult } from 'express-validator';
import { getUserByEmail } from '../../../medplum/oauth/utils';
import { setPassword } from '../../../medplum/auth/setpassword';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    requireSuperAdmin();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendOutcome(res, invalidRequest(errors));
      return;
    }

    const user = await getUserByEmail(req.body.email, req.body.projectId);
    if (!user) {
      sendOutcome(res, badRequest('User not found'));
      return;
    }

    await setPassword(user, req.body.password as string);
    sendOutcome(res, allOk);
}),{
    validation: [
        body('email').isEmail().withMessage('Valid email address is required'),
        body('password').isLength({ min: 8 }).withMessage('Invalid password, must be at least 8 characters'),
    ]
})