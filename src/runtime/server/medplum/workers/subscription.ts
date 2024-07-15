import {
    AccessPolicyInteraction,
    BackgroundJobContext,
    BackgroundJobInteraction,
    ContentType,
    OperationOutcomeError,
    Operator,
    createReference,
    getExtension,
    getExtensionValue,
    getReferenceString,
    isGone,
    isNotFound,
    isString,
    normalizeOperationOutcome,
    resourceMatchesSubscriptionCriteria,
    satisfiedAccessPolicy,
    serverError,
    stringify,
  } from '@medplum/core';
  import { globalLogger } from '../../utils/logger';
  import { Repository, getSystemRepo } from '../fhir/repo';
  import { Bot, Project, ProjectMembership, Reference, Resource, ResourceType, Subscription } from '@medplum/fhirtypes';
  import { getLogger, getRequestContext, tryGetRequestContext, tryRunInRequestContext } from '../../utils/context';
  import { getRedis } from '../../utils/redis';
  import { buildAccessPolicy } from '../fhir/accesspolicy';
  import { findProjectMembership, getPreviousResource } from './utils';
  import { Queue } from 'bullmq';

  export type SubStatus = 'requested' | 'active' | 'error' | 'off';
  export type SubEventsOptions = { status?: SubStatus; includeResource?: boolean };

  /*
 * The subscription worker inspects every resource change,
 * and executes FHIR Subscription resources for those changes.
 *
 * The common case is to perform an outbound HTTP request to a webhook.
 * But Subscriptions can include email and SMS notifications.
 */

export interface SubscriptionJobData {
    readonly subscriptionId: string;
    readonly resourceType: ResourceType;
    readonly channelType?: Subscription['channel']['type'];
    readonly id: string;
    readonly versionId: string;
    readonly interaction: 'create' | 'update' | 'delete';
    readonly requestTime: string;
    readonly requestId?: string;
    readonly traceId?: string;
    readonly verbose?: boolean;
  }

  // TODO: USE nuxt-queue to handle this
  const jobName = 'SubscriptionJobData';
  let queue: Queue<SubscriptionJobData> | undefined = undefined;

/**
 * Determines if the resource matches the subscription criteria.
 * @param resource - The resource that was created or updated.
 * @param subscription - The subscription.
 * @param context - Background job context.
 * @returns True if the resource matches the subscription criteria.
 */
async function matchesCriteria(
    resource: Resource,
    subscription: Subscription,
    context: BackgroundJobContext
  ): Promise<boolean> {
    const ctx = getRequestContext();
    return resourceMatchesSubscriptionCriteria({
      resource,
      subscription,
      context,
      logger: ctx.logger,
      getPreviousResource: getPreviousResource,
    });
  }

  /**
 * Checks if this resource should create a notification for this `Subscription` based on the access policy that should be applied for this `Subscription`.
 * The `AccessPolicy` of author's `ProjectMembership` for this resource's `Project` is used when evaluating whether the `AccessPolicy` is satisfied.
 *
 * Currently we log if the `AccessPolicy` is not satisfied only.
 *
 * TODO: Actually prevent notifications for `Subscriptions` where the `AccessPolicy` is not satisfied (for rest-hook subscriptions)
 *
 * @param resource - The resource to evaluate against the `AccessPolicy`.
 * @param project - The project containing the resource.
 * @param subscription - The `Subscription` to get the `AccessPolicy` for.
 * @returns True if access policy is satisfied for this Subscription notification, otherwise returns false
 */
async function satisfiesAccessPolicy(
    resource: Resource,
    project: Project,
    subscription: Subscription
  ): Promise<boolean> {
    let satisfied = true;
    try {
      // We can assert author because any time a resource is updated, the author will be set to the previous author or if it doesn't exist
      // The current Repository author, which must exist for Repository to successfully construct
      const subAuthor = subscription.meta?.author as Reference;
      const membership = await findProjectMembership(project.id as string, subAuthor);
      if (membership) {
        const accessPolicy = await buildAccessPolicy(membership);
        satisfied = !!satisfiedAccessPolicy(resource, AccessPolicyInteraction.READ, accessPolicy);
        if (!satisfied && subscription.channel.type !== 'websocket') {
          const resourceReference = getReferenceString(resource);
          const subReference = getReferenceString(subscription);
          const projectReference = getReferenceString(project);
          globalLogger.warn(
            `[Subscription Access Policy]: Access Policy not satisfied on '${resourceReference}' for '${subReference}'`,
            { subscription: subReference, project: projectReference, accessPolicy }
          );
        }
      } else {
        const projectReference = getReferenceString(project);
        const authorReference = getReferenceString(subAuthor);
        const subReference = getReferenceString(subscription);
        globalLogger.warn(
          `[Subscription Access Policy]: No membership for subscription author '${authorReference}' in project '${projectReference}'`,
          { subscription: subReference, project: projectReference }
        );
        satisfied = false;
      }
    } catch (err: unknown) {
      const projectReference = getReferenceString(project);
      const resourceReference = getReferenceString(resource);
      const subReference = getReferenceString(subscription);
      globalLogger.warn(
        `[Subscription Access Policy]: Error occurred while checking access policy for resource '${resourceReference}' against '${subReference}'`,
        { subscription: subReference, project: projectReference, error: err }
      );
      satisfied = false;
    }
    // Always return true if channelType !== websocket for now
    return subscription.channel.type === 'websocket' ? satisfied : true;
  }

