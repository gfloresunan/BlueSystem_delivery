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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettlementNotificationConfig = exports.getSettlementNotificationConfig = exports.generateOfficialClosureActPdf = exports.verifyCourierDailyClosure = exports.registerBankDepositReceipt = exports.initiateCourierDailyClosure = void 0;
exports.toManaguaBusinessDate = toManaguaBusinessDate;
exports.resolveCourierOperationalId = resolveCourierOperationalId;
exports.dispatchCourierClosureAdminNotification = dispatchCourierClosureAdminNotification;
exports.dispatchCourierClosureEmailNotification = dispatchCourierClosureEmailNotification;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const emailService_1 = require("../services/emailService");
const settlementRecipientResolver_1 = require("../services/settlementRecipientResolver");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
async function resolveCourierName(uid) {
    try {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
            const u = userDoc.data() || {};
            const name = u.name || u.nombre || u.displayName || u.fullName || u.email;
            if (name && name.trim() && name !== "Repartidor" && name !== "Motorizado") {
                return name.trim();
            }
        }
        const courierDoc = await db.collection("couriers").doc(uid).get();
        if (courierDoc.exists) {
            const c = courierDoc.data() || {};
            const name = c.name || c.nombre || c.displayName;
            if (name && name.trim() && name !== "Repartidor" && name !== "Motorizado") {
                return name.trim();
            }
        }
        const balanceDoc = await db.collection("courier_balances").doc(uid).get();
        if (balanceDoc.exists) {
            const b = balanceDoc.data() || {};
            if (b.courierName && b.courierName !== "Repartidor" && b.courierName !== "Motorizado") {
                return b.courierName;
            }
        }
    }
    catch (err) {
        functions.logger.warn(`Error resolving courier name for ${uid}`, err);
    }
    return "Motorizado";
}
/**
 * Convierte un Timestamp de Firestore, Date o ISO string a YYYY-MM-DD en la zona horaria operacional canónica (America/Managua, UTC-6).
 */
function toManaguaBusinessDate(dateOrTimestamp) {
    if (!dateOrTimestamp)
        return "";
    try {
        let date;
        if (typeof dateOrTimestamp.toDate === "function") {
            date = dateOrTimestamp.toDate();
        }
        else if (dateOrTimestamp instanceof Date) {
            date = dateOrTimestamp;
        }
        else if (typeof dateOrTimestamp.seconds === "number") {
            date = new Date(dateOrTimestamp.seconds * 1000);
        }
        else if (typeof dateOrTimestamp._seconds === "number") {
            date = new Date(dateOrTimestamp._seconds * 1000);
        }
        else {
            date = new Date(dateOrTimestamp);
        }
        if (isNaN(date.getTime()))
            return "";
        return date.toLocaleDateString("en-CA", { timeZone: "America/Managua" });
    }
    catch {
        return "";
    }
}
/**
 * Resuelve el identificador operativo canónico del motorizado (ej. DRV-RCPN) para visualización UX/Email
 * sin exponer Firebase UIDs técnicos al usuario final.
 */
async function resolveCourierOperationalId(uid, firestoreDb = db) {
    try {
        const userDoc = await firestoreDb.collection("users").doc(uid).get();
        const u = userDoc.exists ? (typeof userDoc.data === "function" ? userDoc.data() : userDoc.data) || {} : {};
        const courierDoc = await firestoreDb.collection("couriers").doc(uid).get();
        const c = courierDoc.exists ? (typeof courierDoc.data === "function" ? courierDoc.data() : courierDoc.data) || {} : {};
        const foundCode = c.driverId || c.driverCode || c.courierCode || c.codigoOperativo
            || u.driverId || u.driverCode || u.courierCode || u.codigoOperativo;
        if (foundCode && typeof foundCode === "string" && foundCode.trim().length > 0) {
            return foundCode.trim();
        }
    }
    catch (err) {
        functions.logger.warn(`Error resolviendo operational ID para ${uid}`, err);
    }
    return `DRV-${uid.substring(0, 4).toUpperCase()}`;
}
/**
 * Callable HTTPS: initiateCourierDailyClosure
 *
 * Inicia el proceso formal de cierre diario de un motorizado para una fecha operacional dada.
 * Recupera los asientos en /courier_cash_ledger correspondientes a la fecha, calcula el monto
 * esperado autoritativamente en servidor y genera el registro en /courier_daily_closures.
 *
 * Idempotencia: `closureOperationId`.
 */
