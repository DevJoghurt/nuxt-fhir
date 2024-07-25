import { createMedplumHandler } from '#imports';
import { allOk, isOk, OperationOutcomeError } from '@medplum/core';
import { FhirRequest, FhirRouter, HttpMethod, RepositoryMode } from '@medplum/fhir-router';
import { ResourceType } from '@medplum/fhirtypes';
import { getConfig } from '../../medplum/config';
import { Request, Response } from 'express';
import { asyncWrap } from '../../medplum/async';
import { getAuthenticatedContext } from '../../medplum/context';
import { recordHistogramValue } from '../../medplum/otel/otel';
import { agentBulkStatusHandler } from '../../medplum/fhir/operations/agentbulkstatus';
import { agentReloadConfigHandler } from '../../medplum/fhir/operations/agentreloadconfig';
import { agentStatusHandler } from '../../medplum/fhir/operations/agentstatus';
import { agentUpgradeHandler } from '../../medplum/fhir/operations/agentupgrade';
import { codeSystemImportHandler } from '../../medplum/fhir/operations/codesystemimport';
import { codeSystemLookupHandler } from '../../medplum/fhir/operations/codesystemlookup';
import { codeSystemValidateCodeHandler } from '../../medplum/fhir/operations/codesystemvalidatecode';
import { conceptMapTranslateHandler } from '../../medplum/fhir/operations/conceptmaptranslate';
import { dbStatsHandler } from '../../medplum/fhir/operations/dbstats';
import { deployHandler } from '../../medplum/fhir/operations/deploy';
import { evaluateMeasureHandler } from '../../medplum/fhir/operations/evaluatemeasure';
import { expandOperator } from '../../medplum/fhir/operations/expand';
import { bulkExportHandler, patientExportHandler } from '../../medplum/fhir/operations/export';
import { expungeHandler } from '../../medplum/fhir/operations/expunge';
import { getWsBindingTokenHandler } from '../../medplum/fhir/operations/getwsbindingtoken';
import { groupExportHandler } from '../../medplum/fhir/operations/groupexport';
import { patientEverythingHandler } from '../../medplum/fhir/operations/patienteverything';
import { planDefinitionApplyHandler } from '../../medplum/fhir/operations/plandefinitionapply';
import { projectCloneHandler } from '../../medplum/fhir/operations/projectclone';
import { projectInitHandler } from '../../medplum/fhir/operations/projectinit';
import { resourceGraphHandler } from '../../medplum/fhir/operations/resourcegraph';
import { structureDefinitionExpandProfileHandler } from '../../medplum/fhir/operations/structuredefinitionexpandprofile';
import { codeSystemSubsumesOperation } from '../../medplum/fhir/operations/subsumes';
import { valueSetValidateOperation } from '../../medplum/fhir/operations/valuesetvalidatecode';
import { sendResponse } from '../../medplum/fhir/response';
import { sendOutcome } from '../../medplum/fhir/outcomes';


let internalFhirRouter: FhirRouter;

/**
 * Returns the internal FHIR router.
 * This function will be executed on every request.
 * @returns The lazy initialized internal FHIR router.
 */
function getInternalFhirRouter(): FhirRouter {
    if (!internalFhirRouter) {
      internalFhirRouter = initInternalFhirRouter();
    }
    return internalFhirRouter;
}

  
  /**
 * Returns a new FHIR router.
 * This function should only be called once on the first request.
 * @returns A new FHIR router with all the internal operations.
 */
