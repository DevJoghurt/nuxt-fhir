import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../../medplum/async';
import { createBotHandler, createBotValidator } from '../../../medplum/admin/bot';

export default createMedplumHandler(asyncWrap(createBotHandler),{
    admin: true,
    validation: [createBotValidator]
})