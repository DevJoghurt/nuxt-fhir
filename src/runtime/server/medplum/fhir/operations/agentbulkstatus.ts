import { FhirResponse } from '@medplum/fhir-router';
import { Agent, OperationDefinition } from '@medplum/fhirtypes';
import { agentStatusHandler } from './agentstatus';
import { handleBulkAgentOperation } from './utils/agentutils';
import type { H3Event, EventHandlerRequest } from 'h3';


export const operation: OperationDefinition = {
  resourceType: 'OperationDefinition',
  name: 'agent-bulk-status',
  status: 'active',
  kind: 'operation',
  code: 'bulk-status',
  experimental: true,
  resource: ['Agent'],
  system: false,
  type: true,
  instance: false,
  parameter: [{ use: 'out', name: 'return', type: 'Bundle', min: 1, max: '1' }],
};

/**
 * Handles HTTP requests for the Agent $status operation.
 * First reads the agent and makes sure it is valid and the user has access to it.
 * Then tries to get the agent status from Redis.
 * Returns the agent status details as a Parameters resource.
 *
 * Endpoint
 *   [fhir base]/Agent/$bulk-status
 *
 * @param event - The H3 event.
 * @returns The FHIR response.
 */
export async function agentBulkStatusHandler(event: H3Event<EventHandlerRequest>): Promise<FhirResponse> {
  return handleBulkAgentOperation(event, (agent: Agent) => {
    // Overwrite params
    event.context.params = Object.assign({
      id: agent.id as string
    },event.context.params)
    return agentStatusHandler(event)
  });
}
