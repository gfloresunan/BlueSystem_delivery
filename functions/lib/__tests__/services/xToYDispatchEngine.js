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
exports.X2Y_DISPATCH_CONFIG = void 0;
exports.resetXToYDispatchConfigCache = resetXToYDispatchConfigCache;
exports.getXToYDispatchConfig = getXToYDispatchConfig;
exports.calculateHaversineDistanceKm = calculateHaversineDistanceKm;
exports.discoverEligibleCouriers = discoverEligibleCouriers;
exports.notifyTargetedCouriers = notifyTargetedCouriers;
exports.advanceTripDispatch = advanceTripDispatch;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const messaging = admin.messaging();
exports.X2Y_DISPATCH_CONFIG = {
    INITIAL_RADIUS_KM: 5.0,
    STAGE_2_RADIUS_KM: 15.0,
    STAGE_3_RADIUS_KM: 30.0,
    STAGE_2_EXPANSION_SECONDS: 180, // 3 minutos
    STAGE_3_EXPANSION_SECONDS: 360, // 6 minutos
    TIMEOUT_SECONDS: 600, // 10 minutos
    MAX_GPS_STALE_MS: 10 * 60 * 1000, // 10 minutos de frescura GPS
    DEFAULT_CASH_LIMIT_CENTS: 200000, // C$ 2,000.00
};
let cachedDispatchConfig = null;
let cachedDispatchConfigExpiresAt = 0;
function resetXToYDispatchConfigCache() {
    cachedDispatchConfig = null;
    cachedDispatchConfigExpiresAt = 0;
}
async function getXToYDispatchConfig() {
    const now = Date.now();
    if (cachedDispatchConfig && cachedDispatchConfigExpiresAt > now) {
        return cachedDispatchConfig;
    }
    const fallback = { ...exports.X2Y_DISPATCH_CONFIG };
    try {
        const snap = await db.collection("system_config").doc("global").get();
        if (snap.exists) {
            const data = snap.data();
            const cfg = data?.xToYDispatch;
            if (cfg && typeof cfg === "object") {
                const radii = cfg.searchRadiiKm;
                const timeouts = cfg.expansionTimeoutSeconds;
                const gpsFreshness = cfg.gpsFreshnessMinutes;
                // Validaciones estrictas de bounds:
                // 1. Radios: array de 3 números positivos estrictamente crecientes
                const validRadii = Array.isArray(radii) &&
                    radii.length === 3 &&
                    radii.every((r) => typeof r === "number" && r > 0) &&
                    radii[0] < radii[1] && radii[1] < radii[2];
                // 2. Timeouts: array de 3 números positivos estrictamente crecientes
                const validTimeouts = Array.isArray(timeouts) &&
                    timeouts.length === 3 &&
                    timeouts.every((t) => typeof t === "number" && t > 0) &&
                    timeouts[0] < timeouts[1] && timeouts[1] < timeouts[2];
                // 3. Frescura GPS: número positivo (> 0)
                const validGps = typeof gpsFreshness === "number" && gpsFreshness > 0;
                cachedDispatchConfig = {
                    INITIAL_RADIUS_KM: validRadii ? radii[0] : fallback.INITIAL_RADIUS_KM,
                    STAGE_2_RADIUS_KM: validRadii ? radii[1] : fallback.STAGE_2_RADIUS_KM,
                    STAGE_3_RADIUS_KM: validRadii ? radii[2] : fallback.STAGE_3_RADIUS_KM,
                    STAGE_2_EXPANSION_SECONDS: validTimeouts ? timeouts[0] : fallback.STAGE_2_EXPANSION_SECONDS,
                    STAGE_3_EXPANSION_SECONDS: validTimeouts ? timeouts[1] : fallback.STAGE_3_EXPANSION_SECONDS,
                    TIMEOUT_SECONDS: validTimeouts ? timeouts[2] : fallback.TIMEOUT_SECONDS,
                    MAX_GPS_STALE_MS: validGps ? gpsFreshness * 60 * 1000 : fallback.MAX_GPS_STALE_MS,
                    DEFAULT_CASH_LIMIT_CENTS: fallback.DEFAULT_CASH_LIMIT_CENTS,
                };
                cachedDispatchConfigExpiresAt = now + 60 * 1000;
                return cachedDispatchConfig;
            }
        }
    }
    catch (err) {
        logger_1.Logger.warn("[X2Y_DISPATCH] Error al obtener /system_config/global.xToYDispatch, aplicando fallback", { error: err.message });
    }
    cachedDispatchConfig = fallback;
    cachedDispatchConfigExpiresAt = now + 60 * 1000;
    return fallback;
}
/**
 * Cálculo geodésico Haversine entre dos puntos (km).
 * Métrica operacional exclusiva para Courier Discovery (NO altera Pricing ni Ruta Vial).
 */
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const R = 6371.0; // Radio terrestre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180.0) *
            Math.cos((lat2 * Math.PI) / 180.0) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
}
/**
 * Motor de Elegibilidad de Flota X→Y Server-Authoritative
 * Reutiliza e implementa estrictamente las invariantes de FleetEligibilityEngine.kt
 */
