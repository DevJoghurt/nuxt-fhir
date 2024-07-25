import { createMedplumHandler } from '#imports';
import { getAuthenticatedContext } from '../../medplum/context';
import { allOk } from '@medplum/core';
import type { Request, Response } from 'express'
import { AsyncJob } from '@medplum/fhirtypes';
import { asyncWrap } from '../../medplum/async';
import { sendResponse } from '../../medplum/fhir/response';

const finalJobStatusCodes = ['completed', 'error'];

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const ctx = getAuthenticatedContext();
    const { id } = req.params;
    const asyncJob = await ctx.repo.readResource<AsyncJob>('AsyncJob', id);

    if (!finalJobStatusCodes.includes(asyncJob.status as string)) {
      res.status(202).end();
      return;
    }

    await sendResponse(req, res, allOk, asyncJob);
  }), {
    auth: true
})