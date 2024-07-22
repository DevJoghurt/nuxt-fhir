import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { verifyEmailValidator, verifyEmailHandler} from '../../medplum/auth/verifyemail';

export default createMedplumHandler(asyncWrap(verifyEmailHandler),{
    auth: false,
    validation: [
        verifyEmailValidator
    ]
})