async function discoverEligibleCouriers(originLat, originLng, maxRadiusKm, excludedUids = [], customDispatchConfig) {
    const candidates = [];
    const excludedSet = new Set(excludedUids.map((u) => u.trim()));
    if (!originLat || !originLng) {
        return [];
    }
    const dispatchConfig = customDispatchConfig || await getXToYDispatchConfig();
    // 1. Consultar telemetría en /ubicaciones_repartidores
    const locationsSnap = await db.collection("ubicaciones_repartidores").limit(100).get();
    if (locationsSnap.empty) {
        return [];
    }
    const nowMs = Date.now();
    for (const doc of locationsSnap.docs) {
        const courierId = doc.id;
        if (excludedSet.has(courierId))
            continue;
        const data = doc.data() || {};
        const coords = data.coordenadas || {};
        const lat = Number(coords.latitud ?? coords.latitude ?? data.latitud ?? data.lat ?? data.latitude);
        const lng = Number(coords.longitud ?? coords.longitude ?? data.longitud ?? data.lng ?? data.longitude);
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
            continue;
        }
        // 2. Validación de Frescura GPS (<= 10 min)
        let lastUpdateMs = 0;
        if (data.ultimaActualizacion) {
            if (typeof data.ultimaActualizacion.toMillis === "function") {
                lastUpdateMs = data.ultimaActualizacion.toMillis();
            }
            else if (typeof data.ultimaActualizacion === "number") {
                lastUpdateMs = data.ultimaActualizacion;
            }
            else if (typeof data.ultimaActualizacion === "string") {
                lastUpdateMs = Date.parse(data.ultimaActualizacion) || Number(data.ultimaActualizacion) || 0;
            }
        }
        else if (data.updatedAt) {
            lastUpdateMs = typeof data.updatedAt.toMillis === "function" ? data.updatedAt.toMillis() : Date.parse(data.updatedAt) || 0;
        }
        if (lastUpdateMs > 0 && nowMs - lastUpdateMs > dispatchConfig.MAX_GPS_STALE_MS) {
            // Ubicación obsoleta
            continue;
        }
        // 3. Validación de Distancia Operacional Haversine al Punto X
        const distKm = calculateHaversineDistanceKm(lat, lng, originLat, originLng);
        if (distKm > maxRadiusKm) {
            continue;
        }
        // 4. Validación de Perfil Operacional (/couriers o /users)
        const courierDoc = await db.collection("couriers").doc(courierId).get();
        const userDoc = courierDoc.exists ? null : await db.collection("users").doc(courierId).get();
        const profile = (courierDoc.exists ? courierDoc.data() : userDoc?.data()) || {};
        const isOnline = profile.isOnline !== false && profile.online !== false && profile.estadoTurno !== "OFFLINE";
        const isActive = profile.isActive !== false && profile.active !== false;
        const hasActiveAssignment = Boolean(profile.activeAssignmentId || profile.pedidoActivoId);
        if (!isOnline || !isActive || hasActiveAssignment) {
            continue;
        }
        // 5. Validación de Restricciones Financieras (/courier_balances)
        const balanceSnap = await db.collection("courier_balances").doc(courierId).get();
        if (balanceSnap.exists) {
            const bData = balanceSnap.data() || {};
            const canReceive = bData.canReceiveNewOrders !== false;
            const state = (bData.financialAccessState || "ALLOW").toString().toUpperCase();
            const cashCents = Number(bData.cashOutstandingCents || 0);
            const limitCents = Number(bData.effectiveCashLimitCents || bData.cashLimitCents || dispatchConfig.DEFAULT_CASH_LIMIT_CENTS);
            const hasOverdue = Boolean(bData.hasOverdueClosure);
            if (!canReceive || state.startsWith("BLOCKED") || hasOverdue || (limitCents > 0 && cashCents >= limitCents)) {
                continue; // Bloqueado financieramente
            }
        }
        const name = data.nombre || profile.name || profile.nombre || "Motorizado";
        candidates.push({
            courierId,
            name,
            distanceKm: distKm,
            lat,
            lng,
        });
    }
    // Ordenar candidatos por proximidad al origen X
    candidates.sort((a, b) => a.distanceKm - b.distanceKm);
    return candidates;
}
/**
 * Envía notificación push dirigida a motorizados recién añadidos a la bolsa elegible.
 */
