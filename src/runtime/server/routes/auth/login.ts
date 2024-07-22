import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { loginValidator, loginHandler} from '../../medplum/auth/login';

export default createMedplumHandler(asyncWrap(loginHandler),{
    auth: false,
    validation: [
        loginValidator
    ]
})