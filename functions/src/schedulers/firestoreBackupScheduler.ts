/**
 * BlueSystem Delivery Enterprise — Firestore Automated Backup Scheduler & Admin Engine
 * Protocol: BSD-PRESTORE-PHASE-8.1-BUSINESS-CONTINUITY-RECOVERY-REMEDIATION-001
 * Package A: Firestore Recovery Foundation & Package B: Recovery Sandbox
 *
 * Tarea programada diaria a la 01:00 AM (America/Managua) para exportar de forma
 * automatizada todas las colecciones de Firestore hacia el bucket seguro de backup
 * con retención de 30 días y nomenclatura canónica estructurada.
 *
 * Provee además callable administrativo seguro para disparar respaldos on-demand (DR Drills).
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

export const DEFAULT_BACKUP_BUCKET = "bluesystem-7c9af-backups-prod";
export const BACKUP_RETENTION_DAYS = 30;

/**
 * Genera la ruta canónica de almacenamiento para la exportación.
 * Estructura: exports/YYYY/MM/DD/export_YYYYMMDD_HHMMSS
 */
export function generateCanonicalBackupPath(bucketName: string, date: Date = new Date()): { fullUri: string; relativePath: string; backupId: string } {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  const backupId = `bkp_${timestamp}`;
  const relativePath = `exports/${year}/${month}/${day}/export_${timestamp}`;
  const fullUri = `gs://${bucketName}/${relativePath}`;

  return { fullUri, relativePath, backupId };
}

/**
 * Invoca la API REST oficial de Google Cloud Firestore para iniciar la exportación de colecciones.
 */
export async function executeFirestoreExport(options: {
  targetBucket?: string;
  collections?: string[];
  triggerSource: "SCHEDULER" | "MANUAL_CALLABLE" | "DR_DRILL";
  callerUid?: string;
}): Promise<{
  success: boolean;
  backupId: string;
  outputUriPrefix: string;
  operationName: string;
  durationMs: number;
}> {
  const startTime = Date.now();
  const bucketName = options.targetBucket || process.env.FIRESTORE_BACKUP_BUCKET || DEFAULT_BACKUP_BUCKET;
  const { fullUri, relativePath, backupId } = generateCanonicalBackupPath(bucketName);

  Logger.info(`[DR-BACKUP] Iniciando exportación automatizada de Firestore a ${fullUri}`, {
    module: "FirestoreBackupScheduler",
    backupId,
    triggerSource: options.triggerSource,
  });

  try {
    const auth = new GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/datastore",
        "https://www.googleapis.com/auth/cloud-platform",
      ],
    });

    const client = await auth.getClient();
    const projectId = await auth.getProjectId().catch(() => process.env.GCLOUD_PROJECT || "bluesystem-7c9af");

    const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`;

    const requestBody: any = {
      outputUriPrefix: fullUri,
    };

    if (options.collections && options.collections.length > 0) {
      requestBody.collectionIds = options.collections;
    }

    const response: any = await client.request({
      url: endpoint,
      method: "POST",
      data: requestBody,
    });

    const operationName = response?.data?.name || "projects/" + projectId + "/databases/(default)/operations/" + backupId;
    const durationMs = Date.now() - startTime;

    // Registrar metadatos de auditoría y salud del backup
    await getDb().collection("system_health").doc("firestore_backups").collection("runs").doc(backupId).set({
      backupId,
      outputUriPrefix: fullUri,
      relativePath,
      bucketName,
      operationName,
      triggerSource: options.triggerSource,
      callerUid: options.callerUid || "SYSTEM",
      status: "INITIATED",
      retentionDays: BACKUP_RETENTION_DAYS,
      pitrWindowDays: 7,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      durationMs,
    });

    // Registrar evento inmutable en el ledger de auditoría
    await getDb().collection("audit_events").add({
      eventType: "FIRESTORE_EXPORT_INITIATED",
      category: "DISASTER_RECOVERY",
      backupId,
      outputUriPrefix: fullUri,
      operationName,
      triggerSource: options.triggerSource,
      actorUid: options.callerUid || "SYSTEM",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    Logger.info(`[DR-BACKUP] Operación de exportación iniciada exitosamente (${operationName}) en ${durationMs}ms`, {
      module: "FirestoreBackupScheduler",
      backupId,
      durationMs,
    });

    return {
      success: true,
      backupId,
      outputUriPrefix: fullUri,
      operationName,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    Logger.error("[DR-BACKUP] Error crítico al ejecutar exportación de Firestore", error, {
      module: "FirestoreBackupScheduler",
      backupId,
      durationMs,
    });

    // Registrar fallo en auditoría para alertamiento inmediato
    await getDb().collection("audit_events").add({
      eventType: "FIRESTORE_EXPORT_FAILED",
      category: "DISASTER_RECOVERY",
      backupId,
      error: error.message || String(error),
      triggerSource: options.triggerSource,
      actorUid: options.callerUid || "SYSTEM",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => null);

    throw error;
  }
}

/**
 * Cloud Scheduler diario (01:00 AM America/Managua).
 */
export const firestoreBackupScheduler = functions.pubsub
  .schedule("0 1 * * *")
  .timeZone("America/Managua")
  .onRun(async (context) => {
    Logger.info("[DR-BACKUP] Ejecución automática diaria del scheduler de respaldos", {
      module: "FirestoreBackupScheduler",
      timestamp: context.timestamp,
    });

    try {
      await executeFirestoreExport({
        triggerSource: "SCHEDULER",
      });
    } catch (err: any) {
      Logger.error("[DR-BACKUP] Falló la ejecución programada diaria de backup", err);
    }
  });

/**
 * Endpoint Callable Seguro para que administradores o drills de DR puedan disparar respaldos bajo demanda.
 */
export const adminTriggerFirestoreBackup = functions.https.onCall(async (data, context) => {
  const authContext = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: true,
      allowedRoles: ["SUPER_ADMIN", "ADMIN", "AUDITOR", "super_admin", "admin", "auditor"],
    },
    "adminTriggerFirestoreBackup"
  );

  const customBucket = data?.targetBucket ? String(data.targetBucket).trim() : undefined;
  const isDrill = Boolean(data?.isDrill);

  Logger.audit(
    "ADMIN_TRIGGERED_BACKUP",
    authContext.uid,
    {
      role: authContext.role,
      customBucket,
      isDrill,
    },
    { module: "adminTriggerFirestoreBackup" }
  );

  return await executeFirestoreExport({
    targetBucket: customBucket,
    triggerSource: isDrill ? "DR_DRILL" : "MANUAL_CALLABLE",
    callerUid: authContext.uid,
  });
});
