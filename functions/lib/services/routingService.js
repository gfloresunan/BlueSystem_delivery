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
exports.COMMERCE_DEFAULT_COURIER_RATE_PER_KM = exports.COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM = exports.COSTO_POR_KM_NIO = exports.TARIFA_BASE_NIO = void 0;
exports.validateCoordinatesInNicaragua = validateCoordinatesInNicaragua;
exports.calculateHaversineDistanceMeters = calculateHaversineDistanceMeters;
exports.clearPricingConfigCache = clearPricingConfigCache;
exports.getCommerceDeliveryPricingConfig = getCommerceDeliveryPricingConfig;
exports.getXToYPricingConfig = getXToYPricingConfig;
exports.buildPricingSnapshot = buildPricingSnapshot;
exports.calculateAuthoritativeFee = calculateAuthoritativeFee;
exports.calculateDeliveryRoute = calculateDeliveryRoute;
exports.buildCommercePricingSnapshot = buildCommercePricingSnapshot;
exports.calculateCommerceAuthoritativeFee = calculateCommerceAuthoritativeFee;
exports.calculateCommerceDeliveryRoute = calculateCommerceDeliveryRoute;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// In-Memory LRU/TTL Cache (15 minutos)
const ROUTE_CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
// Constantes Financieras Canónicas de BlueSystem Delivery (X→Y)
exports.TARIFA_BASE_NIO = 35.0;
exports.COSTO_POR_KM_NIO = 15.0;
// Constantes Financieras Canónicas de Commerce Delivery
exports.COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM = 8.0;
exports.COMMERCE_DEFAULT_COURIER_RATE_PER_KM = 7.0;
/**
 * Valida si las coordenadas están dentro de los límites geográficos válidos de Nicaragua.
 */
function validateCoordinatesInNicaragua(lat, lng) {
    if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
        return false;
    }
    // Coordenadas válidas en el territorio nacional de Nicaragua
    return lat >= 10.5 && lat <= 15.5 && lng >= -88.0 && lng <= -82.5;
}
/**
 * Calcula la distancia Haversine (línea recta) en metros.
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}
let cachedPricingConfig = null;
let cachedPricingConfigExpiresAt = 0;
let cachedCommercePricingConfig = null;
let cachedCommercePricingConfigExpiresAt = 0;
/**
 * Invalida la caché en memoria de configuración de precios.
 */
function clearPricingConfigCache() {
    cachedPricingConfig = null;
    cachedPricingConfigExpiresAt = 0;
    cachedCommercePricingConfig = null;
    cachedCommercePricingConfigExpiresAt = 0;
}
/**
 * Obtiene la configuración canónica de tarifas Commerce desde /system_config/global.
 * Sigue principio SSOT con separación estricta de X→Y.
 */
