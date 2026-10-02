import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface RoutingOptions {
  origin: LatLngPoint;
  destination: LatLngPoint;
  tenantId?: string;
  transportProfile?: "TWO_WHEELER" | "DRIVE";
  googleApiKey?: string;
}

export interface PricingSnapshot {
  baseFee: number;
  pricePerKm: number;
  distanceKm: number;
  distanceMeters: number;
  calculatedAmount: number;
  currency: string;
  pricingPolicy: "KM_BLOCK_2DEC" | "METRIC_EXACT";
  pricingVersion: string;
  calculatedAt: string;
  rawCalculatedTotal?: number;
  roundingAdjustment?: number;
  courierEarnings?: number;
  platformRevenue?: number;
}

export interface CommerceDeliveryPricingConfig {
  enabled?: boolean;
  customerPricePerKm?: number;
  courierPricePerKm?: number;
  minimumCustomerDeliveryFee?: number;
  currency?: string;
  roundingPrecision?: "KM_BLOCK_2DEC" | "METRIC_EXACT";
  roundingMode?: string;
  pricingVersion?: string;
}

export interface CommercePricingSnapshot {
  serviceType: "COMMERCE_DELIVERY";
  customerPricePerKm: number;
  courierPricePerKm: number;
  distanceKm: number;
  distanceMeters: number;
  deliveryFee: number;
  courierEarnings: number;
  currency: string;
  pricingPolicy: "KM_BLOCK_2DEC" | "METRIC_EXACT";
  pricingVersion: string;
  calculatedAt: string;
}

export interface XToYPricingConfig {
  enabled?: boolean;
  baseFee?: number;
  pricePerKm?: number;
  currency?: string;
  minimumFee?: number;
  maximumDistanceKm?: number;
  roundingPrecision?: "KM_BLOCK_2DEC" | "METRIC_EXACT";
  roundingMode?: string;
}

export interface RoutingResult {
  routeDistanceMeters: number;
  routeDurationSeconds: number;
  straightLineDistanceMeters: number;
  calculatedFee: number;
  pricingSnapshot?: PricingSnapshot;
  commercePricingSnapshot?: CommercePricingSnapshot;
  routingProvider: "GOOGLE_ROUTES_V2" | "OSRM_ENGINE" | "FALLBACK_ESTIMATED";
  routingVersion: string;
  isFallback: boolean;
  transportProfile: "TWO_WHEELER" | "DRIVE";
  polyline?: string;
  calculatedAt: string;
}

interface CacheEntry {
  result: RoutingResult;
  expiresAt: number;
}

// In-Memory LRU/TTL Cache (15 minutos)
const ROUTE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

// Constantes Financieras Canónicas de BlueSystem Delivery (X→Y)
export const TARIFA_BASE_NIO = 35.0;
export const COSTO_POR_KM_NIO = 15.0;

// Constantes Financieras Canónicas de Commerce Delivery
export const COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM = 8.0;
export const COMMERCE_DEFAULT_COURIER_RATE_PER_KM = 7.0;

/**
 * Valida si las coordenadas están dentro de los límites geográficos válidos de Nicaragua.
 */
export function validateCoordinatesInNicaragua(lat: number, lng: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return false;
  }
  // Coordenadas válidas en el territorio nacional de Nicaragua
  return lat >= 10.5 && lat <= 15.5 && lng >= -88.0 && lng <= -82.5;
}

/**
 * Calcula la distancia Haversine (línea recta) en metros.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

let cachedPricingConfig: XToYPricingConfig | null = null;
let cachedPricingConfigExpiresAt = 0;

let cachedCommercePricingConfig: CommerceDeliveryPricingConfig | null = null;
let cachedCommercePricingConfigExpiresAt = 0;

/**
 * Invalida la caché en memoria de configuración de precios.
 */
export function clearPricingConfigCache(): void {
  cachedPricingConfig = null;
  cachedPricingConfigExpiresAt = 0;
  cachedCommercePricingConfig = null;
  cachedCommercePricingConfigExpiresAt = 0;
}

/**
 * Obtiene la configuración canónica de tarifas Commerce desde /system_config/global.
 * Sigue principio SSOT con separación estricta de X→Y.
 */
