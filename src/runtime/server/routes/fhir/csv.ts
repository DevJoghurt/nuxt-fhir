import { createMedplumHandler } from '#imports';
import { csvHandler } from '../../medplum/fhir/operations/csv';
import { asyncWrap } from '../../medplum/async';

export default createMedplumHandler(asyncWrap(csvHandler))