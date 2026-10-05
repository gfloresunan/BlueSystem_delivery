"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp({ projectId: "bluesystem-7c9af-test" });
}
const firestoreBackupScheduler_1 = require("../schedulers/firestoreBackupScheduler");
(0, node_test_1.describe)("Phase 8.1 — Firestore Disaster Recovery Foundation Tests", () => {
    (0, node_test_1.it)("TC-DR-01: Genera ruta canónica con estructura de fecha y bucket por defecto", () => {
        const fixedDate = new Date("2026-10-02T08:30:15Z");
        const result = (0, firestoreBackupScheduler_1.generateCanonicalBackupPath)(firestoreBackupScheduler_1.DEFAULT_BACKUP_BUCKET, fixedDate);
        node_assert_1.default.strictEqual(result.fullUri, "gs://bluesystem-7c9af-backups-prod/exports/2026/10/02/export_20261002_083015", "La URI completa de GCS debe coincidir con la convención canónica");
        node_assert_1.default.strictEqual(result.relativePath, "exports/2026/10/02/export_20261002_083015", "La ruta relativa debe estructurarse año/mes/día");
        node_assert_1.default.strictEqual(result.backupId, "bkp_20261002_083015", "El backupId debe ser determinista con timestamp UTC");
    });
    (0, node_test_1.it)("TC-DR-02: Parámetros de gobernanza cumplen retención de 30 días", () => {
        node_assert_1.default.strictEqual(firestoreBackupScheduler_1.BACKUP_RETENTION_DAYS, 30, "La política de retención obligatoria es de 30 días");
        node_assert_1.default.strictEqual(firestoreBackupScheduler_1.DEFAULT_BACKUP_BUCKET, "bluesystem-7c9af-backups-prod", "El bucket dedicado canónico debe coincidir");
    });
    (0, node_test_1.it)("TC-DR-03: Soporta buckets dedicados de staging o recuperación aislada", () => {
        const fixedDate = new Date("2026-10-02T12:00:00Z");
        const stagingBucket = "bluesystem-7c9af-staging-backups";
        const result = (0, firestoreBackupScheduler_1.generateCanonicalBackupPath)(stagingBucket, fixedDate);
        node_assert_1.default.strictEqual(result.fullUri, "gs://bluesystem-7c9af-staging-backups/exports/2026/10/02/export_20261002_120000");
    });
});
