export default defineNuxtConfig({
  modules: [
    '../src/module',
    '@nuxt/test-utils/module'
  ],
  devServer: {
    port: 8081
  },
  fhir: {
    postgres: {
      database: {
        username: process.env.POSTGRES_USERNAME,
        password: process.env.POSTGRES_PASSWORD,
      }
    },
    allowedOrigins: 'http://localhost:8080'
  },
  devtools: { 
    enabled: true 
  },
  compatibilityDate: '2024-07-11',
})