exports.initiateCourierDailyClosure = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para realizar el cierre diario.");
    }
    const callerUid = context.auth.uid;
    const token = context.auth.token || {};
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || token.role === "SUPER_ADMIN";
    const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;
    const { closureOperationId, courierId, businessDate, // YYYY-MM-DD
    shift, // "MORNING" | "AFTERNOON" | "FULL_DAY"
    expectedAmountCents: clientExpectedAmountCents, } = data || {};
    if (!closureOperationId || typeof closureOperationId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "closureOperationId es obligatorio.");
    }
    const targetCourierId = courierId || callerUid;
    // Si no es supervisor/admin, solo puede cerrar su propia jornada
    if (targetCourierId !== callerUid && !isSupervisor) {
        throw new functions.https.HttpsError("permission-denied", "No está autorizado para iniciar el cierre de otro motorizado.");
    }
    if (!businessDate || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
        throw new functions.https.HttpsError("invalid-argument", "businessDate debe tener formato YYYY-MM-DD.");
    }
    try {
        const courierRealName = await resolveCourierName(targetCourierId);
        return await db.runTransaction(async (transaction) => {
            // 1. Verificación de Idempotencia por closureOperationId
            const existingOpQuery = db
                .collection("courier_daily_closures")
                .where("closureOperationId", "==", closureOperationId)
                .limit(1);
            const existingOpSnap = await transaction.get(existingOpQuery);
            if (!existingOpSnap.empty) {
                const doc = existingOpSnap.docs[0];
                functions.logger.info(`[CLOSURE_IDEMPOTENT] Cierre ya iniciado previamente: opId=${closureOperationId}, docId=${doc.id}`);
                return { success: true, idempotent: true, closureId: doc.id, data: doc.data() };
            }
            // 2. Verificar si ya existe un cierre para este courier en esta businessDate
            const existingDateQuery = db
                .collection("courier_daily_closures")
                .where("courierId", "==", targetCourierId)
                .where("businessDate", "==", businessDate)
                .limit(1);
            const existingDateSnap = await transaction.get(existingDateQuery);
            if (!existingDateSnap.empty) {
                const doc = existingDateSnap.docs[0];
                return { success: true, idempotent: true, closureId: doc.id, data: doc.data(), alreadyClosed: true };
            }
            // 3. Obtener Balance y Nombre del Courier
            const balanceRef = db.collection("courier_balances").doc(targetCourierId);
            const balanceSnap = await transaction.get(balanceRef);
            const balanceData = balanceSnap.exists ? balanceSnap.data() || {} : {};
            const courierName = courierRealName || balanceData.courierName || "Motorizado";
            // 4. Obtener colecciones y asientos en /courier_cash_ledger para la fecha operacional
            const ledgerQuery = db
                .collection("courier_cash_ledger")
                .where("courierId", "==", targetCourierId);
            const ledgerSnap = await transaction.get(ledgerQuery);
            let expectedAmountCents = Number(clientExpectedAmountCents) || 0;
            let totalCashCollectedCents = 0;
            let totalCompensatedCents = 0;
            let totalEarningsCents = 0;
            let totalDistanceEarningsCents = 0;
            let totalBonusEarningsCents = 0;
            let totalTipEarningsCents = 0;
            const includedOrderIds = [];
            const includedTripIds = [];
            ledgerSnap.forEach((doc) => {
                const d = doc.data();
                const entryDate = d.businessDate || toManaguaBusinessDate(d.createdAt);
                // Filtrar exclusivamente asientos de la fecha operacional actual en America/Managua
                if (entryDate && entryDate !== businessDate) {
                    return;
                }
                if (d.eventType === "ORDER_CASH_COLLECTED" || d.eventType === "TRIP_CASH_COLLECTED") {
                    totalCashCollectedCents += Number(d.amountCents || 0);
                }
                totalCompensatedCents += Number(d.compensatedCents || 0);
                totalEarningsCents += Number(d.earningsCents || 0);
                totalDistanceEarningsCents += Number(d.distanceEarningsCents || 0);
                totalBonusEarningsCents += Number(d.bonusEarningsCents || 0);
                totalTipEarningsCents += Number(d.tipEarningsCents || 0);
                if (d.orderId && !includedOrderIds.includes(d.orderId)) {
                    includedOrderIds.push(d.orderId);
                }
                if (d.tripId && !includedTripIds.includes(d.tripId)) {
                    includedTripIds.push(d.tripId);
                }
            });
            if (expectedAmountCents <= 0) {
                if (totalCashCollectedCents > 0) {
                    expectedAmountCents = Math.max(0, totalCashCollectedCents - totalCompensatedCents);
                }
                else {
                    expectedAmountCents = Number(balanceData.cashOutstandingCents || 0);
                }
            }
            const ordersCount = includedOrderIds.length + includedTripIds.length || (expectedAmountCents > 0 ? 1 : 0);
            const now = FieldValue.serverTimestamp();
            const closureRef = db.collection("courier_daily_closures").doc();
            const closureId = closureRef.id;
            const tenantId = data?.tenantId || balanceData?.tenantId || token?.tenantId || "ten_bluesystem_core";
            const closureData = {
                closureId,
                closureOperationId,
                courierId: targetCourierId,
                courierName,
                tenantId,
                businessDate,
                shift: shift || "FULL_DAY",
                status: "OPEN",
                expectedAmountCents,
                totalCashCollectedCents: totalCashCollectedCents > 0 ? totalCashCollectedCents : expectedAmountCents + totalCompensatedCents,
                totalCompensatedCents,
                totalEarningsCents,
                totalDistanceEarningsCents,
                totalBonusEarningsCents,
                totalTipEarningsCents,
                courierPayableBalanceCents: Number(balanceData.courierPayableBalanceCents || 0),
                ordersCount,
                includedOrderIds,
                includedTripIds,
                countedAmountCents: 0,
                differenceCents: 0,
                discrepancyAction: "NONE",
                createdAt: now,
                updatedAt: now,
            };
            transaction.set(closureRef, closureData);
            functions.logger.info(`[CLOSURE_INITIATED] Cierre iniciado: closureId=${closureId}, courier=${targetCourierId}, fecha=${businessDate}, esperado=${expectedAmountCents}¢, recaudado=${totalCashCollectedCents}¢, compensado=${totalCompensatedCents}¢, ganancias=${totalEarningsCents}¢, pedidos=${closureData.ordersCount}`);
            return {
                success: true,
                idempotent: false,
                closureId,
                expectedAmountCents,
                totalCashCollectedCents,
                totalCompensatedCents,
                totalEarningsCents,
                ordersCount: closureData.ordersCount,
                businessDate,
            };
        });
    }
    catch (err) {
        functions.logger.error(`[CLOSURE_INIT_ERROR] Error iniciando cierre: ${err.message}`, err);
        throw new functions.https.HttpsError("internal", err.message || "Error al iniciar el cierre diario.");
    }
});
/**
 * Callable HTTPS: registerBankDepositReceipt
 *
 * Registra formalmente los datos de la transferencia/depósito bancario y la URL del voucher
 * en Firebase Storage, calculando la diferencia contra el monto contado en mesa.
 */