async function getCommerceDeliveryPricingConfig(failClosed = false) {
    var _a;
    const now = Date.now();
    if (cachedCommercePricingConfig && cachedCommercePricingConfigExpiresAt > now) {
        return cachedCommercePricingConfig;
    }
    try {
        const doc = await admin.firestore().collection("system_config").doc("global").get();
        if (doc.exists) {
            const data = doc.data();
            const cfg = data === null || data === void 0 ? void 0 : data.commerceDeliveryPricing;
            const customerRate = typeof (cfg === null || cfg === void 0 ? void 0 : cfg.customerPricePerKm) === "number" && cfg.customerPricePerKm >= 0
                ? cfg.customerPricePerKm
                : (typeof (data === null || data === void 0 ? void 0 : data.customerDeliveryRatePerKm) === "number" && data.customerDeliveryRatePerKm >= 0 ? data.customerDeliveryRatePerKm : null);
            const courierRate = typeof (cfg === null || cfg === void 0 ? void 0 : cfg.courierPricePerKm) === "number" && cfg.courierPricePerKm >= 0
                ? cfg.courierPricePerKm
                : (typeof (data === null || data === void 0 ? void 0 : data.courierRatePerKm) === "number" && data.courierRatePerKm >= 0 ? data.courierRatePerKm : null);
            if (failClosed && (customerRate === null || courierRate === null)) {
                throw new Error("COMMERCE_PRICING_CONFIG_INVALID: /system_config/global carece de 'commerceDeliveryPricing.customerPricePerKm' o 'courierPricePerKm' válidos.");
            }
            cachedCommercePricingConfig = {
                enabled: (_a = cfg === null || cfg === void 0 ? void 0 : cfg.enabled) !== null && _a !== void 0 ? _a : true,
                customerPricePerKm: customerRate !== null && customerRate !== void 0 ? customerRate : exports.COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM,
                courierPricePerKm: courierRate !== null && courierRate !== void 0 ? courierRate : exports.COMMERCE_DEFAULT_COURIER_RATE_PER_KM,
                minimumCustomerDeliveryFee: typeof (cfg === null || cfg === void 0 ? void 0 : cfg.minimumCustomerDeliveryFee) === "number" ? cfg.minimumCustomerDeliveryFee : undefined,
                currency: (cfg === null || cfg === void 0 ? void 0 : cfg.currency) || "NIO",
                roundingPrecision: (cfg === null || cfg === void 0 ? void 0 : cfg.roundingPrecision) || "KM_BLOCK_2DEC",
                roundingMode: (cfg === null || cfg === void 0 ? void 0 : cfg.roundingMode) || "HALF_UP",
                pricingVersion: (cfg === null || cfg === void 0 ? void 0 : cfg.pricingVersion) || "v2.2-commerce",
            };
            cachedCommercePricingConfigExpiresAt = now + 60 * 1000;
            return cachedCommercePricingConfig;
        }
        else if (failClosed) {
            throw new Error("COMMERCE_PRICING_CONFIG_NOT_FOUND: Documento /system_config/global no existe.");
        }
    }
    catch (err) {
        functions.logger.error("[COMMERCE_ROUTING_PRICING] Error al obtener /system_config/global.commerceDeliveryPricing:", err);
        if (failClosed) {
            throw new Error(`COMMERCE_PRICING_SSOT_UNAVAILABLE: (${(err === null || err === void 0 ? void 0 : err.message) || err})`);
        }
    }
    return {
        enabled: true,
        customerPricePerKm: exports.COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM,
        courierPricePerKm: exports.COMMERCE_DEFAULT_COURIER_RATE_PER_KM,
        currency: "NIO",
        roundingPrecision: "KM_BLOCK_2DEC",
        roundingMode: "HALF_UP",
        pricingVersion: "v2.2-commerce",
    };
}
/**
 * Obtiene la configuración canónica de tarifas X→Y desde /system_config/global.
 * Aplica Fail-Closed estricto: Si el documento no existe o falla la lectura, arroja error
 * sin recurrir a fallbacks silenciosos con tarifas divergentes.
 */
