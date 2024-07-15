import { defineNitroPlugin } from 'nitropack/runtime'
import { useRuntimeConfig, initDatabase, closeDatabase, initRedis, closeRedis } from '#imports'

export default defineNitroPlugin(async (nitro) => {

    const { postgres, redis } = useRuntimeConfig().fhir

    await initDatabase(postgres)

    await initRedis(redis)

    nitro.hooks.hook("close", async () => {
        await closeDatabase()
        await closeRedis()
    })
})