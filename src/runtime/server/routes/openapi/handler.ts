import { createMedplumHandler } from '#imports'
import { openApiHandler } from '../../medplum/openapi';

export default createMedplumHandler(openApiHandler, {
    auth: false,
    fhirRequest: false
})