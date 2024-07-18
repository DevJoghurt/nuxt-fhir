import { createFhirHandler } from '#imports';
import { csvHandler } from '../../medplum/fhir/operations/csv';
import { asyncWrap } from '../../medplum/async';

export default createFhirHandler(asyncWrap(csvHandler), {
    auth: true
})