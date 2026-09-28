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
exports.adminSetCourierCashLimit = exports.validateCourierOrderAcceptance = exports.getCourierFinancialAccessState = exports.COURIER_CASH_LIMIT_CENTS = exports.COURIER_DEFAULT_CASH_LIMIT_CENTS = void 0;
exports.resolveEffectiveCashLimitCents = resolveEffectiveCashLimitCents;
exports.evaluateCourierFinancialAccessInternal = evaluateCourierFinancialAccessInternal;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
exports.COURIER_DEFAULT_CASH_LIMIT_CENTS = 200000; // C$ 2,000.00 en centavos enteros
exports.COURIER_CASH_LIMIT_CENTS = exports.COURIER_DEFAULT_CASH_LIMIT_CENTS; // Backward compatibility alias
/**
 * Resuelve el límite de efectivo efectivo en centavos para un motorizado específico.
 * Jerarquía: Override por Courier -> Default Global system_config -> COURIER_DEFAULT_CASH_LIMIT_CENTS
 */
async function resolveEffectiveCashLimitCents(courierId, preloadedBalanceData) {
    // 1. Verificar si ya viene en courier_balances
    if (preloadedBalanceData &&
        preloadedBalanceData.customCashLimitCents !== undefined &&
        preloadedBalanceData.customCashLimitCents !== null) {
        const lim = Number(preloadedBalanceData.customCashLimitCents);
        if (!isNaN(lim) && lim >= 0)
            return Math.round(lim);
    }
    try {
        // 2. Consultar perfil en /couriers/{courierId}
        const courierSnap = await db.collection("couriers").doc(courierId).get();
        if (courierSnap.exists) {
            const cData = courierSnap.data() || {};
            if (cData.cashLimitCents !== undefined && cData.cashLimitCents !== null) {
                const lim = Number(cData.cashLimitCents);
                if (!isNaN(lim) && lim >= 0)
                    return Math.round(lim);
            }
            if (cData.cashLimit !== undefined && cData.cashLimit !== null) {
                const limNio = Number(cData.cashLimit);
                if (!isNaN(limNio) && limNio >= 0)
                    return Math.round(limNio * 100);
            }
        }
        // 3. Consultar /users/{courierId}
        const userSnap = await db.collection("users").doc(courierId).get();
        if (userSnap.exists) {
            const uData = userSnap.data() || {};
            if (uData.cashLimitCents !== undefined && uData.cashLimitCents !== null) {
                const lim = Number(uData.cashLimitCents);
                if (!isNaN(lim) && lim >= 0)
                    return Math.round(lim);
            }
            if (uData.cashLimit !== undefined && uData.cashLimit !== null) {
                const limNio = Number(uData.cashLimit);
                if (!isNaN(limNio) && limNio >= 0)
                    return Math.round(limNio * 100);
            }
        }
        // 4. Consultar system_config/global
        const globalCfgSnap = await db.collection("system_config").doc("global").get();
        if (globalCfgSnap.exists) {
            const gData = globalCfgSnap.data() || {};
            if (gData.courierDefaultCashLimitCents !== undefined && gData.courierDefaultCashLimitCents !== null) {
                const gLim = Number(gData.courierDefaultCashLimitCents);
                if (!isNaN(gLim) && gLim >= 0)
                    return Math.round(gLim);
            }
            if (gData.courierCashLimit !== undefined && gData.courierCashLimit !== null) {
                const gLimNio = Number(gData.courierCashLimit);
                if (!isNaN(gLimNio) && gLimNio >= 0)
                    return Math.round(gLimNio * 100);
            }
        }
    }
    catch (err) {
        functions.logger.warn(`[CASH_LIMIT_WARN] Error resolviendo límite para courier=${courierId}, usando default:`, err);
    }
    // 5. Fallback canónico default: C$ 2,000.00
    return exports.COURIER_DEFAULT_CASH_LIMIT_CENTS;
}
/**
 * Función canónica server-side que evalúa el acceso financiero de un motorizado.
 */
