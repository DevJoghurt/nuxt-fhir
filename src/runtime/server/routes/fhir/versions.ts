import { createMedplumHandler } from '#imports'

export default createMedplumHandler((req, res)=>{
    res.status(200).json({ versions: ['4.0'], default: '4.0' });
}, {
    auth: false
})