function initInternalFhirRouter(): FhirRouter {
    const router = new FhirRouter({ introspectionEnabled: getConfig().introspectionEnabled });
  
    // Project $export
    router.add('GET', '/$export', bulkExportHandler);
    router.add('POST', '/$export', bulkExportHandler);
  
    // Project $clone
    router.add('POST', '/Project/:id/$clone', projectCloneHandler);
  
    // Project $init
    router.add('POST', '/Project/$init', projectInitHandler);
  
    // ConceptMap $translate
    router.add('POST', '/ConceptMap/$translate', conceptMapTranslateHandler);
    router.add('POST', '/ConceptMap/:id/$translate', conceptMapTranslateHandler);
  
    // ValueSet $expand operation
    router.add('GET', '/ValueSet/$expand', expandOperator);
    router.add('POST', '/ValueSet/$expand', expandOperator);
  
    // CodeSystem $import operation
    router.add('POST', '/CodeSystem/$import', codeSystemImportHandler);
    router.add('POST', '/CodeSystem/:id/$import', codeSystemImportHandler);
  
    // CodeSystem $lookup operation
    router.add('GET', '/CodeSystem/$lookup', codeSystemLookupHandler);
    router.add('POST', '/CodeSystem/$lookup', codeSystemLookupHandler);
    router.add('GET', '/CodeSystem/:id/$lookup', codeSystemLookupHandler);
    router.add('POST', '/CodeSystem/:id/$lookup', codeSystemLookupHandler);
  
    // CodeSystem $validate-code operation
    router.add('GET', '/CodeSystem/$validate-code', codeSystemValidateCodeHandler);
    router.add('POST', '/CodeSystem/$validate-code', codeSystemValidateCodeHandler);
    router.add('GET', '/CodeSystem/:id/$validate-code', codeSystemValidateCodeHandler);
    router.add('POST', '/CodeSystem/:id/$validate-code', codeSystemValidateCodeHandler);
  
    // CodeSystem $subsumes operation
    router.add('GET', '/CodeSystem/$subsumes', codeSystemSubsumesOperation);
    router.add('POST', '/CodeSystem/$subsumes', codeSystemSubsumesOperation);
    router.add('GET', '/CodeSystem/:id/$subsumes', codeSystemSubsumesOperation);
    router.add('POST', '/CodeSystem/:id/$subsumes', codeSystemSubsumesOperation);
  
    // ValueSet $validate-code operation
    router.add('GET', '/ValueSet/$validate-code', valueSetValidateOperation);
    router.add('POST', '/ValueSet/$validate-code', valueSetValidateOperation);
    router.add('GET', '/ValueSet/:id/$validate-code', valueSetValidateOperation);
    router.add('POST', '/ValueSet/:id/$validate-code', valueSetValidateOperation);
  
    // Agent $status operation
    router.add('GET', '/Agent/$status', agentStatusHandler);
    router.add('GET', '/Agent/:id/$status', agentStatusHandler);
  
    // Agent $bulk-status operation
    router.add('GET', '/Agent/$bulk-status', agentBulkStatusHandler);
  
    // Agent $reload-config operation
    router.add('GET', '/Agent/$reload-config', agentReloadConfigHandler);
    router.add('GET', '/Agent/:id/$reload-config', agentReloadConfigHandler);
  
    // Agent $upgrade operation
    router.add('GET', '/Agent/$upgrade', agentUpgradeHandler);
    router.add('GET', '/Agent/:id/$upgrade', agentUpgradeHandler);
  
    // Bot $deploy operation
    router.add('POST', '/Bot/:id/$deploy', deployHandler);
  
    // Group $export operation
    router.add('GET', '/Group/:id/$export', groupExportHandler);
  
    // Patient $export operation
    router.add('GET', '/Patient/$export', patientExportHandler);
  
    // Measure $evaluate-measure operation
    router.add('POST', '/Measure/:id/$evaluate-measure', evaluateMeasureHandler);
  
    // PlanDefinition $apply operation
    router.add('POST', '/PlanDefinition/:id/$apply', planDefinitionApplyHandler);
  
    // Resource $graph operation
    router.add('GET', '/:resourceType/:id/$graph', resourceGraphHandler);
  
    // Patient $everything operation
    router.add('GET', '/Patient/:id/$everything', patientEverythingHandler);
  
    // $expunge operation
    router.add('POST', '/:resourceType/:id/$expunge', expungeHandler);
  
    // $get-ws-binding-token operation
    router.add('GET', '/Subscription/:id/$get-ws-binding-token', getWsBindingTokenHandler);
  
    // StructureDefinition $expand-profile operation
    router.add('POST', '/StructureDefinition/$expand-profile', structureDefinitionExpandProfileHandler);
  
    // AWS operations
    //router.add('POST', '/:resourceType/:id/$aws-textract', awsTextractHandler);
  
    // Validate create resource
    router.add('POST', '/:resourceType/$validate', async (req: FhirRequest) => {
      const ctx = getAuthenticatedContext();
      await ctx.repo.validateResource(req.body);
      return [allOk];
    });
  
    // Reindex resource
    router.add('POST', '/:resourceType/:id/$reindex', async (req: FhirRequest) => {
      const ctx = getAuthenticatedContext();
      const { resourceType, id } = req.params as { resourceType: ResourceType; id: string };
      await ctx.repo.reindexResource(resourceType, id);
      return [allOk];
    });
  
    // Resend subscriptions
    router.add('POST', '/:resourceType/:id/$resend', async (req: FhirRequest) => {
      const ctx = getAuthenticatedContext();
      const { resourceType, id } = req.params as { resourceType: ResourceType; id: string };
      await ctx.repo.resendSubscriptions(resourceType, id);
      return [allOk];
    });
  
    // Super admin operations
    router.add('POST', '/$db-stats', dbStatsHandler);
  
    router.addEventListener('warn', (e: any) => {
      const ctx = getAuthenticatedContext();
      ctx.logger.warn(e.message, { ...e.data, project: ctx.project.id });
    });
  
    router.addEventListener('batch', ({ count, errors, size, bundleType }: any) => {
      const ctx = getAuthenticatedContext();
      const projectId = ctx.project.id;
  
      const batchMetricOptions = { attributes: { bundleType, projectId } };
      recordHistogramValue('medplum.batch.entries', count, batchMetricOptions);
      recordHistogramValue('medplum.batch.errors', errors, batchMetricOptions);
      recordHistogramValue('medplum.batch.size', size, batchMetricOptions);
  
      if (errors > 0 && bundleType === 'transaction') {
        ctx.logger.warn('Error processing transaction Bundle', { count, errors, size, project: projectId });
      }
    });
  
    return router;
}

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const ctx = getAuthenticatedContext();

    const request: FhirRequest = {
      method: req.method as HttpMethod,
      pathname: req.originalUrl.replace('/fhir/R4', '').split('?').shift() as string,
      params: req.params,
      query: req.query as Record<string, string>,
      body: req.body,
      headers: req.headers,
    };


    if (request.pathname.includes('$graphql')) {
      // If this is a GraphQL request, mark the repository as eligible for "reader" mode.
      // Inside the GraphQL handler, the repository will be set to "writer" mode if needed.
      // At the time of this writing, the GraphQL handler is the only place where we consider "reader" mode.
      ctx.repo.setMode(RepositoryMode.READER);
    }

    const result = await getInternalFhirRouter().handleRequest(request, ctx.repo);
    if (result.length === 1) {
      if (!isOk(result[0])) {
        throw new OperationOutcomeError(result[0]);
      }
      sendOutcome(res, result[0]);
    } else {
      await sendResponse(req, res, result[0], result[1]);
    }
  }))