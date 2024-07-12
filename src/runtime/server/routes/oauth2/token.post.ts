import { defineEventHandler } from '#imports'
import { tokenHandler } from '../../medplum/oauth/token'

export default defineEventHandler(async (event)=>tokenHandler(event.node.req, event.node.res))