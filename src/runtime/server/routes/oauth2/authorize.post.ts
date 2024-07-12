import { defineEventHandler } from '#imports'
import { authorizePostHandler } from '../../medplum/oauth/authorize'

export default defineEventHandler(async (event)=>authorizePostHandler(event))