async function notifyTargetedCouriers(tripId, courierUids, originAddress, destinationAddress, customerOffer, radiusKm) {
    if (courierUids.length === 0)
        return;
    const devicesSnap = await db
        .collection("user_devices")
        .where("uid", "in", courierUids.slice(0, 30))
        .get();
    const tokens = new Set();
    devicesSnap.forEach((d) => {
        const t = d.data().token;
        if (t)
            tokens.add(t);
    });
    if (tokens.size === 0)
        return;
    try {
        await messaging.sendEachForMulticast({
            tokens: Array.from(tokens),
            data: {
                action: "NEW_X_TO_Y_DELIVERY",
                orderId: tripId,
                tripId: tripId,
                serviceType: "X_TO_Y_DELIVERY",
                screen: "courier_dashboard",
                title: `📦 ¡Nueva Encomienda X→Y (${radiusKm} km)!`,
                body: `${originAddress} → ${destinationAddress} | Oferta: C$${customerOffer}`,
            },
            android: {
                priority: "high",
                directBootOk: true,
            },
        });
        logger_1.Logger.info(`[X2Y_DISPATCH] Push dirigida enviada a ${tokens.size} dispositivos para tripId=${tripId} (radio=${radiusKm}km)`);
    }
    catch (err) {
        logger_1.Logger.warn(`[X2Y_DISPATCH] Error enviando push multicast para tripId=${tripId}`, { error: err.message });
    }
}
/**
 * Ejecuta la máquina de estados de Despacho de forma autoritativa, atómica y segura contra carreras.
 */
