import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../../medplum/async';
import { createClientHandler, createClientValidator } from '../../../medplum/admin/client';

export default createMedplumHandler(asyncWrap(createClientHandler),{
    admin: true,
    validation: [createClientValidator]
})