import { createMedplumHandler} from '#imports'
import { 
    smartStylingHandler 
} from '../../medplum/fhir/smart';

export default createMedplumHandler(smartStylingHandler, {
    auth: false
});