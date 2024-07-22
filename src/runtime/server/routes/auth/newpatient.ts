import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { newPatientValidator, newPatientHandler} from '../../medplum/auth/newpatient';

export default createMedplumHandler(asyncWrap(newPatientHandler),{
    auth: false,
    validation: [
        newPatientValidator
    ]
})