async function evaluateCourierFinancialAccessInternal(courierId, businessDateOverride) {
    const now = new Date();
    const currentBusinessDate = businessDateOverride ||
        now.toLocaleDateString("en-CA", { timeZone: "America/Managua" }); // YYYY-MM-DD
    const balanceRef = db.collection("courier_balances").doc(courierId);
    const balanceSnap = await balanceRef.get();
    const balanceData = balanceSnap.exists ? balanceSnap.data() || {} : {};
    const cashOutstandingCents = Number(balanceData.cashOutstandingCents || 0);
    // 1. Resolución de Límite Efectivo
    const effectiveCashLimitCents = await resolveEffectiveCashLimitCents(courierId, balanceData);
    // 2. Evaluación de Límite de Efectivo en Custodia: >= Límite Efectivo
    const isCashLimitExceeded = effectiveCashLimitCents > 0 && cashOutstandingCents >= effectiveCashLimitCents;
    // 3. Evaluación de Cierre Pendiente de Días Anteriores (Overdue Closure)
    let hasOverdueClosure = false;
    let overdueDate = undefined;
    if (cashOutstandingCents > 0) {
        try {
            // Buscar si existen cierres de fechas anteriores no verificados
            // Usamos query con índice simple nativo (courierId) y filtro en memoria para prevenir fallos por índice compuesto faltante
            const prevClosuresQuery = await db
                .collection("courier_daily_closures")
                .where("courierId", "==", courierId)
                .limit(25)
                .get();
            for (const doc of prevClosuresQuery.docs) {
                const c = doc.data();
                if (c.businessDate && c.businessDate < currentBusinessDate && c.status !== "VERIFIED") {
                    hasOverdueClosure = true;
                    overdueDate = c.businessDate;
                    break;
                }
            }
        }
        catch (closureErr) {
            functions.logger.warn(`[COURIER_ACCESS_POLICY] Advertencia al consultar cierres previos para courierId=${courierId}:`, closureErr);
        }
        // Si no hay documento de cierre previo pero la última recaudación registrada fue antes de hoy y aún hay saldo vivo
        if (!hasOverdueClosure && balanceData.lastCollectionAt) {
            const lastCollectionDate = balanceData.lastCollectionAt.toDate
                ? balanceData.lastCollectionAt.toDate().toLocaleDateString("en-CA", { timeZone: "America/Managua" })
                : null;
            if (lastCollectionDate && lastCollectionDate < currentBusinessDate) {
                hasOverdueClosure = true;
                overdueDate = lastCollectionDate;
            }
        }
    }
    // 4. Determinación de Estado Canónico
    let accessState = "ALLOW";
    let reasonMessage = "Acceso a nuevos pedidos autorizado.";
    const formattedOutstanding = `C$ ${(cashOutstandingCents / 100).toFixed(2)}`;
    const formattedLimit = `C$ ${(effectiveCashLimitCents / 100).toFixed(2)}`;
    if (isCashLimitExceeded && hasOverdueClosure) {
        accessState = "BLOCKED_CASH_LIMIT_AND_OVERDUE";
        reasonMessage = `Límite de efectivo alcanzado (${formattedOutstanding} / ${formattedLimit}) y cierre pendiente de fecha anterior (${overdueDate}).`;
    }
    else if (isCashLimitExceeded) {
        accessState = "BLOCKED_CASH_LIMIT";
        reasonMessage = `Límite máximo de efectivo en custodia alcanzado (${formattedOutstanding} >= ${formattedLimit}).`;
    }
    else if (hasOverdueClosure) {
        accessState = "BLOCKED_OVERDUE_CLOSURE";
        reasonMessage = `Cierre y depósito de efectivo pendiente de fecha anterior (${overdueDate}).`;
    }
    const canReceiveNewOrders = accessState === "ALLOW";
    // 5. Proyectar estado en /courier_balances y auditar transiciones
    const previousState = balanceData.financialAccessState || "ALLOW";
    if (previousState !== accessState) {
        await db.collection("audit_events").add({
            eventType: canReceiveNewOrders ? "COURIER_ACCESS_UNBLOCKED" : "COURIER_ACCESS_BLOCKED",
            courierId,
            previousState,
            newState: accessState,
            cashOutstandingCents,
            cashLimitCents: effectiveCashLimitCents,
            effectiveCashLimitCents,
            hasOverdueClosure,
            overdueDate: overdueDate || null,
            reason: reasonMessage,
            businessDate: currentBusinessDate,
            createdAt: FieldValue.serverTimestamp(),
        });
    }
    await balanceRef.set({
        financialAccessState: accessState,
        canReceiveNewOrders,
        financialAccessReason: reasonMessage,
        cashLimitCents: effectiveCashLimitCents,
        effectiveCashLimitCents,
        hasOverdueClosure,
        overdueClosureDate: overdueDate || null,
        lastEvaluatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return {
        courierId,
        canReceiveNewOrders,
        accessState,
        cashOutstandingCents,
        cashLimitCents: effectiveCashLimitCents,
        effectiveCashLimitCents,
        hasOverdueClosure,
        overdueDate,
        reasonMessage,
        evaluatedAt: now.toISOString(),
    };
}
/**
 * Callable HTTPS: getCourierFinancialAccessState
 * Permite a la app Courier o al Admin consultar el estado financiero de acceso del motorizado.
 */
exports.getCourierFinancialAccessState = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    const callerUid = context.auth.uid;
    const token = context.auth.token || {};
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || token.role === "SUPER_ADMIN";
    const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;
    const targetCourierId = ((data === null || data === void 0 ? void 0 : data.courierId) || callerUid).toString().trim();
    if (targetCourierId !== callerUid && !isSupervisor) {
        throw new functions.https.HttpsError("permission-denied", "No autorizado para consultar otro motorizado.");
    }
    return await evaluateCourierFinancialAccessInternal(targetCourierId, data === null || data === void 0 ? void 0 : data.businessDate);
});
/**
 * Callable HTTPS: validateCourierOrderAcceptance
 * Validación estricta server-side antes de permitir que un Courier acepte una orden o viaje.
 */
