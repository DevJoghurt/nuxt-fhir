import { createMedplumHandler } from '#imports'
import { Fhir } from 'fhir'
import { ParseConformance } from 'fhir/parseConformance'
import { SnapshotGenerator  } from 'fhir/snapshotGenerator'
import { readJson } from '@medplum/definitions'
import { sendResponse } from '../../medplum/fhir/response';
import { sendOutcome } from '../../medplum/fhir/outcomes';
import { allOk, isOk, OperationOutcomeError } from '@medplum/core';
import { asyncWrap } from '../../medplum/async';
import { Request, Response } from 'express';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const parser = new ParseConformance(false);
    const types = readJson('fhir/r4/profiles-types.json');
    const resources = readJson('fhir/r4/profiles-resources.json');
    const valueSets = readJson('fhir/r4/valuesets.json');
    parser.parseBundle(valueSets);
    parser.parseBundle(types);
    parser.parseBundle(resources);

    const fhir = new Fhir(parser);

    const resource = structuredClone(req.body);

    const bundle =  SnapshotGenerator.createBundle(resource);

    fhir.generateSnapshot(bundle);

    await sendResponse(req, res, allOk, resource);

}), {
    auth: true
})