import { createMedplumHandler } from '#imports';
import { getAuthenticatedContext } from '../../../medplum/context';
import { Request, Response } from 'express';
import { asyncWrap } from '../../../medplum/async';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const project = getAuthenticatedContext().project;
    return res.status(200).json({
      project: {
        id: project.id,
        name: project.name,
        secret: project.secret,
        site: project.site,
      },
    });
  }), {
    admin: true
});