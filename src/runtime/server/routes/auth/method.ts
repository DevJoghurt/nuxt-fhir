import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { methodHandler, methodValidator } from '../../medplum/auth/method';

export default createMedplumHandler(asyncWrap(methodHandler),{
    auth: false,
    validation: [
        methodValidator
    ]
})