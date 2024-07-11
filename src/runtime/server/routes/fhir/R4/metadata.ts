import { getCapabilityStatement, defineEventHandler, useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event)=>{
    const { baseUrl } = useRuntimeConfig().fhir;
    return getCapabilityStatement(baseUrl)
})