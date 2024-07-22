import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { googleValidator, googleHandler} from '../../medplum/auth/google';

export default createMedplumHandler(asyncWrap(googleHandler),{
    auth: false,
    validation: [
        googleValidator
    ]
})