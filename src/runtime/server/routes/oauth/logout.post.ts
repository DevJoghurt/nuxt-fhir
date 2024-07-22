import { createMedplumHandler } from '#imports';
import { logoutHandler } from '../../medplum/oauth/logout';

export default createMedplumHandler(logoutHandler,{
    auth: true
})