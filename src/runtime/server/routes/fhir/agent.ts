import { createMedplumHandler } from '#imports';
import { agentPushHandler } from '../../medplum/fhir/operations/agentpush';

export default createMedplumHandler(agentPushHandler);