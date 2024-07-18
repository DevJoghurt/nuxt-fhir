import { createFhirHandler } from '#imports';
import { agentPushHandler } from '../../medplum/fhir/operations/agentpush';

export default createFhirHandler(agentPushHandler, {
    auth: true
})