exports.registerBankDepositReceipt = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para registrar el depósito bancario.");
    }
    const callerUid = context.auth.uid;
    const token = context.auth.token || {};
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || token.role === "SUPER_ADMIN";
    const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;
    const { closureId, bankName, accountReference, bankReference, depositDate, depositTime, depositAmountCents, receiptStoragePath, receiptDownloadUrl, receiptFileHash, notes, } = data || {};
    if (!closureId || typeof closureId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "closureId es obligatorio.");
    }
    if (!bankName || typeof bankName !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "bankName es obligatorio.");
    }
    if (!bankReference || typeof bankReference !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "bankReference es obligatorio.");
    }
    if (typeof depositAmountCents !== "number" || depositAmountCents <= 0) {
        throw new functions.https.HttpsError("invalid-argument", "depositAmountCents debe ser un entero positivo.");
    }
    try {
        const result = await db.runTransaction(async (transaction) => {
            const closureRef = db.collection("courier_daily_closures").doc(closureId);
            const closureSnap = await transaction.get(closureRef);
            if (!closureSnap.exists) {
                throw new functions.https.HttpsError("not-found", "El cierre especificado no existe.");
            }
            const closure = closureSnap.data() || {};
            // Validación de propiedad
            if (closure.courierId !== callerUid && !isSupervisor) {
                throw new functions.https.HttpsError("permission-denied", "No está autorizado para modificar este cierre.");
            }
            // El monto de referencia para el depósito es lo contado/entregado en el settlement (o lo esperado si no hubo settlement)
            const baseCountedCents = Number(closure.countedAmountCents || closure.expectedAmountCents || 0);
            const depositDiscrepancyCents = depositAmountCents - baseCountedCents;
            const now = FieldValue.serverTimestamp();
            const bankDepositId = `dep_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const bankDeposit = {
                bankDepositId,
                bankName: bankName.trim(),
                accountReference: (accountReference || "").trim(),
                bankReference: bankReference.trim(),
                depositDate: depositDate || new Date().toISOString().split("T")[0],
                depositTime: depositTime || new Date().toISOString().split("T")[1].substring(0, 5),
                depositAmountCents,
                depositDiscrepancyCents,
                receiptStoragePath: receiptStoragePath || "",
                receiptDownloadUrl: receiptDownloadUrl || "",
                receiptFileHash: receiptFileHash || null,
                uploadedAt: now,
                uploadedByUid: callerUid,
                notes: (notes || "").trim(),
            };
            const newStatus = "PENDING_ADMIN_VERIFICATION";
            transaction.update(closureRef, {
                bankDeposit,
                status: newStatus,
                updatedAt: now,
            });
            // Actualizar balance de courier a PENDING_AUDIT
            const balanceRef = db.collection("courier_balances").doc(closure.courierId);
            transaction.set(balanceRef, {
                status: "PENDING_AUDIT",
                lastDepositVoucher: bankReference.trim(),
                lastDepositAmountCents: depositAmountCents,
                lastDepositDate: depositDate || new Date().toISOString().split("T")[0],
                updatedAt: now,
            }, { merge: true });
            // Auditoría inmutable
            const auditRef = db.collection("audit_events").doc();
            transaction.set(auditRef, {
                event: "BANK_DEPOSIT_RECEIPT_REGISTERED",
                closureId,
                courierId: closure.courierId,
                bankDepositId,
                depositAmountCents,
                depositDiscrepancyCents,
                bankReference,
                timestamp: now,
            });
            let courierDisplayName = closure.courierName;
            if (!courierDisplayName || courierDisplayName === "Repartidor" || courierDisplayName === "Motorizado") {
                courierDisplayName = await resolveCourierName(closure.courierId);
            }
            functions.logger.info(`[BANK_DEPOSIT_REGISTERED] Depósito registrado: closureId=${closureId}, courier=${closure.courierId}, monto=${depositAmountCents}¢, diff=${depositDiscrepancyCents}¢`);
            return {
                success: true,
                closureId,
                bankDepositId,
                depositDiscrepancyCents,
                status: newStatus,
                courierId: closure.courierId,
                courierName: courierDisplayName,
                expectedAmountCents: baseCountedCents,
                businessDate: closure.businessDate,
                tenantId: closure.tenantId || "ten_bluesystem_core",
                totalOrders: Array.isArray(closure.includedOrderIds) ? closure.includedOrderIds.length : (closure.ordersCount || 0),
                totalTrips: Array.isArray(closure.includedTripIds) ? closure.includedTripIds.length : 0,
                courierEarningsCents: Number(closure.totalEarningsCents || 0),
            };
        });
        // Despacho Asíncrono e Idempotente de Notificación Operativa al Administrador (GAP-01)
        try {
            await dispatchCourierClosureAdminNotification({
                closureId: result.closureId,
                courierId: result.courierId,
                courierName: result.courierName,
                depositAmountCents,
                expectedAmountCents: result.expectedAmountCents,
                bankName: bankName.trim(),
                bankReference: bankReference.trim(),
                businessDate: result.businessDate,
                tenantId: result.tenantId,
            });
        }
        catch (notifErr) {
            functions.logger.warn(`[CLOSURE_NOTIF_ERROR] Error notificando a administradores para closure ${closureId}: ${notifErr?.message}`);
        }
        // Despacho Asíncrono e Idempotente de Correo Corporativo (GAP-02)
        try {
            await dispatchCourierClosureEmailNotification({
                eventType: "SUBMITTED",
                closureId: result.closureId,
                courierId: result.courierId,
                courierName: result.courierName,
                businessDate: result.businessDate,
                depositAmountCents,
                expectedAmountCents: result.expectedAmountCents,
                discrepancyAmountCents: result.depositDiscrepancyCents,
                bankName: bankName.trim(),
                bankReference: bankReference.trim(),
                tenantId: result.tenantId,
                totalOrders: result.totalOrders,
                totalTrips: result.totalTrips,
                courierEarningsCents: result.courierEarningsCents,
                netCustodyCents: result.expectedAmountCents,
            });
        }
        catch (emailErr) {
            functions.logger.warn(`[CLOSURE_EMAIL_ERROR] Error enviando correos de liquidación para closure ${closureId}: ${emailErr?.message}`);
        }
        return {
            success: true,
            closureId: result.closureId,
            bankDepositId: result.bankDepositId,
            depositDiscrepancyCents: result.depositDiscrepancyCents,
            status: result.status,
        };
    }
    catch (err) {
        functions.logger.error(`[BANK_DEPOSIT_ERROR] Error registrando depósito: ${err.message}`, err);
        throw new functions.https.HttpsError("internal", err.message || "Error al registrar comprobante de depósito.");
    }
});
/**
 * Despacha de forma idempotente la notificación operacional para Administradores
 * en /notification_campaigns y /users/{adminUid}/notifications (GAP-01)
 */
async function dispatchCourierClosureAdminNotification(params, firestoreDb = db) {
    const { closureId, courierId, courierName, depositAmountCents, expectedAmountCents, bankName, bankReference, businessDate, tenantId, } = params;
    if (!closureId) {
        return { success: false, campaignDocId: "", adminCount: 0, reason: "closureId is required" };
    }
    const campaignDocId = `courier_closure_${closureId}_pending_admin`;
    // 1. Verificación de Idempotencia estricta
    const campaignRef = firestoreDb.collection("notification_campaigns").doc(campaignDocId);
    const existingCampSnap = await campaignRef.get();
    if (existingCampSnap.exists) {
        functions.logger.info(`[CLOSURE_NOTIF_IDEMPOTENT] Campaña de notificación ${campaignDocId} ya existe. Omitiendo duplicado.`);
        return { success: true, idempotent: true, campaignDocId, adminCount: 0 };
    }
    // 2. Resolución de Destinatarios mediante Recipient Resolver Canónico (GAP-03)
    const resolvedRecipients = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.resolveRecipients(tenantId, firestoreDb);
    const adminUids = resolvedRecipients
        .filter((r) => r.channels.pushFcm || r.channels.inApp)
        .map((r) => r.uid);
    const depositNio = (depositAmountCents / 100).toFixed(2);
    const expectedNio = (expectedAmountCents / 100).toFixed(2);
    const notifTitle = "🔔 Nueva liquidación de efectivo pendiente";
    const notifBody = `Motorizado ${courierName} depositó C$ ${depositNio} (${bankName}, ref: ${bankReference}). Esperado: C$ ${expectedNio}. Pendiente de verificación.`;
    const deepLink = `panel-admin/public/dashboard.html#courierCashControl?closureId=${closureId}`;
    const now = FieldValue.serverTimestamp();
    // 3. Crear Campaña de Notificación para Worker FCM
    await campaignRef.set({
        id: campaignDocId,
        campaignId: campaignDocId,
        title: notifTitle,
        body: notifBody,
        type: "OPERATIONAL",
        category: "Liquidaciones",
        priority: "HIGH",
        status: "QUEUED",
        targetType: "admin",
        targetUids: adminUids,
        action: "OPEN_COURIER_DAILY_CLOSURE",
        destinationType: "SCREEN",
        destinationRoute: "courier_cash_control",
        navigationRoute: "courier_cash_control",
        closureId,
        courierId,
        courierName,
        amount: depositAmountCents / 100,
        expectedAmount: expectedAmountCents / 100,
        bankName,
        bankReference,
        businessDate: businessDate || new Date().toISOString().split("T")[0],
        deepLink,
        createdAt: now,
        scheduledAt: now,
        attempts: 0,
    });
    // 4. Persistir Notificaciones In-App Idempotentes en /users/{adminUid}/notifications
    if (adminUids.length > 0) {
        const batch = firestoreDb.batch();
        for (const adminUid of adminUids) {
            const notifRef = firestoreDb.collection("users").doc(adminUid).collection("notifications").doc(campaignDocId);
            batch.set(notifRef, {
                id: campaignDocId,
                notificationId: campaignDocId,
                type: "COURIER_DAILY_CLOSURE_PENDING",
                action: "OPEN_COURIER_DAILY_CLOSURE",
                closureId,
                courierId,
                courierName,
                amount: depositAmountCents / 100,
                expectedAmount: expectedAmountCents / 100,
                bankName,
                bankReference,
                screen: "courier_cash_control",
                title: notifTitle,
                body: notifBody,
                category: "Liquidaciones",
                priority: "HIGH",
                isRead: false,
                read: false,
                deletedByUser: false,
                visibilityStatus: "VISIBLE",
                sentAt: now,
                createdAt: now,
                deepLink,
            }, { merge: true });
        }
        await batch.commit();
    }
    // 5. Auditoría Inmutable
    await firestoreDb.collection("audit_events").add({
        event: "COURIER_CLOSURE_ADMIN_NOTIFIED",
        closureId,
        courierId,
        campaignDocId,
        adminRecipientsCount: adminUids.length,
        timestamp: now,
    });
    functions.logger.info(`[CLOSURE_ADMIN_NOTIFIED] Notificación enviada a ${adminUids.length} administradores para closure ${closureId} (campaign: ${campaignDocId})`);
    return {
        success: true,
        idempotent: false,
        campaignDocId,
        adminCount: adminUids.length,
    };
}
async function resolveCourierContact(uid, firestoreDb = db) {
    try {
        const userDoc = await firestoreDb.collection("users").doc(uid).get();
        const u = userDoc.exists ? (typeof userDoc.data === "function" ? userDoc.data() : userDoc.data) || {} : {};
        const courierDoc = await firestoreDb.collection("couriers").doc(uid).get();
        const c = courierDoc.exists ? (typeof courierDoc.data === "function" ? courierDoc.data() : courierDoc.data) || {} : {};
        return {
            email: u.email || c.email || undefined,
            phone: u.phone || u.telefono || c.phone || c.telefono || "N/A",
            plate: c.plate || c.placa || u.plate || u.placa || "M-N/A",
        };
    }
    catch {
        return { phone: "N/A", plate: "M-N/A" };
    }
}
/**
 * Despachador de Correo Corporativo Enterprise para Liquidaciones de Motorizados (GAP-02)
 * Reutiliza EmailService y la infraestructura SMTP nativa mail.bluesystemdelivery.com:465
 */
async function dispatchCourierClosureEmailNotification(params, firestoreDb = db) {
    const { eventType, closureId, courierId, courierName, businessDate, depositAmountCents = 0, expectedAmountCents = 0, discrepancyAmountCents = depositAmountCents - expectedAmountCents, bankName = "N/A", bankReference = "N/A", actNumber = "", verificationCode = "", rejectionReason = "", verifiedByName = "Administración", tenantId = "ten_bluesystem_core", totalOrders = 0, totalTrips = 0, courierEarningsCents = 0, netCustodyCents = expectedAmountCents, } = params;
    if (!closureId || !eventType) {
        return { success: false, emailsSent: 0, recipients: [], reason: "closureId and eventType are required" };
    }
    // Resolver contacto e identidad operativa del motorizado (DRV-XXXX)
    const courierContact = await resolveCourierContact(courierId, firestoreDb);
    const operationalId = await resolveCourierOperationalId(courierId, firestoreDb);
    const plate = params.plate || courierContact.plate || "M-N/A";
    const phone = params.phone || courierContact.phone || "N/A";
    // Resolución canónica de métricas operacionales si no fueron provistas
    let resolvedOrders = totalOrders;
    let resolvedTrips = totalTrips;
    let resolvedEarningsCents = courierEarningsCents;
    if (resolvedOrders === 0 && resolvedTrips === 0 && resolvedEarningsCents === 0 && closureId) {
        try {
            const closureSnap = await firestoreDb.collection("courier_daily_closures").doc(closureId).get();
            if (closureSnap.exists) {
                const cData = typeof closureSnap.data === "function" ? closureSnap.data() : closureSnap.data;
                if (cData) {
                    resolvedOrders = Array.isArray(cData.includedOrderIds) ? cData.includedOrderIds.length : (cData.ordersCount || 0);
                    resolvedTrips = Array.isArray(cData.includedTripIds) ? cData.includedTripIds.length : 0;
                    resolvedEarningsCents = Number(cData.totalEarningsCents || 0);
                }
            }
            // Si el closure tenía includedOrderIds vacío pero existe businessDate, consultar ledger canónico por fecha Managua
            if (resolvedOrders === 0 && resolvedTrips === 0 && businessDate && courierId) {
                const ledgerSnap = await firestoreDb.collection("courier_cash_ledger")
                    .where("courierId", "==", courierId)
                    .get();
                if (!ledgerSnap.empty) {
                    ledgerSnap.forEach((doc) => {
                        const d = typeof doc.data === "function" ? doc.data() : doc.data;
                        const entryDate = d.businessDate || toManaguaBusinessDate(d.createdAt);
                        if (entryDate === businessDate && (d.eventType === "ORDER_CASH_COLLECTED" || d.eventType === "TRIP_CASH_COLLECTED")) {
                            if (d.sourceDomain === "X_TO_Y_DELIVERY" || d.tripId) {
                                resolvedTrips++;
                            }
                            else {
                                resolvedOrders++;
                            }
                            resolvedEarningsCents += Number(d.earningsCents || 0);
                        }
                    });
                }
            }
        }
        catch (fetchErr) {
            functions.logger.warn(`[CLOSURE_EMAIL_RESOLVE_WARN] Error resolviendo resumen operacional: ${fetchErr}`);
        }
    }
    const depositFormatted = (depositAmountCents / 100).toFixed(2);
    const expectedFormatted = (expectedAmountCents / 100).toFixed(2);
    const discrepancyFormatted = (discrepancyAmountCents / 100).toFixed(2);
    const earningsFormatted = (resolvedEarningsCents / 100).toFixed(2);
    const custodyFormatted = (netCustodyCents / 100).toFixed(2);
    let reconciliationStatus = "CUADRADO EXACTO";
    if (discrepancyAmountCents < 0) {
        reconciliationStatus = `FALTANTE (-C$ ${Math.abs(discrepancyAmountCents / 100).toFixed(2)})`;
    }
    else if (discrepancyAmountCents > 0) {
        reconciliationStatus = `SOBRANTE (+C$ ${(discrepancyAmountCents / 100).toFixed(2)})`;
    }
    const adminDashboardUrl = `https://bluesystemdelivery.com/panel-admin/public/dashboard.html#courierCashControl?closureId=${closureId}`;
    const recipientsSent = [];
    if (eventType === "SUBMITTED") {
        // 1. Notificar a Supervisores y Administradores autorizados mediante Recipient Resolver Canónico (GAP-03)
        const resolvedRecipients = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.resolveRecipients(tenantId, firestoreDb);
        const targetUsers = resolvedRecipients
            .filter((r) => r.channels.email && r.email && r.email.includes("@"))
            .map((r) => ({ uid: r.uid, email: r.email }));
        for (const target of targetUsers) {
            const eventId = `email_closure_${closureId}_submitted_${target.uid}`;
            const emailRes = await emailService_1.EmailService.sendTransactionalEmail({
                eventId,
                eventType: "COURIER_CLOSURE_SUBMITTED",
                recipient: target.email,
                recipientUid: target.uid,
                templateId: "courier_closure_submitted",
                variables: {
                    courierName,
                    courierId: operationalId,
                    plate,
                    phone,
                    closureId,
                    businessDate,
                    expectedAmount: expectedFormatted,
                    depositAmount: depositFormatted,
                    discrepancyAmount: discrepancyFormatted,
                    bankName,
                    bankReference,
                    courierEarnings: earningsFormatted,
                    netCustody: custodyFormatted,
                    totalOrders: String(resolvedOrders),
                    totalTrips: String(resolvedTrips),
                    reconciliationStatus,
                    adminDashboardUrl,
                },
                tenantId,
                entityType: "COURIER_CLOSURE",
                entityId: closureId,
            });
            if (emailRes.success) {
                recipientsSent.push(target.email);
            }
        }
    }
    else if (eventType === "VERIFIED") {
        // 1. Notificar al motorizado si tiene correo registrado
        if (courierContact.email && courierContact.email.includes("@")) {
            const eventId = `email_closure_${closureId}_verified_courier_${courierId}`;
            const emailRes = await emailService_1.EmailService.sendTransactionalEmail({
                eventId,
                eventType: "COURIER_CLOSURE_VERIFIED",
                recipient: courierContact.email.trim(),
                recipientUid: courierId,
                templateId: "courier_deposit_verified",
                variables: {
                    courierName,
                    courierId: operationalId,
                    closureId,
                    businessDate,
                    depositAmount: depositFormatted,
                    expectedAmount: expectedFormatted,
                    actNumber,
                    verificationCode,
                    verifiedByName,
                    verifiedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
                    adminDashboardUrl,
                },
                tenantId,
                entityType: "COURIER_CLOSURE",
                entityId: closureId,
            });
            if (emailRes.success) {
                recipientsSent.push(courierContact.email.trim());
            }
        }
    }
    else if (eventType === "REJECTED") {
        // Notificar al motorizado sobre la observación o rechazo
        if (courierContact.email && courierContact.email.includes("@")) {
            const eventId = `email_closure_${closureId}_rejected_courier_${courierId}`;
            const emailRes = await emailService_1.EmailService.sendTransactionalEmail({
                eventId,
                eventType: "COURIER_CLOSURE_REJECTED",
                recipient: courierContact.email.trim(),
                recipientUid: courierId,
                templateId: "courier_closure_rejected",
                variables: {
                    courierName,
                    courierId: operationalId,
                    closureId,
                    businessDate,
                    rejectionReason,
                    reviewedByName: verifiedByName,
                    adminDashboardUrl,
                },
                tenantId,
                entityType: "COURIER_CLOSURE",
                entityId: closureId,
            });
            if (emailRes.success) {
                recipientsSent.push(courierContact.email.trim());
            }
        }
    }
    // Auditoría
    try {
        await firestoreDb.collection("audit_events").add({
            event: `COURIER_CLOSURE_EMAIL_${eventType}`,
            closureId,
            courierId,
            eventType,
            recipientsCount: recipientsSent.length,
            recipients: recipientsSent,
            timestamp: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        functions.logger.warn(`[AUDIT_EMAIL_ERROR] Error registrando auditoría de email: ${err?.message}`);
    }
    return {
        success: true,
        idempotent: false,
        emailsSent: recipientsSent.length,
        recipients: recipientsSent,
    };
}
/**
 * Callable HTTPS: verifyCourierDailyClosure
 *
 * Permite a un supervisor/administrador verificar y aprobar el cierre diario (emitiendo el Acta Oficial)
 * o rechazarlo formalmente con motivo auditable.
 */
exports.verifyCourierDailyClosure = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para verificar el cierre.");
    }
    const callerUid = context.auth.uid;
    const token = context.auth.token || {};
    const isSuperAdmin = token.role === "SUPER_ADMIN" || token.superadmin === true;
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || isSuperAdmin;
    const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;
    if (!isSupervisor) {
        throw new functions.https.HttpsError("permission-denied", "Solo supervisores o administradores pueden verificar cierres.");
    }
    const { closureId, action, rejectionReason } = data || {};
    if (!closureId || typeof closureId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "closureId es obligatorio.");
    }
    if (action !== "VERIFY" && action !== "REJECT") {
        throw new functions.https.HttpsError("invalid-argument", "action debe ser 'VERIFY' o 'REJECT'.");
    }
    if (action === "REJECT" && (!rejectionReason || typeof rejectionReason !== "string")) {
        throw new functions.https.HttpsError("invalid-argument", "rejectionReason es obligatorio al rechazar un cierre.");
    }
    try {
        const verifyResult = await db.runTransaction(async (transaction) => {
            const closureRef = db.collection("courier_daily_closures").doc(closureId);
            const closureSnap = await transaction.get(closureRef);
            if (!closureSnap.exists) {
                throw new functions.https.HttpsError("not-found", "El cierre no existe.");
            }
            const closure = closureSnap.data() || {};
            const now = FieldValue.serverTimestamp();
            let courierDisplayName = closure.courierName;
            if (!courierDisplayName || courierDisplayName === "Repartidor" || courierDisplayName === "Motorizado" || courierDisplayName === "Courier") {
                courierDisplayName = await resolveCourierName(closure.courierId);
            }
            if (action === "REJECT") {
                transaction.update(closureRef, {
                    courierName: courierDisplayName,
                    status: "REJECTED",
                    rejectionReason: rejectionReason.trim(),
                    verifiedByUid: callerUid,
                    verifiedAt: now,
                    updatedAt: now,
                });
                // Auditoría
                const auditRef = db.collection("audit_events").doc();
                transaction.set(auditRef, {
                    event: "COURIER_CLOSURE_REJECTED",
                    closureId,
                    courierId: closure.courierId,
                    courierName: courierDisplayName,
                    supervisorUid: callerUid,
                    reason: rejectionReason.trim(),
                    timestamp: now,
                });
                return {
                    success: true,
                    closureId,
                    status: "REJECTED",
                    courierId: closure.courierId,
                    courierName: courierDisplayName,
                    businessDate: closure.businessDate,
                    rejectionReason: rejectionReason.trim(),
                    tenantId: closure.tenantId || "ten_bluesystem_core",
                };
            }
            // Emisión de Acta Oficial Inmutable
            const actDateStr = (closure.businessDate || new Date().toISOString().split("T")[0]).replace(/-/g, "");
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const actNumber = `ACTA-CASH-${actDateStr}-${closure.courierId.slice(-4).toUpperCase()}-${randomSuffix}`;
            const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            const officialAct = {
                actNumber,
                issuedAt: now,
                verificationCode,
                courierName: courierDisplayName,
                supervisorUid: callerUid,
                supervisorName: token.name || "Supervisor de Operaciones",
            };
            // ─── Asiento de Débito en /courier_cash_ledger y Actualización de Balance ─────
            const depositAmountCents = Number(closure.bankDeposit?.depositAmountCents || closure.countedAmountCents || closure.expectedAmountCents || 0);
            if (depositAmountCents > 0) {
                const depositLedgerRef = db.collection("courier_cash_ledger").doc();
                transaction.set(depositLedgerRef, {
                    entryId: depositLedgerRef.id,
                    courierId: closure.courierId,
                    courierName: courierDisplayName,
                    closureId,
                    sourceDomain: "BANK_DEPOSIT",
                    eventType: "BANK_DEPOSIT_SETTLED",
                    direction: "DEBIT", // Reduce pasivo de custodia
                    amountCents: depositAmountCents,
                    currency: "NIO",
                    description: `Depósito bancario validado [${closure.bankDeposit?.bankName || "Banco"} ref: ${closure.bankDeposit?.bankReference || "N/A"}] — Acta ${actNumber}`,
                    idempotencyKey: `closure_${closureId}_deposit_settled`,
                    createdAt: now,
                    createdByUid: callerUid,
                    createdByType: "SUPERVISOR",
                });
                const balanceRef = db.collection("courier_balances").doc(closure.courierId);
                transaction.set(balanceRef, {
                    courierName: courierDisplayName,
                    cashOutstandingCents: FieldValue.increment(-depositAmountCents),
                    totalSettledCents: FieldValue.increment(depositAmountCents),
                    lastSettlementId: closureId,
                    lastSettledAt: now,
                    updatedAt: now,
                }, { merge: true });
            }
            transaction.update(closureRef, {
                courierName: courierDisplayName,
                status: "VERIFIED",
                officialAct,
                verifiedByUid: callerUid,
                verifiedByName: token.name || "Supervisor de Operaciones",
                verifiedAt: now,
                updatedAt: now,
            });
            // Auditoría
            const auditRef = db.collection("audit_events").doc();
            transaction.set(auditRef, {
                event: "COURIER_CLOSURE_VERIFIED",
                closureId,
                courierId: closure.courierId,
                actNumber,
                verificationCode,
                depositAmountCents,
                supervisorUid: callerUid,
                timestamp: now,
            });
            functions.logger.info(`[CLOSURE_VERIFIED] Cierre aprobado con éxito: closureId=${closureId}, actNumber=${actNumber}, montoLiquidado=${depositAmountCents}¢`);
            return {
                success: true,
                closureId,
                status: "VERIFIED",
                officialAct,
                settledAmountCents: depositAmountCents,
                courierId: closure.courierId,
                courierName: courierDisplayName,
                businessDate: closure.businessDate,
                expectedAmountCents: closure.expectedAmountCents || 0,
                tenantId: closure.tenantId || "ten_bluesystem_core",
            };
        });
        // Despacho Asíncrono de Correo Corporativo (GAP-02)
        try {
            if (verifyResult.status === "VERIFIED") {
                await dispatchCourierClosureEmailNotification({
                    eventType: "VERIFIED",
                    closureId: verifyResult.closureId,
                    courierId: verifyResult.courierId,
                    courierName: verifyResult.courierName,
                    businessDate: verifyResult.businessDate,
                    depositAmountCents: verifyResult.settledAmountCents || 0,
                    expectedAmountCents: verifyResult.expectedAmountCents || 0,
                    actNumber: verifyResult.officialAct?.actNumber || "",
                    verificationCode: verifyResult.officialAct?.verificationCode || "",
                    verifiedByName: token.name || "Supervisor de Operaciones",
                    tenantId: verifyResult.tenantId,
                });
            }
            else if (verifyResult.status === "REJECTED") {
                await dispatchCourierClosureEmailNotification({
                    eventType: "REJECTED",
                    closureId: verifyResult.closureId,
                    courierId: verifyResult.courierId,
                    courierName: verifyResult.courierName,
                    businessDate: verifyResult.businessDate,
                    rejectionReason: verifyResult.rejectionReason,
                    verifiedByName: token.name || "Supervisor de Operaciones",
                    tenantId: verifyResult.tenantId,
                });
            }
        }
        catch (emailErr) {
            functions.logger.warn(`[CLOSURE_EMAIL_ERROR] Error enviando correo tras verificación de closure ${closureId}: ${emailErr?.message}`);
        }
        return verifyResult;
    }
    catch (err) {
        functions.logger.error(`[CLOSURE_VERIFY_ERROR] Error verificando cierre: ${err.message}`, err);
        throw new functions.https.HttpsError("internal", err.message || "Error al verificar el cierre.");
    }
});
/**
 * Callable HTTPS: generateOfficialClosureActPdf
 *
 * Genera la estructura de datos autoritativa o HTML renderizable del Acta Oficial de Cierre.
 */
