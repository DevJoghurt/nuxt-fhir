import type { ConnectionOptions } from 'pg';

export type PostgresDatabase = {
    host: string;
    port: number;
    dbname: string;
    username?: string;
    password?: string;
    max: number;
    runMigrations: boolean;
    queryTimeout?: number;
    ssl?: boolean | ConnectionOptions | undefined
}
  
export type PostgresServerConfig = {
    database: PostgresDatabase;
    readonlyDatabase?: PostgresDatabase;
    databaseProxyEndpoint?: string | undefined;
    readonlyDatabaseProxyEndpoint?: string | undefined;
}

export type RedisConfig = {
    host?: string;
    port?: number;
    password?: string;
    /** The logical database to use for Redis. See: https://redis.io/commands/select/. Default is `0`. */
    db?: number;
    tls?: Record<string, unknown>;
}

export type SmtpConfig = {
    host: string,
    port: number,
    username: string,
    password: string
}

// Module options TypeScript interface definition
export interface ModuleOptions {
    //API prefix
    prefix: string | null;
    //The fully qualified base URL of the API server including a trailing slash. For example, https://api.example.com/.
    baseUrl: string | null;
    postgres: PostgresServerConfig;
    //Verbosity of logging: 'NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG'
    logLevel: 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
    //The JWK issuer. By default, Medplum server uses built in OAuth, so issuer should be the same as baseUrl.
    issuer?: string;
    //The JWKS URL. By default, Medplum server uses built in OAuth, so jwksUrl should be baseUrl + .well-known/jwks.json.
    jwksUrl?: string;
    //The OAuth authorize URL. By default, Medplum server uses built in OAuth, so authorizeUrl should be baseUrl + oauth2/authorize.
    authorizeUrl?: string;
    //The OAuth token URL. By default, Medplum server uses built in OAuth, so tokenUrl should be baseUrl + oauth2/token.
    tokenUrl?: string;
    //The fully qualified URL of the user-facing app. This is used for CORS and system generated emails. For example, https://app.example.com/.
    appBaseUrl: string | null;
    // Prefix of cookie for login handling
    cookiePrefix?: string;
    //If using reCAPTCHA, this is the reCAPTCHA secret key.
    recaptchaSecretKey?: string;
    //If using reCAPTCHA, this is the reCAPTCHA secret key.
    recaptchaSiteKey?: string;
    //The domain name that will be used to access the file storage using presigned URLs. For example, storage.medplum.com.
    storageDomainName?: string;
    //The fully qualified base URL of the binary storage. This should be the CDK config storageDomainName with https:// prefix. For example, https://storage.medplum.com/binary/.
    storageBaseUrl?: string;
    // The redis connection details as a JSON object. Only available when using JSON config file.
    redis?: RedisConfig;
    //Optional flag to save AuditEvent resources for all auth and RESTful operations in the database.
    saveAuditEvents?: boolean;
    // Disable VM context bots
    vmContextBotsEnabled?: boolean;
    //Optional max AuditEvent.outcomeDesc length for Bot events saved as a resource in the database.
    maxBotLogLengthForResource?: number;
    //Optional max AuditEvent.outcomeDesc length for Bot events sent to logger.
    maxBotLogLengthForLogs?: number;
    //Optional enable heartbeat timers for WebSocket connections.
    heartbeatEnabled?: boolean;
    //Optional interval for heartbeat -> default 10 * 1000.
    heartbeatMilliseconds?: number;
    //Optional enable introspection for GraphQL.
    introspectionEnabled?: boolean;
    //If the estimate is less than the "accurateCountThreshold" config setting (default 1,000,000), then we run an accurate count.
    accurateCountThreshold?: number;
    // Temporary feature flag, to be removed
    chainedSearchWithReferenceTables?: boolean;
    // File storage presigned URL signing key
    signingKey?: string;
    // File storage presigned URL signing key passphrase
    signingKeyPassphrase?: string;
    // Optional flag to log AuditEvent resources for all auth and RESTful operations to the logger.
    logAuditEvents?: boolean;
    //Optional Log Group name for AuditEvent logs. If not specified, AuditEvent logs use the default logger.
    auditEventLogGroup?: string;
    //Optional default bot runtime version. See Bot runtime version for more details.
    defaultBotRuntimeVersion?: 'vmcontext' | undefined;
    //Optional SMTP email settings to use SMTP for email. See Sending SMTP Emails for more details.
    smtp?: SmtpConfig;
    // Optional list of approved sender email addresses. If specified, only these email addresses can be used as the "from" address in emails, e.g ",".
    approvedSenderEmails?: string;
    // Optional support email address. If specified, this email address is used as the "from" address in emails when the user does not specify a "from" address.
    supportEmail?: string;
    //Optional comma separated list of allowed origins for Cross-Origin Resource Sharing (CORS) requests. appBaseUrl is included automatically.
    allowedOrigins?: string;
    // Optional rate limit for all requests. Set to -1 to disable rate limiting.
    defaultRateLimit?: number;
    // Optional rate limit for auth requests. Set to -1 to disable rate limiting.
    defaultAuthRateLimit?: number;
    // Optional flag to log requests to the logger.
    logRequests?: boolean;
    //Maximum JSON size for API calls. String is parsed with the bytes library. Default is 1mb.
    maxJsonSize?: string;
    // Allow user registration for FHIR server
    registerEnabled?: boolean;

    bcryptHashSalt?: number;
  }