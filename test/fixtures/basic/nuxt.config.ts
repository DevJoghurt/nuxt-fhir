import { defineNuxtConfig } from 'nuxt/config'
import FhirModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    FhirModule
  ],
  fhir: {
    postgres: {
      database: {
        username: process.env.POSTGRES_USERNAME,
        password: process.env.POSTGRES_PASSWORD,
      }
    }
  }
})
