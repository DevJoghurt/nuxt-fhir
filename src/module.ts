import { 
  defineNuxtModule, 
  createResolver,
  addServerScanDir,
  addServerImportsDir,
  addServerPlugin,
  addServerHandler
} from '@nuxt/kit'
import defu from 'defu'
import type { ModuleOptions } from './types'
import { createFhirRoutes } from './handler/fhir'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-fhir',
    configKey: 'fhir'
  },
  // Default configuration options of the Nuxt module
  defaults: {
    prefix: null,
    baseUrl: null,
    appBaseUrl: null,
    postgres: {
      database: {
        host: 'localhost',
        port: 5432,
        dbname: 'medplum',
        max: 600,
        runMigrations: true
      },
    },
    redis: {
      host: 'localhost',
      port: 6379
    },
    cookiePrefix: 'fhir',
    saveAuditEvents: false,
    logLevel: 'DEBUG',
    vmContextBotsEnabled: true
  },
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    _nuxt.options.build.transpile.push(resolve('./runtime/server'))

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
      jwksUrl: _options.jwksUrl || `${baseUrl}.well-known/jwks.json`,
      authorizeUrl: _options.authorizeUrl || `${baseUrl}oauth2/authorize`,
      tokenUrl: _options.authorizeUrl || `${baseUrl}oauth2/token`,
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
      registerEnabled: _options.registerEnabled || false,
      bcryptHashSalt: _options.bcryptHashSalt || 10
    })

    addServerImportsDir(resolve('./runtime/server/utils'))

    addServerPlugin(resolve('./runtime/server/plugins/medplum'))

    createFhirRoutes(_options.prefix,{
      cwd: resolve('./runtime/server/routes/fhir')
    })

    _nuxt.hook('nitro:config', (nitro) => {
      const ignoredWarnings = ['THIS_IS_UNDEFINED', 'CIRCULAR_DEPENDENCY']
      //@ts-ignore
      nitro.rollupConfig.onwarn = function (warn){
        if(ignoredWarnings.indexOf(warn?.code || '') === -1)
          console.log(warn.message)
      } 
    })

  }
})