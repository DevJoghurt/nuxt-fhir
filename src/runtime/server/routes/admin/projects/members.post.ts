import { createMedplumHandler,getAuthenticatedContext } from '#imports';
import { forbidden, getReferenceString } from '@medplum/core';
import { Request, Response } from 'express';
import { ProjectMembership } from '@medplum/fhirtypes';
import { sendOutcome } from '../../../medplum/fhir/outcomes';
import { asyncWrap } from '../../../medplum/async';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
  const ctx = getAuthenticatedContext();
  const { membershipId } = req.params;
  const membership = await ctx.repo.readResource<ProjectMembership>('ProjectMembership', membershipId);
  if (membership.project?.reference !== getReferenceString(ctx.project)) {
    sendOutcome(res, forbidden);
    return;
  }
  const resource = req.body;
  if (resource?.resourceType !== 'ProjectMembership' || resource.id !== membershipId) {
    sendOutcome(res, forbidden);
    return;
  }
  const result = await ctx.repo.updateResource(resource);
  res.json(result);
  }), {
    admin: true
});