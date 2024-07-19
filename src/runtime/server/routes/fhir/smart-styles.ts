import { 
    smartConfigurationHandler
} from '../../medplum/fhir/smart';
import { createMedplumHandler } from '#imports'


export default createMedplumHandler(smartConfigurationHandler, {
    auth: false
});
