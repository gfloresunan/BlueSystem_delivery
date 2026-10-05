"use strict";
/**
 * BlueSystem Delivery Enterprise — Settlement Notification Recipient Resolver
 * Protocolo: BSD-COURIER-SETTLEMENT-PHASE2-CONTROLLED-IMPLEMENTATION-001 (GAP-03)
 *
 * Responsabilidades:
 * 1. SSOT de destinatarios configurables en /system_config/settlement_recipients.
 * 2. Resolución dinámica en tiempo de ejecución por rol y por usuario específico.
 * 3. Validación estricta de seguridad: existencia de usuario, estatus activo, autorización y aislamiento multi-tenant.
 * 4. Trazabilidad inmutable de cambios de configuración en /audit_events.
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
exports.SettlementNotificationRecipientResolver = exports.ALLOWED_SETTLEMENT_ROLES = void 0;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
exports.ALLOWED_SETTLEMENT_ROLES = [
    "admin",
    "ADMIN",
    "superadmin",
    "SUPERADMIN",
    "super_admin",
    "SUPER_ADMIN",
    "platform_admin",
    "PLATFORM_ADMIN",
    "supervisor",
    "SUPERVISOR",
    "finance_manager",
    "FINANCE_MANAGER",
    "accountant",
    "ACCOUNTANT",
];
class SettlementNotificationRecipientResolver {
    static setDb(dbInstance) {
        this.customDb = dbInstance;
    }
    static getFirestore() {
        return this.customDb || db;
    }
    /**
     * Obtiene la configuración activa desde Firestore o provee defaults canónicos.
     */
    static async getConfig(tenantId) {
        const firestore = this.getFirestore();
        try {
            const snap = await firestore.collection("system_config").doc("settlement_recipients").get();
            if (snap.exists) {
                const data = (typeof snap.data === "function" ? snap.data() : snap.data);
                if (data && Array.isArray(data.enabledRoles)) {
                    return {
                        enabledRoles: data.enabledRoles,
                        specificUserUids: Array.isArray(data.specificUserUids) ? data.specificUserUids : [],
                        channelPreferences: {
                            pushFcm: data.channelPreferences?.pushFcm !== false,
                            inApp: data.channelPreferences?.inApp !== false,
                            email: data.channelPreferences?.email !== false,
                        },
                        tenantId: data.tenantId || "ten_bluesystem_core",
                        updatedAt: data.updatedAt,
                        updatedByUid: data.updatedByUid,
                        updatedByEmail: data.updatedByEmail,
                        lastReason: data.lastReason,
                    };
                }
            }
        }
        catch (err) {
            logger_1.Logger.warn("[SETTLEMENT_RECIPIENTS] Error leyendo config en system_config/settlement_recipients:", err?.message);
        }
        // Default Canónico Enterprise
        return {
            enabledRoles: [
                "admin", "ADMIN", "superadmin", "SUPERADMIN", "super_admin", "SUPER_ADMIN",
                "platform_admin", "PLATFORM_ADMIN", "supervisor", "SUPERVISOR",
                "finance_manager", "FINANCE_MANAGER", "accountant", "ACCOUNTANT",
            ],
            specificUserUids: [],
            channelPreferences: {
                pushFcm: true,
                inApp: true,
                email: true,
            },
            tenantId: tenantId || "ten_bluesystem_core",
        };
    }
    /**
     * Resuelve la lista de destinatarios elegibles y validados en tiempo de ejecución.
     */
    static async resolveRecipients(tenantId, providedDb) {
        const firestore = providedDb || this.getFirestore();
        const config = await this.getConfig(tenantId);
        const candidatesMap = new Map();
        // 1. Candidatos por Rol Habilitado
        if (config.enabledRoles.length > 0) {
            try {
                const roleSnap = await firestore
                    .collection("users")
                    .where("role", "in", config.enabledRoles.slice(0, 30))
                    .limit(30)
                    .get();
                roleSnap.forEach((doc) => {
                    candidatesMap.set(doc.id, {
                        id: doc.id,
                        ...(typeof doc.data === "function" ? doc.data() : doc.data),
                    });
                });
            }
            catch (err) {
                logger_1.Logger.warn("[SETTLEMENT_RECIPIENTS] Error consultando usuarios por rol:", err?.message);
            }
        }
        // 2. Candidatos por Usuario Específico
        for (const uid of config.specificUserUids) {
            if (!uid || candidatesMap.has(uid))
                continue;
            try {
                const uDoc = await firestore.collection("users").doc(uid).get();
                if (uDoc.exists) {
                    candidatesMap.set(uid, {
                        id: uid,
                        ...(typeof uDoc.data === "function" ? uDoc.data() : uDoc.data),
                    });
                }
            }
            catch (err) {
                logger_1.Logger.warn(`[SETTLEMENT_RECIPIENTS] Error consultando usuario específico ${uid}:`, err?.message);
            }
        }
        // 3. Validación Estricta de Seguridad y Filtros
        const validRecipients = [];
        for (const [uid, user] of candidatesMap.entries()) {
            // Regla A: Usuario activo
            if (user.isActive === false ||
                user.activo === false ||
                user.status === "INACTIVE" ||
                user.status === "SUSPENDED") {
                continue;
            }
            // Regla B: Email válido
            const email = (user.email || "").trim().toLowerCase();
            if (!email || !email.includes("@")) {
                continue;
            }
            // Regla C: Aislamiento Multi-Tenant
            if (tenantId && user.tenantId && user.tenantId !== tenantId) {
                const role = (user.role || "").toUpperCase();
                const isGlobalAdmin = role === "SUPER_ADMIN" ||
                    role === "SUPERADMIN" ||
                    role === "PLATFORM_ADMIN" ||
                    role === "PLATFORMADMIN";
                if (!isGlobalAdmin) {
                    continue; // Excluido por mismatch de tenant
                }
            }
            validRecipients.push({
                uid,
                email,
                name: user.name || user.nombre || user.displayName || user.email,
                role: user.role || "USER",
                tenantId: user.tenantId,
                channels: {
                    pushFcm: config.channelPreferences.pushFcm,
                    inApp: config.channelPreferences.inApp,
                    email: config.channelPreferences.email,
                },
            });
        }
        return validRecipients;
    }
    /**
     * Actualiza la configuración de destinatarios con validación de seguridad y auditoría inmutable.
     */
    static async updateConfig(params, providedDb) {
        const firestore = providedDb || this.getFirestore();
        const { enabledRoles, specificUserUids, channelPreferences, reason, actorUid, actorEmail, tenantId = "ten_bluesystem_core", } = params;
        if (!reason || reason.trim().length < 5) {
            throw new Error("Debe proporcionar un motivo válido de auditoría (mínimo 5 caracteres).");
        }
        // Validar roles permitidos
        const sanitizedRoles = enabledRoles.filter((r) => exports.ALLOWED_SETTLEMENT_ROLES.includes(r));
        // Validar usuarios específicos (deben existir y ser elegibles)
        const validSpecificUids = [];
        for (const uid of specificUserUids) {
            if (!uid || typeof uid !== "string")
                continue;
            const userDoc = await firestore.collection("users").doc(uid.trim()).get();
            if (userDoc.exists) {
                const u = (typeof userDoc.data === "function" ? userDoc.data() : userDoc.data) || {};
                if (u.isActive !== false && u.status !== "INACTIVE") {
                    validSpecificUids.push(uid.trim());
                }
            }
        }
        const previousConfig = await this.getConfig(tenantId);
        const now = FieldValue.serverTimestamp();
        const newConfig = {
            enabledRoles: sanitizedRoles,
            specificUserUids: validSpecificUids,
            channelPreferences: {
                pushFcm: channelPreferences?.pushFcm !== false,
                inApp: channelPreferences?.inApp !== false,
                email: channelPreferences?.email !== false,
            },
            tenantId,
            updatedAt: now,
            updatedByUid: actorUid,
            updatedByEmail: actorEmail || "admin@bluesystemdelivery.com",
            lastReason: reason.trim(),
        };
        // Escritura atómica en /system_config/settlement_recipients y /settlement_notification_config/global
        const batch = firestore.batch ? firestore.batch() : null;
        const ref1 = firestore.collection("system_config").doc("settlement_recipients");
        const ref2 = firestore.collection("settlement_notification_config").doc("global");
        if (batch) {
            batch.set(ref1, newConfig, { merge: true });
            batch.set(ref2, newConfig, { merge: true });
            await batch.commit();
        }
        else {
            await ref1.set(newConfig, { merge: true });
            await ref2.set(newConfig, { merge: true });
        }
        // Auditoría inmutable en /audit_events
        await firestore.collection("audit_events").add({
            event: "SETTLEMENT_NOTIFICATION_CONFIG_UPDATED",
            actorUid,
            actorEmail: actorEmail || null,
            reason: reason.trim(),
            previousConfig,
            newConfig,
            tenantId,
            timestamp: now,
        });
        logger_1.Logger.info("[SETTLEMENT_RECIPIENTS] 🟢 Configuración de alertas de liquidación actualizada exitosamente por actor:", {
            actorUid,
            reason,
            enabledRoles: sanitizedRoles,
            specificUsersCount: validSpecificUids.length,
        });
        return { success: true, config: newConfig };
    }
}
exports.SettlementNotificationRecipientResolver = SettlementNotificationRecipientResolver;
SettlementNotificationRecipientResolver.CONFIG_DOC_PATH = "system_config/settlement_recipients";
SettlementNotificationRecipientResolver.ALIAS_DOC_PATH = "settlement_notification_config/global";
SettlementNotificationRecipientResolver.customDb = null;
