import { createMedplumHandler } from '#imports'

export default createMedplumHandler((req, res)=>{
    res.sendStatus(202);
})