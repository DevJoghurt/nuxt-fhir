import { createFhirHandler } from '#imports'

export default createFhirHandler((req, res)=>{
    res.status(200).json({ versions: ['4.0'], default: '4.0' });
})