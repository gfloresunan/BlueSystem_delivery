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
exports.calculateDeliveryRouteCallable = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const routingService_1 = require("../services/routingService");
/**
 * Callable HTTPS: calculateDeliveryRouteCallable
 * Punto de entrada autoritativo del backend para cotizar distancias reales y tarifas de entrega.
 * Soporta DOMINIO A (COMMERCE_DELIVERY) y DOMINIO B (X_TO_Y_DELIVERY) con contratos canónicos separados.
 */
exports.calculateDeliveryRouteCallable = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    // Verificación opcional de autenticación (requerido para clientes autenticados)
    const callerUid = context.auth ? context.auth.uid : "ANONYMOUS_CLIENT";
    const originLat = Number((_b = (_a = data === null || data === void 0 ? void 0 : data.origin) === null || _a === void 0 ? void 0 : _a.latitude) !== null && _b !== void 0 ? _b : data === null || data === void 0 ? void 0 : data.originLat);
    const originLng = Number((_d = (_c = data === null || data === void 0 ? void 0 : data.origin) === null || _c === void 0 ? void 0 : _c.longitude) !== null && _d !== void 0 ? _d : data === null || data === void 0 ? void 0 : data.originLng);
    const destLat = Number((_f = (_e = data === null || data === void 0 ? void 0 : data.destination) === null || _e === void 0 ? void 0 : _e.latitude) !== null && _f !== void 0 ? _f : data === null || data === void 0 ? void 0 : data.destLat);
    const destLng = Number((_h = (_g = data === null || data === void 0 ? void 0 : data.destination) === null || _g === void 0 ? void 0 : _g.longitude) !== null && _h !== void 0 ? _h : data === null || data === void 0 ? void 0 : data.destLng);
    const transportProfile = ((data === null || data === void 0 ? void 0 : data.transportProfile) === "DRIVE" ? "DRIVE" : "TWO_WHEELER");
    const tenantId = (data === null || data === void 0 ? void 0 : data.tenantId) || ((_k = (_j = context.auth) === null || _j === void 0 ? void 0 : _j.token) === null || _k === void 0 ? void 0 : _k.tenantId) || "default";
    const rawServiceType = ((data === null || data === void 0 ? void 0 : data.serviceType) || (data === null || data === void 0 ? void 0 : data.type) || "").toString().trim().toUpperCase();
    const isCommerce = rawServiceType === "COMMERCE" || rawServiceType === "COMMERCE_DELIVERY" || rawServiceType === "COMMERCIAL";
    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
        throw new functions.https.HttpsError("invalid-argument", "MISSING_OR_INVALID_COORDINATES: Se requieren origin y destination con latitude y longitude válidas.");
    }
    try {
        const departmentId = ((data === null || data === void 0 ? void 0 : data.departmentId) || (data === null || data === void 0 ? void 0 : data.originDepartmentId) || "").toString().trim() || undefined;
        const municipalityId = ((data === null || data === void 0 ? void 0 : data.municipalityId) || (data === null || data === void 0 ? void 0 : data.originMunicipalityId) || (data === null || data === void 0 ? void 0 : data.cityId) || "").toString().trim() || undefined;
        const businessId = ((data === null || data === void 0 ? void 0 : data.businessId) || (data === null || data === void 0 ? void 0 : data.storeId) || (data === null || data === void 0 ? void 0 : data.comercioId) || "").toString().trim() || undefined;
        const branchId = ((data === null || data === void 0 ? void 0 : data.branchId) || (data === null || data === void 0 ? void 0 : data.sucursalId) || "").toString().trim() || undefined;
        const options = {
            origin: { latitude: originLat, longitude: originLng },
            destination: { latitude: destLat, longitude: destLng },
            transportProfile,
            tenantId,
            departmentId,
            municipalityId,
            businessId,
            branchId,
        };
        const routingResult = isCommerce
            ? await (0, routingService_1.calculateCommerceDeliveryRoute)(options)
            : await (0, routingService_1.calculateDeliveryRoute)(options);
        let quoteId = null;
        let quoteExpiresAt = null;
        // FEATURE GATE: /pricing_quotes solo se genera cuando la resolución territorial es FLAT y el usuario está autenticado.
        // Esto garantiza que Gate A sea 100% inerte para todos los municipios DISTANCE (cero writes, cero reads, cero costo adicional).
        const isFlatPolicyApplied = isCommerce &&
            ((_l = routingResult.pricingSnapshot) === null || _l === void 0 ? void 0 : _l.pricingMode) === "FLAT" &&
            ((_m = routingResult.pricingSnapshot) === null || _m === void 0 ? void 0 : _m.fixedDeliveryFee) != null &&
            routingResult.calculatedFee != null;
        const authenticatedUid = (_o = context.auth) === null || _o === void 0 ? void 0 : _o.uid;
        if (isFlatPolicyApplied && authenticatedUid) {
            try {
                const quoteRef = admin.firestore().collection("pricing_quotes").doc();
                quoteId = quoteRef.id;
                const now = Date.now();
                const expiresAtDate = new Date(now + 15 * 60 * 1000); // 15 minutos de vigencia para redimir
                const ttlExpiresAtDate = new Date(now + 24 * 60 * 60 * 1000); // 24 horas para retención/auditoría y purga TTL
                quoteExpiresAt = expiresAtDate.toISOString();
                const quoteDeptId = (options.departmentId || ((_p = routingResult.pricingSnapshot) === null || _p === void 0 ? void 0 : _p.departmentId) || "").toString().trim() || null;
                const quoteMuniId = (options.municipalityId || ((_q = routingResult.pricingSnapshot) === null || _q === void 0 ? void 0 : _q.municipalityId) || "").toString().trim() || null;
                const quoteBizId = (options.businessId || "").toString().trim() || null;
                const quoteBranchId = (options.branchId || "").toString().trim() || null;
                await quoteRef.set({
                    quoteId,
                    customerId: authenticatedUid,
                    businessId: quoteBizId,
                    branchId: quoteBranchId,
                    departmentId: quoteDeptId,
                    municipalityId: quoteMuniId,
                    countryCode: (((_r = routingResult.pricingSnapshot) === null || _r === void 0 ? void 0 : _r.countryCode) || "NI").toString().trim().toUpperCase(),
                    deliveryFee: routingResult.calculatedFee,
                    courierEarnings: (_t = (_s = routingResult.pricingSnapshot) === null || _s === void 0 ? void 0 : _s.courierEarnings) !== null && _t !== void 0 ? _t : 0,
                    pricingMode: "FLAT",
                    pricingPolicyId: (_v = (_u = routingResult.pricingSnapshot) === null || _u === void 0 ? void 0 : _u.pricingPolicyId) !== null && _v !== void 0 ? _v : null,
                    pricingPolicyVersion: (_x = (_w = routingResult.pricingSnapshot) === null || _w === void 0 ? void 0 : _w.pricingPolicyVersion) !== null && _x !== void 0 ? _x : null,
                    distanceMeters: routingResult.routeDistanceMeters,
                    distanceKm: (_z = (_y = routingResult.pricingSnapshot) === null || _y === void 0 ? void 0 : _y.distanceKm) !== null && _z !== void 0 ? _z : (routingResult.routeDistanceMeters / 1000),
                    originLat: Math.round(options.origin.latitude * 10000) / 10000,
                    originLng: Math.round(options.origin.longitude * 10000) / 10000,
                    destLat: Math.round(options.destination.latitude * 10000) / 10000,
                    destLng: Math.round(options.destination.longitude * 10000) / 10000,
                    currency: ((_0 = routingResult.pricingSnapshot) === null || _0 === void 0 ? void 0 : _0.currency) || "NIO",
                    expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
                    ttlExpiresAt: admin.firestore.Timestamp.fromDate(ttlExpiresAtDate),
                    used: false,
                    orderId: null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                routingResult.quoteId = quoteId;
                routingResult.quoteExpiresAt = quoteExpiresAt;
                if (routingResult.pricingSnapshot) {
                    routingResult.pricingSnapshot.quoteId = quoteId;
                    routingResult.pricingSnapshot.quoteExpiresAt = quoteExpiresAt;
                }
            }
            catch (qErr) {
                functions.logger.warn(`[ROUTING_CALLABLE] Error al persistir server-side quote: ${qErr.message}`);
            }
        }
        functions.logger.info(`[ROUTING_CALLABLE] Rutas calculadas para caller=${callerUid} (service=${isCommerce ? "COMMERCE" : "X_TO_Y"}): dist=${routingResult.routeDistanceMeters}m, dur=${routingResult.routeDurationSeconds}s, fee=C$${routingResult.calculatedFee}, quoteId=${quoteId || "none"}, provider=${routingResult.routingProvider}`);
        return {
            success: true,
            data: routingResult,
        };
    }
    catch (error) {
        functions.logger.error(`[ROUTING_CALLABLE] Error en cálculo de ruta: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        throw new functions.https.HttpsError("internal", (error === null || error === void 0 ? void 0 : error.message) || "Error al procesar la ruta y cotización de entrega.");
    }
});
//# sourceMappingURL=calculateDeliveryRoute.js.map