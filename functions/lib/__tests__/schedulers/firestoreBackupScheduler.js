"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminTriggerFirestoreBackup = exports.firestoreBackupScheduler = exports.BACKUP_RETENTION_DAYS = exports.DEFAULT_BACKUP_BUCKET = void 0;
exports.generateCanonicalBackupPath = generateCanonicalBackupPath;
exports.executeFirestoreExport = executeFirestoreExport;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const google_auth_library_1 = require("google-auth-library");
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
function getDb() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin.firestore();
}
exports.DEFAULT_BACKUP_BUCKET = "bluesystem-7c9af-backups-prod";
exports.BACKUP_RETENTION_DAYS = 30;
/**
 * Genera la ruta canónica de almacenamiento para la exportación.
 * Estructura: exports/YYYY/MM/DD/export_YYYYMMDD_HHMMSS
 */
function generateCanonicalBackupPath(bucketName, date = new Date()) {
    const pad = (n) => n.toString().padStart(2, "0");
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
async function executeFirestoreExport(options) {
    const startTime = Date.now();
    const bucketName = options.targetBucket || process.env.FIRESTORE_BACKUP_BUCKET || exports.DEFAULT_BACKUP_BUCKET;
    const { fullUri, relativePath, backupId } = generateCanonicalBackupPath(bucketName);
    logger_1.Logger.info(`[DR-BACKUP] Iniciando exportación automatizada de Firestore a ${fullUri}`, {
        module: "FirestoreBackupScheduler",
        backupId,
        triggerSource: options.triggerSource,
    });
    try {
        const auth = new google_auth_library_1.GoogleAuth({
            scopes: [
                "https://www.googleapis.com/auth/datastore",
                "https://www.googleapis.com/auth/cloud-platform",
            ],
        });
        const client = await auth.getClient();
        const projectId = await auth.getProjectId().catch(() => process.env.GCLOUD_PROJECT || "bluesystem-7c9af");
        const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`;
        const requestBody = {
            outputUriPrefix: fullUri,
        };
        if (options.collections && options.collections.length > 0) {
            requestBody.collectionIds = options.collections;
        }
        const response = await client.request({
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
            retentionDays: exports.BACKUP_RETENTION_DAYS,
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
        logger_1.Logger.info(`[DR-BACKUP] Operación de exportación iniciada exitosamente (${operationName}) en ${durationMs}ms`, {
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
    }
    catch (error) {
        const durationMs = Date.now() - startTime;
        logger_1.Logger.error("[DR-BACKUP] Error crítico al ejecutar exportación de Firestore", error, {
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
exports.firestoreBackupScheduler = functions.pubsub
    .schedule("0 1 * * *")
    .timeZone("America/Managua")
    .onRun(async (context) => {
    logger_1.Logger.info("[DR-BACKUP] Ejecución automática diaria del scheduler de respaldos", {
        module: "FirestoreBackupScheduler",
        timestamp: context.timestamp,
    });
    try {
        await executeFirestoreExport({
            triggerSource: "SCHEDULER",
        });
    }
    catch (err) {
        logger_1.Logger.error("[DR-BACKUP] Falló la ejecución programada diaria de backup", err);
    }
});
/**
 * Endpoint Callable Seguro para que administradores o drills de DR puedan disparar respaldos bajo demanda.
 */
exports.adminTriggerFirestoreBackup = functions.https.onCall(async (data, context) => {
    const authContext = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["SUPER_ADMIN", "ADMIN", "AUDITOR", "super_admin", "admin", "auditor"],
    }, "adminTriggerFirestoreBackup");
    const customBucket = data?.targetBucket ? String(data.targetBucket).trim() : undefined;
    const isDrill = Boolean(data?.isDrill);
    logger_1.Logger.audit("ADMIN_TRIGGERED_BACKUP", authContext.uid, {
        role: authContext.role,
        customBucket,
        isDrill,
    }, { module: "adminTriggerFirestoreBackup" });
    return await executeFirestoreExport({
        targetBucket: customBucket,
        triggerSource: isDrill ? "DR_DRILL" : "MANUAL_CALLABLE",
        callerUid: authContext.uid,
    });
});
