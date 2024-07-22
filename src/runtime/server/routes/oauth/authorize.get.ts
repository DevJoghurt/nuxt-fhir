import { createMedplumHandler } from '#imports';
import { authorizeGetHandler } from '../../medplum/oauth/authorize';
import cookieParser from 'cookie-parser';

export default createMedplumHandler(authorizeGetHandler,{
    auth: false,
    validation: [cookieParser()]
})