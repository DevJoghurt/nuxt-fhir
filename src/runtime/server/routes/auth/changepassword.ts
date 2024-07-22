import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { changePasswordValidator, changePasswordHandler} from '../../medplum/auth/changepassword';

export default createMedplumHandler(asyncWrap(changePasswordHandler),{
    auth: true,
    validation: [
        changePasswordValidator
    ]
})