async function getXToYPricingConfig(failClosed = true) {
    var _a;
    const now = Date.now();
    if (cachedPricingConfig && cachedPricingConfigExpiresAt > now) {
        return cachedPricingConfig;
    }
    try {
        const doc = await admin.firestore().collection("system_config").doc("global").get();
        if (doc.exists) {
            const data = doc.data();
            const cfg = data === null || data === void 0 ? void 0 : data.xToYPricing;
            if (!cfg) {
                if (failClosed) {
                    throw new Error("PRICING_CONFIG_MISSING: /system_config/global no contiene configuración 'xToYPricing'.");
                }
            }
            else {
                const resolvedBaseFee = typeof cfg.baseFee === "number" && cfg.baseFee >= 0 ? cfg.baseFee : null;
                const resolvedPricePerKm = typeof cfg.pricePerKm === "number" && cfg.pricePerKm >= 0
                    ? cfg.pricePerKm
                    : (typeof cfg.perKmRate === "number" && cfg.perKmRate >= 0 ? cfg.perKmRate : null);
                if (failClosed && (resolvedBaseFee === null || resolvedPricePerKm === null)) {
                    throw new Error("PRICING_CONFIG_INVALID: /system_config/global.xToYPricing carece de 'baseFee' o 'pricePerKm' válidos.");
                }
                cachedPricingConfig = {
                    enabled: (_a = cfg.enabled) !== null && _a !== void 0 ? _a : true,
                    baseFee: resolvedBaseFee !== null && resolvedBaseFee !== void 0 ? resolvedBaseFee : exports.TARIFA_BASE_NIO,
                    // Canónico Master: pricePerKm | Alias Legacy Compatible: perKmRate
                    pricePerKm: resolvedPricePerKm !== null && resolvedPricePerKm !== void 0 ? resolvedPricePerKm : exports.COSTO_POR_KM_NIO,
                    currency: cfg.currency || "NIO",
                    minimumFee: typeof cfg.minimumFee === "number" ? cfg.minimumFee : (resolvedBaseFee !== null && resolvedBaseFee !== void 0 ? resolvedBaseFee : exports.TARIFA_BASE_NIO),
                    maximumDistanceKm: typeof cfg.maximumDistanceKm === "number" ? cfg.maximumDistanceKm : 100,
                    roundingPrecision: cfg.roundingPrecision || "KM_BLOCK_2DEC",
                    roundingMode: cfg.roundingMode || "HALF_UP",
                };
                cachedPricingConfigExpiresAt = now + 60 * 1000; // 1 min TTL
                return cachedPricingConfig;
            }
        }
        else if (failClosed) {
            throw new Error("PRICING_CONFIG_NOT_FOUND: Documento /system_config/global no existe en Firestore.");
        }
    }
    catch (err) {
        functions.logger.error("[ROUTING_PRICING] Error crítico al obtener /system_config/global.xToYPricing:", err);
        if (failClosed) {
            throw new Error(`PRICING_SSOT_UNAVAILABLE: No fue posible resolver tarifas autoritativas de Firestore (${(err === null || err === void 0 ? void 0 : err.message) || err})`);
        }
    }
    // Fallback defensivo únicamente para tests o mocks que lo soliciten explícitamente
    return {
        enabled: true,
        baseFee: exports.TARIFA_BASE_NIO,
        pricePerKm: exports.COSTO_POR_KM_NIO,
        currency: "NIO",
        minimumFee: exports.TARIFA_BASE_NIO,
        maximumDistanceKm: 100,
        roundingPrecision: "KM_BLOCK_2DEC",
        roundingMode: "HALF_UP",
    };
}
/**
 * Construye el pricingSnapshot autoritativo del sistema y la tarifa canónica.
 * Política KM_BLOCK_2DEC (por defecto): Bloque de 0.01 km para concordancia perfecta entre distancia presentada y tarifa cobrada.
 * Política METRIC_EXACT: Precisión interna basada en metros exactos antes de redondear el importe final.
 */
function buildPricingSnapshot(distanceMeters, config) {
    var _a, _b, _c;
    const baseFee = (_a = config === null || config === void 0 ? void 0 : config.baseFee) !== null && _a !== void 0 ? _a : exports.TARIFA_BASE_NIO;
    const pricePerKm = (_b = config === null || config === void 0 ? void 0 : config.pricePerKm) !== null && _b !== void 0 ? _b : exports.COSTO_POR_KM_NIO;
    const minFee = (_c = config === null || config === void 0 ? void 0 : config.minimumFee) !== null && _c !== void 0 ? _c : baseFee;
    const policy = (config === null || config === void 0 ? void 0 : config.roundingPrecision) || "KM_BLOCK_2DEC";
    const displayKm = Math.round((distanceMeters / 1000.0) * 100) / 100;
    let courierEarnings;
    if (distanceMeters <= 0) {
        courierEarnings = 0;
    }
    else if (policy === "METRIC_EXACT") {
        const kmExact = distanceMeters / 1000.0;
        courierEarnings = Math.round(kmExact * pricePerKm * 100) / 100;
    }
    else {
        // KM_BLOCK_2DEC: concordancia exacta entre km mostrados y cálculo financiero
        courierEarnings = Math.round(displayKm * pricePerKm * 100) / 100;
    }
    const rawCalculatedTotal = Math.round(Math.max(minFee, baseFee + courierEarnings) * 100) / 100;
    // Redondeo al entero superior (Ceiling) para evitar fracciones de córdobas en cobro físico/bancario
    const customerTotal = Math.ceil(rawCalculatedTotal);
    const roundingAdjustment = Math.round((customerTotal - rawCalculatedTotal) * 100) / 100;
    const platformRevenue = Math.round((customerTotal - courierEarnings) * 100) / 100;
    const pricingSnapshot = {
        baseFee,
        pricePerKm,
        distanceKm: displayKm,
        distanceMeters,
        calculatedAmount: customerTotal,
        rawCalculatedTotal,
        roundingAdjustment,
        courierEarnings,
        platformRevenue,
        currency: (config === null || config === void 0 ? void 0 : config.currency) || "NIO",
        pricingPolicy: policy,
        pricingVersion: "v2.0",
        calculatedAt: new Date().toISOString(),
    };
    return { calculatedFee: customerTotal, pricingSnapshot };
}
/**
 * Calcula la tarifa autoritativa del sistema a partir de la distancia real en metros.
 * Compatible con la API sincrónica histórica (TC-ROUTING-03).
 */
