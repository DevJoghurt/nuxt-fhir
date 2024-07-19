import { createMedplumHandler } from '#imports'
import { getCapabilityStatement } from '../../medplum/fhir/metadata'

export default createMedplumHandler((req, res)=>{
    res.status(200).json(getCapabilityStatement());
}, {
    auth: false
})