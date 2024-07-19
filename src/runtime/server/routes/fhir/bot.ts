import { createMedplumHandler} from '#imports';
import { executeHandler } from '../../medplum/fhir/operations/execute';

export default createMedplumHandler(executeHandler);