/**
 * Loads the list of all subscriptions in this repository.
 * @param resource - The resource that was created or updated.
 * @param project - The project that contains this resource.
 * @returns The list of all subscriptions in this repository.
 */
async function getSubscriptions(resource: Resource, project: Project): Promise<Subscription[]> {
    const projectId = project.id as string;
    const systemRepo = getSystemRepo();
    const subscriptions = await systemRepo.searchResources<Subscription>({
      resourceType: 'Subscription',
      count: 1000,
      filters: [
        {
          code: '_project',
          operator: Operator.EQUALS,
          value: projectId,
        },
        {
          code: 'status',
          operator: Operator.EQUALS,
          value: 'active',
        },
      ],
    });
    const redisOnlySubRefStrs = await getRedis().smembers(`medplum:subscriptions:r4:project:${projectId}:active`);
    if (redisOnlySubRefStrs.length) {
      const redisOnlySubStrs = await getRedis().mget(redisOnlySubRefStrs);
      if (project.features?.includes('websocket-subscriptions')) {
        const subArrStr = '[' + redisOnlySubStrs.filter(Boolean).join(',') + ']';
        const inMemorySubs = JSON.parse(subArrStr) as { resource: Subscription; projectId: string }[];
        for (const { resource } of inMemorySubs) {
          subscriptions.push(resource);
        }
      } else {
        globalLogger.warn(
          `[WebSocket Subscriptions]: subscription for resource '${getReferenceString(resource)}' might have been fired but WebSocket subscriptions are not enabled for project '${project.name ?? getReferenceString(project)}'`
        );
      }
    }
    return subscriptions;
  }

  /**
 * Adds a subscription job to the queue.
 * @param job - The subscription job details.
 */
async function addSubscriptionJobData(job: SubscriptionJobData): Promise<void> {
    if (queue) {
      await queue.add(jobName, job);
    }
  }

/**
 * Adds all subscription jobs for a given resource.
 *
 * There are a few important structural considerations:
 * 1) One resource change can spawn multiple subscription jobs.
 * 2) Subscription jobs can fail, and must be retried independently.
 * 3) Subscriptions should be evaluated at the time of the resource change.
 *
 * So, when a resource changes (create, update, or delete), we evaluate all subscriptions
 * at that moment in time.  For each matching subscription, we enqueue the job.
 * The only purpose of the job is to make the outbound HTTP request,
 * not to re-evaluate the subscription.
 * @param resource - The resource that was created or updated.
 * @param context - The background job context.
 * @param verbose - If true, log verbose output.
 */
export async function addSubscriptionJobs(
    resource: Resource,
    context: BackgroundJobContext,
    verbose = false
  ): Promise<void> {
    if (resource.resourceType === 'AuditEvent') {
      // Never send subscriptions for audit events
      return;
    }
  
    const ctx = tryGetRequestContext();
    const logger = getLogger();
    const logFn = verbose ? logger.info : logger.debug;
    const systemRepo = getSystemRepo();
    let project: Project | undefined;
    try {
      const projectId = resource.meta?.project;
      if (projectId) {
        project = await systemRepo.readResource<Project>('Project', projectId);
      }
    } catch (err: unknown) {
      const resourceReference = getReferenceString(resource);
      globalLogger.error(`[Subscription]: No project found for '${resourceReference}' -- something is very wrong.`, {
        error: err,
        resource: resourceReference,
      });
      return;
    }
    if (!project) {
      return;
    }
  
    const requestTime = new Date().toISOString();
    const subscriptions = await getSubscriptions(resource, project);
    logFn(`Evaluate ${subscriptions.length} subscription(s)`);
  
    const wsEvents = [] as [Resource, string, SubEventsOptions][];
  
    for (const subscription of subscriptions) {
      const criteria = await matchesCriteria(resource, subscription, context);
      logFn(`Subscription matchesCriteria(${resource.id}, ${subscription.id}) = ${criteria}`);
      if (criteria) {
        if (!(await satisfiesAccessPolicy(resource, project, subscription))) {
          logFn(`Subscription satisfiesAccessPolicy(${resource.id}) = false`);
          continue;
        }
        if (subscription.channel.type === 'websocket') {
          wsEvents.push([resource, subscription.id as string, { includeResource: true }]);
          continue;
        }
        await addSubscriptionJobData({
          subscriptionId: subscription.id as string,
          resourceType: resource.resourceType,
          channelType: subscription.channel.type,
          id: resource.id as string,
          versionId: resource.meta?.versionId as string,
          interaction: context.interaction,
          requestTime,
          requestId: ctx?.requestId,
          traceId: ctx?.traceId,
          verbose,
        });
      }
    }
  
    if (wsEvents.length) {
      await getRedis().publish('medplum:subscriptions:r4:websockets', JSON.stringify(wsEvents));
    }
  }