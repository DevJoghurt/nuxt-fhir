import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { meHandler } from '../../medplum/auth/me';

export default createMedplumHandler(asyncWrap(meHandler))