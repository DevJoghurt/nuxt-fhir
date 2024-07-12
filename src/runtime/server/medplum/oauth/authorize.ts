import { getDateProperty, Operator } from '@medplum/core';
import { ClientApplication, Login } from '@medplum/fhirtypes';
import { URL } from 'url';
import { useRuntimeConfig } from '#imports';
import { getLogger } from '../../utils/context';
import { getSystemRepo } from '../fhir/repo';
import { MedplumIdTokenClaims, verifyJwt } from './keys';
import { getClientApplication } from './utils';
import type { H3Event, EventHandlerRequest } from 'h3'
import  { sendRedirect, readBody, getQuery, createError, getCookie } from '#imports'

/*
 * Handles the OAuth/OpenID Authorization Endpoint.
 * See: https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint
 */

/**
 * HTTP GET handler for /oauth2/authorize endpoint.
 */
export const authorizeGetHandler = async (event: H3Event<EventHandlerRequest>) => {
  const validateResult = await validateAuthorizeRequest(event);
  if (!validateResult) {
    return;
  }

  return sendSuccessRedirect(event);
};

/**
 * HTTP POST handler for /oauth2/authorize endpoint.
 */
export const authorizePostHandler = async (event: H3Event<EventHandlerRequest>) => {
  const validateResult = await validateAuthorizeRequest(event);
  if (!validateResult) {
    return;
  }

  return sendSuccessRedirect(event);
};

type ValidationBody = {
  client_id: string;
  redirectUri: string;
  redirect_uri: string;
  state: string;
  scope: string | undefined;
  response_type: 'code';
  request: string | undefined;
  aud: string | undefined;
  code_challenge: boolean;
  code_challenge_method: string | undefined;
  prompt: string | undefined;
  nonce: string;
}

/**
 * Validates the OAuth/OpenID Authorization Endpoint configuration.
 * This is used for both GET and POST requests.
 * We currently only support query string parameters.
 * See: https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint
 * @param req - The HTTP request.
 * @param res - The HTTP response.
 * @param params - The params (query string params for GET, form body params for POST).
 * @returns True on success; false on error.
 */
async function validateAuthorizeRequest(event: H3Event<EventHandlerRequest>) {

  const params = await readBody(event) as ValidationBody
  // First validate the client and the redirect URI.
  // If these are invalid, then show an error page.
  let client = undefined;
  try {
    client = await getClientApplication(params.client_id as string);
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Client not found',
    })
  }

  if (client.redirectUri !== params.redirect_uri) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Incorrect redirect_ur',
    })
  }

  const state = params.state as string;

  // Then, validate all other parameters.
  // If these are invalid, redirect back to the redirect URI.
  const scope = params.scope as string | undefined;
  if (!scope) {
    return sendErrorRedirect(event, client.redirectUri as string, 'invalid_request', state);
  }

  const responseType = params.response_type;
  if (responseType !== 'code') {
    return sendErrorRedirect(event, client.redirectUri as string, 'unsupported_response_type', state);
  }

  const requestObject = params.request as string | undefined;
  if (requestObject) {
    return sendErrorRedirect(event, client.redirectUri as string, 'request_not_supported', state);
  }

  const aud = params.aud as string | undefined;
  if (!isValidAudience(aud)) {
    return sendErrorRedirect(event, client.redirectUri as string, 'invalid_request', state);
  }

  const codeChallenge = params.code_challenge;
  if (codeChallenge) {
    const codeChallengeMethod = params.code_challenge_method;
    if (!codeChallengeMethod) {
      return sendErrorRedirect(event, client.redirectUri as string, 'invalid_request', state);
    }
  }

  const existingLogin = await getExistingLogin(event, client);

  const prompt = params.prompt as string | undefined;
  if (prompt === 'none' && !existingLogin) {
    return sendErrorRedirect(event, client.redirectUri as string, 'login_required', state);
  }

  if (prompt !== 'login' && existingLogin) {
    const systemRepo = getSystemRepo();
    await systemRepo.updateResource<Login>({
      ...existingLogin,
      nonce: params.nonce as string,
      granted: false,
    });

    const redirectUrl = new URL(params.redirect_uri as string);
    redirectUrl.searchParams.append('code', existingLogin.code as string);
    redirectUrl.searchParams.append('state', state);
    return sendRedirect(event, redirectUrl.toString());
  }

  return true;
}