async function advanceTripDispatch(tripId) {
    const tripRef = db.collection("deliveryTrips").doc(tripId);
    const orderRef = db.collection("orders").doc(tripId);
    const dispatchConfig = await getXToYDispatchConfig();
    let targetStage = "SEARCHING_5KM";
    let targetRadiusKm = dispatchConfig.INITIAL_RADIUS_KM;
    let shouldCancelTimeout = false;
    let newEligibleUids = [];
    let existingEligibleUids = [];
    let originAddress = "";
    let destinationAddress = "";
    let customerOffer = 0;
    let elapsedSeconds = 0;
    // 1. Transacción Atómica de Evaluación y Mutación de Estado
    const result = await db.runTransaction(async (transaction) => {
        const tripSnap = await transaction.get(tripRef);
        if (!tripSnap.exists) {
            return { advanced: false, stage: "CANCELLED", radiusKm: 0, eligibleCount: 0, reason: "NOT_FOUND" };
        }
        const tripData = tripSnap.data() || {};
        const currentStatus = (tripData.status || "").toString().toUpperCase().trim();
        const assignedCourier = tripData.assignedCourierId || tripData.courierId || tripData.motorizadoId;
        // Si ya está asignado o terminado, detener dispatch inmediatamente
        if (assignedCourier || ["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "IN_TRANSIT", "COMPLETED", "DELIVERED", "COURIER_ACCEPTED"].includes(currentStatus)) {
            return { advanced: false, stage: "ASSIGNED", radiusKm: Number(tripData.dispatchRadiusKm || 5), eligibleCount: 0, reason: "ALREADY_ASSIGNED" };
        }
        // Si ya está cancelado, terminar
        if (["CANCELLED", "TIMEOUT"].includes(currentStatus)) {
            return { advanced: false, stage: "TIMEOUT", radiusKm: Number(tripData.dispatchRadiusKm || 30), eligibleCount: 0, reason: "ALREADY_CANCELLED" };
        }
        // Regla de Despacho X→Y: Pago por transferencia debe estar aprobado antes de liberar a la flota
        const paymentMethod = (tripData.paymentMethod || "").toString().toLowerCase().trim();
        const paymentStatus = (tripData.paymentStatus || "").toString().toUpperCase().trim();
        const paymentVerified = tripData.paymentVerified === true;
        const isPaymentBlocked = (currentStatus === "PAYMENT_VERIFYING" || paymentMethod === "transferencia") && !paymentVerified && paymentStatus !== "APPROVED" && paymentStatus !== "VERIFIED";
        if (isPaymentBlocked) {
            logger_1.Logger.info(`[X2Y_DISPATCH] Dispatch bloqueado para tripId=${tripId}: Pago por transferencia pendiente de verificación.`);
            return { advanced: false, stage: (tripData.dispatchStage || "SEARCHING_5KM"), radiusKm: Number(tripData.dispatchRadiusKm || 5), eligibleCount: 0, reason: "PAYMENT_PENDING_VERIFICATION" };
        }
        // 2. SSOT Temporal Único: Basado en trip.createdAt
        let createdAtMs = Date.now();
        if (tripData.createdAt) {
            if (typeof tripData.createdAt.toMillis === "function") {
                createdAtMs = tripData.createdAt.toMillis();
            }
            else if (typeof tripData.createdAt === "number") {
                createdAtMs = tripData.createdAt;
            }
            else if (typeof tripData.createdAt === "string") {
                createdAtMs = Date.parse(tripData.createdAt) || createdAtMs;
            }
        }
        elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
        const currentDispatch = tripData.dispatch || {};
        const currentStage = currentDispatch.stage || tripData.dispatchStage || "SEARCHING_5KM";
        existingEligibleUids = tripData.eligibleCouriers || [];
        const origin = tripData.origin || {};
        const dest = tripData.destination || {};
        const originLat = Number(origin.latitude || tripData.originLat || 0);
        const originLng = Number(origin.longitude || tripData.originLng || 0);
        originAddress = origin.address || tripData.businessAddress || "Origen";
        destinationAddress = dest.address || tripData.destinationAddress || "Destino";
        customerOffer = Number(tripData.customerOffer || tripData.deliveryFee || 0);
        // 3. Determinación Autoritativa de Stage según elapsedSeconds
        if (elapsedSeconds >= dispatchConfig.TIMEOUT_SECONDS) {
            // 🔒 TIMEOUT -> Cancelación Atómica Definitiva
            targetStage = "TIMEOUT";
            targetRadiusKm = dispatchConfig.STAGE_3_RADIUS_KM;
            shouldCancelTimeout = true;
            const cancelUpdates = {
                status: "CANCELLED",
                estado: "cancelado",
                cancelReason: "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT",
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                "dispatch.stage": "TIMEOUT",
                "dispatch.radiusKm": targetRadiusKm,
                "dispatch.timedOutAt": admin.firestore.FieldValue.serverTimestamp(),
                dispatchStage: "TIMEOUT",
                dispatchRadiusKm: targetRadiusKm,
            };
            transaction.update(tripRef, cancelUpdates);
            // Cancelar espejo en /orders si existe
            transaction.update(orderRef, {
                status: "cancelled",
                estado: "cancelado",
                cancelReason: "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT",
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return {
                advanced: true,
                stage: targetStage,
                radiusKm: targetRadiusKm,
                eligibleCount: 0,
                reason: "TIMED_OUT_AND_CANCELLED",
            };
        }
        else if (elapsedSeconds >= dispatchConfig.STAGE_3_EXPANSION_SECONDS) {
            targetStage = "EXPANDED_30KM";
            targetRadiusKm = dispatchConfig.STAGE_3_RADIUS_KM;
        }
        else if (elapsedSeconds >= dispatchConfig.STAGE_2_EXPANSION_SECONDS) {
            targetStage = "EXPANDED_15KM";
            targetRadiusKm = dispatchConfig.STAGE_2_RADIUS_KM;
        }
        else {
            targetStage = "SEARCHING_5KM";
            targetRadiusKm = dispatchConfig.INITIAL_RADIUS_KM;
        }
        // 4. Descubrimiento de Candidatos dentro del nuevo radio
        const rejectedBy = tripData.rejectedByCouriers || [];
        const candidates = await discoverEligibleCouriers(originLat, originLng, targetRadiusKm, rejectedBy, dispatchConfig);
        const candidateUids = candidates.map((c) => c.courierId);
        // Identificar nuevos motorizados para evitar ofertas duplicadas
        const existingSet = new Set(existingEligibleUids);
        newEligibleUids = candidateUids.filter((uid) => !existingSet.has(uid));
        const combinedEligibleUids = Array.from(new Set([...existingEligibleUids, ...candidateUids]));
        // 5. Persistir estado autoritativo en /deliveryTrips
        transaction.update(tripRef, {
            "dispatch.stage": targetStage,
            "dispatch.radiusKm": targetRadiusKm,
            "dispatch.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
            "dispatch.eligibleCount": candidateUids.length,
            dispatchStage: targetStage,
            dispatchRadiusKm: targetRadiusKm,
            eligibleCouriers: combinedEligibleUids,
            eligibleCouriersCount: candidateUids.length,
            candidateCouriersCount: candidateUids.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            advanced: true,
            stage: targetStage,
            radiusKm: targetRadiusKm,
            eligibleCount: candidateUids.length,
        };
    });
    // 6. Telemetría Estructurada Obligatoria
    logger_1.Logger.info(`[X2Y_DISPATCH] tripId=${tripId} stage=${result.stage} radiusKm=${result.radiusKm} eligibleCount=${result.eligibleCount} elapsedSeconds=${elapsedSeconds}s`);
    // 7. Notificar exclusivamente a los NUEVOS candidatos fuera de la transacción
    if (!shouldCancelTimeout && newEligibleUids.length > 0) {
        await notifyTargetedCouriers(tripId, newEligibleUids, originAddress, destinationAddress, customerOffer, targetRadiusKm);
    }
    return result;
}