exports.generateOfficialClosureActPdf = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
    }
    const { closureId } = data || {};
    if (!closureId || typeof closureId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "closureId es obligatorio.");
    }
    const closureSnap = await db.collection("courier_daily_closures").doc(closureId).get();
    if (!closureSnap.exists) {
        throw new functions.https.HttpsError("not-found", "El cierre no existe.");
    }
    const closure = closureSnap.data() || {};
    return {
        success: true,
        actNumber: closure.officialAct?.actNumber || "PENDIENTE",
        verificationCode: closure.officialAct?.verificationCode || "N/A",
        businessDate: closure.businessDate,
        courierName: closure.courierName,
        courierId: closure.courierId,
        expectedAmount: (Number(closure.expectedAmountCents || 0) / 100).toFixed(2),
        countedAmount: (Number(closure.countedAmountCents || 0) / 100).toFixed(2),
        differenceAmount: (Number(closure.differenceCents || 0) / 100).toFixed(2),
        bankName: closure.bankDeposit?.bankName || "N/A",
        bankReference: closure.bankDeposit?.bankReference || "N/A",
        depositAmount: closure.bankDeposit ? (Number(closure.bankDeposit.depositAmountCents || 0) / 100).toFixed(2) : "0.00",
        status: closure.status,
        issuedAt: closure.officialAct?.issuedAt || null,
    };
});
/**
 * Callable HTTPS: getSettlementNotificationConfig (GAP-03)
 *
 * Retorna la configuración activa de destinatarios de alertas financieras y la lista
 * de usuarios administrativos y financieros elegibles para selección en el panel web.
 */
