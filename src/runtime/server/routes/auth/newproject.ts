import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { newProjectHandler, newProjectValidator } from '../../medplum/auth/newproject';

export default createMedplumHandler(asyncWrap(newProjectHandler),{
    auth: false,
    validation: [
        newProjectValidator
    ]
})