import { createMedplumHandler } from '#imports';
import { getAuthenticatedContext } from '../../../medplum/context';
import { forbidden, getReferenceString } from '@medplum/core';
import { Request, Response } from 'express';
import { ProjectMembership } from '@medplum/fhirtypes';
import { sendOutcome } from '../../../medplum/fhir/outcomes';
import { asyncWrap } from '../../../medplum/async';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
  const ctx = getAuthenticatedContext();
  const { membershipId } = req.h3params;
  const membership = await ctx.repo.readResource<ProjectMembership>('ProjectMembership', membershipId);
  if (membership.project?.reference !== getReferenceString(ctx.project)) {
    sendOutcome(res, forbidden);
    return;
  }
  res.json(membership);
  }), {
    admin: true
});