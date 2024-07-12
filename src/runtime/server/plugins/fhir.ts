import { defineNitroPlugin } from 'nitropack/runtime'
import { useRuntimeConfig, initDatabase, closeDatabase } from '#imports'

export default defineNitroPlugin(async (nitro) => {

    const { postgres } = useRuntimeConfig().fhir

    await initDatabase(postgres)

    nitro.hooks.hook("close", async () => {
        await closeDatabase()
    })
})