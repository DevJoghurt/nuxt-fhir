import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { statusValidator, statusHandler} from '../../medplum/auth/status';

export default createMedplumHandler(asyncWrap(statusHandler),{
    auth: false,
    validation: [
        statusValidator
    ]
})