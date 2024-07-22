import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { revokeValidator, revokeHandler} from '../../medplum/auth/revoke';

export default createMedplumHandler(asyncWrap(revokeHandler),{
    auth: true,
    validation: [
        revokeValidator
    ]
})