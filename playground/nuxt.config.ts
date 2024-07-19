export default defineNuxtConfig({
  modules: ['../src/module'],
  fhir: {
    postgres: {
      database: {
        username: 'postgres',
        password: process.env.POSTGRES_PASSWORD,
      }
    }
  },
  devtools: { 
    enabled: true 
  },
  compatibilityDate: '2024-07-11',
})