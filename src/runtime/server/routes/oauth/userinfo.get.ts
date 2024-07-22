import { createMedplumHandler } from '#imports';
import { userInfoHandler } from '../../medplum/oauth/userinfo';

export default createMedplumHandler(userInfoHandler,{
    auth: true
})