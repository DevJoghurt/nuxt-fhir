import { createMedplumHandler } from '#imports';
import {
    getResourceTypes
  } from '@medplum/core';
import { asyncWrap } from '../../../medplum/async';
import { requireSuperAdmin, requireAsync } from './utils';
import { Request, Response } from 'express';
import { DatabaseMode, getDatabasePool } from '#imports';
import { sendAsyncResponse } from '../../../medplum/fhir/operations/utils/asyncjobexecutor';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    requireSuperAdmin();
    requireAsync(req);

    await sendAsyncResponse(req, res, async () => {
      const resourceTypes = getResourceTypes();
      for (const resourceType of resourceTypes) {
        await getDatabasePool(DatabaseMode.WRITER).query(
          `UPDATE "${resourceType}" SET "projectId"="compartments"[1] WHERE "compartments" IS NOT NULL AND cardinality("compartments")>0`
        );
      }
    });
}))