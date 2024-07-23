import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { handleBinaryWriteRequest } from '../../medplum/fhir/binary';

export default createMedplumHandler(asyncWrap(handleBinaryWriteRequest),{
    auth: false,
    fhirRequest: false,
    extendedHeaders: false
})