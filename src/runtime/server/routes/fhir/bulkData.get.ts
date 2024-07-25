import { createMedplumHandler } from '#imports';
import { getAuthenticatedContext } from '../../medplum/context';
import { ContentType } from '@medplum/core';
import type { Request, Response } from 'express'
import { BulkDataExport } from '@medplum/fhirtypes';
import { asyncWrap } from '../../medplum/async';
import { rewriteAttachments, RewriteMode } from '../../medplum/fhir/rewrite';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
    const ctx = getAuthenticatedContext();
    const { id } = req.params;
    const bulkDataExport = await ctx.repo.readResource<BulkDataExport>('BulkDataExport', id);

    if (bulkDataExport.status !== 'completed') {
      res.status(202).end();
      return;
    }

    const json = await rewriteAttachments(RewriteMode.PRESIGNED_URL, ctx.repo, {
      transactionTime: bulkDataExport.transactionTime,
      request: bulkDataExport.request,
      requiresAccessToken: !!bulkDataExport.requiresAccessToken,
      output: bulkDataExport.output || [],
      error: bulkDataExport.error || [],
    });
    res.status(200).type(ContentType.JSON).json(json);
  }))