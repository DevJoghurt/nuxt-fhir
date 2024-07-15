import {
  ContentType,
  OAuthClientAssertionType,
  OAuthGrantType,
  OAuthTokenType,
  Operator,
  ProfileResource,
  createReference,
  getStatus,
  isJwt,
  normalizeErrorString,
  normalizeOperationOutcome,
  parseJWTPayload,
  resolveId,
} from '@medplum/core';
import { ClientApplication, Login, Project, ProjectMembership, Reference } from '@medplum/fhirtypes';
import { createHash, randomUUID } from 'crypto';
import type { H3Event, EventHandlerRequest } from 'h3'
import { setResponseHeader, setResponseStatus, send } from "h3";
import  { readBody, createError, getHeader, getRequestIP, useRuntimeConfig } from '#imports'
import { JWTVerifyOptions, createRemoteJWKSet, jwtVerify } from 'jose';
import { getProjectIdByClientId } from '../auth/utils';
import { getAccessPolicyForLogin } from '../fhir/accesspolicy';
import { getSystemRepo } from '../fhir/repo';
import { getTopicForUser } from '../fhircast/utils';
import { MedplumRefreshTokenClaims, generateSecret, verifyJwt } from './keys';
import {
  checkIpAccessRules,
  getAuthTokens,
  getClientApplication,
  getClientApplicationMembership,
  getExternalUserInfo,
  revokeLogin,
  timingSafeEqualStr,
  tryLogin,
  verifyMultipleMatchingException,
} from './utils';

type ClientIdAndSecret = { error?: string; clientId?: string; clientSecret?: string };
type FhircastProps = { 'hub.topic': string; 'hub.url': string };

/**
 * Handles the OAuth/OpenID Token Endpoint.
 *
 * Implements the following authorization flows:
 *  1) Client Credentials - for server-to-server access
 *  2) Authorization Code - for user access
 *  3) Refresh - for "remember me" long term access
 *
 * See: https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint
 */
export const tokenHandler = async (event: H3Event<EventHandlerRequest>) => {

  if (getHeader(event,"Content-Type") !== ContentType.FORM_URL_ENCODED) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported content type',
    })
  }

  const body = await readBody(event)
  const grantType = body.grant_type as OAuthGrantType;
  if (!grantType) {
    return sendTokenError(event, 'invalid_request', 'Missing grant_type');
  }

  switch (grantType) {
    case OAuthGrantType.ClientCredentials:
      return await handleClientCredentials(event);
    case OAuthGrantType.AuthorizationCode:
      return await handleAuthorizationCode(event);
    case OAuthGrantType.RefreshToken:
      return await handleRefreshToken(event);
    case OAuthGrantType.TokenExchange:
      return await handleTokenExchange(event);
    default:
      return sendTokenError(event, 'invalid_request', 'Unsupported grant_type');
  }
};

/**
 * Handles the "Client Credentials" OAuth flow.
 * See: https://datatracker.ietf.org/doc/html/rfc6749#section-4.4
 * @param event - The H3 event.
 */
