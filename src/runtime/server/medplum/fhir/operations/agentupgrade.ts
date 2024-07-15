import { AgentUpgradeResponse, OperationOutcomeError, badRequest, serverError } from '@medplum/core';
import { FhirResponse } from '@medplum/fhir-router';
import { Agent, OperationDefinition } from '@medplum/fhirtypes';
import { handleBulkAgentOperation, publishAgentRequest } from './utils/agentutils';
import { H3Event, EventHandlerRequest } from 'h3';
import { getQuery } from '#imports';

const DEFAULT_UPGRADE_TIMEOUT = 45000;
const MAX_UPGRADE_TIMEOUT = 56000;

export const operation: OperationDefinition = {
  resourceType: 'OperationDefinition',
  name: 'agent-upgrade',
  status: 'active',
  kind: 'operation',
  code: 'upgrade',
  experimental: true,
  resource: ['Agent'],
  system: false,
  type: true,
  instance: true,
  parameter: [
    { use: 'in', name: 'version', type: 'string', min: 0, max: '1' },
    { use: 'in', name: 'timeout', type: 'integer', min: 0, max: '1' },
    { use: 'out', name: 'return', type: 'Bundle', min: 1, max: '1' },
  ],
};

type AgentUpgradeHandlerQuery = {
  version: string | undefined;
  timeout: string | undefined;
}

/**
 * Handles HTTP requests for the Agent $upgrade operation.
 *
 * Endpoints:
 *   [fhir base]/Agent/$upgrade
 *   [fhir base]/Agent/[id]/$upgrade
 *
 * @param event - The H3 event.
 * @returns The FHIR response.
 */
export async function agentUpgradeHandler(event: H3Event<EventHandlerRequest>): Promise<FhirResponse> {

  const { version, timeout: _timeout } = getQuery<AgentUpgradeHandlerQuery>(event);

  let timeout: number | undefined;
  if (_timeout) {
    timeout = Number.parseInt(_timeout, 10);
    if (Number.isNaN(timeout)) {
      throw new OperationOutcomeError(
        badRequest("'timeout' must be an integer representing a duration in milliseconds, if defined")
      );
    }
  }

  return handleBulkAgentOperation(event, async (agent: Agent) => upgradeAgent(agent, { version, timeout }));
}

export type AgentUpgradeOptions = {
  version?: string;
  timeout?: number;
};

async function upgradeAgent(agent: Agent, options?: AgentUpgradeOptions): Promise<FhirResponse> {
  let timeout = options?.timeout ?? DEFAULT_UPGRADE_TIMEOUT;
  if (timeout > MAX_UPGRADE_TIMEOUT) {
    timeout = MAX_UPGRADE_TIMEOUT;
  }

  // Send agent message
  const [outcome, result] = await publishAgentRequest<AgentUpgradeResponse>(
    agent,
    { type: 'agent:upgrade:request', ...(options?.version ? { version: options.version } : undefined) },
    { waitForResponse: true, timeout }
  );

  if (!result || result.type === 'agent:upgrade:response') {
    return [outcome];
  }

  if (result.type === 'agent:error') {
    throw new OperationOutcomeError(badRequest(result.body));
  }

  throw new OperationOutcomeError(serverError(new Error('Invalid response received from agent')));
}
