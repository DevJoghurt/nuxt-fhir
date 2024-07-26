import { 
    defineNitroPlugin,
    isPreflightRequest,
    setResponseHeaders,
    setResponseStatus
} from '#imports'
import { initDatabase, closeDatabase } from '../medplum/database';
import { AuthenticatedRequestContext, requestContextStore } from '../medplum/context';
import { closeRedis } from '../medplum/redis';
import { closeRateLimiter } from '../medplum/ratelimit';
import { getConfig } from '../medplum/config';
import { consola } from "consola"
import { loadStructureDefinitions } from '../medplum/fhir/structure';
import { seedDatabase } from '../medplum/seed';
import { initKeys } from '../medplum/oauth/keys';
import { cleanupHeartbeat, initHeartbeat } from '../medplum/heartbeat';
import { initBinaryStorage } from '../medplum/fhir/storage';
import { closeWebSockets } from '../routes/websockets/handler';
import { closeWorkers, initWorkers } from '../medplum/workers';

export default defineNitroPlugin(async (nitro) => {
    const logger = consola.create({}).withTag("MEDPLUM");

    const config = getConfig();

    await requestContextStore.run(AuthenticatedRequestContext.system(), async () => {
        loadStructureDefinitions();
        await initDatabase(config.postgres);
        await seedDatabase();
        await initKeys(config);
        initHeartbeat(config);
        initBinaryStorage(config.binaryStorage);
        initWorkers(config);
        logger.info('Successfully initialized');
    })


    nitro.hooks.hook("close", async () => {
        await closeDatabase();
        await closeRedis();
        await closeWorkers();
        closeRateLimiter();
        cleanupHeartbeat();
        await closeWebSockets();
        logger.info('Successfully closed');
    })

    nitro.hooks.hook('request', async (event) => {
        if (isPreflightRequest(event)) {
            setResponseHeaders(event, {
                'Access-Control-Allow-Origin': config.allowedOrigins,
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': 'Origin, Content-Type, X-Medplum, Authorization, Accept, Prefer, Referer, User-Agent, Pragma, Cache-Control, Connection',
                'Access-Control-Expose-Headers': '*',
                'Access-Control-Allow-Credentials': 'true'
            })
            setResponseStatus(event, 204);
        }
    })
})