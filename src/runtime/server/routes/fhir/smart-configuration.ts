import { createFhirHandler } from '#imports'
import { 
    smartStylingHandler 
} from '../../medplum/fhir/smart';

export default createFhirHandler(smartStylingHandler);