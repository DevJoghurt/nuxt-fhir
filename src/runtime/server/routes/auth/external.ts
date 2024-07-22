import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { externalCallbackHandler } from '../../medplum/auth/external';

export default createMedplumHandler(asyncWrap(externalCallbackHandler),{
    auth: false
})