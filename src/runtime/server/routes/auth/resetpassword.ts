import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { resetPasswordValidator, resetPasswordHandler} from '../../medplum/auth/resetpassword';
import { validateRecaptcha } from '../../medplum/auth/utils';

export default createMedplumHandler(asyncWrap(resetPasswordHandler),{
    auth: false,
    validation: [
        resetPasswordValidator,
        validateRecaptcha()
    ]
})