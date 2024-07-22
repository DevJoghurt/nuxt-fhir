import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { profileValidator, profileHandler} from '../../medplum/auth/profile';

export default createMedplumHandler(asyncWrap(profileHandler),{
    auth: false,
    validation: [
        profileValidator
    ]
})