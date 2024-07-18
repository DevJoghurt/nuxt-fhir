import { 
    smartConfigurationHandler
} from '../../medplum/fhir/smart';
import { createFhirHandler } from '#imports'


export default createFhirHandler(smartConfigurationHandler);
