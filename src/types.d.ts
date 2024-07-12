import type { ConnectionOptions } from 'pg';

export type PostgresDatabase = {
    host: string;
    port: number;
    dbname: string;
    username: string;
    password: string;
    max: number;
    runMigrations: boolean;
    queryTimeout?: number;
    ssl: boolean | ConnectionOptions | undefined
}
  
export type PostgresServerConfig = {
    database: PostgresDatabase;
    readonlyDatabase?: PostgresDatabase;
    databaseProxyEndpoint?: string | undefined;
    readonlyDatabaseProxyEndpoint?: string | undefined;
}

// Module options TypeScript interface definition
export interface ModuleOptions {
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
  }