import { createFhirHandler } from '#imports'
import { getCapabilityStatement } from '../../medplum/fhir/metadata'

export default createFhirHandler((req, res)=>{
    res.status(200).json(getCapabilityStatement());
})