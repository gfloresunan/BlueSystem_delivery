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
exports.onOrderDelivered = exports.onPaymentStatusUpdated = exports.notifyOrderStatusChange = exports.notifyNewOrder = void 0;
exports.resolveMerchantIsRestaurant = resolveMerchantIsRestaurant;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const paymentActivationGate_1 = require("../domain/payments/paymentActivationGate");
const courierAccessPolicy_1 = require("../callables/courierAccessPolicy");
const geoCatalog_1 = require("../domain/geo/geoCatalog");
const orderCodeUtils_1 = require("../shared/orderCodeUtils");
const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;
/**
 * Helper: Obtiene de forma canónica los tokens FCM activos para un usuario (soporta multi-dispositivo)
 */
async function getUserActiveTokens(uid, branchId) {
    if (!uid)
        return [];
    let queryRef = db
        .collection("user_devices")
        .where("uid", "==", uid)
        .where("isActive", "==", true);
    const snap = await queryRef.get();
    const tokens = [];
    snap.forEach((doc) => {
        const d = doc.data();
        const t = (d === null || d === void 0 ? void 0 : d.fcmToken) ? d === null || d === void 0 ? void 0 : d.fcmToken.trim() : "";
        if (t && t.length > 20 && !tokens.includes(t)) {
            // Si la orden especifica sucursal y el dispositivo tiene asignada sucursal, filtrar si no coincide
            if (branchId && d.branchId && d.branchId !== branchId) {
                return;
            }
            tokens.push(t);
        }
    });
    return tokens;
}
/**
 * Resuelve autoritativamente los UIDs de los usuarios administradores/staff del comercio.
 */
async function resolveMerchantUids(businessId) {
    if (!businessId)
        return [];
    const uids = new Set();
    try {
        const bizDoc = await db.collection("businesses").doc(businessId).get();
        if (bizDoc.exists) {
            const bData = bizDoc.data() || {};
            if (bData.ownerUid)
                uids.add(bData.ownerUid.toString().trim());
            if (bData.userId)
                uids.add(bData.userId.toString().trim());
            if (bData.createdByUid)
                uids.add(bData.createdByUid.toString().trim());
        }
        // Buscar usuarios con businessId explícito
        const userByBizQuery = await db
            .collection("users")
            .where("businessId", "==", businessId)
            .limit(20)
            .get();
        userByBizQuery.forEach((uDoc) => uids.add(uDoc.id));
        // Buscar usuarios con businessIds (array)
        const userByBizIdsQuery = await db
            .collection("users")
            .where("businessIds", "array-contains", businessId)
            .limit(20)
            .get();
        userByBizIdsQuery.forEach((uDoc) => uids.add(uDoc.id));
        // Si existe documento directo en /users/{businessId}
        const directUserDoc = await db.collection("users").doc(businessId).get();
        if (directUserDoc.exists) {
            uids.add(directUserDoc.id);
        }
    }
    catch (err) {
        functions.logger.warn(`[MERCHANT_UID_RESOLVER] Error resolviendo UIDs para businessId ${businessId}:`, err === null || err === void 0 ? void 0 : err.message);
    }
    return Array.from(uids).filter((id) => id && !id.startsWith("guest_") && !id.startsWith("device_"));
}
/**
 * Obtiene los tokens FCM activos de todos los administradores/staff del comercio (multi-dispositivo).
 */
async function getMerchantActiveTokens(businessId, branchId) {
    const uids = await resolveMerchantUids(businessId);
    const targetUids = Array.from(new Set([...uids, businessId]));
    const tokens = [];
    for (let i = 0; i < targetUids.length; i += 30) {
        const chunk = targetUids.slice(i, i + 30);
        const snap = await db
            .collection("user_devices")
            .where("uid", "in", chunk)
            .where("isActive", "==", true)
            .get();
        snap.forEach((doc) => {
            const d = doc.data();
            const t = (d === null || d === void 0 ? void 0 : d.fcmToken) ? d === null || d === void 0 ? void 0 : d.fcmToken.trim() : "";
            if (t && t.length > 20 && !tokens.includes(t)) {
                if (branchId && d.branchId && d.branchId !== branchId)
                    return;
                tokens.push(t);
            }
        });
    }
    return { uids, tokens };
}
/**
 * Persiste la notificación in-app en el buzón /users/{merchantUid}/notifications de los usuarios del comercio.
 */
async function persistMerchantInAppNotification(params) {
    const { merchantUids, businessId, branchId, orderId, notificationId, category, type, title, body, priority = "HIGH", destinationRoute = "orders", action = "OPEN_ORDER", metadata = {}, } = params;
    if (!merchantUids || merchantUids.length === 0)
        return;
    const batch = db.batch();
    let count = 0;
    merchantUids.forEach((uid) => {
        const notifRef = db.collection("users").doc(uid).collection("notifications").doc(notificationId);
        batch.set(notifRef, Object.assign({ id: notificationId, notificationId, recipientUid: uid, recipientRole: "MERCHANT", targetAudience: "MERCHANT", businessId: businessId || "", branchId: branchId || "", orderId: orderId || "", entityId: orderId || "", entityType: "order", category,
            type,
            title,
            body,
            priority,
            action,
            destinationRoute, navigationRoute: destinationRoute, deepLink: `bluesystem://merchant/${destinationRoute}${orderId ? `/${orderId}` : ""}`, isRead: false, read: false, deletedByUser: false, visibilityStatus: "VISIBLE", createdAt: FieldValue.serverTimestamp(), sentAt: FieldValue.serverTimestamp(), version: 1 }, metadata), { merge: true });
        count++;
    });
    if (count > 0) {
        await batch.commit().catch((err) => functions.logger.warn(`[MERCHANT_NOTIF_PERSIST] Error guardando notificación in-app para comercio: ${err.message}`));
    }
}
/**
 * 1. TRIGGER: Nuevo pedido en /orders/{orderId} -> Auditoría Financiera Autoritativa de Cupones + Notificar al Comercio
 *
 * C30 FIX: Bifurcación por dominio de negocio:
 * - COMMERCE_DELIVERY: Requiere businessId -> notifica al comercio. Flujo original intacto.
 * - X_TO_Y_DELIVERY:   NO tiene businessId -> emite NEW_X_TO_Y_DELIVERY al pool de motorizados.
 */
