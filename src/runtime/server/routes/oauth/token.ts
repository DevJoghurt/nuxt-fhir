import { createMedplumHandler } from '#imports';
import { tokenHandler } from '../../medplum/oauth/token';

export default createMedplumHandler(tokenHandler,{
    auth: false
})