async function handleClientCredentials(event: H3Event<EventHandlerRequest>) {
  const { clientId, clientSecret, error } = await getClientIdAndSecret(event);
  const body = await readBody(event);
  if (error) {
    return sendTokenError(event, 'invalid_request', error);
  }

  if (!clientId) {
    return sendTokenError(event, 'invalid_request', 'Missing client_id');
  }

  if (!clientSecret) {
    return sendTokenError(event, 'invalid_request', 'Missing client_secret');
  }

  const systemRepo = getSystemRepo();
  let client: ClientApplication;
  try {
    client = await systemRepo.readResource<ClientApplication>('ClientApplication', clientId);
  } catch (err) {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  if (client.status && client.status !== 'active') {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  if (!(await validateClientIdAndSecret(event, client, clientSecret))) {
    return;
  }

  const membership = await getClientApplicationMembership(client);
  if (!membership) {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  const project = await systemRepo.readReference(membership.project as Reference<Project>);
  const scope = (body.scope || 'openid') as string;

  const userAgent = getHeader(event, 'User-Agent');

  const login = await systemRepo.createResource<Login>({
    resourceType: 'Login',
    authMethod: 'client',
    user: createReference(client),
    client: createReference(client),
    membership: createReference(membership),
    authTime: new Date().toISOString(),
    granted: true,
    scope,
    remoteAddress: getRequestIP(event),
    userAgent,
  });

  // TODO: build full AuthState object, including on-behalf-of

  try {
    const accessPolicy = await getAccessPolicyForLogin({ project, login, membership });
    await checkIpAccessRules(login, accessPolicy);
  } catch (err) {
    return sendTokenError(event, 'invalid_request', normalizeErrorString(err));
  }

  return await sendTokenResponse(event, login, membership, client.refreshTokenLifetime);
}

/**
 * Handles the "Authorization Code Grant" flow.
 * See: https://datatracker.ietf.org/doc/html/rfc6749#section-4.1
 * @param event - The H3 event.
 */
async function handleAuthorizationCode(event: H3Event<EventHandlerRequest>) {
  const { clientId, clientSecret, error } = await getClientIdAndSecret(event);
  const body = await readBody(event);
  if (error) {
    return sendTokenError(event, 'invalid_request', error);
  }

  const { code } = await readBody(event);
  if (!code) {
    return sendTokenError(event, 'invalid_request', 'Missing code');
  }

  const systemRepo = getSystemRepo();
  const searchResult = await systemRepo.search({
    resourceType: 'Login',
    filters: [
      {
        code: 'code',
        operator: Operator.EQUALS,
        value: code,
      },
    ],
  });

  if (!searchResult.entry || searchResult.entry.length === 0) {
    return sendTokenError(event, 'invalid_request', 'Invalid code');
  }

  const login = searchResult.entry[0].resource as Login;

  if (clientId && login.client?.reference !== 'ClientApplication/' + clientId) {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  if (!login.membership) {
    return sendTokenError(event, 'invalid_request', 'Invalid profile');
  }

  if (login.granted) {
    await revokeLogin(login);
    return sendTokenError(event, 'invalid_grant', 'Token already granted');
  }

  if (login.revoked) {
    return sendTokenError(event, 'invalid_grant', 'Token revoked');
  }

  let client: ClientApplication | undefined;
  try {
    if (clientId) {
      client = await getClientApplication(clientId);
    } else if (login.client) {
      client = await getClientApplication(resolveId(login.client) as string);
    }
  } catch (err) {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  if (clientSecret) {
    if (!(await validateClientIdAndSecret(event, client, clientSecret))) {
      return;
    }
  } else if (!client?.pkceOptional) {
    if (login.codeChallenge) {
      const codeVerifier = body.code_verifier;
      if (!codeVerifier) {
        return sendTokenError(event, 'invalid_request', 'Missing code verifier');
      }

      if (!verifyCode(login.codeChallenge, login.codeChallengeMethod as string, codeVerifier)) {
        return sendTokenError(event, 'invalid_request', 'Invalid code verifier');
      }
    } else {
      return sendTokenError(event, 'invalid_request', 'Missing verification context');
    }
  }

  const membership = await systemRepo.readReference<ProjectMembership>(login.membership);
  return await sendTokenResponse(event, login, membership, client?.refreshTokenLifetime);
}

/**
 * Handles the "Refresh" flow.
 * See: https://datatracker.ietf.org/doc/html/rfc6749#section-6
 * @param event - The H3 event.
 */
async function handleRefreshToken(event: H3Event<EventHandlerRequest>) {
  const body = await readBody(event);
  const refreshToken = body.refresh_token;
  if (!refreshToken) {
    return sendTokenError(event, 'invalid_request', 'Invalid refresh token');
  }

  let claims: MedplumRefreshTokenClaims;
  try {
    claims = (await verifyJwt(refreshToken)).payload as MedplumRefreshTokenClaims;
  } catch (err) {
    return sendTokenError(event, 'invalid_request', 'Invalid refresh token');
  }

  const systemRepo = getSystemRepo();
  const login = await systemRepo.readResource<Login>('Login', claims.login_id);

  if (login.refreshSecret === undefined) {
    // This token does not have a refresh available
    return sendTokenError(event, 'invalid_request', 'Invalid token');
  }

  if (login.revoked) {
    return sendTokenError(event, 'invalid_grant', 'Token revoked');
  }

  // Use a timing-safe-equal here so that we don't expose timing information which could be
  // used to infer the secret value
  if (!timingSafeEqualStr(login.refreshSecret, claims.refresh_secret)) {
    return sendTokenError(event, 'invalid_request', 'Invalid token');
  }

  const authHeader = getHeader(event, 'Authorization');
  if (authHeader) {
    if (!authHeader.startsWith('Basic ')) {
      return sendTokenError(event, 'invalid_request', 'Invalid authorization header');
    }
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [clientId, clientSecret] = credentials.split(':');
    if (clientId !== resolveId(login.client)) {
      return sendTokenError(event, 'invalid_grant', 'Incorrect client');
    }
    if (!clientSecret) {
      return sendTokenError(event, 'invalid_grant', 'Incorrect client secret');
    }
  }

  let client: ClientApplication | undefined;
  if (login.client) {
    const clientId = resolveId(login.client) ?? '';
    try {
      client = await systemRepo.readResource<ClientApplication>('ClientApplication', clientId);
    } catch (err) {
      return sendTokenError(event, 'invalid_request', 'Invalid client');
    }
  }

  const refreshTokenLifetime = client?.refreshTokenLifetime;

  // Refresh token rotation
  // Generate a new refresh secret and update the login
  const updatedLogin = await systemRepo.updateResource<Login>({
    ...login,
    refreshSecret: generateSecret(32),
    remoteAddress: getRequestIP(event),
    userAgent: getHeader(event, 'User-Agent'),
  });

  const membership = await systemRepo.readReference<ProjectMembership>(
    login.membership as Reference<ProjectMembership>
  );

  return await sendTokenResponse(event, updatedLogin, membership, refreshTokenLifetime);
}

/**
 * Handles the "Exchange" flow.
 * See: https://datatracker.ietf.org/doc/html/rfc8693
 * @param event - The H3 event.
 * @returns Promise to complete.
 */
async function handleTokenExchange(event: H3Event<EventHandlerRequest>) {
  const body = await readBody(event)
  return exchangeExternalAuthToken(event, body.client_id, body.subject_token, body.subject_token_type);
}

/**
 * Exchanges an existing token for a new set of tokens.
 * See: https://datatracker.ietf.org/doc/html/rfc8693
 * @param event - The H3 event.
 * @param clientId - The client application ID.
 * @param subjectToken - The subject token. Only access tokens are currently supported.
 * @param subjectTokenType - The subject token type as defined in Section 3.  Only "urn:ietf:params:oauth:token-type:access_token" is currently supported.
 */
export async function exchangeExternalAuthToken(
  event: H3Event<EventHandlerRequest>,
  clientId: string,
  subjectToken: string,
  subjectTokenType: OAuthTokenType
) {
  if (!clientId) {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  if (!subjectToken) {
    return sendTokenError(event, 'invalid_request', 'Invalid subject_token');
  }

  if (subjectTokenType !== OAuthTokenType.AccessToken) {
    return sendTokenError(event, 'invalid_request', 'Invalid subject_token_type');
  }

  const systemRepo = getSystemRepo();
  const projectId = await getProjectIdByClientId(clientId, undefined);
  const client = await systemRepo.readResource<ClientApplication>('ClientApplication', clientId);
  const idp = client.identityProvider;
  if (!idp) {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  let userInfo;
  try {
    userInfo = await getExternalUserInfo(idp, subjectToken);
  } catch (err: any) {
    const outcome = normalizeOperationOutcome(err);
    return sendTokenError(event, 'invalid_request', normalizeErrorString(err), getStatus(outcome));
  }

  let email: string | undefined = undefined;
  let externalId: string | undefined = undefined;
  if (idp.useSubject) {
    externalId = userInfo.sub as string;
  } else {
    email = userInfo.email as string;
  }

  const body = await readBody(event)

  const login = await tryLogin({
    authMethod: 'exchange',
    email,
    externalId,
    projectId,
    clientId,
    scope: body.scope || 'openid offline',
    nonce: body.nonce || randomUUID(),
    remoteAddress: getRequestIP(event),
    userAgent: getHeader(event, 'User-Agent'),
  });

  const membership = await systemRepo.readReference<ProjectMembership>(
    login.membership as Reference<ProjectMembership>
  );

  return await sendTokenResponse(event, login, membership, client.refreshTokenLifetime);
}

/**
 * Tries to extract the client ID and secret from the request.
 *
 * Possible methods:
 * 1. Client assertion (private_key_jwt)
 * 2. Basic auth header (client_secret_basic)
 * 3. Form body (client_secret_post)
 *
 * See SMART "token_endpoint_auth_methods_supported"
 * @param event - The H3 event.
 * @returns The client ID and secret on success, or an error message on failure.
 */
async function getClientIdAndSecret(event: H3Event<EventHandlerRequest>): Promise<ClientIdAndSecret> {
  const body = await readBody(event)
  if (body.client_assertion_type) {
    return parseClientAssertion(body.client_assertion_type, body.client_assertion);
  }

  const authHeader = getHeader(event, 'Authorization');
  if (authHeader) {
    return parseAuthorizationHeader(authHeader);
  }

  return {
    clientId: body.client_id,
    clientSecret: body.client_secret,
  };
}

/**
 * Parses a client assertion credential.
 *
 * Client assertion works like this:
 * 1. Client creates a self signed JWT with required fields.
 * 2. Client must have a configured JWK Set URL.
 * 3. Server first parses the JWT to get the client ID.
 * 4. Server looks up the client by ID.
 * 5. Server verifies the JWT signature using the JWK Set URL.
 *
 * References:
 * 1. https://www.rfc-editor.org/rfc/rfc7523
 * 2. https://www.hl7.org/fhir/smart-app-launch/example-backend-services.html#step-2-discovery
 * 3. https://docs.oracle.com/en/cloud/get-started/subscriptions-cloud/csimg/obtaining-access-token-using-self-signed-client-assertion.html
 * 4. https://darutk.medium.com/oauth-2-0-client-authentication-4b5f929305d4
 * @param clientAssertionType - The client assertion type.
 * @param clientAssertion - The client assertion JWT.
 * @returns The parsed client ID and secret on success, or an error message on failure.
 */
async function parseClientAssertion(
  clientAssertionType: OAuthClientAssertionType,
  clientAssertion: string
): Promise<ClientIdAndSecret> {
  if (clientAssertionType !== OAuthClientAssertionType.JwtBearer) {
    return { error: 'Unsupported client assertion type' };
  }

  if (!clientAssertion || !isJwt(clientAssertion)) {
    return { error: 'Invalid client assertion' };
  }

  const { tokenUrl } = useRuntimeConfig().fhir;
  const claims = parseJWTPayload(clientAssertion);

  if (claims.aud !== tokenUrl) {
    return { error: 'Invalid client assertion audience' };
  }

  if (claims.iss !== claims.sub) {
    return { error: 'Invalid client assertion issuer' };
  }

  const systemRepo = getSystemRepo();
  const clientId = claims.iss as string;
  let client: ClientApplication;
  try {
    client = await systemRepo.readResource<ClientApplication>('ClientApplication', clientId);
  } catch (err) {
    return { error: 'Client not found' };
  }

  if (!client.jwksUri) {
    return { error: 'Client must have a JWK Set URL' };
  }

  const JWKS = createRemoteJWKSet(new URL(client.jwksUri));

  const verifyOptions: JWTVerifyOptions = {
    issuer: clientId,
    algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
    audience: tokenUrl,
  };

  try {
    await jwtVerify(clientAssertion, JWKS, verifyOptions);
  } catch (error: any) {
    // There are some edge cases where there are multiple matching JWKS
    // and we need to iterate throught the JWKSMultipleMatchingKeys error
    // and return the first verified match
    if (error?.code === 'ERR_JWKS_MULTIPLE_MATCHING_KEYS') {
      return verifyMultipleMatchingException(error, clientId, clientAssertion, verifyOptions, client);
    }
    return { error: 'Invalid client assertion signature' };
  }

  // Successfully validated the client assertion
  return { clientId, clientSecret: client.secret };
}

/**
 * Tries to parse the client ID and secret from the Authorization header.
 * @param authHeader - The Authorizaiton header string.
 * @returns Client ID and secret on success, or an error message on failure.
 */
async function parseAuthorizationHeader(authHeader: string): Promise<ClientIdAndSecret> {
  if (!authHeader.startsWith('Basic ')) {
    return { error: 'Invalid authorization header' };
  }
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [clientId, clientSecret] = credentials.split(':');
  return { clientId, clientSecret };
}

async function validateClientIdAndSecret(
  event: H3Event<EventHandlerRequest>,
  client: ClientApplication | undefined,
  clientSecret: string
) {
  if (!client?.secret) {
    return sendTokenError(event, 'invalid_request', 'Invalid client');
  }

  // Use a timing-safe-equal here so that we don't expose timing information which could be
  // used to infer the secret value
  if (!timingSafeEqualStr(client.secret, clientSecret)) {
    return sendTokenError(event, 'invalid_request', 'Invalid secret');
  }

  return true;
}

/**
 * Sends a successful token response.
 * @param event - The H3 event.
 * @param login - The user login.
 * @param membership - The project membership.
 * @param refreshLifetime - The refresh token duration.
 */
async function sendTokenResponse(
  event: H3Event<EventHandlerRequest>,
  login: Login,
  membership: ProjectMembership,
  refreshLifetime?: string
) {
  const { baseUrl } = useRuntimeConfig().fhir;
  const tokens = await getAuthTokens(login, membership.profile as Reference<ProfileResource>, refreshLifetime);
  let patient = undefined;
  let encounter = undefined;

  if (login.launch) {
    const systemRepo = getSystemRepo();
    const launch = await systemRepo.readReference(login.launch);
    patient = resolveId(launch.patient);
    encounter = resolveId(launch.encounter);
  }

  if (membership.profile?.reference?.startsWith('Patient/')) {
    patient = membership.profile.reference.replace('Patient/', '');
  }

  const fhircastProps = {} as FhircastProps;
  if (login.scope?.includes('fhircast/')) {
    const userId = resolveId(login.user) as string;
    let topic: string;
    try {
      topic = await getTopicForUser(userId);
    } catch (err: unknown) {
      return sendTokenError(event, normalizeErrorString(err));
    }
    fhircastProps['hub.url'] = baseUrl + 'fhircast/STU3/'; // TODO: Figure out how to handle the split between STU2 and STU3...
    fhircastProps['hub.topic'] = topic;
  }



  return {
    token_type: 'Bearer',
    expires_in: 3600,
    scope: login.scope,
    id_token: tokens.idToken,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    project: membership.project,
    profile: membership.profile,
    patient,
    encounter,
    smart_style_url: baseUrl + 'fhir/R4/.well-known/smart-styles.json',
    need_patient_banner: !!patient,
    ...fhircastProps, // Spreads no props when FHIRcast scopes not present
  };
}

/**
 * Sends an OAuth2 response.
 * @param event - The H3 event.
 * @param error - The error code.  See: https://datatracker.ietf.org/doc/html/rfc6749#appendix-A.7
 * @param description - The error description.  See: https://datatracker.ietf.org/doc/html/rfc6749#appendix-A.8
 * @param status - The HTTP status code.
 * @returns Reference to the HTTP response.
 */
function sendTokenError(event: H3Event<EventHandlerRequest>, error: string, description?: string, status = 400) {
  setResponseHeader(event, "Content-Type", "application/json");

  setResponseStatus(event, status, error);

  return send(event, JSON.stringify({
    error,
    error_description: description,
  }));
}

/**
 * Verifies the code challenge and verifier.
 * @param challenge - The code_challenge from the authorization.
 * @param method - The code_challenge_method from the authorization.
 * @param verifier - The code_verifier from the token request.
 * @returns True if the verifier succeeds; false otherwise.
 */
function verifyCode(challenge: string, method: string, verifier: string): boolean {
  if (method === 'plain' && challenge === verifier) {
    return true;
  }

  if (method === 'S256' && challenge === hashCode(verifier)) {
    return true;
  }

  return false;
}

/**
 * Returns the base64-url-encoded SHA256 hash of the code.
 * The details around '+', '/', and '=' are important for compatibility.
 * See: https://auth0.com/docs/flows/call-your-api-using-the-authorization-code-flow-with-pkce
 * See: packages/client/src/crypto.ts
 * @param code - The input code.
 * @returns The base64-url-encoded SHA256 hash.
 */
export function hashCode(code: string): string {
  return createHash('sha256')
    .update(code)
    .digest()
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