function calculateAuthoritativeFee(distanceMeters, config) {
    return buildPricingSnapshot(distanceMeters, config).calculatedFee;
}
function getCacheKey(origin, dest, profile) {
    return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}->${dest.latitude.toFixed(4)},${dest.longitude.toFixed(4)}:${profile}`;
}
/**
 * Intenta resolver la ruta usando Google Routes API v2 (Compute Routes).
 */
async function computeWithGoogleRoutes(origin, dest, profile, apiKey) {
    var _a;
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const travelMode = profile === "TWO_WHEELER" ? "TWO_WHEELER" : "DRIVE";
    const requestBody = {
        origin: {
            location: {
                latLng: {
                    latitude: origin.latitude,
                    longitude: origin.longitude,
                },
            },
        },
        destination: {
            location: {
                latLng: {
                    latitude: dest.latitude,
                    longitude: dest.longitude,
                },
            },
        },
        travelMode: travelMode,
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: false,
        routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: true,
        },
        languageCode: "es-419",
        units: "METRIC",
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errText = await response.text();
            functions.logger.warn(`[ROUTING_ENGINE] Google Routes API HTTP ${response.status}: ${errText}`);
            return null;
        }
        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
            functions.logger.warn("[ROUTING_ENGINE] Google Routes no encontró rutas válidas.");
            return null;
        }
        const route = data.routes[0];
        const distanceMeters = Number(route.distanceMeters || 0);
        // duration viene en formato "1234s"
        const durationSeconds = parseInt((route.duration || "0s").replace("s", ""), 10) || 0;
        const polyline = (_a = route.polyline) === null || _a === void 0 ? void 0 : _a.encodedPolyline;
        return { distanceMeters, durationSeconds, polyline };
    }
    catch (e) {
        clearTimeout(timeoutId);
        functions.logger.warn(`[ROUTING_ENGINE] Error al invocar Google Routes API: ${(e === null || e === void 0 ? void 0 : e.message) || e}`);
        return null;
    }
}
/**
 * Fallback a OSRM Engine (Open Source Routing Machine).
 */
async function computeWithOsrm(origin, dest) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=simplified&geometries=polyline`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "BlueSystem-Delivery-Enterprise/2.2",
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            functions.logger.warn(`[ROUTING_ENGINE] OSRM Engine HTTP ${response.status}`);
            return null;
        }
        const data = await response.json();
        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
            functions.logger.warn(`[ROUTING_ENGINE] OSRM no encontró rutas: code=${data.code}`);
            return null;
        }
        const route = data.routes[0];
        const distanceMeters = Math.round(Number(route.distance || 0));
        const durationSeconds = Math.round(Number(route.duration || 0));
        const polyline = route.geometry;
        return { distanceMeters, durationSeconds, polyline };
    }
    catch (e) {
        clearTimeout(timeoutId);
        functions.logger.warn(`[ROUTING_ENGINE] Error al invocar OSRM Engine: ${(e === null || e === void 0 ? void 0 : e.message) || e}`);
        return null;
    }
}
/**
 * Motor Principal de Routing de BlueSystem Delivery Enterprise.
 * Resuelve la ruta vial real, distancia, duración y tarifa autoritativa.
 */
