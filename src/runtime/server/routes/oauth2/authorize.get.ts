import { defineEventHandler } from '#imports'
import { authorizeGetHandler } from '../../medplum/oauth/authorize'

export default defineEventHandler(async (event)=> await authorizeGetHandler(event))