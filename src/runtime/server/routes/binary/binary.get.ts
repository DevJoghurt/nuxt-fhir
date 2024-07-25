import { createMedplumHandler } from '#imports';
import { getAuthenticatedContext } from '../../medplum/context';
import { allOk } from '@medplum/core';
import { Binary} from '@medplum/fhirtypes';
import { asyncWrap } from '../../medplum/async';
import { Request, Response } from 'express';
import { sendResponse } from '../../medplum/fhir/response';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const ctx = getAuthenticatedContext();
    const { id } = req.params;
    const binary = await ctx.repo.readResource<Binary>('Binary', id);
    await sendResponse(req, res, allOk, binary);
  }),{
    auth: false,
    fhirRequest: false,
    extendedHeaders: false
})