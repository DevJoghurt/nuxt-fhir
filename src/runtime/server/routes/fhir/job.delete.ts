import { createFhirHandler } from '#imports'

export default createFhirHandler((req, res)=>{
    res.sendStatus(202);
}, {
    auth: true
})