exports.getSettlementNotificationConfig = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
    }
    const token = context.auth.token || {};
    const isSuperAdmin = token.role === "SUPER_ADMIN" || token.superadmin === true;
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || isSuperAdmin;
    const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;
    if (!isSupervisor) {
        throw new functions.https.HttpsError("permission-denied", "Acceso denegado a configuración de liquidaciones.");
    }
    const { tenantId = "ten_bluesystem_core" } = data || {};
    const config = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.getConfig(tenantId);
    // Obtener lista de usuarios administrativos/financieros para selección en UI
    const usersSnap = await db.collection("users")
        .where("role", "in", [
        "admin", "ADMIN", "superadmin", "SUPERADMIN", "super_admin", "SUPER_ADMIN",
        "platform_admin", "PLATFORM_ADMIN", "supervisor", "SUPERVISOR",
        "finance_manager", "FINANCE_MANAGER", "accountant", "ACCOUNTANT",
    ])
        .limit(50)
        .get();
    const eligibleUsers = [];
    usersSnap.forEach((doc) => {
        const u = doc.data() || {};
        eligibleUsers.push({
            uid: doc.id,
            name: u.name || u.nombre || u.displayName || u.email || "Usuario",
            email: u.email || "",
            role: u.role || "USER",
            isActive: u.isActive !== false && u.status !== "INACTIVE",
        });
    });
    return {
        success: true,
        config,
        eligibleUsers,
    };
});
/**
 * Callable HTTPS: updateSettlementNotificationConfig (GAP-03)
 *
 * Actualiza la configuración de destinatarios con validación de seguridad estricta y
 * estampación obligatoria de auditoría inmutable en /audit_events.
 */
