import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { setPasswordValidator, setPasswordHandler} from '../../medplum/auth/setpassword';

export default createMedplumHandler(asyncWrap(setPasswordHandler),{
    auth: false,
    validation: [
        setPasswordValidator
    ]
})