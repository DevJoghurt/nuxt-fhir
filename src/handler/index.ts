import { addServerHandler } from '@nuxt/kit'
import { fhirRoutes } from './fhir'
import { websocketRoutes } from './websocket'

type Options = {
    cwd: string;
}

export function createServerHandler(prefix: string | null, opts: Options): void {
      const routeDefs = [fhirRoutes, websocketRoutes]
    
      for(const routeDef of routeDefs){
        if(prefix?.startsWith('/'))
            prefix = prefix.substring(1)
          const pathPrefix = prefix ? `/${prefix}${routeDef.routePrefix}` : routeDef.routePrefix
        for(const route of routeDef.routes){
          addServerHandler({
            route: pathPrefix + route.path,
            handler: `${opts.cwd}/${routeDef.folder}/${route.file}`,
            method: route.method
          })
        }
      }
}