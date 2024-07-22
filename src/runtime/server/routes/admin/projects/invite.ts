import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../../medplum/async';
import { inviteHandler, inviteValidator } from '../../../medplum/admin/invite';

export default createMedplumHandler(asyncWrap(inviteHandler),{
    admin: true,
    validation: [inviteValidator]
})