import { 
  Operator, 
  createReference,
  isResource
} from '@medplum/core';
import {
    Resource,
    Reference,
    Coding,
    ProjectMembership,
    AuditEventEntity,
  } from '@medplum/fhirtypes';
import { getSystemRepo } from '../fhir/repo';

export async function getPreviousResource(currentResource: Resource): Promise<Resource | undefined> {
    const systemRepo = getSystemRepo();
    const history = await systemRepo.readHistory(currentResource.resourceType, currentResource?.id as string);
  
    return history.entry?.find((_, idx) => {
      if (idx === 0) {
        return false;
      }
  
      return history.entry?.[idx - 1]?.resource?.meta?.versionId === currentResource.meta?.versionId;
    })?.resource;
}

export function findProjectMembership(project: string, profile: Reference): Promise<ProjectMembership | undefined> {
    const systemRepo = getSystemRepo();
    return systemRepo.searchOne<ProjectMembership>({
      resourceType: 'ProjectMembership',
      filters: [
        {
          code: 'project',
          operator: Operator.EQUALS,
          value: `Project/${project}`,
        },
        {
          code: 'profile',
          operator: Operator.EQUALS,
          value: profile.reference as string,
        },
      ],
    });
  }

  export function getAuditEventEntityRole(resource: Resource): Coding {
    switch (resource.resourceType) {
      case 'Patient':
        return { code: '1', display: 'Patient' };
      case 'Subscription':
        return { code: '9', display: 'Subscriber' };
      default:
        return { code: '4', display: 'Domain' };
    }
  }

  export function createAuditEventEntity(resource: Resource): AuditEventEntity {
    return {
      what: createReference(resource),
      role: getAuditEventEntityRole(resource),
    };
  }

  export function createAuditEventEntities(...resources: Resource[]): AuditEventEntity[] {
    return resources.filter(isResource).map(createAuditEventEntity);
  }