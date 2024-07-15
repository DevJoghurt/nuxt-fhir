import { Resource } from '@medplum/fhirtypes';
import { BackgroundJobContext } from '@medplum/core';

/**
 * Adds all background jobs for a given resource.
 * @param resource - The resource that was created or updated.
 * @param context - The background job context.
 */
export async function addBackgroundJobs(resource: Resource, context: BackgroundJobContext): Promise<void> {
    //TODO
}