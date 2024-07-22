import { createMedplumHandler, getAuthenticatedContext } from '#imports';
import { allOk, badRequest } from '@medplum/core';
import { Reference, User } from '@medplum/fhirtypes';
import { body } from 'express-validator';
import { Request, Response } from 'express';
import { authenticator } from 'otplib';
import { asyncWrap } from '../../../medplum/async';
import { getSystemRepo } from '../../../medplum/fhir/repo';
import { sendOutcome } from '../../../medplum/fhir/outcomes';

authenticator.options = {
    window: 1,
};

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const systemRepo = getSystemRepo();
    const ctx = getAuthenticatedContext();
    const user = await systemRepo.readReference<User>(ctx.membership.user as Reference<User>);

    if (user.mfaEnrolled) {
      sendOutcome(res, badRequest('Already enrolled'));
      return;
    }

    if (!user.mfaSecret) {
      sendOutcome(res, badRequest('Secret not found'));
      return;
    }

    const secret = user.mfaSecret as string;
    const token = req.body.token as string;
    if (!authenticator.check(token, secret)) {
      sendOutcome(res, badRequest('Invalid token'));
      return;
    }

    await systemRepo.updateResource({
      ...user,
      mfaEnrolled: true,
    });
    sendOutcome(res, allOk);
  }),{
    auth: true,
    validation: [
        body('token').notEmpty().withMessage('Missing token')
    ]
})