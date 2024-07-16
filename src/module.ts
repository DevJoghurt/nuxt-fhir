import { 
  defineNuxtModule, 
  createResolver,
  addServerScanDir,
  addServerHandler
} from '@nuxt/kit'
import defu from 'defu'
import type { ModuleOptions } from './types'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-fhir',
    configKey: 'fhir'
  },
  // Default configuration options of the Nuxt module
  defaults: {
    baseUrl: null,
    appBaseUrl: null,
    postgres: {
      database: {
        host: 'localhost',
        port: 5432,
        dbname: 'medplum_test',
        username: 'medplum_test_readonly',
        password: 'medplum_test_readonly',
        max: 600,
        runMigrations: false,
        ssl: {
          required: true
        }
      },
    },
    redis: {
      host: 'localhost',
      port: 6379
    },
    cookiePrefix: 'fhir',
    saveAuditEvents: false,
    logLevel: 'INFO',
    vmContextBotsEnabled: true
  },
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addServerScanDir(resolve('./runtime/server'))

    // add runtime config
    
    //create baseUrl + check if ends with '/'
    let baseUrl = _options.baseUrl === null ? _nuxt.options.devServer.url : _options.baseUrl
    if (!baseUrl.endsWith('/')) {
      baseUrl = baseUrl + '/'
    }
    let appBaseUrl = _options.appBaseUrl === null ? _nuxt.options.devServer.url : _options.appBaseUrl
    if (!appBaseUrl.endsWith('/')) {
      appBaseUrl = appBaseUrl + '/'
    }
    let storageDomainName = _options.storageDomainName ? _options.storageDomainName : _nuxt.options.devServer.host
    let storageBaseUrl = _options.storageBaseUrl ? _options.storageBaseUrl : _nuxt.options.devServer.url + '/binary/'

    _nuxt.options.runtimeConfig.fhir = defu(_nuxt.options.runtimeConfig.fhir || {}, {
      baseUrl,
      appBaseUrl,
      postgres: _options.postgres,
      redis: _options.redis,
      logLevel: _options.logLevel,
      issuer: _options.issuer || baseUrl,
      jwksUrl: _options.jwksUrl || `${baseUrl}/.well-known/jwks.json`,
      authorizeUrl: _options.authorizeUrl || `${baseUrl}/oauth2/authorize`,
      tokenUrl: _options.authorizeUrl || `${baseUrl}/oauth2/token`,
      cookiePrefix: _options.cookiePrefix,
      recaptchaSiteKey: _options.recaptchaSiteKey || undefined,
      recaptchaSecretKey: _options.recaptchaSecretKey || undefined,
      storageDomainName,
      storageBaseUrl,
      saveAuditEvents: _options.saveAuditEvents,
      vmContextBotsEnabled: _options.vmContextBotsEnabled,
      maxBotLogLengthForLogs: _options.maxBotLogLengthForLogs,
      maxBotLogLengthForResource: _options.maxBotLogLengthForResource,
      heartbeatEnabled: _options.heartbeatEnabled || false,
      heartbeatMilliseconds: _options.heartbeatMilliseconds || 10 * 1000,
      introspectionEnabled: _options.introspectionEnabled || false,
      accurateCountThreshold: _options.accurateCountThreshold || 1000000,
      chainedSearchWithReferenceTables: _options.chainedSearchWithReferenceTables || false,
      signingKey: _options.signingKey || undefined,
      signingKeyPassphrase: _options.signingKeyPassphrase || undefined,
      logAuditEvents: _options.logAuditEvents || false,
      auditEventLogGroup: _options.auditEventLogGroup || undefined,
      defaultBotRuntimeVersion: _options.defaultBotRuntimeVersion || 'vmcontext',
      smtp: _options.smtp || undefined,
      approvedSenderEmails: _options.approvedSenderEmails || undefined,
      supportEmail: _options.supportEmail || undefined,
      allowedOrigins: _options.allowedOrigins || '*',
      defaultRateLimit: _options.defaultRateLimit || 60000,
      defaultAuthRateLimit: _options.defaultAuthRateLimit || 160,
      logRequests: _options.logRequests || false,
      maxJsonSize: _options.maxJsonSize || '1mb',
    })

    addServerHandler({
      route: '/test/*',
      handler: resolve('./runtime/server/handler/app.ts'),
    })

  },
})