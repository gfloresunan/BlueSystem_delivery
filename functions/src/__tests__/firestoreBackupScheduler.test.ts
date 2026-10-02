import { describe, it } from "node:test";
import assert from "node:assert";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "bluesystem-7c9af-test" });
}

import {
  generateCanonicalBackupPath,
  DEFAULT_BACKUP_BUCKET,
  BACKUP_RETENTION_DAYS,
} from "../schedulers/firestoreBackupScheduler";

describe("Phase 8.1 — Firestore Disaster Recovery Foundation Tests", () => {
  it("TC-DR-01: Genera ruta canónica con estructura de fecha y bucket por defecto", () => {
    const fixedDate = new Date("2026-10-02T08:30:15Z");
    const result = generateCanonicalBackupPath(DEFAULT_BACKUP_BUCKET, fixedDate);

    assert.strictEqual(
      result.fullUri,
      "gs://bluesystem-7c9af-backups-prod/exports/2026/10/02/export_20261002_083015",
      "La URI completa de GCS debe coincidir con la convención canónica"
    );
    assert.strictEqual(
      result.relativePath,
      "exports/2026/10/02/export_20261002_083015",
      "La ruta relativa debe estructurarse año/mes/día"
    );
    assert.strictEqual(
      result.backupId,
      "bkp_20261002_083015",
      "El backupId debe ser determinista con timestamp UTC"
    );
  });

  it("TC-DR-02: Parámetros de gobernanza cumplen retención de 30 días", () => {
    assert.strictEqual(BACKUP_RETENTION_DAYS, 30, "La política de retención obligatoria es de 30 días");
    assert.strictEqual(DEFAULT_BACKUP_BUCKET, "bluesystem-7c9af-backups-prod", "El bucket dedicado canónico debe coincidir");
  });

  it("TC-DR-03: Soporta buckets dedicados de staging o recuperación aislada", () => {
    const fixedDate = new Date("2026-10-02T12:00:00Z");
    const stagingBucket = "bluesystem-7c9af-staging-backups";
    const result = generateCanonicalBackupPath(stagingBucket, fixedDate);

    assert.strictEqual(
      result.fullUri,
      "gs://bluesystem-7c9af-staging-backups/exports/2026/10/02/export_20261002_120000"
    );
  });
});