async function calculateDeliveryRoute(options) {
    const { origin, destination, transportProfile = "TWO_WHEELER", googleApiKey } = options;
    if (!validateCoordinatesInNicaragua(origin.latitude, origin.longitude)) {
        throw new Error("INVALID_ORIGIN_COORDINATES: Coordenadas de origen fuera de Nicaragua o inválidas.");
    }
    if (!validateCoordinatesInNicaragua(destination.latitude, destination.longitude)) {
        throw new Error("INVALID_DESTINATION_COORDINATES: Coordenadas de destino fuera de Nicaragua o inválidas.");
    }
    const straightLineDistanceMeters = calculateHaversineDistanceMeters(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    // 1. Carga de configuración canónica de tarifas
    const pricingConfig = await getXToYPricingConfig();
    // 2. Verificación de Caché en Memoria
    const cacheKey = getCacheKey(origin, destination, transportProfile);
    const cached = ROUTE_CACHE.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        functions.logger.info(`[ROUTING_ENGINE] Cache HIT para ${cacheKey}`);
        return cached.result;
    }
    // 3. Intento 1: Google Routes API v2
    const apiKey = googleApiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.ROUTES_API_KEY;
    if (apiKey) {
        const googleResult = await computeWithGoogleRoutes(origin, destination, transportProfile, apiKey);
        if (googleResult && googleResult.distanceMeters > 0) {
            const { calculatedFee, pricingSnapshot } = buildPricingSnapshot(googleResult.distanceMeters, pricingConfig);
            const result = {
                routeDistanceMeters: googleResult.distanceMeters,
                routeDurationSeconds: googleResult.durationSeconds,
                straightLineDistanceMeters,
                calculatedFee,
                pricingSnapshot,
                routingProvider: "GOOGLE_ROUTES_V2",
                routingVersion: "v1.0",
                isFallback: false,
                transportProfile,
                polyline: googleResult.polyline,
                calculatedAt: new Date().toISOString(),
            };
            if (ROUTE_CACHE.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = ROUTE_CACHE.keys().next().value;
                if (oldestKey)
                    ROUTE_CACHE.delete(oldestKey);
            }
            ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
            return result;
        }
    }
    // 4. Intento 2: OSRM Engine
    const osrmResult = await computeWithOsrm(origin, destination);
    if (osrmResult && osrmResult.distanceMeters > 0) {
        const { calculatedFee, pricingSnapshot } = buildPricingSnapshot(osrmResult.distanceMeters, pricingConfig);
        const result = {
            routeDistanceMeters: osrmResult.distanceMeters,
            routeDurationSeconds: osrmResult.durationSeconds,
            straightLineDistanceMeters,
            calculatedFee,
            pricingSnapshot,
            routingProvider: "OSRM_ENGINE",
            routingVersion: "v1.0",
            isFallback: false,
            transportProfile,
            polyline: osrmResult.polyline,
            calculatedAt: new Date().toISOString(),
        };
        if (ROUTE_CACHE.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = ROUTE_CACHE.keys().next().value;
            if (oldestKey)
                ROUTE_CACHE.delete(oldestKey);
        }
        ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
        return result;
    }
    // 5. Intento 3: Fallback de contingencia explícitamente marcado
    // Multiplicador de sinuosidad vial de Managua (1.28x sobre distancia euclidiana)
    const estimatedRoadDistanceMeters = Math.round(straightLineDistanceMeters * 1.28);
    const estimatedDurationSeconds = Math.round((estimatedRoadDistanceMeters / 1000.0) * 120); // ~30 km/h velocidad media
    const { calculatedFee: fallbackFee, pricingSnapshot: fallbackPricing } = buildPricingSnapshot(estimatedRoadDistanceMeters, pricingConfig);
    functions.logger.warn(`[ROUTING_ENGINE] Aplicando FALLBACK_ESTIMATED: lineDist=${straightLineDistanceMeters}m, estRoadDist=${estimatedRoadDistanceMeters}m`);
    const fallbackResult = {
        routeDistanceMeters: estimatedRoadDistanceMeters,
        routeDurationSeconds: estimatedDurationSeconds,
        straightLineDistanceMeters,
        calculatedFee: fallbackFee,
        pricingSnapshot: fallbackPricing,
        routingProvider: "FALLBACK_ESTIMATED",
        routingVersion: "v1.0",
        isFallback: true,
        transportProfile,
        calculatedAt: new Date().toISOString(),
    };
    return fallbackResult;
}
/**
 * Construye el pricingSnapshot autoritativo del sistema y tarifas canónicas para Commerce Delivery.
 * Customer: distanceKm * customerPricePerKm
 * Courier: distanceKm * courierPricePerKm
 */
