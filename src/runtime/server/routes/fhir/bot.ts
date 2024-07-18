import { createFhirHandler } from '#imports';
import { executeHandler } from '../../medplum/fhir/operations/execute';

export default createFhirHandler(executeHandler, {
    auth: true
})