exports.validateCourierOrderAcceptance = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    const courierUid = context.auth.uid;
    const access = await evaluateCourierFinancialAccessInternal(courierUid);
    if (!access.canReceiveNewOrders) {
        throw new functions.https.HttpsError("failed-precondition", `COURIER_FINANCIAL_BLOCK: ${access.reasonMessage}`);
    }
    return { authorized: true, accessState: access.accessState };
});
/**
 * Callable HTTPS: adminSetCourierCashLimit
 * Permite a la administración configurar el límite de efectivo personalizado para un motorizado.
 */
exports.adminSetCourierCashLimit = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    const token = context.auth.token || {};
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" ||
        token.role === "SUPER_ADMIN" ||
        token.admin === true ||
        token.super_admin === true;
    const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;
    if (!isSupervisor) {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores y supervisores pueden modificar los límites de efectivo de los motorizados.");
    }
    const targetCourierId = ((data === null || data === void 0 ? void 0 : data.courierId) || "").toString().trim();
    if (!targetCourierId) {
        throw new functions.https.HttpsError("invalid-argument", "El ID del motorizado (courierId) es obligatorio.");
    }
    const isResetToGlobal = (data === null || data === void 0 ? void 0 : data.resetToGlobal) === true || (data === null || data === void 0 ? void 0 : data.useGlobal) === true;
    let newLimitCents = exports.COURIER_DEFAULT_CASH_LIMIT_CENTS;
    if (!isResetToGlobal) {
        // Recibir límite en centavos o en NIO (si viene en NIO, convertir a centavos)
        if ((data === null || data === void 0 ? void 0 : data.cashLimitCents) !== undefined && (data === null || data === void 0 ? void 0 : data.cashLimitCents) !== null) {
            newLimitCents = Math.round(Number(data.cashLimitCents));
        }
        else if ((data === null || data === void 0 ? void 0 : data.cashLimit) !== undefined && (data === null || data === void 0 ? void 0 : data.cashLimit) !== null) {
            newLimitCents = Math.round(Number(data.cashLimit) * 100);
        }
        else {
            throw new functions.https.HttpsError("invalid-argument", "Debe especificar cashLimit o cashLimitCents, o resetToGlobal: true.");
        }
        if (isNaN(newLimitCents) || newLimitCents < 0 || newLimitCents > 10000000) {
            // Máximo C$ 100,000.00
            throw new functions.https.HttpsError("invalid-argument", "El límite de efectivo debe ser un valor válido entre C$ 0.00 y C$ 100,000.00.");
        }
    }
    const reason = ((data === null || data === void 0 ? void 0 : data.reason) || (isResetToGlobal ? "Restauración a límite general predeterminado" : "Ajuste de límite de custodia por Administración")).toString().trim();
    const callerUid = context.auth.uid;
    const callerEmail = ((_a = context.auth.token) === null || _a === void 0 ? void 0 : _a.email) || callerUid;
    // 1. Obtener límite anterior
    const courierRef = db.collection("couriers").doc(targetCourierId);
    const courierSnap = await courierRef.get();
    const oldLimitCents = courierSnap.exists
        ? Number((_c = (_b = courierSnap.data()) === null || _b === void 0 ? void 0 : _b.cashLimitCents) !== null && _c !== void 0 ? _c : exports.COURIER_DEFAULT_CASH_LIMIT_CENTS)
        : exports.COURIER_DEFAULT_CASH_LIMIT_CENTS;
    const now = new Date();
    const batch = db.batch();
    if (isResetToGlobal) {
        const resetPayload = {
            customCashLimitCents: FieldValue.delete(),
            cashLimitCents: FieldValue.delete(),
            cashLimit: FieldValue.delete(),
            cashLimitUpdatedAt: FieldValue.serverTimestamp(),
            cashLimitUpdatedBy: callerEmail,
        };
        batch.set(courierRef, resetPayload, { merge: true });
        batch.set(db.collection("users").doc(targetCourierId), resetPayload, { merge: true });
        batch.set(db.collection("courier_balances").doc(targetCourierId), resetPayload, { merge: true });
        const auditRef = db.collection("audit_events").doc();
        batch.set(auditRef, {
            eventType: "COURIER_CASH_LIMIT_RESET_TO_GLOBAL",
            courierId: targetCourierId,
            changedByUid: callerUid,
            changedByEmail: callerEmail,
            oldLimitCents,
            oldLimitNio: oldLimitCents / 100,
            reason,
            timestamp: now.toISOString(),
            createdAt: FieldValue.serverTimestamp(),
        });
    }
    else {
        const updatePayload = {
            cashLimitCents: newLimitCents,
            cashLimit: newLimitCents / 100,
            customCashLimitCents: newLimitCents,
            cashLimitUpdatedAt: FieldValue.serverTimestamp(),
            cashLimitUpdatedBy: callerEmail,
        };
        batch.set(courierRef, updatePayload, { merge: true });
        batch.set(db.collection("users").doc(targetCourierId), updatePayload, { merge: true });
        batch.set(db.collection("courier_balances").doc(targetCourierId), updatePayload, { merge: true });
        const auditRef = db.collection("audit_events").doc();
        batch.set(auditRef, {
            eventType: "COURIER_CASH_LIMIT_UPDATED",
            courierId: targetCourierId,
            changedByUid: callerUid,
            changedByEmail: callerEmail,
            oldLimitCents,
            newLimitCents,
            oldLimitNio: oldLimitCents / 100,
            newLimitNio: newLimitCents / 100,
            reason,
            timestamp: now.toISOString(),
            createdAt: FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    // 2. Reevaluar elegibilidad financiera inmediatamente con el nuevo estado
    const newAccessState = await evaluateCourierFinancialAccessInternal(targetCourierId);
    return {
        success: true,
        courierId: targetCourierId,
        oldLimitCents,
        newLimitCents: isResetToGlobal ? newAccessState.effectiveCashLimitCents : newLimitCents,
        newLimitNio: (isResetToGlobal ? newAccessState.effectiveCashLimitCents : newLimitCents) / 100,
        isCustom: !isResetToGlobal,
        accessState: newAccessState,
    };
});
//# sourceMappingURL=courierAccessPolicy.js.map