import { 
  defineNuxtModule, 
  createResolver,
  addServerScanDir
} from '@nuxt/kit'
import defu from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  baseUrl: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-fhir',
    configKey: 'fhir',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    baseUrl: ''
  },
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addServerScanDir(resolve('./runtime/server'))

    // add runtime config
    
    //create baseUrl + check if ends with '/'
    let baseUrl = _options.baseUrl === '' ? _nuxt.options.devServer.url : _options.baseUrl
    if (!baseUrl.endsWith('/')) {
      baseUrl = baseUrl + '/'
    }

    _nuxt.options.runtimeConfig.fhir = defu(_nuxt.options.runtimeConfig.fhir || {}, {
      baseUrl
    })

  },
})