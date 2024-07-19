import type { NitroEventHandler } from '@nuxt/schema'

export type Route = {
    routePrefix: string;
    folder: string;
    routes: Array<NitroEventHandler>;
}