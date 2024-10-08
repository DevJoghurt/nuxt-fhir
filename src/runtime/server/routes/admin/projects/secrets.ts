import { createMedplumHandler } from '#imports';
import { getAuthenticatedContext } from '../../../medplum/context';
import { Request, Response } from 'express';
import { asyncWrap } from '../../../medplum/async';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const ctx = getAuthenticatedContext();
    const result = await ctx.repo.updateResource({
      ...ctx.project,
      secret: req.body,
    });

    res.json(result);
  }), {
    admin: true
});