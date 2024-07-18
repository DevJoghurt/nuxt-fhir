import { 
    defineNitroPlugin,
    initDatabase,
    closeDatabase, 
    closeRedis, 
    closeRateLimiter,
    requestContextStore,
    AuthenticatedRequestContext,
    getConfig,
} from '#imports'
import { consola } from "consola"
import { loadStructureDefinitions } from '../medplum/fhir/structure';
import { seedDatabase } from '../medplum/seed';
import { initKeys } from '../medplum/oauth/keys';
import { cleanupHeartbeat, initHeartbeat } from '../medplum/heartbeat';
import { closeWebSockets, initWebSockets } from '../medplum/websockets';

export default defineNitroPlugin(async (nitro) => {
    const logger = consola.create({}).withTag("MEDPLUM")

    const config = getConfig()

    // TODO: add websocket https://github.com/nuxt-alt/websocket/blob/main/src/runtime/websocket-plugin.nitro.ts
    nitro.hooks.hook('listen:node', () => {
        console.log('listen')
    })

    await requestContextStore.run(AuthenticatedRequestContext.system(), async () => {
        loadStructureDefinitions();
        await initDatabase(config.postgres);
        await seedDatabase();
        await initKeys(config);
        initHeartbeat(config);
        logger.info('Successfully initialized');
    })


    nitro.hooks.hook("close", async () => {
        await closeDatabase();
        await closeRedis();
        closeRateLimiter();
        cleanupHeartbeat();
        logger.info('Successfully closed');
    })
})