import { createMedplumHandler } from '#imports';
import { badRequest } from '@medplum/core';
import { OperationOutcome, Project } from '@medplum/fhirtypes';
import { asyncWrap } from '../../medplum/async';
import { newUserHandler, newUserValidator } from '../../medplum/auth/newuser';
import { validateRecaptcha } from '../../medplum/auth/utils';


function projectRegistrationAllowed(project: Project): OperationOutcome | undefined {
    if (!project.defaultPatientAccessPolicy) {
      return badRequest('Project does not allow open registration');
    }
    return undefined;
  }
  

export default createMedplumHandler(asyncWrap(newUserHandler),{
    auth: false,
    validation: [
        newUserValidator,
        validateRecaptcha(projectRegistrationAllowed)
    ]
})