exports.updateSettlementNotificationConfig = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
    }
    const token = context.auth.token || {};
    const isSuperAdmin = token.role === "SUPER_ADMIN" || token.superadmin === true;
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || isSuperAdmin;
    if (!isPlatformAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden modificar destinatarios.");
    }
    const { enabledRoles, specificUserUids, channelPreferences, reason, tenantId = "ten_bluesystem_core" } = data || {};
    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
        throw new functions.https.HttpsError("invalid-argument", "Debe proporcionar una justificación válida de auditoría (mínimo 5 caracteres).");
    }
    try {
        const result = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.updateConfig({
            enabledRoles: Array.isArray(enabledRoles) ? enabledRoles : [],
            specificUserUids: Array.isArray(specificUserUids) ? specificUserUids : [],
            channelPreferences: channelPreferences || { pushFcm: true, inApp: true, email: true },
            reason: reason.trim(),
            actorUid: context.auth.uid,
            actorEmail: token.email || "admin@bluesystemdelivery.com",
            tenantId,
        });
        return {
            success: true,
            config: result.config,
        };
    }
    catch (err) {
        functions.logger.error("[UPDATE_RECIPIENTS_ERROR] Error actualizando configuración:", err);
        throw new functions.https.HttpsError("internal", err.message || "Error al actualizar configuración.");
    }
});
