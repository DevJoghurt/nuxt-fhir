import { useRuntimeConfig } from '#imports';


/**
 * Returns the server configuration settings.
 * @returns The server configuration settings.
 */
export function getConfig() {
  return useRuntimeConfig().fhir;
}