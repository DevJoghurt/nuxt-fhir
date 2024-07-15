import { getStatus, isAccepted } from '@medplum/core';
import { OperationOutcome } from '@medplum/fhirtypes';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { Result, ValidationError } from 'express-validator';
import { buildTracingExtension } from '../../utils/context';
import type { H3Event, EventHandlerRequest } from 'h3';
import { setResponseHeader, setResponseStatus, send } from 'h3'

export function invalidRequest(errors: Result<ValidationError>): OperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    id: randomUUID(),
    issue: errors.array().map((error) => ({
      severity: 'error',
      code: 'invalid',
      expression: getValidationErrorExpression(error),
      details: { text: error.msg },
    })),
  };
}

function getValidationErrorExpression(error: ValidationError): string[] | undefined {
  // ValidationError can be AlternativeValidationError | GroupedAlternativeValidationError | UnknownFieldsError | FieldValidationError
  if (error.type === 'field') {
    return [error.path];
  }
  return undefined;
}

export function sendOutcome(event: H3Event<EventHandlerRequest>, outcome: OperationOutcome) {

  if (isAccepted(outcome) && outcome.issue?.[0].diagnostics) {
    setResponseHeader(event, "content-location", outcome.issue[0].diagnostics);
  }
  
  setResponseStatus(event, getStatus(outcome))

  return send(event, JSON.stringify({
    ...outcome,
    extension: buildTracingExtension()
  } as OperationOutcome))
}