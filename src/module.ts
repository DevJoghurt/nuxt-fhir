import { 
  defineNuxtModule, 
  createResolver,
  addServerScanDir
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
        host: '127.0.0.1',
        port: 5432,
        dbname: 'fhir',
        username: '',
        password: '',
        max: 600,
        runMigrations: true,
        ssl: {
          required: true
        }
      }
    },
    logLevel: 'INFO'
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

    _nuxt.options.runtimeConfig.fhir = defu(_nuxt.options.runtimeConfig.fhir || {}, {
      baseUrl,
      appBaseUrl,
      postgres: _options.postgres,
      logLevel: _options.logLevel,
      issuer: _options.issuer || baseUrl,
      jwksUrl: _options.jwksUrl || `${baseUrl}/.well-known/jwks.json`,
      authorizeUrl: _options.authorizeUrl || `${baseUrl}/oauth2/authorize`,
      tokenUrl: _options.authorizeUrl || `${baseUrl}/oauth2/token`
    })

  },
})