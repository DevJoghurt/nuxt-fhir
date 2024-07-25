import { createMedplumHandler } from '#imports';
import { asyncWrap } from '../../../medplum/async';
import { requireSuperAdmin, requireAsync } from './utils';
import { Request, Response } from 'express';
import { DatabaseMode, getDatabasePool } from '../../../medplum/database';
import { sendAsyncResponse } from '../../../medplum/fhir/operations/utils/asyncjobexecutor';
import * as dataMigrations from '../../../migrations/data';
import { getSystemRepo } from '../../../medplum/fhir/repo';

export default createMedplumHandler(asyncWrap(async (req: Request, res: Response) => {
  const ctx = requireSuperAdmin();
  requireAsync(req);

  await sendAsyncResponse(req, res, async () => {
    const systemRepo = getSystemRepo();
    const client = getDatabasePool(DatabaseMode.WRITER);
    const result = await client.query('SELECT "dataVersion" FROM "DatabaseMigration"');
    const version = result.rows[0]?.dataVersion as number;
    const migrationKeys = Object.keys(dataMigrations);
    for (let i = version + 1; i <= migrationKeys.length; i++) {
      const migration = (dataMigrations as Record<string, dataMigrations.Migration>)['v' + i];
      const start = Date.now();
      await migration.run(systemRepo);
      ctx.logger.info('Data migration', { version: `v${i}`, duration: `${Date.now() - start} ms` });
      await client.query('UPDATE "DatabaseMigration" SET "dataVersion"=$1', [i]);
    }
  });
}))