import { createMedplumHandler } from '#imports';
import { Request, Response } from 'express';
import { Login } from '@medplum/fhirtypes';
import { asyncWrap } from '../../../medplum/async';
import { getSystemRepo } from '../../../medplum/fhir/repo';
import { body, validationResult } from 'express-validator';
import { invalidRequest, sendOutcome } from '../../../medplum/fhir/outcomes';
import { verifyMfaToken } from '../../../medplum/oauth/utils';
import { sendLoginResult } from '../../../medplum/auth/utils';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendOutcome(res, invalidRequest(errors));
      return Promise.resolve();
    }

    const systemRepo = getSystemRepo();
    const login = await systemRepo.readResource<Login>('Login', req.body.login);
    const result = await verifyMfaToken(login, req.body.token);
    return sendLoginResult(res, result);
  }),{
    auth: false,
    validation: [
        body('login').notEmpty().withMessage('Missing login'), 
        body('token').notEmpty().withMessage('Missing token')
    ]
})