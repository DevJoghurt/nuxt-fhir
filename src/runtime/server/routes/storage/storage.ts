import { createMedplumHandler } from '#imports';
import { Binary } from '@medplum/fhirtypes';
import { Request, Response } from 'express';
import { asyncWrap } from '../../medplum/async';
import { getSystemRepo } from '../../medplum/fhir/repo';
import { getBinaryStorage } from '../../medplum/fhir/storage';


// This endpoint emulates CloudFront storage for localhost development.
// It is not intended for production use.
export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    if (!req.query['Signature']) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.h3params;
    const systemRepo = getSystemRepo();
    const binary = await systemRepo.readResource<Binary>('Binary', id);

    try {
      const stream = await getBinaryStorage().readBinary(binary);
      res.status(200).contentType(binary.contentType as string);
      stream.pipe(res);
    } catch (err) {
      res.sendStatus(404);
    }
}),{
    auth: false
});