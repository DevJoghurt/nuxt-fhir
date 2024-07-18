import { 
    defineNitroPlugin, 
    useRuntimeConfig, 
    initDatabase, 
    closeDatabase, 
    closeRedis, 
    closeRateLimiter 
} from '#imports'
import { consola } from "consola"

export default defineNitroPlugin(async (nitro) => {
    const logger = consola.create({}).withTag("QUEUE")
    logger.info('Nitro Plugin')

    const { postgres, redis } = useRuntimeConfig().fhir

    await initDatabase(postgres)


    nitro.hooks.hook("close", async () => {
        await closeDatabase()
        await closeRedis()
        closeRateLimiter()
    })
})