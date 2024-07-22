import { createMedplumHandler } from '#imports';
import {
    allOk
  } from '@medplum/core';
import { asyncWrap } from '../../../medplum/async';
import { requireSuperAdmin } from './utils';
import { Request, Response } from 'express';
import { sendOutcome, invalidRequest } from '../../../medplum/fhir/outcomes';
import { body, validationResult } from 'express-validator';
import { removeBullMQJobByKey } from '../../../medplum/workers/cron';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    requireSuperAdmin();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendOutcome(res, invalidRequest(errors));
      return;
    }

    await removeBullMQJobByKey(req.body.botId);

    sendOutcome(res, allOk);
}),{
    validation: [
        body('botId').notEmpty().withMessage('Bot ID is required')
    ]
})