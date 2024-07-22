import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { scopeValidator, scopeHandler} from '../../medplum/auth/scope';

export default createMedplumHandler(asyncWrap(scopeHandler),{
    auth: false,
    validation: [
        scopeValidator
    ]
})