exports.notifyNewOrder = functions.firestore
    .document("orders/{orderId}")
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    const order = snap.data();
    const orderId = context.params.orderId;
    if (!order)
        return null;
    // --- C30 FIX: BIFURCACIÓN POR DOMINIO ---
    // Las encomiendas X→Y no tienen businessId por diseño (peer-to-peer).
    // Se notifican al pool de motorizados en onCreate sin esperar transición a "ready".
    const serviceType = (order.serviceType || "").toString().trim();
    const isXToY = serviceType === "X_TO_Y_DELIVERY";
    if (isXToY) {
        // --- DOMINIO B: X_TO_Y_DELIVERY -> Dispatch inmediato al Fleet Pool ---
        const payer = order.payer === "RECIPIENT" ? "Destinatario paga" : "Remitente paga";
        const packageDesc = order.packageDescription || "Encomienda";
        const originAddr = order.businessAddress || (order.origen && order.origen.direccion) || "Punto X";
        const destAddr = order.destinationAddress || (order.destino && order.destino.direccion) || "Punto Y";
        const offerAmount = order.customerOffer || order.deliveryFee || 0;
        functions.logger.info(`[FCM][X_TO_Y] Emitiendo NEW_X_TO_Y_DELIVERY: orderId=${orderId}, offer=C$${offerAmount}`);
        try {
            await messaging.send({
                topic: "available_orders",
                data: {
                    action: "NEW_X_TO_Y_DELIVERY",
                    orderId,
                    serviceType: "X_TO_Y_DELIVERY",
                    screen: "courier_dashboard",
                    title: "📦 ¡Nueva Encomienda X→Y!",
                    body: `${packageDesc} | ${originAddr} → ${destAddr} | ${payer} C$${offerAmount}`,
                },
                android: {
                    priority: "high",
                    directBootOk: true,
                },
            });
            functions.logger.info(`[FCM][X_TO_Y] NEW_X_TO_Y_DELIVERY enviado: orderId=${orderId}`);
        }
        catch (fcmErr) {
            functions.logger.error(`[FCM][X_TO_Y] Error enviando NEW_X_TO_Y_DELIVERY: orderId=${orderId}`, fcmErr);
        }
        return null; // Fin ruta X→Y. No ejecutar cupones ni notificar comercio.
    }
    // --- DOMINIO A: COMMERCE_DELIVERY -> Flujo original intacto ---
    if (!order.businessId) {
        // Pedido sin businessId y sin serviceType reconocido -> ignorar.
        functions.logger.warn(`[FCM] Pedido ${orderId} sin businessId y sin serviceType reconocido. Ignorado.`);
        return null;
    }
    // ─── ESTAMPADO AUTORITATIVO DE UBICACIÓN & MUNICIPIO DEL COMERCIO ─────────────
    try {
        const bizDoc = await db.collection("businesses").doc(order.businessId).get();
        if (bizDoc.exists) {
            const bizData = bizDoc.data() || {};
            let branchData = null;
            if (order.branchId) {
                const branchDoc = await db.collection("branches").doc(order.branchId).get();
                if (branchDoc.exists) {
                    branchData = branchDoc.data() || null;
                    if (branchData && branchData.businessId && branchData.businessId !== order.businessId) {
                        functions.logger.error(`[SECURITY_REJECT] branchId=${order.branchId} pertenece a ${branchData.businessId}, no a ${order.businessId}`);
                        await snap.ref.update({
                            status: "cancelled",
                            estado: "cancelado",
                            cancelReason: "BRANCH_BUSINESS_MISMATCH: La sucursal no pertenece al comercio especificado.",
                            isFraudulent: true,
                            updatedAt: FieldValue.serverTimestamp(),
                        });
                        await db.collection("audit_events").add({
                            event: "BRANCH_BUSINESS_MISMATCH_REJECTED",
                            orderId,
                            businessId: order.businessId,
                            branchId: order.branchId,
                            expectedBusinessId: branchData.businessId,
                            timestamp: FieldValue.serverTimestamp(),
                        });
                        return null;
                    }
                }
            }
            const rawDept = (branchData === null || branchData === void 0 ? void 0 : branchData.departmentId) || (branchData === null || branchData === void 0 ? void 0 : branchData.department) || (branchData === null || branchData === void 0 ? void 0 : branchData.departamento) ||
                bizData.departmentId || bizData.departamento || bizData.department;
            const rawMuni = (branchData === null || branchData === void 0 ? void 0 : branchData.municipalityId) || (branchData === null || branchData === void 0 ? void 0 : branchData.municipio) || (branchData === null || branchData === void 0 ? void 0 : branchData.municipality) || (branchData === null || branchData === void 0 ? void 0 : branchData.cityId) || (branchData === null || branchData === void 0 ? void 0 : branchData.city) || (branchData === null || branchData === void 0 ? void 0 : branchData.ciudad) ||
                bizData.municipalityId || bizData.municipio || bizData.municipality || bizData.cityId || bizData.city || bizData.ciudad;
            let latVal = Number((_c = (_b = (_a = branchData === null || branchData === void 0 ? void 0 : branchData.latitude) !== null && _a !== void 0 ? _a : ((branchData === null || branchData === void 0 ? void 0 : branchData.location) && branchData.location.latitude)) !== null && _b !== void 0 ? _b : branchData === null || branchData === void 0 ? void 0 : branchData.lat) !== null && _c !== void 0 ? _c : 0);
            let lngVal = Number((_f = (_e = (_d = branchData === null || branchData === void 0 ? void 0 : branchData.longitude) !== null && _d !== void 0 ? _d : ((branchData === null || branchData === void 0 ? void 0 : branchData.location) && branchData.location.longitude)) !== null && _e !== void 0 ? _e : branchData === null || branchData === void 0 ? void 0 : branchData.lng) !== null && _f !== void 0 ? _f : 0);
            if (latVal === 0 && lngVal === 0) {
                latVal = Number(bizData.latitude || (bizData.location && bizData.location.latitude) || bizData.lat || 0);
                lngVal = Number(bizData.longitude || (bizData.location && bizData.location.longitude) || bizData.lng || 0);
            }
            const geo = (0, geoCatalog_1.normalizeGeoLocationStrict)(rawDept, rawMuni);
            const deptId = (geo === null || geo === void 0 ? void 0 : geo.departmentId) || "";
            const deptName = (geo === null || geo === void 0 ? void 0 : geo.departmentName) || deptId;
            const muniId = (geo === null || geo === void 0 ? void 0 : geo.municipalityId) || "";
            const muniName = (geo === null || geo === void 0 ? void 0 : geo.municipalityName) || muniId;
            const targetTenantId = (branchData === null || branchData === void 0 ? void 0 : branchData.tenantId) || bizData.tenantId || order.tenantId || "default";
            let commissionRate = 0.15;
            let policyId = "merchant_commission";
            let policyVersion = 1;
            // COURIER-RATE-SSOT-REMEDIATION-004: No hardcoded fallback. Fail-closed if config unavailable.
            let courierRatePerKm = null;
            let courierOrderBonus = 0.0;
            let courierPolicyVersion = 1;
            // CR-002 CLOSED: Client-supplied courierRatePerKmApplied is IGNORED for new orders.
            // The backend is the sole authority — rate comes from system_config/global.
            // Step 1: Resolve merchant commission (override takes precedence)
            if (bizData.commissionOverrideRate !== undefined && bizData.commissionOverrideRate !== null) {
                commissionRate = Number(bizData.commissionOverrideRate);
            }
            // Step 2: ALWAYS read system_config/global for commerce pricing, courier rate AND commission defaults
            let customerRatePerKm = 8.0;
            try {
                const globalCfgDoc = await db.collection("system_config").doc("global").get();
                if (globalCfgDoc.exists) {
                    const gData = globalCfgDoc.data() || {};
                    const commercePricing = gData.commerceDeliveryPricing || {};
                    // Merchant commission defaults (only if no override was set above)
                    if (bizData.commissionOverrideRate === undefined || bizData.commissionOverrideRate === null) {
                        if (gData.merchantCommissionRate != null) {
                            commissionRate = Number(gData.merchantCommissionRate);
                        }
                    }
                    if (gData.merchantCommissionPolicyId) {
                        policyId = gData.merchantCommissionPolicyId;
                    }
                    if (gData.merchantCommissionPolicyVersion) {
                        policyVersion = Number(gData.merchantCommissionPolicyVersion);
                    }
                    // Customer Commerce Rate:
                    if (commercePricing.customerPricePerKm != null) {
                        customerRatePerKm = Number(commercePricing.customerPricePerKm);
                    }
                    else if (gData.customerDeliveryRatePerKm != null) {
                        customerRatePerKm = Number(gData.customerDeliveryRatePerKm);
                    }
                    // Courier rate: ALWAYS from global config (commerceDeliveryPricing or fallback to courierRatePerKm)
                    if (commercePricing.courierPricePerKm != null) {
                        courierRatePerKm = Number(commercePricing.courierPricePerKm);
                    }
                    else if (gData.courierRatePerKm != null) {
                        courierRatePerKm = Number(gData.courierRatePerKm);
                    }
                    if (gData.courierOrderBonus != null) {
                        courierOrderBonus = Number(gData.courierOrderBonus);
                    }
                    if (gData.courierRatePolicyVersion != null) {
                        courierPolicyVersion = Number(gData.courierRatePolicyVersion);
                    }
                }
                else {
                    functions.logger.error(`[COURIER_RATE_SSOT_FAIL] system_config/global document does not exist. Cannot resolve courier rate for orderId=${orderId}`);
                }
            }
            catch (cfgErr) {
                functions.logger.error(`[COURIER_RATE_SSOT_FAIL] Error reading system_config/global for orderId=${orderId}:`, cfgErr);
            }
            // CR-004 CLOSED: Fail-closed validation — no hardcoded 7.0 fallback
            if (courierRatePerKm == null || isNaN(courierRatePerKm) || courierRatePerKm <= 0) {
                functions.logger.error(`[COURIER_RATE_SSOT_FAIL] No valid courierRatePerKm resolved for orderId=${orderId}. ` +
                    `Resolved value: ${courierRatePerKm}. Courier financial fields will not be stamped.`);
                courierRatePerKm = null;
            }
            const subtotalVal = Number(order.subtotal || 0);
            const discountVal = Number(order.discountAmount || order.couponDiscount || 0);
            const grossSalesVal = Number((_g = order.merchantGrossSales) !== null && _g !== void 0 ? _g : (subtotalVal > 0 ? Math.max(0, subtotalVal - discountVal) : (order.total || 0)));
            const commissionAmountVal = Math.round(grossSalesVal * commissionRate * 100) / 100;
            const netPayoutVal = Math.max(0, Math.round((grossSalesVal - commissionAmountVal) * 100) / 100);
            const deliveryFeeVal = Number(order.deliveryFee || 0);
            const tipVal = Number(order.tipAmount || order.tip || 0);
            const addChargeVal = Number(order.additionalChargeAmount || order.additionalCharge || 0);
            const platformRevenueVal = Math.round((commissionAmountVal + addChargeVal) * 100) / 100;
            const destMuni = (order.destinationMunicipalityId || (order.deliveryAddress && order.deliveryAddress.municipalityId) || muniId).toString().trim().toUpperCase();
            // 🔒 C2D.35.GEO-R.2: KILL-SWITCH AUTORITATIVO INTRAMUNICIPAL
            if (!muniId || !destMuni || muniId !== destMuni) {
                functions.logger.error(`[SECURITY_REJECT] Violación de aislamiento municipal en Commerce Delivery: origin=${muniId}, dest=${destMuni}, orderId=${orderId}`);
                await snap.ref.update({
                    status: "cancelled",
                    estado: "cancelado",
                    cancelReason: `CROSS_CITY_ORDER_BLOCKED: Envíos comerciales intramunicipales únicamente (${muniId} -> ${destMuni}). Utilice X->Y.`,
                    isFraudulent: true,
                    updatedAt: FieldValue.serverTimestamp(),
                });
                await db.collection("audit_events").add({
                    event: "CROSS_CITY_ORDER_REJECTED",
                    orderId,
                    customerId: order.customerId || order.clienteId || "",
                    businessId: order.businessId,
                    originMunicipalityId: muniId,
                    destinationMunicipalityId: destMuni,
                    timestamp: FieldValue.serverTimestamp(),
                });
                return null;
            }
            // ── Resolución de Distancia Operacional Real y Ganancia Canónica del Courier ──
            let routeDistanceMeters = 0;
            let distanceSource = "ROUTE_DISTANCE_UNAVAILABLE";
            let routingProvider = "FALLBACK_ESTIMATED";
            if (order.routeDistanceMeters != null && Number(order.routeDistanceMeters) > 0) {
                routeDistanceMeters = Math.round(Number(order.routeDistanceMeters));
                distanceSource = order.distanceSource || "ROUTING_ENGINE";
                routingProvider = order.routingProvider || "GOOGLE_ROUTES_V2";
            }
            else if (order.routeDistanceKm != null && Number(order.routeDistanceKm) > 0) {
                routeDistanceMeters = Math.round(Number(order.routeDistanceKm) * 1000);
                distanceSource = order.distanceSource || "ROUTING_ENGINE";
                routingProvider = order.routingProvider || "OSRM_ENGINE";
            }
            else if (order.distanceKm != null && Number(order.distanceKm) > 0) {
                routeDistanceMeters = Math.round(Number(order.distanceKm) * 1000);
                distanceSource = "ROUTING_ENGINE";
                routingProvider = "OSRM_ENGINE";
            }
            else {
                const destLat = Number((_p = (_l = (_h = order.destinationLatitude) !== null && _h !== void 0 ? _h : (_k = (_j = order.rawDestino) === null || _j === void 0 ? void 0 : _j.coordenadas) === null || _k === void 0 ? void 0 : _k.latitud) !== null && _l !== void 0 ? _l : (_o = (_m = order.destino) === null || _m === void 0 ? void 0 : _m.coordenadas) === null || _o === void 0 ? void 0 : _o.latitud) !== null && _p !== void 0 ? _p : order.latitude);
                const destLng = Number((_w = (_t = (_q = order.destinationLongitude) !== null && _q !== void 0 ? _q : (_s = (_r = order.rawDestino) === null || _r === void 0 ? void 0 : _r.coordenadas) === null || _s === void 0 ? void 0 : _s.longitud) !== null && _t !== void 0 ? _t : (_v = (_u = order.destino) === null || _u === void 0 ? void 0 : _u.coordenadas) === null || _v === void 0 ? void 0 : _v.longitud) !== null && _w !== void 0 ? _w : order.longitude);
                if (!isNaN(latVal) && !isNaN(lngVal) && !isNaN(destLat) && !isNaN(destLng) && latVal !== 0 && destLat !== 0) {
                    const R = 6371000;
                    const dLat = ((destLat - latVal) * Math.PI) / 180;
                    const dLon = ((destLng - lngVal) * Math.PI) / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos((latVal * Math.PI) / 180) *
                            Math.cos((destLat * Math.PI) / 180) *
                            Math.sin(dLon / 2) *
                            Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const haversineMeters = R * c;
                    routeDistanceMeters = Math.round(haversineMeters * 1.28);
                    distanceSource = "FALLBACK_ESTIMATED";
                    routingProvider = "FALLBACK_ESTIMATED";
                }
            }
            const routeDistanceKm = Math.round((routeDistanceMeters / 1000) * 100) / 100;
            // COURIER-RATE-SSOT-REMEDIATION-004: Courier financials only calculated if rate is valid
            const effectiveCourierRate = courierRatePerKm !== null && courierRatePerKm !== void 0 ? courierRatePerKm : 0;
            const ratePerKmCents = Math.round(effectiveCourierRate * 100);
            const distanceEarningsCents = courierRatePerKm != null ? Math.round((routeDistanceMeters * ratePerKmCents) / 1000) : 0;
            const bonusEarningsCents = courierRatePerKm != null ? Math.round(courierOrderBonus * 100) : 0;
            const tipEarningsCents = Math.round(tipVal * 100);
            const courierTotalEarningsCents = distanceEarningsCents + bonusEarningsCents + tipEarningsCents;
            const courierTotalEarningsFloat = Math.round(courierTotalEarningsCents) / 100;
            const courierDistanceEarningsFloat = Math.round(distanceEarningsCents) / 100;
            const courierBonusEarningsFloat = Math.round(bonusEarningsCents) / 100;
            const pricingSnapshot = {
                serviceType: "COMMERCE_DELIVERY",
                customerPricePerKm: customerRatePerKm,
                courierPricePerKm: effectiveCourierRate,
                routeDistanceKm,
                routeDistanceMeters,
                deliveryFee: deliveryFeeVal,
                courierEarnings: courierDistanceEarningsFloat,
                currency: "NIO",
                pricingVersion: "v2.2-commerce",
                calculatedAt: new Date().toISOString(),
            };
            const locationStamp = {
                commercialMunicipalityId: muniId,
                originMunicipalityId: muniId,
                originBranchId: order.branchId || null,
                commercialTenantId: targetTenantId,
                destinationMunicipalityId: destMuni,
                businessDepartmentId: deptId,
                businessDepartment: deptName,
                businessMunicipalityId: muniId,
                businessMunicipality: muniName,
                departmentId: deptId,
                departmentName: deptName,
                municipalityId: muniId,
                municipalityName: muniName,
                cityId: muniId,
                city: muniName,
                businessLatitude: latVal,
                businessLongitude: lngVal,
                tenantId: targetTenantId,
                merchantGrossSales: grossSalesVal,
                merchantCommissionRate: commissionRate,
                merchantCommissionAmount: commissionAmountVal,
                merchantNetPayout: netPayoutVal,
                merchantCommissionPolicyId: policyId,
                merchantCommissionPolicyVersion: policyVersion,
                routeDistanceMeters,
                routeDistanceKm,
                distanceKm: routeDistanceKm,
                distanceSource,
                routingProvider,
                customerPricePerKm: customerRatePerKm,
                courierPricePerKm: effectiveCourierRate,
                pricingVersion: "v2.2-commerce",
                pricingSnapshot,
                courierRatePerKmApplied: effectiveCourierRate,
                courierOrderBonusApplied: courierOrderBonus,
                courierDistanceEarnings: courierDistanceEarningsFloat,
                courierBonusEarnings: courierBonusEarningsFloat,
                courierDeliveryEarnings: deliveryFeeVal,
                courierTipEarnings: tipVal,
                courierTotalEarnings: courierTotalEarningsFloat,
                courierEarnings: courierTotalEarningsFloat, // Legacy alias
                gananciaRepartidor: courierTotalEarningsFloat, // Legacy alias
                platformAdditionalChargeRevenue: addChargeVal,
                platformCommissionRevenue: commissionAmountVal,
                platformRevenue: platformRevenueVal,
                customerTotal: Number(order.total || 0),
            };
            await snap.ref.update(locationStamp);
            functions.logger.info(`[FLEET_ELIGIBILITY_ORDER_STAMP] orderId=${orderId} businessId=${order.businessId} branchId=${order.branchId || "none"} municipality=${muniId} department=${deptId} tenant=${targetTenantId} grossSales=${grossSalesVal}`);
        }
    }
    catch (stampErr) {
        functions.logger.warn(`[FLEET_ELIGIBILITY_ORDER_STAMP_WARN] Error estampando ubicación para orden ${orderId}:`, stampErr);
    }
    // ─── GATE DE PAGOS & DEFENSA SECUNDARIA CONTRA FALSO PAGO ───────────────
    const paymentValidation = (0, paymentActivationGate_1.validatePaymentRequest)(order.paymentMethod);
    const declaredPaymentStatus = (order.paymentStatus || "").toString().toUpperCase();
    const isUnauthorizedPaidState = (declaredPaymentStatus === "PAID" || order.paymentVerified === true) &&
        !order.authoritativeGatewayVerified;
    if (!paymentValidation.isValid || isUnauthorizedPaidState) {
        functions.logger.warn(`[PAYMENT_GUARD] Intento de pago no autorizado en pedido ${orderId}: method=${order.paymentMethod}, status=${order.paymentStatus}`);
        await snap.ref.update({
            status: "cancelled",
            estado: "cancelado",
            cancellationReason: isUnauthorizedPaidState
                ? "UNAUTHORIZED_PAYMENT_STATE: Declaración no autorizada de pago completado"
                : (paymentValidation.errorMessage || "PAYMENT_GATEWAY_NOT_AVAILABLE"),
            paymentStatus: "FAILED",
            paymentVerified: false,
            updatedAt: FieldValue.serverTimestamp(),
        });
        await db.collection("audit_events").add({
            event: "PAYMENT_ATTEMPT_BLOCKED",
            reason: isUnauthorizedPaidState
                ? "UNAUTHORIZED_PAID_STATE"
                : (paymentValidation.errorCode || "GATEWAY_NOT_AVAILABLE"),
            orderId,
            customerId: order.customerId || order.clienteId || "",
            businessId: order.businessId,
            paymentMethod: order.paymentMethod || "unknown",
            timestamp: FieldValue.serverTimestamp(),
        });
        return null; // Detener propagación: no notificar al comercio como orden válida
    }
    // ─── AUDITORÍA FINANCIERA AUTORITATIVA & REDENCIÓN SERVER-SIDE ───────────────
    try {
        const rawCode = (order.couponCode || "").trim().toUpperCase();
        const declaredCouponDiscount = Number(order.couponDiscount) || 0;
        const subtotal = Number(order.subtotal) || 0;
        const deliveryFee = Number(order.deliveryFee) || 0;
        const promoDiscount = Number(order.promotionDiscount) || 0;
        const customerId = order.customerId || order.clienteId || order.userId || "";
        const businessId = order.businessId;
        const branchId = order.branchId || "";
        const items = order.items || [];
        if (rawCode) {
            // Redención y validación atómica autoritativa en Firestore Transaction
            await db.runTransaction(async (transaction) => {
                const redemptionDocId = `${orderId}_${rawCode}`;
                const redemptionRef = db.collection("coupon_redemptions").doc(redemptionDocId);
                const redemptionSnap = await transaction.get(redemptionRef);
                const couponQuery = db.collection("coupons").where("code", "==", rawCode).limit(1);
                const couponQuerySnap = await transaction.get(couponQuery);
                if (couponQuerySnap.empty) {
                    // Cupón inexistente -> Corregir fraude/inyección
                    transaction.update(snap.ref, {
                        couponDiscount: 0,
                        couponCode: "",
                        couponStatus: "REJECTED_NOT_FOUND",
                        total: Math.max(0, subtotal + deliveryFee - promoDiscount),
                        totalDiscount: promoDiscount,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    await db.collection("audit_events").add({
                        event: "COUPON_FRAUD_PREVENTED",
                        reason: "COUPON_NOT_FOUND",
                        orderId,
                        code: rawCode,
                        customerId,
                        businessId,
                        timestamp: FieldValue.serverTimestamp(),
                    });
                    return;
                }
                const couponDoc = couponQuerySnap.docs[0];
                const couponData = Object.assign({ id: couponDoc.id }, couponDoc.data());
                // Contar redenciones previas del cliente si hay límite
                let customerPreviousRedemptionCount = 0;
                if (customerId && couponData.perCustomerLimit && couponData.perCustomerLimit > 0) {
                    const custRedemptions = await db
                        .collection("coupon_redemptions")
                        .where("couponId", "==", couponDoc.id)
                        .where("customerId", "==", customerId)
                        .where("status", "in", ["APPLIED", "CONFIRMED", "REDEEMED"])
                        .get();
                    customerPreviousRedemptionCount = custRedemptions.size;
                }
                // Importar e invocar evaluación determinista
                const { evaluateCoupon } = require("../domain/coupons/couponEngine");
                const evalResult = evaluateCoupon(couponData, {
                    couponCode: rawCode,
                    businessId,
                    branchId,
                    customerId,
                    cartSubtotal: subtotal,
                    deliveryFee,
                    items,
                    currentTimestamp: Date.now(),
                    customerPreviousRedemptionCount,
                    existingPromotionDiscount: promoDiscount,
                });
                if (!evalResult.isValid) {
                    // Cupón no válido (negocio equivocado, expirado, límite alcanzado, etc.) -> Forzar rechazo
                    transaction.update(snap.ref, {
                        couponDiscount: 0,
                        couponCode: rawCode,
                        couponStatus: `REJECTED_${evalResult.errorCode || "INVALID"}`,
                        total: Math.max(0, subtotal + deliveryFee - promoDiscount),
                        totalDiscount: promoDiscount,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    await db.collection("audit_events").add({
                        event: "COUPON_REJECTED_ON_ORDER",
                        errorCode: evalResult.errorCode,
                        errorMessage: evalResult.errorMessage,
                        orderId,
                        code: rawCode,
                        customerId,
                        businessId,
                        timestamp: FieldValue.serverTimestamp(),
                    });
                    return;
                }
                const authoritativeDiscount = evalResult.discountAmount + evalResult.deliveryDiscountAmount;
                const authoritativeTotal = Math.max(0, subtotal + deliveryFee - promoDiscount - authoritativeDiscount);
                // Si el cliente manipuló el descuento o el total, imponer el resultado autoritativo
                if (declaredCouponDiscount !== authoritativeDiscount || Number(order.total) !== authoritativeTotal) {
                    transaction.update(snap.ref, {
                        couponDiscount: authoritativeDiscount,
                        total: authoritativeTotal,
                        totalDiscount: promoDiscount + authoritativeDiscount,
                        coupon: evalResult.appliedCouponSnapshot,
                        financialCorrectionApplied: true,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }
                // Crear redención atómica si no existe
                if (!redemptionSnap.exists) {
                    transaction.set(redemptionRef, {
                        redemptionId: redemptionDocId,
                        idempotencyKey: redemptionDocId,
                        couponId: couponDoc.id,
                        code: rawCode,
                        orderId,
                        customerId,
                        businessId: couponData.businessId || businessId,
                        branchId: branchId || null,
                        discountAmount: authoritativeDiscount,
                        discountType: couponData.discountType,
                        status: "CONFIRMED",
                        redeemedAt: FieldValue.serverTimestamp(),
                    });
                    // Incrementar usageCount atómicamente en el cupón
                    transaction.update(couponDoc.ref, {
                        usageCount: FieldValue.increment(1),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }
            });
        }
        else if (declaredCouponDiscount > 0) {
            // Inyección de descuento sin código -> Corregir inmediatamente
            await snap.ref.update({
                couponDiscount: 0,
                total: Math.max(0, subtotal + deliveryFee - promoDiscount),
                totalDiscount: promoDiscount,
                fraudInjectedDiscountEliminated: true,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
    }
    catch (e) {
        console.error(`[FINANCIAL_AUDIT_ERROR] Error auditando pedido ${orderId}:`, e);
    }
    // ─── RESOLUCIÓN / ASIGNACIÓN FALLBACK DE ORDERCODE ATÓMICO (BSD-HUMAN-ORDER-CODE-001) ───
    let orderCode = (order.orderCode || "").toString().trim();
    let orderShortCode = (order.orderShortCode || "").toString().trim();
    let orderSequence = Number(order.orderSequence || 0);
    let orderCodePrefix = (order.orderCodePrefix || "").toString().trim();
    if ((!orderCode || !orderSequence || orderSequence <= 0) && order.businessId) {
        try {
            const assignedData = await db.runTransaction(async (t) => {
                const freshSnap = await t.get(snap.ref);
                const freshData = freshSnap.data() || {};
                if (freshData.orderCode && freshData.orderSequence && freshData.orderSequence > 0) {
                    return {
                        orderCode: freshData.orderCode,
                        orderShortCode: freshData.orderShortCode,
                        orderSequence: freshData.orderSequence,
                        orderCodePrefix: freshData.orderCodePrefix,
                    };
                }
                const generated = await (0, orderCodeUtils_1.getNextOrderCodeInTransaction)(t, db, order.businessId);
                t.update(snap.ref, {
                    orderCode: generated.orderCode,
                    orderShortCode: generated.orderShortCode,
                    orderSequence: generated.orderSequence,
                    orderCodePrefix: generated.orderCodePrefix,
                });
                return generated;
            });
            orderCode = assignedData.orderCode;
            orderShortCode = assignedData.orderShortCode;
            orderSequence = assignedData.orderSequence;
            orderCodePrefix = assignedData.orderCodePrefix;
            functions.logger.info(`[ORDER_CODE_FALLBACK_STAMP] orderId=${orderId} asignado orderCode=${orderCode}`);
        }
        catch (assignErr) {
            functions.logger.warn(`[ORDER_CODE_FALLBACK_WARN] Error asignando orderCode para ${orderId}:`, assignErr);
        }
    }
    // ─── NOTIFICACIÓN IN-APP & FCM MULTI-DISPOSITIVO AL COMERCIO ─────────────
    const { uids: merchantUids, tokens: merchantTokens } = await getMerchantActiveTokens(order.businessId, order.branchId);
    const fulfillmentText = order.fulfillmentType === "PICKUP" ? "🏪 Retiro en Tienda (PICKUP)" : "🛵 Envío Delivery";
    const displayCode = orderCode ? ` #${orderCode}` : "";
    const newOrderTitle = "🛒 ¡Nuevo Pedido Entrante!";
    const newOrderBody = `[${fulfillmentText}] Pedido${displayCode} - Cliente: ${order.customerName || "Cliente"} - Total: C$ ${order.total || "0.00"}`;
    // 1. Persistir notificación in-app en buzón del comercio
    const notifDocId = `order_${orderId}_created_merchant`;
    await persistMerchantInAppNotification({
        merchantUids,
        businessId: order.businessId,
        branchId: order.branchId,
        orderId,
        notificationId: notifDocId,
        category: "Pedidos",
        type: "NEW_ORDER",
        title: newOrderTitle,
        body: newOrderBody,
        priority: "HIGH",
        destinationRoute: "orders",
        action: "OPEN_ORDER",
        metadata: {
            orderCode: orderCode || "",
            orderShortCode: orderShortCode || "",
            fulfillmentType: order.fulfillmentType || "DELIVERY",
            total: order.total || 0,
        },
    });
    // 2. Despachar FCM Push a los dispositivos activos del comercio
    if (merchantTokens.length === 0)
        return null;
    return messaging.sendEachForMulticast({
        tokens: merchantTokens,
        data: {
            action: "NEW_ORDER",
            orderId,
            orderCode: orderCode || "",
            orderShortCode: orderShortCode || "",
            branchId: order.branchId || "",
            fulfillmentType: order.fulfillmentType || "DELIVERY",
            screen: "business_dashboard",
            title: newOrderTitle,
            body: newOrderBody,
            notificationId: notifDocId,
        },
        android: {
            priority: "high",
            directBootOk: true,
        },
    });
});
/**
 * Determina si el comercio del pedido es un restaurante / negocio gastronómico.
 * Aplica la regla estricta:
 * 1. isRestaurant booleano explícito.
 * 2. businessType o category / categoria / businessCategory coincidente con gastronomía.
 * 3. Fallback de seguridad: false (no asumir restaurante).
 */
async function resolveMerchantIsRestaurant(orderData) {
    var _a;
    if (!orderData)
        return false;
    // 1. Booleano explícito en los datos del pedido
    if (typeof orderData.isRestaurant === "boolean") {
        return orderData.isRestaurant;
    }
    const checkGastronomyCategory = (cat) => {
        if (!cat)
            return null;
        const norm = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const nonGastroKeywords = [
            "tecnologia", "technology", "gadgets", "supermercado", "supermarket", "abarrotes",
            "farmacia", "pharmacy", "salud", "ropa", "clothing", "calzado", "tienda", "retail",
            "electronics", "hardware", "ferreteria", "zapateria", "belleza", "cosmeticos"
        ];
        for (const ng of nonGastroKeywords) {
            if (norm.includes(ng))
                return false;
        }
        const gastroKeywords = [
            "restaurante", "restaurant", "comida rapida", "fast food", "fast_food",
            "cafeteria", "panaderia", "bakery", "cafe", "gastronomia", "reposteria", "pizzeria",
            "heladeria", "hamburguesas", "tacos", "antojitos", "pupuseria", "asados", "mariscos",
            "comida", "food", "beverage"
        ];
        for (const g of gastroKeywords) {
            if (norm.includes(g))
                return true;
        }
        return null;
    };
    // 2. Evaluar campos presentes en la orden
    const orderCat = (orderData.category || orderData.categoria || orderData.businessCategory || orderData.storeType || "").toString();
    const orderBizType = (orderData.businessType || orderData.merchantType || "").toString();
    const directGastroOrder = (_a = checkGastronomyCategory(orderBizType)) !== null && _a !== void 0 ? _a : checkGastronomyCategory(orderCat);
    if (directGastroOrder !== null) {
        return directGastroOrder;
    }
    // 3. Consulta documental resiliente a /businesses/{businessId} o /users/{businessId}
    const businessId = (orderData.businessId || orderData.restaurantId || orderData.comercioId || "").toString().trim();
    if (businessId) {
        try {
            const bizDoc = await db.collection("businesses").doc(businessId).get();
            if (bizDoc.exists) {
                const data = bizDoc.data() || {};
                if (typeof data.isRestaurant === "boolean")
                    return data.isRestaurant;
                const bizCat = (data.category || data.categoria || data.businessCategory || data.businessType || data.storeType || "").toString();
                const res = checkGastronomyCategory(bizCat);
                if (res !== null)
                    return res;
            }
            else {
                const userDoc = await db.collection("users").doc(businessId).get();
                if (userDoc.exists) {
                    const uData = userDoc.data() || {};
                    if (typeof uData.isRestaurant === "boolean")
                        return uData.isRestaurant;
                    const uCat = (uData.category || uData.categoria || uData.businessCategory || uData.businessType || uData.storeType || "").toString();
                    const res = checkGastronomyCategory(uCat);
                    if (res !== null)
                        return res;
                }
            }
        }
        catch (e) {
            functions.logger.warn(`[RESTAURANT_RESOLVER] Error consultando negocio ${businessId}: ${e.message}`);
        }
    }
    // 4. Fallback de seguridad incondicional: false
    return false;
}
/**
 * 2. TRIGGER: Cambio de estado en /orders/{orderId} -> Notificar al destinatario (Multi-Dispositivo)
 */
exports.notifyOrderStatusChange = functions.firestore
    .document("orders/{orderId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;
    if (!before || !after)
        return null;
    const previousStatus = (before.status || before.estado || "").toString().toLowerCase().trim();
    const currentStatus = (after.status || after.estado || "").toString().toLowerCase().trim();
    const previousCourierId = (before.assignedCourierId || before.motorizadoId || "").toString().trim();
    const assignedCourierId = (after.assignedCourierId || after.motorizadoId || "").toString().trim();
    const courierIdChanged = previousCourierId !== assignedCourierId;
    const statusChanged = previousStatus !== currentStatus;
    if (!statusChanged && !courierIdChanged)
        return null;
    // 1. Notificación directa al motorizado cuando es asignado por el comercio o administración
    if (assignedCourierId && (currentStatus === "assigned" || currentStatus === "asignado" || courierIdChanged)) {
        const courierTokens = await getUserActiveTokens(assignedCourierId);
        if (courierTokens.length > 0) {
            functions.logger.info(`[FCM] Enviando notificación de asignación a courierUid=${assignedCourierId}, orderId=${orderId}`);
            const displayCode = after.orderCode || orderId.slice(-6).toUpperCase();
            await messaging.sendEachForMulticast({
                tokens: courierTokens,
                data: {
                    action: "COURIER_ASSIGNED",
                    orderId,
                    orderCode: (after.orderCode || "").toString(),
                    orderShortCode: (after.orderShortCode || "").toString(),
                    status: currentStatus || "assigned",
                    screen: "assigned_orders",
                    title: "🛵 Nuevo pedido asignado",
                    body: `[${after.businessName || "Comercio"}] Pedido #${displayCode} — Total: C$ ${after.total || "0.00"}`,
                },
                android: { priority: "high", directBootOk: true },
            });
        }
    }
    // 2. Notificación al pool de motorizados (Fleet Pool) si pasa a ready y no tiene motorizado asignado.
    // C30 DEDUP GUARD: Se excluyen X_TO_Y_DELIVERY porque recibieron su notificación
    // NEW_X_TO_Y_DELIVERY en onCreate. Evita doble notificación al Courier.
    const orderServiceType = (after.serviceType || "").toString().trim();
    const isXToYOrder = orderServiceType === "X_TO_Y_DELIVERY";
    if (currentStatus === "ready" && !assignedCourierId && statusChanged && !isXToYOrder) {
        const targetTenantId = (after.commercialTenantId || after.tenantId || "default").toString().trim();
        const targetMuniId = (after.commercialMunicipalityId || after.municipalityId || after.cityId || "").toString().trim().toUpperCase();
        // 🔒 C2D.35.GEO-R.2: FAIL-CLOSED FCM. Si no hay municipio comercial válido, NUNCA radiodifundir a available_orders
        if (!targetMuniId) {
            functions.logger.error(`[FCM_ABORT] Orden ${orderId} en estado READY carece de commercialMunicipalityId válido. Difusión a pool cancelada.`);
        }
        else {
            const topicName = `fleet_${targetTenantId}_${targetMuniId}`;
            functions.logger.info(`[FCM] Difundiendo pedido listo al pool de repartidores (${topicName}): orderId=${orderId} muni=${targetMuniId}`);
            await messaging.send({
                topic: topicName,
                data: {
                    action: "NEW_ORDER",
                    orderId,
                    orderCode: (after.orderCode || "").toString(),
                    orderShortCode: (after.orderShortCode || "").toString(),
                    title: "🛵 Pedido Listo para Recoger",
                    body: `Comercio: ${after.businessName || "Comercio"} - Dir: ${after.destinationAddress || "Dirección de entrega"}`,
                    tenantId: targetTenantId,
                    commercialTenantId: targetTenantId,
                    cityId: targetMuniId,
                    municipalityId: targetMuniId,
                    commercialMunicipalityId: targetMuniId,
                    departmentId: (after.departmentId || "").toString(),
                },
                android: { priority: "high", directBootOk: true },
            });
        }
    }
    // 3. Matriz de Notificaciones Transaccionales para el Cliente (Customer)
    let targetCustomerId = (after.customerId || after.userId || after.uid || "").toString().trim();
    let title = "";
    let body = "";
    let actionType = "ORDER_STATUS";
    let canonicalType = "ORDER_STATUS_CHANGED";
    let destinationType = "CUSTOMER_ORDER_DETAIL";
    let canonicalAction = "OPEN_ORDER";
    let shouldNotifyCustomer = false;
    const businessName = (after.businessName || after.nombreComercio || "El comercio").toString().trim();
    switch (currentStatus) {
        case "pending":
        case "pendiente":
            title = "Pedido recibido";
            body = "Estamos procesando tu pedido.";
            canonicalType = "ORDER_CREATED";
            destinationType = "CUSTOMER_ORDER_DETAIL";
            canonicalAction = "OPEN_ORDER";
            shouldNotifyCustomer = true;
            break;
        case "preparing":
        case "preparando":
        case "en_cocina": {
            const isRestaurant = await resolveMerchantIsRestaurant(after);
            if (isRestaurant) {
                title = "🍳 Pedido en Cocina";
                body = `${businessName} está preparando tu pedido.`;
            }
            else {
                title = "📦 Tu pedido en Preparación";
                body = `${businessName} está preparando tu pedido.`;
            }
            canonicalType = "ORDER_PREPARING";
            destinationType = "CUSTOMER_ORDER_DETAIL";
            canonicalAction = "OPEN_ORDER";
            shouldNotifyCustomer = true;
            break;
        }
        case "ready":
        case "listo":
            title = "📦 Tu pedido está listo";
            body = "Tu pedido está listo y pronto será entregado.";
            canonicalType = "ORDER_READY";
            destinationType = "CUSTOMER_ORDER_DETAIL";
            canonicalAction = "OPEN_ORDER";
            shouldNotifyCustomer = true;
            break;
        case "assigned":
        case "asignado":
            title = "🛵 Repartidor asignado";
            body = "Un motorizado ha sido asignado para entregar tu pedido.";
            canonicalType = "COURIER_ASSIGNED";
            destinationType = "CUSTOMER_ORDER_DETAIL";
            canonicalAction = "OPEN_ORDER";
            shouldNotifyCustomer = true;
            break;
        case "courier_accepted":
        case "aceptado_por_motorizado":
            title = "🛵 Repartidor confirmado";
            body = "Tu repartidor aceptó el pedido y se dirige al comercio.";
            canonicalType = "COURIER_ASSIGNED";
            destinationType = "CUSTOMER_ORDER_DETAIL";
            canonicalAction = "OPEN_ORDER";
            shouldNotifyCustomer = true;
            break;
        case "picked_up":
        case "recogido":
            title = "📦 Pedido recogido";
            body = "El motorizado ha recogido tu pedido en el comercio.";
            canonicalType = "ORDER_PICKED_UP";
            destinationType = "CUSTOMER_ORDER_TRACKING";
            canonicalAction = "OPEN_TRACKING";
            shouldNotifyCustomer = true;
            break;
        case "in_transit":
        case "en_camino":
            title = "🛵 Tu pedido está en camino";
            body = "Tu repartidor lleva tu pedido en ruta hacia tu dirección.";
            canonicalType = "ORDER_IN_TRANSIT";
            destinationType = "CUSTOMER_ORDER_TRACKING";
            canonicalAction = "OPEN_TRACKING";
            shouldNotifyCustomer = true;
            break;
        case "delivered":
        case "entregado":
            title = "🎉 ¡Pedido entregado!";
            body = "Tu pedido fue entregado correctamente.";
            canonicalType = "ORDER_DELIVERED";
            destinationType = "CUSTOMER_ORDER_DETAIL";
            canonicalAction = "OPEN_ORDER";
            shouldNotifyCustomer = true;
            break;
        case "completed":
        case "completado":
            // Si el estado previo fue 'delivered', no saturar al cliente con un push duplicado instantáneo
            if (previousStatus !== "delivered" && previousStatus !== "entregado") {
                title = "✓ Pedido completado";
                body = "Tu pedido ha sido completado con éxito.";
                canonicalType = "ORDER_DELIVERED";
                destinationType = "CUSTOMER_ORDER_DETAIL";
                canonicalAction = "OPEN_ORDER";
                shouldNotifyCustomer = true;
            }
            break;
        case "cancelled":
        case "cancelado":
            actionType = "ORDER_CANCELLED";
            canonicalType = "ORDER_CANCELLED";
            destinationType = "CUSTOMER_ORDER_DETAIL";
            canonicalAction = "OPEN_ORDER";
            title = "🚫 Pedido cancelado";
            body = after.cancellationReason ? `Motivo: ${after.cancellationReason}` : "Tu pedido ha sido cancelado.";
            shouldNotifyCustomer = true;
            break;
    }
    if (!shouldNotifyCustomer || !targetCustomerId) {
        return null;
    }
    // Ruta de destino contextual canónica
    const destinationRoute = destinationType === "CUSTOMER_ORDER_TRACKING"
        ? `customer/order_tracking/${orderId}`
        : `order_detail/${orderId}`;
    // 4. Persistir evento en users/{customerId}/notifications/ (Centro Interno In-App) con ID idempotente
    const notifDocId = `order_${orderId}_${currentStatus}`;
    if (shouldNotifyCustomer && targetCustomerId) {
        try {
            const userNotifRef = db.collection("users").doc(targetCustomerId).collection("notifications").doc(notifDocId);
            await userNotifRef.set({
                id: notifDocId,
                notificationId: notifDocId,
                orderId,
                entityId: orderId,
                entityType: "order",
                businessId: after.businessId || "",
                title,
                body,
                category: "Pedidos",
                type: canonicalType,
                destinationType,
                action: canonicalAction,
                priority: "HIGH",
                status: currentStatus,
                isRead: false,
                read: false,
                deletedByUser: false,
                visibilityStatus: "VISIBLE",
                sentAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp(),
                deepLink: destinationRoute,
                navigationRoute: destinationRoute,
                version: 1,
            }, { merge: true });
        }
        catch (e) {
            functions.logger.warn(`[NOTIFICATIONS] Error persistiendo notificación in-app para ${targetCustomerId}: ${e.message}`);
        }
        // 5. Enviar FCM Multicast a los dispositivos activos del cliente
        const customerTokens = await getUserActiveTokens(targetCustomerId);
        if (customerTokens.length > 0) {
            functions.logger.info(`[FCM] Enviando push transaccional a ${customerTokens.length} dispositivo(s) de ${targetCustomerId} (Status: ${currentStatus})`);
            await messaging.sendEachForMulticast({
                tokens: customerTokens,
                data: {
                    action: actionType,
                    orderId,
                    orderCode: (after.orderCode || "").toString(),
                    orderShortCode: (after.orderShortCode || "").toString(),
                    entityId: orderId,
                    entityType: "order",
                    businessId: (after.businessId || "").toString(),
                    type: canonicalType,
                    destinationType,
                    route: destinationRoute,
                    deepLink: destinationRoute,
                    navigationRoute: destinationRoute,
                    status: currentStatus,
                    screen: destinationType === "CUSTOMER_ORDER_TRACKING" ? "order_tracking" : "order_detail",
                    title,
                    body,
                    notificationId: notifDocId,
                },
                android: {
                    priority: "high",
                    directBootOk: true,
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title,
                                body,
                            },
                            sound: "default",
                            badge: 1,
                        },
                    },
                    headers: {
                        "apns-priority": "10",
                    },
                },
            }).catch((err) => functions.logger.warn(`[FCM] Error enviando push a cliente: ${err.message}`));
        }
    }
    // 6. Matriz de Notificaciones Operativas para el Comercio (Merchant)
    if (after.businessId) {
        let merchantTitle = "";
        let merchantBody = "";
        let merchantNotifType = "";
        let shouldNotifyMerchant = false;
        const displayCode = after.orderCode || (after.orderShortCode ? `#${after.orderShortCode}` : orderId.slice(-6).toUpperCase());
        const courierName = after.assignedCourierName || after.driverName || after.motorizadoName || "Motorizado";
        const custName = after.customerName || after.clienteNombre || "Cliente";
        switch (currentStatus) {
            case "assigned":
            case "asignado":
            case "courier_accepted":
            case "aceptado_por_motorizado":
                merchantTitle = `🛵 Motorizado Asignado (#${displayCode})`;
                merchantBody = `${courierName} ha sido asignado para recoger el pedido de ${custName}.`;
                merchantNotifType = "COURIER_ASSIGNED";
                shouldNotifyMerchant = true;
                break;
            case "ready":
            case "listo":
                if (statusChanged) {
                    merchantTitle = `📦 Pedido Listo para Despacho (#${displayCode})`;
                    merchantBody = `Pedido marcado como listo. Esperando recolección por motorizado.`;
                    merchantNotifType = "ORDER_READY";
                    shouldNotifyMerchant = true;
                }
                break;
            case "picked_up":
            case "recogido":
                merchantTitle = `📦 Pedido Recogido (#${displayCode})`;
                merchantBody = `${courierName} ha recogido el pedido y se dirige al cliente.`;
                merchantNotifType = "ORDER_PICKED_UP";
                shouldNotifyMerchant = true;
                break;
            case "in_transit":
            case "en_camino":
                merchantTitle = `🛵 Pedido en Camino (#${displayCode})`;
                merchantBody = `El pedido va en ruta hacia la dirección del cliente (${custName}).`;
                merchantNotifType = "ORDER_IN_TRANSIT";
                shouldNotifyMerchant = true;
                break;
            case "delivered":
            case "entregado":
            case "completed":
            case "completado":
                if (previousStatus !== "delivered" && previousStatus !== "entregado" && previousStatus !== "completed") {
                    merchantTitle = `✅ ¡Pedido Entregado! (#${displayCode})`;
                    merchantBody = `El pedido fue entregado con éxito a ${custName}. Total: C$ ${after.total || "0.00"}`;
                    merchantNotifType = "ORDER_DELIVERED";
                    shouldNotifyMerchant = true;
                }
                break;
            case "cancelled":
            case "cancelado":
                merchantTitle = `🚫 Pedido Cancelado (#${displayCode})`;
                merchantBody = after.cancellationReason || after.cancelReason
                    ? `Motivo: ${after.cancellationReason || after.cancelReason}`
                    : `El pedido de ${custName} ha sido cancelado.`;
                merchantNotifType = "ORDER_CANCELLED";
                shouldNotifyMerchant = true;
                break;
        }
        if (shouldNotifyMerchant) {
            const { uids: merchantUids, tokens: merchantTokens } = await getMerchantActiveTokens(after.businessId, after.branchId);
            const merchantNotifDocId = `order_${orderId}_${currentStatus}_merchant`;
            await persistMerchantInAppNotification({
                merchantUids,
                businessId: after.businessId,
                branchId: after.branchId,
                orderId,
                notificationId: merchantNotifDocId,
                category: "Pedidos",
                type: merchantNotifType,
                title: merchantTitle,
                body: merchantBody,
                priority: currentStatus === "cancelled" || currentStatus === "assigned" ? "HIGH" : "NORMAL",
                destinationRoute: "orders",
                action: "OPEN_ORDER",
                metadata: {
                    orderCode: after.orderCode || "",
                    orderShortCode: after.orderShortCode || "",
                    status: currentStatus,
                    total: after.total || 0,
                    courierName: courierName || "",
                },
            });
            if (merchantTokens.length > 0) {
                await messaging.sendEachForMulticast({
                    tokens: merchantTokens,
                    data: {
                        action: "ORDER_STATUS_CHANGED",
                        orderId,
                        orderCode: (after.orderCode || "").toString(),
                        orderShortCode: (after.orderShortCode || "").toString(),
                        branchId: (after.branchId || "").toString(),
                        screen: "business_dashboard",
                        title: merchantTitle,
                        body: merchantBody,
                        type: merchantNotifType,
                        status: currentStatus,
                        notificationId: merchantNotifDocId,
                    },
                    android: { priority: "high", directBootOk: true },
                }).catch((err) => functions.logger.warn(`[FCM_MERCHANT_ERROR] Error enviando push a comercio: ${err.message}`));
            }
        }
    }
    return null;
});
/**
 * 3. TRIGGER: Notificar rechazo de comprobante o cancelación por intentos agotados (Multi-Dispositivo)
 */
exports.onPaymentStatusUpdated = functions.firestore
    .document("orders/{orderId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;
    if (!before || !after)
        return;
    // 1. Notificar al cliente si el comprobante fue rechazado
    if (before.status === "payment_verifying" && after.status === "pending") {
        const tokens = await getUserActiveTokens(after.customerId);
        if (tokens.length > 0) {
            const notifTitle = "❌ Comprobante no verificado";
            const notifBody = `Motivo: ${after.paymentRejectionReason || "No coincide con la transferencia"}. Revisa tu pago.`;
            await messaging.sendEachForMulticast({
                tokens,
                data: {
                    action: "PAYMENT_REJECTED",
                    orderId,
                    orderCode: (after.orderCode || "").toString(),
                    orderShortCode: (after.orderShortCode || "").toString(),
                    title: notifTitle,
                    body: notifBody,
                },
                android: { priority: "high", directBootOk: true },
                apns: {
                    payload: {
                        aps: {
                            alert: { title: notifTitle, body: notifBody },
                            sound: "default",
                            badge: 1,
                        },
                    },
                    headers: { "apns-priority": "10" },
                },
            });
        }
    }
    // 2. Notificar si se canceló automáticamente por exceder 3 intentos
    if (after.status === "cancelled" &&
        after.cancellationReason &&
        after.cancellationReason.includes("múltiples comprobantes")) {
        const tokens = await getUserActiveTokens(after.customerId);
        if (tokens.length > 0) {
            const notifTitle = "🚫 Pedido Cancelado";
            const notifBody = "Tu pedido fue cancelado al superar el límite de intentos de comprobantes.";
            await messaging.sendEachForMulticast({
                tokens,
                data: {
                    action: "ORDER_CANCELLED",
                    orderId,
                    orderCode: (after.orderCode || "").toString(),
                    orderShortCode: (after.orderShortCode || "").toString(),
                    title: notifTitle,
                    body: notifBody,
                },
                android: { priority: "high", directBootOk: true },
                apns: {
                    payload: {
                        aps: {
                            alert: { title: notifTitle, body: notifBody },
                            sound: "default",
                            badge: 1,
                        },
                    },
                    headers: { "apns-priority": "10" },
                },
            });
        }
    }
});
/**
 * 4. TRIGGER: onOrderDelivered — ADR-003 / Phase 5 Finance Integration
 *
 * Cuando una orden cambia status a 'delivered', genera eventos financieros
 * inmutables en /financial_events y actualiza /merchant_summaries/{businessId}
 * usando FieldValue.increment (atómico).
 *
 * Idempotencia: usa `idempotencyKey = orderId_ORDER_REVENUE` para evitar
 * duplicados si el trigger se dispara más de una vez.
 *
 * Montos: almacenados en centavos (integer) para evitar floating-point.
 */
exports.onOrderDelivered = functions.firestore
    .document("orders/{orderId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;
    if (!before || !after)
        return null;
    // Solo procesar la transición → 'delivered'
    const wasDelivered = before.status === "delivered" ||
        before.status === "entregado" ||
        before.status === "completed";
    const isNowDelivered = after.status === "delivered" ||
        after.status === "entregado" ||
        after.status === "completed";
    if (wasDelivered || !isNowDelivered)
        return null;
    // ── AISLAMIENTO DOMINIO B (ADR-026 / BSD-X2Y-AMENDMENT-001): FASE 3A ──
    // Si la orden tiene serviceType === "X_TO_Y_DELIVERY", NO liquidar contable ni financieramente aquí.
    // La autoridad financiera exclusiva de encomiendas X->Y reside en onTripCompleted (trips.ts) sobre /deliveryTrips/{tripId}.
    const serviceType = (after.serviceType || "").toString().trim();
    if (serviceType === "X_TO_Y_DELIVERY") {
        functions.logger.info(`[COMMERCE_TRIGGER_SKIP] Omitiendo liquidación en orders.ts para encomienda X->Y: ${orderId}`);
        return null;
    }
    const businessId = after.businessId;
    if (!businessId) {
        functions.logger.warn(`[FINANCE] onOrderDelivered: orderId=${orderId} sin businessId — ignorado`);
        return null;
    }
    // ── Validación de Estado Financiero por Dominio y Método ─────────────────
    const paymentMethod = (after.paymentMethod || "efectivo").toString().toLowerCase();
    const isCard = paymentMethod === "tarjeta" || paymentMethod === "card";
    const paymentStatus = (after.paymentStatus || "").toString().toUpperCase();
    // Para pedidos de tarjeta, es obligatorio que el pago esté confirmado (PAID) por pasarela
    if (isCard && paymentStatus !== "PAID") {
        functions.logger.error(`[FINANCE_ANOMALY] Intento de liquidar pedido de tarjeta no pagado: orderId=${orderId}, paymentStatus=${paymentStatus}`);
        return null;
    }
    // ── Idempotencia: verificar si ya fue procesado ──────────────────────────
    const idempotencyKey = `${orderId}_ORDER_REVENUE`;
    const existingSnap = await db
        .collection("financial_events")
        .where("idempotencyKey", "==", idempotencyKey)
        .where("businessId", "==", businessId)
        .limit(1)
        .get();
    if (!existingSnap.empty) {
        functions.logger.info(`[FINANCE] Evento ya procesado (idempotencia): orderId=${orderId}, businessId=${businessId}`);
        return null;
    }
    // ── Leer/Resolver configuración de comisión y snapshot inmutable ────────
    let effectiveCommissionRate = 0.15; // Fallback: 15%
    let policyId = "merchant_commission";
    let policyVersion = 1;
    let courierRatePerKm = 7.0; // Default C$7.00/km
    let courierOrderBonus = 10.0; // Default C$10.00/order
    let courierPolicyVersion = 1;
    try {
        const globalCfgDoc = await db.collection("system_config").doc("global").get();
        if (globalCfgDoc.exists) {
            const gData = globalCfgDoc.data() || {};
            if (gData.merchantCommissionRate != null) {
                effectiveCommissionRate = Number(gData.merchantCommissionRate);
            }
            if (gData.merchantCommissionPolicyId) {
                policyId = gData.merchantCommissionPolicyId;
            }
            if (gData.merchantCommissionPolicyVersion) {
                policyVersion = Number(gData.merchantCommissionPolicyVersion);
            }
            if (gData.courierRatePerKm != null) {
                courierRatePerKm = Number(gData.courierRatePerKm);
            }
            if (gData.courierOrderBonus != null) {
                courierOrderBonus = Number(gData.courierOrderBonus);
            }
            if (gData.courierRatePolicyVersion != null) {
                courierPolicyVersion = Number(gData.courierRatePolicyVersion);
            }
        }
    }
    catch (cfgErr) {
        functions.logger.warn(`[CONFIG_WARN] Error leyendo system_config/global en onOrderDelivered:`, cfgErr);
    }
    if (after.merchantCommissionRate != null) {
        // Usar snapshot congelado inmutable de la orden
        effectiveCommissionRate = Number(after.merchantCommissionRate);
        policyId = after.merchantCommissionPolicyId || policyId;
        policyVersion = Number(after.merchantCommissionPolicyVersion || policyVersion);
    }
    // Si la orden ya tenía snapshot congelado de tarifa de courier, respetarlo
    if (after.courierRatePerKmApplied != null) {
        courierRatePerKm = Number(after.courierRatePerKmApplied);
    }
    if (after.courierOrderBonusApplied != null) {
        courierOrderBonus = Number(after.courierOrderBonusApplied);
    }
    // ── Resolución de Distancia Operacional Real ─────────────────────────────
    let routeDistanceMeters = 0;
    let distanceSource = "ROUTE_DISTANCE_UNAVAILABLE";
    let routingProvider = "FALLBACK_ESTIMATED";
    if (after.routeDistanceMeters != null && Number(after.routeDistanceMeters) > 0) {
        routeDistanceMeters = Math.round(Number(after.routeDistanceMeters));
        distanceSource = after.distanceSource || "ROUTING_ENGINE";
        routingProvider = after.routingProvider || "GOOGLE_ROUTES_V2";
    }
    else if (after.routeDistanceKm != null && Number(after.routeDistanceKm) > 0) {
        routeDistanceMeters = Math.round(Number(after.routeDistanceKm) * 1000);
        distanceSource = after.distanceSource || "ROUTING_ENGINE";
        routingProvider = after.routingProvider || "OSRM_ENGINE";
    }
    else if (after.distanceKm != null && Number(after.distanceKm) > 0) {
        routeDistanceMeters = Math.round(Number(after.distanceKm) * 1000);
        distanceSource = "ROUTING_ENGINE";
        routingProvider = "OSRM_ENGINE";
    }
    else {
        // Cálculo con coordenadas de origen y destino si están disponibles
        const originLat = Number((_d = (_a = after.businessLatitude) !== null && _a !== void 0 ? _a : (_c = (_b = after.rawOrigen) === null || _b === void 0 ? void 0 : _b.coordenadas) === null || _c === void 0 ? void 0 : _c.latitud) !== null && _d !== void 0 ? _d : (_f = (_e = after.origen) === null || _e === void 0 ? void 0 : _e.coordenadas) === null || _f === void 0 ? void 0 : _f.latitud);
        const originLng = Number((_k = (_g = after.businessLongitude) !== null && _g !== void 0 ? _g : (_j = (_h = after.rawOrigen) === null || _h === void 0 ? void 0 : _h.coordenadas) === null || _j === void 0 ? void 0 : _j.longitud) !== null && _k !== void 0 ? _k : (_m = (_l = after.origen) === null || _l === void 0 ? void 0 : _l.coordenadas) === null || _m === void 0 ? void 0 : _m.longitud);
        const destLat = Number((_u = (_r = (_o = after.destinationLatitude) !== null && _o !== void 0 ? _o : (_q = (_p = after.rawDestino) === null || _p === void 0 ? void 0 : _p.coordenadas) === null || _q === void 0 ? void 0 : _q.latitud) !== null && _r !== void 0 ? _r : (_t = (_s = after.destino) === null || _s === void 0 ? void 0 : _s.coordenadas) === null || _t === void 0 ? void 0 : _t.latitud) !== null && _u !== void 0 ? _u : after.latitude);
        const destLng = Number((_1 = (_y = (_v = after.destinationLongitude) !== null && _v !== void 0 ? _v : (_x = (_w = after.rawDestino) === null || _w === void 0 ? void 0 : _w.coordenadas) === null || _x === void 0 ? void 0 : _x.longitud) !== null && _y !== void 0 ? _y : (_0 = (_z = after.destino) === null || _z === void 0 ? void 0 : _z.coordenadas) === null || _0 === void 0 ? void 0 : _0.longitud) !== null && _1 !== void 0 ? _1 : after.longitude);
        if (!isNaN(originLat) && !isNaN(originLng) && !isNaN(destLat) && !isNaN(destLng) && originLat !== 0 && destLat !== 0) {
            // Haversine con factor de tortuosidad de Managua (1.28)
            const R = 6371000;
            const dLat = ((destLat - originLat) * Math.PI) / 180;
            const dLon = ((destLng - originLng) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((originLat * Math.PI) / 180) *
                    Math.cos((destLat * Math.PI) / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const haversineMeters = R * c;
            routeDistanceMeters = Math.round(haversineMeters * 1.28);
            distanceSource = "FALLBACK_ESTIMATED";
            routingProvider = "FALLBACK_ESTIMATED";
        }
    }
    const routeDistanceKm = Math.round((routeDistanceMeters / 1000) * 100) / 100;
    const ratePerKmCents = Math.round(courierRatePerKm * 100);
    const distanceEarningsCents = Math.round((routeDistanceMeters * ratePerKmCents) / 1000);
    const bonusEarningsCents = Math.round(courierOrderBonus * 100);
    // ── Cálculo financiero en centavos (integer, sin float) ──────────────────
    const orderTotalFloat = Number(after.total || 0);
    const orderCustomerTotalCents = Math.round(orderTotalFloat * 100);
    const subtotalFloat = Number(after.subtotal || 0);
    const deliveryFeeFloat = Number(after.deliveryFee || 0);
    const tipAmountFloat = Number(after.tipAmount || after.tip || 0);
    const tipEarningsCents = Math.round(tipAmountFloat * 100);
    const additionalChargeAmountFloat = Number(after.additionalChargeAmount || after.additionalCharge || 0);
    const discountAmountFloat = Number(after.discountAmount || after.couponDiscount || 0);
    const deliveryNoteStr = after.deliveryNote || after.notes || null;
    // Venta bruta del comercio: valor de los productos vendidos (subtotal - descuentos de productos)
    const merchantGrossSalesFloat = Number((_2 = after.merchantGrossSales) !== null && _2 !== void 0 ? _2 : (subtotalFloat > 0 ? Math.max(0, subtotalFloat - discountAmountFloat) : orderTotalFloat));
    // Convertir a centavos: round para consistencia aritmética estricta
    const merchantGrossSalesCents = Math.round(merchantGrossSalesFloat * 100);
    const platformFeeCents = Math.round(merchantGrossSalesCents * effectiveCommissionRate);
    const merchantNetCents = Math.max(0, merchantGrossSalesCents - platformFeeCents);
    // Ganancias del courier (BSD-COURIER-EARNINGS-CASH-SETTLEMENT-001)
    const courierTotalEarningsCents = distanceEarningsCents + bonusEarningsCents + tipEarningsCents;
    const courierEarningsFloat = Math.round(courierTotalEarningsCents) / 100;
    const platformRevenueFloat = Math.round((platformFeeCents / 100 + additionalChargeAmountFloat) * 100) / 100;
    const now = FieldValue.serverTimestamp();
    // ─── DOMINIO A: Asiento en General Accounting Ledger (Merchant & Platform) ───
    const batch = db.batch();
    const orgId = (_3 = after.orgId) !== null && _3 !== void 0 ? _3 : null;
    const tenantId = (_5 = (_4 = after.tenantId) !== null && _4 !== void 0 ? _4 : after.orgId) !== null && _5 !== void 0 ? _5 : null;
    const branchId = (_6 = after.branchId) !== null && _6 !== void 0 ? _6 : null;
    // Evento 1: ORDER_REVENUE (crédito bruto de venta de productos al comercio)
    const revenueRef = db.collection("financial_events").doc();
    batch.set(revenueRef, {
        eventId: revenueRef.id,
        businessId,
        orgId,
        tenantId,
        branchId,
        orderId,
        eventType: "ORDER_REVENUE",
        amountCents: merchantGrossSalesCents,
        direction: "CREDIT",
        currency: "NIO",
        description: `Venta de productos pedido #${orderId.slice(-6).toUpperCase()}`,
        orderTotal: orderTotalFloat,
        customerTotal: orderTotalFloat,
        merchantGrossSales: merchantGrossSalesFloat,
        merchantCommissionRate: effectiveCommissionRate,
        merchantCommissionAmount: platformFeeCents / 100,
        merchantNetPayout: merchantNetCents / 100,
        subtotal: subtotalFloat,
        deliveryFee: deliveryFeeFloat,
        tipAmount: tipAmountFloat,
        routeDistanceMeters,
        routeDistanceKm,
        distanceSource,
        routingProvider,
        courierRatePerKmApplied: courierRatePerKm,
        courierOrderBonusApplied: courierOrderBonus,
        courierDistanceEarnings: distanceEarningsCents / 100,
        courierBonusEarnings: bonusEarningsCents / 100,
        courierTipEarnings: tipEarningsCents / 100,
        courierTotalEarnings: courierEarningsFloat,
        courierEarnings: courierEarningsFloat, // Legacy alias
        additionalChargeAmount: additionalChargeAmountFloat,
        platformRevenue: platformRevenueFloat,
        discountAmount: discountAmountFloat,
        deliveryNote: deliveryNoteStr,
        createdAt: now,
        createdBy: "SYSTEM",
        idempotencyKey,
        processedAt: now,
    });
    // Evento 2: PLATFORM_FEE (débito de comisión de plataforma sobre venta de productos)
    const feeKey = `${orderId}_PLATFORM_FEE`;
    const feeRef = db.collection("financial_events").doc();
    batch.set(feeRef, {
        eventId: feeRef.id,
        businessId,
        orgId,
        tenantId,
        branchId,
        orderId,
        eventType: "PLATFORM_FEE",
        amountCents: platformFeeCents,
        direction: "DEBIT",
        currency: "NIO",
        description: `Comisión plataforma ${(effectiveCommissionRate * 100).toFixed(1)}% — pedido #${orderId.slice(-6).toUpperCase()}`,
        orderTotal: orderTotalFloat,
        customerTotal: orderTotalFloat,
        merchantGrossSales: merchantGrossSalesFloat,
        commissionRate: effectiveCommissionRate,
        createdAt: now,
        createdBy: "SYSTEM",
        idempotencyKey: feeKey,
        processedAt: now,
    });
    // Actualizar merchant_summaries con FieldValue.increment (atómico)
    const summaryRef = db.collection("merchant_summaries").doc(businessId);
    batch.set(summaryRef, {
        businessId,
        orgId,
        tenantId,
        todayRevenueCents: FieldValue.increment(merchantGrossSalesCents),
        todayOrdersCount: FieldValue.increment(1),
        todayPlatformFeesCents: FieldValue.increment(platformFeeCents),
        todayNetCents: FieldValue.increment(merchantNetCents),
        pendingSettlementCents: FieldValue.increment(merchantNetCents),
        lastUpdatedAt: now,
        lastOrderId: orderId,
    }, { merge: true });
    // ─── DOMINIO B / SUBLEDGER: Custodia de Efectivo y Compensación del Courier ──
    const isCash = paymentMethod === "efectivo" || paymentMethod === "cash";
    const courierUid = (after.assignedCourierId || after.motorizadoId || "").toString().trim();
    if (courierUid) {
        const courierIdempotencyKey = `order_${orderId}_courier_collection`;
        const existingCourierSnap = await db
            .collection("courier_cash_ledger")
            .where("idempotencyKey", "==", courierIdempotencyKey)
            .limit(1)
            .get();
        if (existingCourierSnap.empty) {
            const courierName = after.driverName || after.motorizadoNombre || after.assignedCourierName || "Repartidor";
            const balanceRef = db.collection("courier_balances").doc(courierUid);
            const balanceSnap = await balanceRef.get();
            const currentBalanceData = balanceSnap.exists ? balanceSnap.data() || {} : {};
            const currentOutstandingCents = Number(currentBalanceData.cashOutstandingCents || 0);
            const currentPayableBalanceCents = Number(currentBalanceData.courierPayableBalanceCents || 0);
            if (isCash) {
                // Cálculo de efectivo cobrado en centavos
                const cashReceivedFloat = Number(after.cashReceived || orderTotalFloat);
                const changeGivenFloat = Number(after.changeGiven || 0);
                const cashReceivedCents = Math.round(cashReceivedFloat * 100);
                const changeGivenCents = Math.round(changeGivenFloat * 100);
                const cashCollectedNetCents = Math.max(0, cashReceivedCents - changeGivenCents);
                const discrepancyCents = cashCollectedNetCents - orderCustomerTotalCents;
                // Compensación determinista: el courier tiene derecho a sus ganancias de esta orden + saldo a favor acumulado
                const totalPayableToCourierCents = currentPayableBalanceCents + courierTotalEarningsCents;
                const compensationCents = Math.min(cashCollectedNetCents, totalPayableToCourierCents);
                const netCustodyIncrementCents = Math.max(0, cashCollectedNetCents - compensationCents);
                const remainingPayableCents = totalPayableToCourierCents - compensationCents;
                // 1. Asiento en /courier_cash_ledger
                const courierLedgerRef = db.collection("courier_cash_ledger").doc();
                batch.set(courierLedgerRef, {
                    entryId: courierLedgerRef.id,
                    courierId: courierUid,
                    courierName,
                    sourceDomain: "COMMERCE_DELIVERY",
                    orderId,
                    businessId,
                    eventType: "ORDER_CASH_COLLECTED",
                    direction: "CREDIT", // Incrementa pasivo vivo bajo custodia
                    amountCents: cashCollectedNetCents,
                    compensatedCents: compensationCents,
                    netCustodyCents: netCustodyIncrementCents,
                    earningsCents: courierTotalEarningsCents,
                    distanceEarningsCents,
                    bonusEarningsCents,
                    tipEarningsCents,
                    currency: "NIO",
                    description: `Recaudación pedido #${orderId.slice(-6).toUpperCase()} [${after.businessName || "Comercio"}]`,
                    idempotencyKey: courierIdempotencyKey,
                    createdAt: now,
                    createdByUid: "SYSTEM_TRIGGER",
                    createdByType: "SYSTEM_TRIGGER",
                });
                // 2. Actualización de balance en /courier_balances/{courierUid}
                batch.set(balanceRef, {
                    courierId: courierUid,
                    courierName,
                    cashOutstandingCents: FieldValue.increment(netCustodyIncrementCents),
                    courierPayableBalanceCents: remainingPayableCents,
                    totalCollectedCents: FieldValue.increment(cashCollectedNetCents),
                    totalCompensatedCents: FieldValue.increment(compensationCents),
                    totalEarningsCents: FieldValue.increment(courierTotalEarningsCents),
                    totalDistanceEarningsCents: FieldValue.increment(distanceEarningsCents),
                    totalBonusEarningsCents: FieldValue.increment(bonusEarningsCents),
                    totalTipEarningsCents: FieldValue.increment(tipEarningsCents),
                    totalDiscrepanciesCents: FieldValue.increment(discrepancyCents !== 0 ? Math.abs(discrepancyCents) : 0),
                    lastCollectionAt: now,
                    updatedAt: now,
                    reconciliationStatus: "IN_SYNC",
                }, { merge: true });
                // 3. Conciliación en la orden
                batch.update(change.after.ref, {
                    cashCollectedNet: cashCollectedNetCents / 100,
                    cashDiscrepancy: discrepancyCents !== 0,
                    discrepancyAmount: discrepancyCents / 100,
                    financialReconciliationStatus: discrepancyCents === 0 ? "MATCHED" : "DISCREPANCY",
                    routeDistanceMeters,
                    routeDistanceKm,
                    distanceSource,
                    routingProvider,
                    courierRatePerKmApplied: courierRatePerKm,
                    courierOrderBonusApplied: courierOrderBonus,
                    courierDistanceEarnings: distanceEarningsCents / 100,
                    courierBonusEarnings: bonusEarningsCents / 100,
                    courierTipEarnings: tipEarningsCents / 100,
                    courierTotalEarnings: courierEarningsFloat,
                    courierEarnings: courierEarningsFloat, // Legacy alias
                    compensatedAmount: compensationCents / 100,
                    reconciledAt: now,
                });
                functions.logger.info(`[COURIER_LEDGER] Custodia asentada: orderId=${orderId}, courier=${courierUid}, bruto=${cashCollectedNetCents}¢, compensado=${compensationCents}¢, neto=${netCustodyIncrementCents}¢, pendiente=${remainingPayableCents}¢`);
            }
            else {
                // Pedido con Tarjeta / Transferencia (CARD / DIGITAL)
                // Si el motorizado tenía custodia previa pendiente, compensar contra esa custodia
                let compensationCents = 0;
                let newOutstandingCents = currentOutstandingCents;
                let remainingPayableCents = currentPayableBalanceCents;
                if (currentOutstandingCents > 0) {
                    compensationCents = Math.min(currentOutstandingCents, courierTotalEarningsCents);
                    newOutstandingCents = currentOutstandingCents - compensationCents;
                    const surplusPayableCents = courierTotalEarningsCents - compensationCents;
                    remainingPayableCents = currentPayableBalanceCents + surplusPayableCents;
                }
                else {
                    remainingPayableCents = currentPayableBalanceCents + courierTotalEarningsCents;
                }
                // 1. Asiento en /courier_cash_ledger
                const courierLedgerRef = db.collection("courier_cash_ledger").doc();
                batch.set(courierLedgerRef, {
                    entryId: courierLedgerRef.id,
                    courierId: courierUid,
                    courierName,
                    sourceDomain: "COMMERCE_DELIVERY",
                    orderId,
                    businessId,
                    eventType: "ORDER_EARNINGS_DIGITAL",
                    direction: compensationCents > 0 ? "DEBIT" : "PAYABLE",
                    amountCents: courierTotalEarningsCents,
                    compensatedCents: compensationCents,
                    earningsCents: courierTotalEarningsCents,
                    distanceEarningsCents,
                    bonusEarningsCents,
                    tipEarningsCents,
                    currency: "NIO",
                    description: `Ganancia pedido digital #${orderId.slice(-6).toUpperCase()} [${after.businessName || "Comercio"}]`,
                    idempotencyKey: courierIdempotencyKey,
                    createdAt: now,
                    createdByUid: "SYSTEM_TRIGGER",
                    createdByType: "SYSTEM_TRIGGER",
                });
                // 2. Actualización de balance en /courier_balances/{courierUid}
                batch.set(balanceRef, {
                    courierId: courierUid,
                    courierName,
                    cashOutstandingCents: newOutstandingCents,
                    courierPayableBalanceCents: remainingPayableCents,
                    totalCompensatedCents: FieldValue.increment(compensationCents),
                    totalEarningsCents: FieldValue.increment(courierTotalEarningsCents),
                    totalDistanceEarningsCents: FieldValue.increment(distanceEarningsCents),
                    totalBonusEarningsCents: FieldValue.increment(bonusEarningsCents),
                    totalTipEarningsCents: FieldValue.increment(tipEarningsCents),
                    lastCollectionAt: now,
                    updatedAt: now,
                    reconciliationStatus: "IN_SYNC",
                }, { merge: true });
                // 3. Conciliación en la orden
                batch.update(change.after.ref, {
                    routeDistanceMeters,
                    routeDistanceKm,
                    distanceSource,
                    routingProvider,
                    courierRatePerKmApplied: courierRatePerKm,
                    courierOrderBonusApplied: courierOrderBonus,
                    courierDistanceEarnings: distanceEarningsCents / 100,
                    courierBonusEarnings: bonusEarningsCents / 100,
                    courierTipEarnings: tipEarningsCents / 100,
                    courierTotalEarnings: courierEarningsFloat,
                    courierEarnings: courierEarningsFloat, // Legacy alias
                    compensatedAmount: compensationCents / 100,
                    reconciledAt: now,
                });
                functions.logger.info(`[COURIER_LEDGER] Ganancia digital asentada: orderId=${orderId}, courier=${courierUid}, ganancia=${courierTotalEarningsCents}¢, compensado=${compensationCents}¢, saldo_favor=${remainingPayableCents}¢`);
            }
        }
    }
    await batch.commit();
    if (courierUid) {
        try {
            await (0, courierAccessPolicy_1.evaluateCourierFinancialAccessInternal)(courierUid);
        }
        catch (evalErr) {
            functions.logger.warn(`[FINANCE_EVAL_WARN] Error reevaluando acceso de courier ${courierUid} tras entrega:`, evalErr);
        }
        // ─── BSD-X2Y-CANCELLATION-RATING-COURIER-TRIP-METRICS-UX-001: Métricas Históricas ───
        try {
            const courierRef = db.collection("couriers").doc(courierUid);
            const userRef = db.collection("users").doc(courierUid);
            await Promise.all([
                courierRef.set({
                    completedCommerceTrips: FieldValue.increment(1),
                    completedTotalTrips: FieldValue.increment(1),
                    completedTripsCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true }),
                userRef.set({
                    completedCommerceTrips: FieldValue.increment(1),
                    completedTotalTrips: FieldValue.increment(1),
                    completedTripsCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true }),
            ]);
            functions.logger.info(`[COURIER_METRICS] Incrementados viajes de comercio para courier=${courierUid}`);
        }
        catch (metricsErr) {
            functions.logger.warn(`[COURIER_METRICS_WARN] Error actualizando métricas de comercio de courier ${courierUid}:`, metricsErr);
        }
    }
    functions.logger.info(`[FINANCE] Eventos financieros creados: orderId=${orderId}, businessId=${businessId}, ` +
        `brutoProductos=${merchantGrossSalesCents}¢, fee=${platformFeeCents}¢, netoComercio=${merchantNetCents}¢, totalCliente=${orderCustomerTotalCents}¢`);
    return null;
});
//# sourceMappingURL=orders.js.map