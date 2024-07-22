import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../medplum/async';
import { exchangeValidator, exchangeHandler} from '../../medplum/auth/exchange';

export default createMedplumHandler(asyncWrap(exchangeHandler),{
    auth: false,
    validation: [
        exchangeValidator
    ]
})