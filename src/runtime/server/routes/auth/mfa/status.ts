import { createMedplumHandler, getAuthenticatedContext } from '#imports';
import { Reference, User } from '@medplum/fhirtypes';
import { Request, Response } from 'express';
import { authenticator } from 'otplib';
import { asyncWrap } from '../../../medplum/async';
import { getSystemRepo } from '../../../medplum/fhir/repo';
import { toDataURL } from 'qrcode';

authenticator.options = {
    window: 1,
};

export default createMedplumHandler(asyncWrap(async (_req: Request, res: Response) => {
    const systemRepo = getSystemRepo();
    const ctx = getAuthenticatedContext();
    let user = await systemRepo.readReference<User>(ctx.membership.user as Reference<User>);
    if (user.mfaEnrolled) {
      res.json({ enrolled: true });
      return;
    }

    if (!user.mfaSecret) {
      user = await systemRepo.updateResource({
        ...user,
        mfaSecret: authenticator.generateSecret(),
      });
    }

    const accountName = `Medplum - ${user.email}`;
    const issuer = 'medplum.com';
    const secret = user.mfaSecret as string;
    const otp = authenticator.keyuri(accountName, issuer, secret);

    res.json({
      enrolled: false,
      enrollUri: otp,
      enrollQrCode: await toDataURL(otp),
    });
  }),{
    auth: true
})