export async function getCommerceDeliveryPricingConfig(failClosed: boolean = false): Promise<CommerceDeliveryPricingConfig> {
  const now = Date.now();
  if (cachedCommercePricingConfig && cachedCommercePricingConfigExpiresAt > now) {
    return cachedCommercePricingConfig;
  }
  try {
    const doc = await admin.firestore().collection("system_config").doc("global").get();
    if (doc.exists) {
      const data = doc.data();
      const cfg = data?.commerceDeliveryPricing as CommerceDeliveryPricingConfig | undefined;
      
      const customerRate = typeof cfg?.customerPricePerKm === "number" && cfg.customerPricePerKm >= 0
        ? cfg.customerPricePerKm
        : (typeof data?.customerDeliveryRatePerKm === "number" && data.customerDeliveryRatePerKm >= 0 ? data.customerDeliveryRatePerKm : null);

      const courierRate = typeof cfg?.courierPricePerKm === "number" && cfg.courierPricePerKm >= 0
        ? cfg.courierPricePerKm
        : (typeof data?.courierRatePerKm === "number" && data.courierRatePerKm >= 0 ? data.courierRatePerKm : null);

      if (failClosed && (customerRate === null || courierRate === null)) {
        throw new Error("COMMERCE_PRICING_CONFIG_INVALID: /system_config/global carece de 'commerceDeliveryPricing.customerPricePerKm' o 'courierPricePerKm' válidos.");
      }

      cachedCommercePricingConfig = {
        enabled: cfg?.enabled ?? true,
        customerPricePerKm: customerRate ?? COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM,
        courierPricePerKm: courierRate ?? COMMERCE_DEFAULT_COURIER_RATE_PER_KM,
        minimumCustomerDeliveryFee: typeof cfg?.minimumCustomerDeliveryFee === "number" ? cfg.minimumCustomerDeliveryFee : undefined,
        currency: cfg?.currency || "NIO",
        roundingPrecision: cfg?.roundingPrecision || "KM_BLOCK_2DEC",
        roundingMode: cfg?.roundingMode || "HALF_UP",
        pricingVersion: cfg?.pricingVersion || "v2.2-commerce",
      };
      cachedCommercePricingConfigExpiresAt = now + 60 * 1000;
      return cachedCommercePricingConfig;
    } else if (failClosed) {
      throw new Error("COMMERCE_PRICING_CONFIG_NOT_FOUND: Documento /system_config/global no existe.");
    }
  } catch (err: any) {
    functions.logger.error("[COMMERCE_ROUTING_PRICING] Error al obtener /system_config/global.commerceDeliveryPricing:", err);
    if (failClosed) {
      throw new Error(`COMMERCE_PRICING_SSOT_UNAVAILABLE: (${err?.message || err})`);
    }
  }

  return {
    enabled: true,
    customerPricePerKm: COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM,
    courierPricePerKm: COMMERCE_DEFAULT_COURIER_RATE_PER_KM,
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
export async function getXToYPricingConfig(failClosed: boolean = true): Promise<XToYPricingConfig> {
  const now = Date.now();
  if (cachedPricingConfig && cachedPricingConfigExpiresAt > now) {
    return cachedPricingConfig;
  }
  try {
    const doc = await admin.firestore().collection("system_config").doc("global").get();
    if (doc.exists) {
      const data = doc.data();
      const cfg = data?.xToYPricing as XToYPricingConfig | undefined;
      if (!cfg) {
        if (failClosed) {
          throw new Error("PRICING_CONFIG_MISSING: /system_config/global no contiene configuración 'xToYPricing'.");
        }
      } else {
        const resolvedBaseFee = typeof cfg.baseFee === "number" && cfg.baseFee >= 0 ? cfg.baseFee : null;
        const resolvedPricePerKm = typeof cfg.pricePerKm === "number" && cfg.pricePerKm >= 0 
          ? cfg.pricePerKm 
          : (typeof (cfg as any).perKmRate === "number" && (cfg as any).perKmRate >= 0 ? (cfg as any).perKmRate : null);

        if (failClosed && (resolvedBaseFee === null || resolvedPricePerKm === null)) {
          throw new Error("PRICING_CONFIG_INVALID: /system_config/global.xToYPricing carece de 'baseFee' o 'pricePerKm' válidos.");
        }

        cachedPricingConfig = {
          enabled: cfg.enabled ?? true,
          baseFee: resolvedBaseFee ?? TARIFA_BASE_NIO,
          // Canónico Master: pricePerKm | Alias Legacy Compatible: perKmRate
          pricePerKm: resolvedPricePerKm ?? COSTO_POR_KM_NIO,
          currency: cfg.currency || "NIO",
          minimumFee: typeof cfg.minimumFee === "number" ? cfg.minimumFee : (resolvedBaseFee ?? TARIFA_BASE_NIO),
          maximumDistanceKm: typeof cfg.maximumDistanceKm === "number" ? cfg.maximumDistanceKm : 100,
          roundingPrecision: cfg.roundingPrecision || "KM_BLOCK_2DEC",
          roundingMode: cfg.roundingMode || "HALF_UP",
        };
        cachedPricingConfigExpiresAt = now + 60 * 1000; // 1 min TTL
        return cachedPricingConfig;
      }
    } else if (failClosed) {
      throw new Error("PRICING_CONFIG_NOT_FOUND: Documento /system_config/global no existe en Firestore.");
    }
  } catch (err: any) {
    functions.logger.error("[ROUTING_PRICING] Error crítico al obtener /system_config/global.xToYPricing:", err);
    if (failClosed) {
      throw new Error(`PRICING_SSOT_UNAVAILABLE: No fue posible resolver tarifas autoritativas de Firestore (${err?.message || err})`);
    }
  }

  // Fallback defensivo únicamente para tests o mocks que lo soliciten explícitamente
  return {
    enabled: true,
    baseFee: TARIFA_BASE_NIO,
    pricePerKm: COSTO_POR_KM_NIO,
    currency: "NIO",
    minimumFee: TARIFA_BASE_NIO,
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
export function buildPricingSnapshot(
  distanceMeters: number,
  config?: XToYPricingConfig
): { calculatedFee: number; pricingSnapshot: PricingSnapshot } {
  const baseFee = config?.baseFee ?? TARIFA_BASE_NIO;
  const pricePerKm = config?.pricePerKm ?? COSTO_POR_KM_NIO;
  const minFee = config?.minimumFee ?? baseFee;
  const policy: "KM_BLOCK_2DEC" | "METRIC_EXACT" = config?.roundingPrecision || "KM_BLOCK_2DEC";

  const displayKm = Math.round((distanceMeters / 1000.0) * 100) / 100;

  let courierEarnings: number;
  if (distanceMeters <= 0) {
    courierEarnings = 0;
  } else if (policy === "METRIC_EXACT") {
    const kmExact = distanceMeters / 1000.0;
    courierEarnings = Math.round(kmExact * pricePerKm * 100) / 100;
  } else {
    // KM_BLOCK_2DEC: concordancia exacta entre km mostrados y cálculo financiero
    courierEarnings = Math.round(displayKm * pricePerKm * 100) / 100;
  }

  const rawCalculatedTotal = Math.round(Math.max(minFee, baseFee + courierEarnings) * 100) / 100;
  // Redondeo al entero superior (Ceiling) para evitar fracciones de córdobas en cobro físico/bancario
  const customerTotal = Math.ceil(rawCalculatedTotal);
  const roundingAdjustment = Math.round((customerTotal - rawCalculatedTotal) * 100) / 100;
  const platformRevenue = Math.round((customerTotal - courierEarnings) * 100) / 100;

  const pricingSnapshot: PricingSnapshot = {
    baseFee,
    pricePerKm,
    distanceKm: displayKm,
    distanceMeters,
    calculatedAmount: customerTotal,
    rawCalculatedTotal,
    roundingAdjustment,
    courierEarnings,
    platformRevenue,
    currency: config?.currency || "NIO",
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
export function calculateAuthoritativeFee(distanceMeters: number, config?: XToYPricingConfig): number {
  return buildPricingSnapshot(distanceMeters, config).calculatedFee;
}

function getCacheKey(origin: LatLngPoint, dest: LatLngPoint, profile: string): string {
  return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}->${dest.latitude.toFixed(4)},${dest.longitude.toFixed(4)}:${profile}`;
}

/**
 * Intenta resolver la ruta usando Google Routes API v2 (Compute Routes).
 */
async function computeWithGoogleRoutes(
  origin: LatLngPoint,
  dest: LatLngPoint,
  profile: "TWO_WHEELER" | "DRIVE",
  apiKey: string
): Promise<{ distanceMeters: number; durationSeconds: number; polyline?: string } | null> {
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

    const data: any = await response.json();
    if (!data.routes || data.routes.length === 0) {
      functions.logger.warn("[ROUTING_ENGINE] Google Routes no encontró rutas válidas.");
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = Number(route.distanceMeters || 0);
    // duration viene en formato "1234s"
    const durationSeconds = parseInt((route.duration || "0s").replace("s", ""), 10) || 0;
    const polyline = route.polyline?.encodedPolyline;

    return { distanceMeters, durationSeconds, polyline };
  } catch (e: any) {
    clearTimeout(timeoutId);
    functions.logger.warn(`[ROUTING_ENGINE] Error al invocar Google Routes API: ${e?.message || e}`);
    return null;
  }
}

/**
 * Fallback a OSRM Engine (Open Source Routing Machine).
 */
async function computeWithOsrm(
  origin: LatLngPoint,
  dest: LatLngPoint
): Promise<{ distanceMeters: number; durationSeconds: number; polyline?: string } | null> {
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

    const data: any = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      functions.logger.warn(`[ROUTING_ENGINE] OSRM no encontró rutas: code=${data.code}`);
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = Math.round(Number(route.distance || 0));
    const durationSeconds = Math.round(Number(route.duration || 0));
    const polyline = route.geometry;

    return { distanceMeters, durationSeconds, polyline };
  } catch (e: any) {
    clearTimeout(timeoutId);
    functions.logger.warn(`[ROUTING_ENGINE] Error al invocar OSRM Engine: ${e?.message || e}`);
    return null;
  }
}

/**
 * Motor Principal de Routing de BlueSystem Delivery Enterprise.
 * Resuelve la ruta vial real, distancia, duración y tarifa autoritativa.
 */
export async function calculateDeliveryRoute(options: RoutingOptions): Promise<RoutingResult> {
  const { origin, destination, transportProfile = "TWO_WHEELER", googleApiKey } = options;

  if (!validateCoordinatesInNicaragua(origin.latitude, origin.longitude)) {
    throw new Error("INVALID_ORIGIN_COORDINATES: Coordenadas de origen fuera de Nicaragua o inválidas.");
  }

  if (!validateCoordinatesInNicaragua(destination.latitude, destination.longitude)) {
    throw new Error("INVALID_DESTINATION_COORDINATES: Coordenadas de destino fuera de Nicaragua o inválidas.");
  }

  const straightLineDistanceMeters = calculateHaversineDistanceMeters(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

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
      const result: RoutingResult = {
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
        if (oldestKey) ROUTE_CACHE.delete(oldestKey);
      }
      ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });

      return result;
    }
  }

  // 4. Intento 2: OSRM Engine
  const osrmResult = await computeWithOsrm(origin, destination);
  if (osrmResult && osrmResult.distanceMeters > 0) {
    const { calculatedFee, pricingSnapshot } = buildPricingSnapshot(osrmResult.distanceMeters, pricingConfig);
    const result: RoutingResult = {
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
      if (oldestKey) ROUTE_CACHE.delete(oldestKey);
    }
    ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });

    return result;
  }

  // 5. Intento 3: Fallback de contingencia explícitamente marcado
  // Multiplicador de sinuosidad vial de Managua (1.28x sobre distancia euclidiana)
  const estimatedRoadDistanceMeters = Math.round(straightLineDistanceMeters * 1.28);
  const estimatedDurationSeconds = Math.round((estimatedRoadDistanceMeters / 1000.0) * 120); // ~30 km/h velocidad media
  const { calculatedFee: fallbackFee, pricingSnapshot: fallbackPricing } = buildPricingSnapshot(estimatedRoadDistanceMeters, pricingConfig);

  functions.logger.warn(
    `[ROUTING_ENGINE] Aplicando FALLBACK_ESTIMATED: lineDist=${straightLineDistanceMeters}m, estRoadDist=${estimatedRoadDistanceMeters}m`
  );

  const fallbackResult: RoutingResult = {
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
export function buildCommercePricingSnapshot(
  distanceMeters: number,
  config?: CommerceDeliveryPricingConfig
): { deliveryFee: number; courierEarnings: number; pricingSnapshot: CommercePricingSnapshot } {
  const customerRate = config?.customerPricePerKm ?? COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM;
  const courierRate = config?.courierPricePerKm ?? COMMERCE_DEFAULT_COURIER_RATE_PER_KM;
  const policy: "KM_BLOCK_2DEC" | "METRIC_EXACT" = config?.roundingPrecision || "KM_BLOCK_2DEC";

  const displayKm = Math.round((distanceMeters / 1000.0) * 100) / 100;

  let rawDeliveryFee: number;
  let rawCourierEarnings: number;

  if (distanceMeters <= 0) {
    rawDeliveryFee = 0;
    rawCourierEarnings = 0;
  } else if (policy === "METRIC_EXACT") {
    const kmExact = distanceMeters / 1000.0;
    rawDeliveryFee = Math.round(kmExact * customerRate * 100) / 100;
    rawCourierEarnings = Math.round(kmExact * courierRate * 100) / 100;
  } else {
    // KM_BLOCK_2DEC: Bloque de 0.01 km para paridad total con la UI
    rawDeliveryFee = Math.round(displayKm * customerRate * 100) / 100;
    rawCourierEarnings = Math.round(displayKm * courierRate * 100) / 100;
  }

  if (typeof config?.minimumCustomerDeliveryFee === "number" && rawDeliveryFee < config.minimumCustomerDeliveryFee && distanceMeters > 0) {
    rawDeliveryFee = config.minimumCustomerDeliveryFee;
  }

  // Redondeo a números enteros según directiva:
  // - Cliente: redondeado hacia arriba al entero superior (Math.ceil), e.g. 50.94 -> 51
  // - Motorizado: redondeado hacia abajo al entero inferior (Math.floor), e.g. 45.70 -> 45, 80.20 -> 80
  // - El diferencial de centavos se acumula a favor de la plataforma admin como ingresos por servicios de app
  const deliveryFee = distanceMeters > 0 ? Math.ceil(rawDeliveryFee) : 0;
  const courierEarnings = distanceMeters > 0 ? Math.floor(rawCourierEarnings) : 0;

  const pricingSnapshot: CommercePricingSnapshot = {
    serviceType: "COMMERCE_DELIVERY",
    customerPricePerKm: customerRate,
    courierPricePerKm: courierRate,
    distanceKm: displayKm,
    distanceMeters,
    deliveryFee,
    courierEarnings,
    currency: config?.currency || "NIO",
    pricingPolicy: policy,
    pricingVersion: config?.pricingVersion || "v2.2-commerce",
    calculatedAt: new Date().toISOString(),
  };

  return { deliveryFee, courierEarnings, pricingSnapshot };
}

/**
 * Calcula la tarifa de comercio autoritativa a partir de la distancia real en metros.
 */
export function calculateCommerceAuthoritativeFee(distanceMeters: number, config?: CommerceDeliveryPricingConfig): { deliveryFee: number; courierEarnings: number } {
  const res = buildCommercePricingSnapshot(distanceMeters, config);
  return { deliveryFee: res.deliveryFee, courierEarnings: res.courierEarnings };
}

/**
 * Motor de Routing para Commerce Delivery de BlueSystem Delivery Enterprise.
 * Resuelve la ruta vial real, distancia, duración y la tarificación autoritativa de comercio.
 */
export async function calculateCommerceDeliveryRoute(options: RoutingOptions): Promise<RoutingResult> {
  const { origin, destination, transportProfile = "TWO_WHEELER", googleApiKey } = options;

  if (!validateCoordinatesInNicaragua(origin.latitude, origin.longitude)) {
    throw new Error("INVALID_ORIGIN_COORDINATES: Coordenadas de origen fuera de Nicaragua o inválidas.");
  }

  if (!validateCoordinatesInNicaragua(destination.latitude, destination.longitude)) {
    throw new Error("INVALID_DESTINATION_COORDINATES: Coordenadas de destino fuera de Nicaragua o inválidas.");
  }

  const straightLineDistanceMeters = calculateHaversineDistanceMeters(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

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
  const toPricingSnapshot = (cps: CommercePricingSnapshot): PricingSnapshot => ({
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
      const result: RoutingResult = {
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
        if (oldestKey) ROUTE_CACHE.delete(oldestKey);
      }
      ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });

      return result;
    }
  }

  // 4. Intento 2: OSRM Engine
  const osrmResult = await computeWithOsrm(origin, destination);
  if (osrmResult && osrmResult.distanceMeters > 0) {
    const { deliveryFee, pricingSnapshot: commercePricingSnapshot } = buildCommercePricingSnapshot(osrmResult.distanceMeters, commerceConfig);
    const result: RoutingResult = {
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
      if (oldestKey) ROUTE_CACHE.delete(oldestKey);
    }
    ROUTE_CACHE.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });

    return result;
  }

  // 5. Intento 3: Fallback de contingencia con factor 1.28x
  const estimatedRoadDistanceMeters = Math.round(straightLineDistanceMeters * 1.28);
  const estimatedDurationSeconds = Math.round((estimatedRoadDistanceMeters / 1000.0) * 120);
  const { deliveryFee: fallbackDeliveryFee, pricingSnapshot: fallbackPricing } = buildCommercePricingSnapshot(estimatedRoadDistanceMeters, commerceConfig);

  functions.logger.warn(
    `[COMMERCE_ROUTING] Aplicando FALLBACK_ESTIMATED: lineDist=${straightLineDistanceMeters}m, estRoadDist=${estimatedRoadDistanceMeters}m`
  );

  const fallbackResult: RoutingResult = {
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