function buildCommercePricingSnapshot(distanceMeters, config) {
    var _a, _b;
    const customerRate = (_a = config === null || config === void 0 ? void 0 : config.customerPricePerKm) !== null && _a !== void 0 ? _a : exports.COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM;
    const courierRate = (_b = config === null || config === void 0 ? void 0 : config.courierPricePerKm) !== null && _b !== void 0 ? _b : exports.COMMERCE_DEFAULT_COURIER_RATE_PER_KM;
    const policy = (config === null || config === void 0 ? void 0 : config.roundingPrecision) || "KM_BLOCK_2DEC";
    const displayKm = Math.round((distanceMeters / 1000.0) * 100) / 100;
    let rawDeliveryFee;
    let rawCourierEarnings;
    if (distanceMeters <= 0) {
        rawDeliveryFee = 0;
        rawCourierEarnings = 0;
    }
    else if (policy === "METRIC_EXACT") {
        const kmExact = distanceMeters / 1000.0;
        rawDeliveryFee = Math.round(kmExact * customerRate * 100) / 100;
        rawCourierEarnings = Math.round(kmExact * courierRate * 100) / 100;
    }
    else {
        // KM_BLOCK_2DEC: Bloque de 0.01 km para paridad total con la UI
        rawDeliveryFee = Math.round(displayKm * customerRate * 100) / 100;
        rawCourierEarnings = Math.round(displayKm * courierRate * 100) / 100;
    }
    if (typeof (config === null || config === void 0 ? void 0 : config.minimumCustomerDeliveryFee) === "number" && rawDeliveryFee < config.minimumCustomerDeliveryFee && distanceMeters > 0) {
        rawDeliveryFee = config.minimumCustomerDeliveryFee;
    }
    // Redondeo a números enteros según directiva:
    // - Cliente: redondeado hacia arriba al entero superior (Math.ceil), e.g. 50.94 -> 51
    // - Motorizado: redondeado hacia abajo al entero inferior (Math.floor), e.g. 45.70 -> 45, 80.20 -> 80
    // - El diferencial de centavos se acumula a favor de la plataforma admin como ingresos por servicios de app
    const deliveryFee = distanceMeters > 0 ? Math.ceil(rawDeliveryFee) : 0;
    const courierEarnings = distanceMeters > 0 ? Math.floor(rawCourierEarnings) : 0;
    const pricingSnapshot = {
        serviceType: "COMMERCE_DELIVERY",
        customerPricePerKm: customerRate,
        courierPricePerKm: courierRate,
        distanceKm: displayKm,
        distanceMeters,
        deliveryFee,
        courierEarnings,
        currency: (config === null || config === void 0 ? void 0 : config.currency) || "NIO",
        pricingPolicy: policy,
        pricingVersion: (config === null || config === void 0 ? void 0 : config.pricingVersion) || "v2.2-commerce",
        calculatedAt: new Date().toISOString(),
    };
    return { deliveryFee, courierEarnings, pricingSnapshot };
}
/**
 * Calcula la tarifa de comercio autoritativa a partir de la distancia real en metros.
 */
function calculateCommerceAuthoritativeFee(distanceMeters, config) {
    const res = buildCommercePricingSnapshot(distanceMeters, config);
    return { deliveryFee: res.deliveryFee, courierEarnings: res.courierEarnings };
}
/**
 * Motor de Routing para Commerce Delivery de BlueSystem Delivery Enterprise.
 * Resuelve la ruta vial real, distancia, duración y la tarificación autoritativa de comercio.
 */
