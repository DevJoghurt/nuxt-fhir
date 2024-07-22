import { createMedplumHandler } from '#imports';
import { authorizePostHandler } from '../../medplum/oauth/authorize';
import cookieParser from 'cookie-parser';

export default createMedplumHandler(authorizePostHandler,{
    auth: false,
    validation: [cookieParser()]
})