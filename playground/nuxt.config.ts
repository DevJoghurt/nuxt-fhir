export default defineNuxtConfig({
  modules: ['../src/module'],
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