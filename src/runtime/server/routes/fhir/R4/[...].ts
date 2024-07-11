import { defineEventHandler, readBody, getQuery, getRouterParams } from '#imports'
import { FhirRequest, FhirRouter, HttpMethod, RepositoryMode } from '@medplum/fhir-router';

export default defineEventHandler(async (event)=>{

    const body = await readBody(event).catch(() => {})

    const query = getQuery(event)

    const params = getRouterParams(event)

    const request: FhirRequest = {
        method: event.method as HttpMethod,
        pathname: event.node.req?.originalUrl?.replace('/fhir/R4', '').split('?').shift() as string,
        params,
        query: query as Record<string, string>,
        body,
        headers: event.node.req.headers,
      };

    const router = new FhirRouter();

    await router.handleRequest(request)
})