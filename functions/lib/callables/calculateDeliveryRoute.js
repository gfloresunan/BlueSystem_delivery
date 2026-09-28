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
const routingService_1 = require("../services/routingService");
/**
 * Callable HTTPS: calculateDeliveryRouteCallable
 * Punto de entrada autoritativo del backend para cotizar distancias reales y tarifas de entrega.
 * Soporta DOMINIO A (COMMERCE_DELIVERY) y DOMINIO B (X_TO_Y_DELIVERY) con contratos canónicos separados.
 */
exports.calculateDeliveryRouteCallable = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
        const options = {
            origin: { latitude: originLat, longitude: originLng },
            destination: { latitude: destLat, longitude: destLng },
            transportProfile,
            tenantId,
        };
        const routingResult = isCommerce
            ? await (0, routingService_1.calculateCommerceDeliveryRoute)(options)
            : await (0, routingService_1.calculateDeliveryRoute)(options);
        functions.logger.info(`[ROUTING_CALLABLE] Rutas calculadas para caller=${callerUid} (service=${isCommerce ? "COMMERCE" : "X_TO_Y"}): dist=${routingResult.routeDistanceMeters}m, dur=${routingResult.routeDurationSeconds}s, fee=C$${routingResult.calculatedFee}, provider=${routingResult.routingProvider}`);
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