async function calculateCommerceDeliveryRoute(options) {
    const { origin, destination, transportProfile = "TWO_WHEELER", googleApiKey } = options;
    if (!validateCoordinatesInNicaragua(origin.latitude, origin.longitude)) {
        throw new Error("INVALID_ORIGIN_COORDINATES: Coordenadas de origen fuera de Nicaragua o inválidas.");
    }
    if (!validateCoordinatesInNicaragua(destination.latitude, destination.longitude)) {
        throw new Error("INVALID_DESTINATION_COORDINATES: Coordenadas de destino fuera de Nicaragua o inválidas.");
    }
    const straightLineDistanceMeters = calculateHaversineDistanceMeters(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    // 1. Carga de configuración canónica de tarifas Commerce
    const commerceConfig = await getCommerceDeliveryPricingConfig();
    // 2. Verificación de Caché en Memoria
    const cacheKey = `COMMERCE:${getCacheKey(origin, destination, transportProfile)}`;
    const cached = ROUTE_CACHE.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        functions.logger.info(`[COMMERCE_ROUTING] Cache HIT para ${cacheKey}`);
        return cached.result;
    }
    // Helper to convert CommercePricingSnapshot to legacy PricingSnapshot
    const toPricingSnapshot = (cps) => ({
        baseFee: 0,
        pricePerKm: cps.customerPricePerKm,
        distanceKm: cps.distanceKm,
        distanceMeters: cps.distanceMeters,
        calculatedAmount: cps.deliveryFee,
        currency: cps.currency,
        pricingPolicy: cps.pricingPolicy,
        pricingVersion: cps.pricingVersion,
        calculatedAt: cps.calculatedAt,
        courierEarnings: cps.courierEarnings,
        platformRevenue: Math.max(0, Math.round((cps.deliveryFee - cps.courierEarnings) * 100) / 100),
    });
    // 3. Intento 1: Google Routes API v2
    const apiKey = googleApiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.ROUTES_API_KEY;
    if (apiKey) {
        const googleResult = await computeWithGoogleRoutes(origin, destination, transportProfile, apiKey);
        if (googleResult && googleResult.distanceMeters > 0) {
            const { deliveryFee, pricingSnapshot: commercePricingSnapshot } = buildCommercePricingSnapshot(googleResult.distanceMeters, commerceConfig);
            const result = {
                routeDistanceMeters: googleResult.distanceMeters,
                routeDurationSeconds: googleResult.durationSeconds,
                straightLineDistanceMeters,
                calculatedFee: deliveryFee,
                commercePricingSnapshot,
                pricingSnapshot: toPricingSnapshot(commercePricingSnapshot),
                routingProvider: "GOOGLE_ROUTES_V2",
                routingVersion: "v1.0",
                isFallback: false,
                transportProfile,
                polyline: googleResult.polyline,
                calculatedAt: new Date().toISOString(),
            };
            if (ROUTE_CACHE.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = ROUTE_CACHE.keys().next().value;
                if (oldestKey)
                    ROUTE_CACHE.delete(oldestKey);
            }
            ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
            return result;
        }
    }
    // 4. Intento 2: OSRM Engine
    const osrmResult = await computeWithOsrm(origin, destination);
    if (osrmResult && osrmResult.distanceMeters > 0) {
        const { deliveryFee, pricingSnapshot: commercePricingSnapshot } = buildCommercePricingSnapshot(osrmResult.distanceMeters, commerceConfig);
        const result = {
            routeDistanceMeters: osrmResult.distanceMeters,
            routeDurationSeconds: osrmResult.durationSeconds,
            straightLineDistanceMeters,
            calculatedFee: deliveryFee,
            commercePricingSnapshot,
            pricingSnapshot: toPricingSnapshot(commercePricingSnapshot),
            routingProvider: "OSRM_ENGINE",
            routingVersion: "v1.0",
            isFallback: false,
            transportProfile,
            polyline: osrmResult.polyline,
            calculatedAt: new Date().toISOString(),
        };
        if (ROUTE_CACHE.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = ROUTE_CACHE.keys().next().value;
            if (oldestKey)
                ROUTE_CACHE.delete(oldestKey);
        }
        ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
        return result;
    }
    // 5. Intento 3: Fallback de contingencia con factor 1.28x
    const estimatedRoadDistanceMeters = Math.round(straightLineDistanceMeters * 1.28);
    const estimatedDurationSeconds = Math.round((estimatedRoadDistanceMeters / 1000.0) * 120);
    const { deliveryFee: fallbackDeliveryFee, pricingSnapshot: fallbackPricing } = buildCommercePricingSnapshot(estimatedRoadDistanceMeters, commerceConfig);
    functions.logger.warn(`[COMMERCE_ROUTING] Aplicando FALLBACK_ESTIMATED: lineDist=${straightLineDistanceMeters}m, estRoadDist=${estimatedRoadDistanceMeters}m`);
    const fallbackResult = {
        routeDistanceMeters: estimatedRoadDistanceMeters,
        routeDurationSeconds: estimatedDurationSeconds,
        straightLineDistanceMeters,
        calculatedFee: fallbackDeliveryFee,
        commercePricingSnapshot: fallbackPricing,
        pricingSnapshot: toPricingSnapshot(fallbackPricing),
        routingProvider: "FALLBACK_ESTIMATED",
        routingVersion: "v1.0",
        isFallback: true,
        transportProfile,
        calculatedAt: new Date().toISOString(),
    };
    return fallbackResult;
}
//# sourceMappingURL=routingService.js.map