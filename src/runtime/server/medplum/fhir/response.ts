import { ContentType, concatUrls, getStatus, isCreated } from '@medplum/core';
import { OperationOutcome, Resource } from '@medplum/fhirtypes';
import { getAuthenticatedContext } from '../../utils/context';
import { RewriteMode, rewriteAttachments } from './rewrite';
import { getBinaryStorage } from './storage';
import { useRuntimeConfig, getResponseHeader, setResponseHeader, setResponseStatus, getRequestHeader, send, getQuery } from '#imports';
import type { H3Event, EventHandlerRequest } from 'h3';

export function isFhirJsonContentType(event: H3Event<EventHandlerRequest>): boolean {
    const contentType = getResponseHeader(event, 'Content-Type') as string
  return !!(contentType?.toLowerCase() === ContentType.JSON || contentType?.toLowerCase() === ContentType.FHIR_JSON);
}

export function getFullUrl(resourceType: string, id: string): string {
  return concatUrls(useRuntimeConfig().fhir.baseUrl, `/fhir/R4/${resourceType}/${id}`);
}

export function sendResponseHeaders(event: H3Event<EventHandlerRequest>, outcome: OperationOutcome, body: Resource): void {
  if (body.meta?.versionId) {
    setResponseHeader(event, 'ETag', `W/"${body.meta.versionId}"`);
  }
  if (body.meta?.lastUpdated) {
    setResponseHeader(event, 'Last-Modified', new Date(body.meta.lastUpdated).toUTCString());
  }
  if (isCreated(outcome)) {
    setResponseHeader(event, 'Location', getFullUrl(body.resourceType, body.id as string));
  }

  setResponseStatus(event, getStatus(outcome));
}

export async function sendResponse(
    event: H3Event<EventHandlerRequest>,
    outcome: OperationOutcome,
    body: Resource
) {
  sendResponseHeaders(event, outcome, body);

  const acceptHeader = getRequestHeader(event,'Accept');
  if (body.resourceType === 'Binary' && event.method === 'GET' && !acceptHeader?.startsWith(ContentType.FHIR_JSON)) {
    // When the read request has some other type in the Accept header,
    // then the content should be returned with the content type stated in the resource in the Content-Type header.
    // E.g. if the content type in the resource is "application/pdf", then the content should be returned as a PDF directly.
    setResponseHeader(event, 'Content-Type', body.contentType as string);
    if (body.data) {
      return send(event, Buffer.from(body.data, 'base64'));
    } else {
        //TODO handle streams in nuxt way
      const stream = await getBinaryStorage().readBinary(body);
      // @ts-ignore
      return stream.pipe(event);
    }
  }

  setResponseHeader(event, 'Content-Type', ContentType.FHIR_JSON);

  const ctx = getAuthenticatedContext();
  const result = await rewriteAttachments(RewriteMode.PRESIGNED_URL, ctx.repo, body);

  if (getQuery(event)._pretty === 'true') {
    return send(event, JSON.stringify(result, undefined, 2));
  } else {
    return send(event, JSON.stringify(result));
  }
}