/**
 * Returns true if the audience is valid.
 * @param aud - The user provided audience.
 * @returns True if the audience is valid; false otherwise.
 */
function isValidAudience(aud: string | undefined): boolean {
  if (!aud) {
    // Allow missing aud parameter.
    // Technically, aud is required: https://www.hl7.org/fhir/smart-app-launch/app-launch.html#obtain-authorization-code
    // However, some FHIR validation tools do not include it, so we silently ignore missing values.
    return true;
  }

  try {
    const audUrl = new URL(aud);
    const serverUrl = new URL(useRuntimeConfig().fhir.baseUrl);
    return audUrl.protocol === serverUrl.protocol && audUrl.host === serverUrl.host;
  } catch (err) {
    return false;
  }
}

/**
 * Tries to get an existing login for the current request.
 * @param event - The H3 event.
 * @param client - The current client application.
 * @returns Existing login if found; undefined otherwise.
 */
async function getExistingLogin(event: H3Event<EventHandlerRequest>, client: ClientApplication): Promise<Login | undefined> {
  const query = getQuery(event);
  const login = (await getExistingLoginFromIdTokenHint(event)) || (await getExistingLoginFromCookie(event, client));

  if (!login) {
    return undefined;
  }

  const authTime = getDateProperty(login.authTime) as Date;
  const age = (Date.now() - authTime.getTime()) / 1000;
  const maxAge = query.max_age ? parseInt(query.max_age as string, 10) : 3600;
  if (age > maxAge) {
    return undefined;
  }

  return login;
}

/**
 * Tries to get an existing login based on the "id_token_hint" query string parameter.
 * @param event - The H3 event.
 * @returns Existing login if found; undefined otherwise.
 */
async function getExistingLoginFromIdTokenHint(event: H3Event<EventHandlerRequest>): Promise<Login | undefined> {
  const query = getQuery(event)
  const idTokenHint = query.id_token_hint as string | undefined;
  if (!idTokenHint) {
    return undefined;
  }

  let verifyResult;
  try {
    verifyResult = await verifyJwt(idTokenHint);
  } catch (err: any) {
    getLogger().debug('Error verifying id_token_hint', err);
    return undefined;
  }

  const claims = verifyResult.payload as MedplumIdTokenClaims;
  const existingLoginId = claims.login_id as string | undefined;
  if (!existingLoginId) {
    return undefined;
  }

  const systemRepo = getSystemRepo();
  return systemRepo.readResource<Login>('Login', existingLoginId);
}

/**
 * Tries to get an existing login based on the HTTP cookies.
 * @param event - The H3 event.
 * @param client - The current client application.
 * @returns Existing login if found; undefined otherwise.
 */
async function getExistingLoginFromCookie(event: H3Event<EventHandlerRequest>, client: ClientApplication): Promise<Login | undefined> {
  const cookieName = 'medplum-' + client.id;
  const cookieValue = getCookie(event, cookieName);
  if (!cookieValue) {
    return undefined;
  }

  const systemRepo = getSystemRepo();
  const bundle = await systemRepo.search<Login>({
    resourceType: 'Login',
    filters: [
      {
        code: 'cookie',
        operator: Operator.EQUALS,
        value: cookieValue,
      },
    ],
  });

  const login = bundle.entry?.[0]?.resource;
  return login?.granted && !login.revoked ? login : undefined;
}

/**
 * Sends a redirect back to the client application with error codes and state.
 * @param res - The response.
 * @param redirectUri - The client redirect URI.  This URI may already have query string parameters.
 * @param error - The OAuth/OpenID error code.
 * @param state - The client state.
 */
function sendErrorRedirect(event: H3Event<EventHandlerRequest>, redirectUri: string, error: string, state: string) {
  const url = new URL(redirectUri);
  url.searchParams.append('error', error);
  url.searchParams.append('state', state);
  return sendRedirect(event, url.toString());
}

/**
 * Sends a successful redirect.
 * @param event - The H3 event.
 */
function sendSuccessRedirect(event: H3Event<EventHandlerRequest>) {
  const params = readBody(event);
  const redirectUrl = new URL(useRuntimeConfig().fhir.appBaseUrl + 'oauth');
  for (const [name, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(name, value);
  }
  return sendRedirect(event, redirectUrl.toString());
}
