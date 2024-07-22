import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../../medplum/async';
import { requireSuperAdmin, requireAsync } from './utils';
import { Request, Response } from 'express';
import { rebuildR4StructureDefinitions} from '../../../medplum/seeds/structuredefinitions';
import { sendAsyncResponse } from '../../../medplum/fhir/operations/utils/asyncjobexecutor';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    requireSuperAdmin();
    requireAsync(req);

    await sendAsyncResponse(req, res, () => rebuildR4StructureDefinitions());
}))