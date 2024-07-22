import { createMedplumHandler, getConfig } from '#imports';
import {
    accepted,
    validateResourceType,
  } from '@medplum/core';
  import { ResourceType } from '@medplum/fhirtypes';
import { asyncWrap } from '../../../medplum/async';
import { requireSuperAdmin, requireAsync } from './utils';
import { Request, Response } from 'express';
import { getSystemRepo } from '../../../medplum/fhir/repo';
import { AsyncJobExecutor } from '../../../medplum/fhir/operations/utils/asyncjobexecutor';
import { sendOutcome } from '../../../medplum/fhir/outcomes';
import { addReindexJob } from '../../../medplum/workers/reindex';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    requireSuperAdmin();
    requireAsync(req);

    const resourceTypes = (req.body.resourceType as string).split(',').map((t) => t.trim());
    for (const resourceType of resourceTypes) {
      validateResourceType(resourceType);
    }
    const systemRepo = getSystemRepo();

    const exec = new AsyncJobExecutor(systemRepo);
    await exec.init(`${req.protocol}://${req.get('host') + req.originalUrl}`);
    await exec.run(async (asyncJob) => {
      await addReindexJob(resourceTypes as ResourceType[], asyncJob);
    });

    const { baseUrl } = getConfig();
    sendOutcome(res, accepted(exec.getContentLocation(baseUrl)));
}))