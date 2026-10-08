import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { NotificationTemplateService } from "./notificationTemplateService";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;

// ─── Interfaces del SSOT de Configuración ────────────────────────────────────

export interface CommerceDispatchStageConfig {
  stage: number;          // 1, 2, 3, 4...
  fromSecond: number;     // Tiempo transcurrido desde startedAt (ej. 0, 120, 240, 420)
  radiusKm: number;       // Radio máximo de búsqueda en km (ej. 3, 5, 10, 20)
}

export interface CommerceProgressiveDispatchConfig {
  enabled: boolean;
  profileVersion: string;
  stages: CommerceDispatchStageConfig[];
  timeoutSeconds: number;
  gpsFreshnessSeconds: number;
  offerTtlSeconds: number;
  maxConcurrentOffers: number;
  manualAssignmentEnabled: boolean;
  effectiveAt?: string;
  overrides?: {
    [municipalityId: string]: Partial<CommerceProgressiveDispatchConfig>;
  };
}

export const DEFAULT_COMMERCE_DISPATCH_CONFIG: CommerceProgressiveDispatchConfig = {
  enabled: false, // Inactivo por defecto (Feature Flag OFF)
  profileVersion: "v1.1-commerce-1-3-5-10-20",
  stages: [
    { stage: 1, fromSecond: 0, radiusKm: 1.0 },
    { stage: 2, fromSecond: 120, radiusKm: 3.0 },
    { stage: 3, fromSecond: 240, radiusKm: 5.0 },
    { stage: 4, fromSecond: 360, radiusKm: 10.0 },
    { stage: 5, fromSecond: 480, radiusKm: 20.0 },
  ],
  timeoutSeconds: 600, // 10 minutos
  gpsFreshnessSeconds: 600, // 10 minutos
  offerTtlSeconds: 120, // 2 minutos por oferta
  maxConcurrentOffers: 10,
  manualAssignmentEnabled: true,
};

// In-Memory Config Cache (60 segundos)
let cachedConfig: CommerceProgressiveDispatchConfig | null = null;
let cachedConfigExpiresAt = 0;

export function resetCommerceDispatchConfigCache(): void {
  cachedConfig = null;
  cachedConfigExpiresAt = 0;
}

/**
 * Lee el SSOT de configuración desde /system_config/global.commerceProgressiveDispatch
 * con soporte para overrides por municipio.
 */
export async function getCommerceProgressiveDispatchConfig(
  municipalityId?: string
): Promise<CommerceProgressiveDispatchConfig> {
  const now = Date.now();
  let baseConfig = cachedConfig;

  if (!baseConfig || cachedConfigExpiresAt <= now) {
    try {
      const snap = await db.collection("system_config").doc("global").get();
      if (snap.exists) {
        const raw = snap.data()?.commerceProgressiveDispatch;
        if (raw && typeof raw === "object") {
          const stages = Array.isArray(raw.stages) && raw.stages.length > 0
            ? raw.stages.map((s: any, idx: number) => ({
                stage: Number(s.stage || idx + 1),
                fromSecond: Number(s.fromSecond || 0),
                radiusKm: Number(s.radiusKm !== undefined ? s.radiusKm : 1),
              })).sort((a: any, b: any) => a.fromSecond - b.fromSecond)
            : DEFAULT_COMMERCE_DISPATCH_CONFIG.stages;

          baseConfig = {
            enabled: raw.enabled === true,
            profileVersion: String(raw.profileVersion || "v1"),
            stages,
            timeoutSeconds: Number(raw.timeoutSeconds || DEFAULT_COMMERCE_DISPATCH_CONFIG.timeoutSeconds),
            gpsFreshnessSeconds: Number(raw.gpsFreshnessSeconds || DEFAULT_COMMERCE_DISPATCH_CONFIG.gpsFreshnessSeconds),
            offerTtlSeconds: Number(raw.offerTtlSeconds || DEFAULT_COMMERCE_DISPATCH_CONFIG.offerTtlSeconds),
            maxConcurrentOffers: Number(raw.maxConcurrentOffers || DEFAULT_COMMERCE_DISPATCH_CONFIG.maxConcurrentOffers),
            manualAssignmentEnabled: raw.manualAssignmentEnabled !== false,
            effectiveAt: raw.effectiveAt,
            overrides: raw.overrides || {},
          };
        }
      }
    } catch (err: any) {
      functions.logger.warn(`[COMMERCE_DISPATCH] Error leyendo /system_config/global: ${err.message}`);
    }

    if (!baseConfig) {
      baseConfig = { ...DEFAULT_COMMERCE_DISPATCH_CONFIG };
    }

    cachedConfig = baseConfig;
    cachedConfigExpiresAt = now + 60 * 1000;
  }

  // Resolver posible override por municipio
  if (municipalityId && baseConfig.overrides && baseConfig.overrides[municipalityId]) {
    const override = baseConfig.overrides[municipalityId];
    return {
      ...baseConfig,
      ...override,
      stages: override.stages || baseConfig.stages,
    };
  }

  return baseConfig;
}

// ─── Utilidades SemVer y Gate de Versión de Motorizado ───────────────────────

/**
 * Parsea y compara versiones en formato SemVer (ej. "1.0.1", "1.1.0", "v1.1.0").
 * Retorna:
 *  1 si v1 > v2
 * -1 si v1 < v2
 *  0 si v1 == v2
 */
export function parseSemVer(versionStr?: string | null): [number, number, number] {
  if (!versionStr || typeof versionStr !== "string") return [0, 0, 0];
  const cleaned = versionStr.trim().replace(/^[vV]/, "").split("-")[0];
  const parts = cleaned.split(".").map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return [parts[0], parts[1], parts[2]];
}

export function compareSemVer(v1?: string | null, v2?: string | null): number {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

export interface CourierVersionPolicy {
  enabled: boolean;
  minimumVersion: string;
  updateUrl: string;
}

// In-memory cache de la política de versión de Courier (60 segundos)
let cachedCourierVersionPolicy: CourierVersionPolicy | null = null;
let cachedCourierVersionPolicyExpiresAt = 0;

export function resetCourierMinVersionCache(): void {
  cachedCourierVersionPolicy = null;
  cachedCourierVersionPolicyExpiresAt = 0;
}

/**
 * Resuelve la versión mínima requerida para Couriers desde el SSOT /system_config/global.appUpdate.
 * FAIL-OPEN RESPECTO A ACTIVACIÓN:
 * Si rolePolicies.courier no existe o enabled !== true, el gate permanece DESACTIVADO (enabled: false).
 * Solo se activa cuando Stage 4 configure explícitamente rolePolicies.courier.enabled === true.
 */
export async function getCanonicalCourierMinimumVersion(): Promise<CourierVersionPolicy> {
  const now = Date.now();
  if (cachedCourierVersionPolicy && cachedCourierVersionPolicyExpiresAt > now) {
    return cachedCourierVersionPolicy;
  }

  let enabled = false;
  let minVer = "1.0.0";
  let url = "/downloads/app-core-release.apk";

  try {
    const snap = await db.collection("system_config").doc("global").get();
    if (snap.exists) {
      const data = snap.data();
      const appUpdate = data?.appUpdate;
      const courierPolicy = appUpdate?.rolePolicies?.courier;
      // Verificación estricta: Solo se activa si rolePolicies.courier.enabled es exactamente true
      if (courierPolicy && courierPolicy.enabled === true) {
        enabled = true;
        minVer = courierPolicy.minimumVersion ? courierPolicy.minimumVersion.toString().trim() : "1.1.0";
        url = courierPolicy.downloadUrl || appUpdate?.downloadUrl || url;
      }
    }
  } catch (err: any) {
    functions.logger.warn(`[COURIER_VERSION_GATE] Error leyendo /system_config/global.appUpdate: ${err.message}`);
  }

  cachedCourierVersionPolicy = { enabled, minimumVersion: minVer, updateUrl: url };
  cachedCourierVersionPolicyExpiresAt = now + 60 * 1000;
  return cachedCourierVersionPolicy;
}

/**
 * Consulta la versión instalada en los dispositivos activos del courier desde /user_devices.
 * POLÍTICA MULTI-DISPOSITIVO DETERMINISTA (STRICTEST_ACTIVE_VERSION):
 * Si un Courier UID tiene múltiples documentos activos, se resuelve la versión MÁS ESTRICTA (mínimo SemVer)
 * para garantizar que un dispositivo desactualizado nunca sea clasificado accidentalmente como actualizado.
 * A igual versión, se aplica ordenamiento determinista por timestamp más reciente y tie-breaker por ID de documento.
 */
export async function getCourierActiveAppVersion(courierId: string): Promise<string | null> {
  try {
    const devicesSnap = await db.collection("user_devices")
      .where("uid", "==", courierId)
      .limit(10)
      .get();

    if (devicesSnap.empty) {
      return null;
    }

    const activeDocs = devicesSnap.docs.filter((d) => d.data().isActive !== false);
    if (activeDocs.length === 0) {
      return null;
    }

    const versions: Array<{ version: string; timestampMs: number; id: string }> = [];
    for (const doc of activeDocs) {
      const data = doc.data();
      const rawVer = (data.appVersion || data.versionName || "").toString().trim();
      if (rawVer) {
        const u = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0;
        const l = data.lastActiveAt?.toMillis ? data.lastActiveAt.toMillis() : 0;
        versions.push({
          version: rawVer,
          timestampMs: Math.max(u, l),
          id: doc.id,
        });
      }
    }

    if (versions.length === 0) {
      return null;
    }

    // Ordenar de menor a mayor versión (Strictest SemVer first).
    // A igual versión, ordenar por timestamp más reciente (DESC) y tie-breaker por id (DESC).
    versions.sort((a, b) => {
      const semVerCmp = compareSemVer(a.version, b.version);
      if (semVerCmp !== 0) return semVerCmp; // Menor versión primero (Strictest)
      if (b.timestampMs !== a.timestampMs) return b.timestampMs - a.timestampMs;
      return b.id.localeCompare(a.id);
    });

    return versions[0].version;
  } catch (err: any) {
    functions.logger.warn(`[COURIER_VERSION_GATE] Error leyendo user_devices para ${courierId}: ${err.message}`);
  }
  return null;
}

// ─── Interfaces de Sesión y Ofertas ──────────────────────────────────────────

export type DispatchSessionStatus =
  | "SEARCHING"
  | "ASSIGNED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "MANUALLY_ASSIGNED";

export interface CommerceDispatchSession {
  sessionId: string;
  orderId: string;
  businessId: string;
  branchId?: string | null;
  serviceType: "COMMERCE_DELIVERY";
  orderCityId: string;
  departmentId: string;
  municipalityId: string;
  pickupCoordinates: {
    latitude: number;
    longitude: number;
  };
  deliveryCoordinates: {
    latitude: number;
    longitude: number;
  };
  status: DispatchSessionStatus;
  currentStage: number;
  currentRadiusKm: number;
  attemptNumber: number;
  startedAt: admin.firestore.Timestamp;
  stageStartedAt: admin.firestore.Timestamp;
  nextExpansionAt: admin.firestore.Timestamp | null;
  timeoutAt: admin.firestore.Timestamp;
  assignedCourierId?: string | null;
  assignedCourierName?: string | null;
  assignmentMode?: "AUTO_DISPATCH" | "MANUAL_ADMIN" | "MANUAL_MERCHANT";
  claimedAt?: admin.firestore.Timestamp | null;
  timedOutAt?: admin.firestore.Timestamp | null;
  cancelledAt?: admin.firestore.Timestamp | null;
  cancelReason?: string | null;
  notifiedCourierIds: string[];
  activeOffersCount: number;
  dispatchProfileVersion: string;
  pricingFrozenSnapshot: {
    deliveryFee: number;
    courierEarnings: number;
    pricingMode: string;
    territorialLevel?: string | null;
    pricingPolicyId?: string | null;
  };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface CandidateCourier {
  courierId: string;
  name: string;
  distanceKm: number;
  lat: number;
  lng: number;
}

// ─── Utilidad Haversine Pura ─────────────────────────────────────────────────

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusKm = 6371;
  return Math.round(earthRadiusKm * c * 100) / 100;
}

// ─── Motor de Elegibilidad de Motorizados ────────────────────────────────────

/**
 * Descubre motorizados elegibles dentro de un radio desde el origen del comercio.
 * Filtros estrictos:
 * 1. Telemetría GPS en /ubicaciones_repartidores con coordenadas válidas.
 * 2. GPS Freshness: <= gpsFreshnessSeconds.
 * 3. Distancia Haversine <= maxRadiusKm.
 * 4. No excluidos previamente (notifiedCourierIds).
 * 5. Perfil en /couriers o /users: online, activo, sin pedido activo incompatible.
 * 6. Sin bloqueo financiero en /courier_balances.
 * 7. Coincidencia de municipio operativo (orderCityId / municipalityId).
 */
export async function findEligibleCouriersForStage(
  pickupCoords: { latitude: number; longitude: number },
  maxRadiusKm: number,
  municipalityId: string,
  excludedUids: string[] = [],
  gpsFreshnessSeconds = 600,
  commercialTenantId?: string
): Promise<CandidateCourier[]> {
  const excludedSet = new Set(excludedUids.map((u) => u.trim()));
  const normalizedMuni = (municipalityId || "").trim().toUpperCase();
  const nowMs = Date.now();
  const maxGpsStaleMs = gpsFreshnessSeconds * 1000;

  // 1. Obtener ubicaciones recientes
  const locationsSnap = await db.collection("ubicaciones_repartidores").limit(150).get();
  if (locationsSnap.empty) {
    return [];
  }

  const nearbyList: Array<{
    courierId: string;
    lat: number;
    lng: number;
    distKm: number;
    rawLocationData: any;
  }> = [];

  for (const doc of locationsSnap.docs) {
    const courierId = doc.id;
    if (excludedSet.has(courierId)) continue;

    const data = doc.data() || {};
    const coords = data.coordenadas || {};
    const lat = Number(coords.latitud ?? coords.latitude ?? data.latitud ?? data.lat ?? data.latitude);
    const lng = Number(coords.longitud ?? coords.longitude ?? data.longitud ?? data.lng ?? data.longitude);

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) continue;

    // Validación de Frescura GPS
    let lastUpdateMs = 0;
    if (data.ultimaActualizacion) {
      lastUpdateMs = typeof data.ultimaActualizacion.toMillis === "function"
        ? data.ultimaActualizacion.toMillis()
        : (Number(data.ultimaActualizacion) || Date.parse(data.ultimaActualizacion) || 0);
    } else if (data.updatedAt) {
      lastUpdateMs = typeof data.updatedAt.toMillis === "function"
        ? data.updatedAt.toMillis()
        : Date.parse(data.updatedAt) || 0;
    }

    if (lastUpdateMs > 0 && nowMs - lastUpdateMs > maxGpsStaleMs) {
      continue; // GPS STALE
    }

    // Cálculo Haversine al comercio
    const distKm = calculateHaversineDistanceKm(pickupCoords.latitude, pickupCoords.longitude, lat, lng);
    if (distKm > maxRadiusKm) {
      continue; // Fuera del radio del stage actual
    }

    nearbyList.push({ courierId, lat, lng, distKm, rawLocationData: data });
  }

  if (nearbyList.length === 0) {
    return [];
  }

  // 2. Validación Concurrente de Perfil, Disponibilidad y Territorio
  const candidates: CandidateCourier[] = [];

  await Promise.all(
    nearbyList.map(async (item) => {
      try {
        const [courierDoc, balanceSnap] = await Promise.all([
          db.collection("couriers").doc(item.courierId).get(),
          db.collection("courier_balances").doc(item.courierId).get(),
        ]);

        const userDoc = courierDoc.exists ? null : await db.collection("users").doc(item.courierId).get();
        const profile = (courierDoc.exists ? courierDoc.data() : userDoc?.data()) || {};

        // Validar Rol
        const role = (profile.role || profile.rol || profile.userType || "").toString().toLowerCase();
        if (!["courier", "motorizado", "driver"].includes(role)) {
          return;
        }

        // Validar Estado Operativo / Online
        const isOnline = profile.isOnline !== false && profile.online !== false && profile.estadoTurno !== "OFFLINE";
        const isActive = profile.isActive !== false && profile.active !== false && profile.status !== "SUSPENDED" && profile.status !== "BLOCKED";
        const hasActiveAssignment = Boolean(profile.activeAssignmentId || profile.pedidoActivoId);

        if (!isOnline || !isActive || hasActiveAssignment) {
          return;
        }

        // Validar Territorio Operativo / Municipio (C2D.35.GEO-R.2)
        const courierMuni = (
          profile.operationalMunicipalityId ||
          profile.municipalityId ||
          profile.cityId ||
          profile.city ||
          ""
        ).toString().trim().toUpperCase();

        if (normalizedMuni && courierMuni && courierMuni !== normalizedMuni) {
          return; // Courier pertenece a otra ciudad
        }

        // Validar Tenant si aplica
        if (commercialTenantId && profile.tenantId && profile.tenantId !== "default" && profile.tenantId !== commercialTenantId) {
          return;
        }

        // Validar Bloqueos Financieros (/courier_balances)
        if (balanceSnap.exists) {
          const bData = balanceSnap.data() || {};
          const canReceive = bData.canReceiveNewOrders !== false;
          const state = (bData.financialAccessState || "ALLOW").toString().toUpperCase();
          const hasOverdue = Boolean(bData.hasOverdueClosure);
          const cashCents = Number(bData.cashOutstandingCents || 0);
          const limitCents = Number(bData.effectiveCashLimitCents || bData.cashLimitCents || 200000);

          if (!canReceive || state.startsWith("BLOCKED") || hasOverdue || (limitCents > 0 && cashCents >= limitCents)) {
            return;
          }
        }

        // Validar Versión de la Aplicación Courier (BSD-SCHEDULED-COMMERCE-STAGE-3B-COURIER-UPDATE-BOOTSTRAP-001)
        // FAIL-OPEN: Solo se evalúa si rolePolicies.courier.enabled === true en el SSOT de configuración
        const versionPolicy = await getCanonicalCourierMinimumVersion();
        if (versionPolicy.enabled) {
          const courierVersion = await getCourierActiveAppVersion(item.courierId);
          if (courierVersion && compareSemVer(courierVersion, versionPolicy.minimumVersion) < 0) {
            functions.logger.info(`[COMMERCE_DISPATCH] Courier ${item.courierId} excluido de ofertas por versión desactualizada (${courierVersion} < ${versionPolicy.minimumVersion})`);
            return;
          }
        }

        const name = item.rawLocationData.nombre || profile.name || profile.nombre || "Motorizado";
        candidates.push({
          courierId: item.courierId,
          name,
          distanceKm: item.distKm,
          lat: item.lat,
          lng: item.lng,
        });
      } catch (err: any) {
        functions.logger.warn(`[COMMERCE_DISPATCH] Error evaluando elegibilidad de ${item.courierId}: ${err.message}`);
      }
    })
  );

  // Ordenar por cercanía al comercio
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  return candidates;
}

// ─── Emisión de Ofertas y Notificación FCM ───────────────────────────────────

export async function dispatchOffersToCouriers(
  session: CommerceDispatchSession,
  candidates: CandidateCourier[],
  offerTtlSeconds: number,
  orderData: any
): Promise<string[]> {
  if (candidates.length === 0) return [];

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + offerTtlSeconds * 1000);
  const notifiedUids: string[] = [];

  const batch = db.batch();
  const sessionRef = db.collection("commerce_dispatch_sessions").doc(session.orderId);

  for (const c of candidates) {
    const offerRef = sessionRef.collection("offers").doc(c.courierId);
    batch.set(offerRef, {
      offerId: `${session.orderId}_${c.courierId}_${session.currentStage}`,
      orderId: session.orderId,
      courierId: c.courierId,
      stage: session.currentStage,
      radiusKm: session.currentRadiusKm,
      distanceToMerchantKm: c.distanceKm,
      status: "OFFERED",
      offeredAt: now,
      expiresAt,
    }, { merge: true });

    notifiedUids.push(c.courierId);
  }

  // Actualizar lista de motorizados ya notificados en la sesión
  batch.update(sessionRef, {
    notifiedCourierIds: admin.firestore.FieldValue.arrayUnion(...notifiedUids),
    activeOffersCount: admin.firestore.FieldValue.increment(notifiedUids.length),
    updatedAt: now,
  });

  await batch.commit();

  // Enviar Notificación Push FCM Idempotente
  const businessName = orderData.businessName || "Comercio";
  const displayEarnings = session.pricingFrozenSnapshot.courierEarnings || 0;
  const displayCode = orderData.orderCode || orderData.orderShortCode || session.orderId.slice(-6).toUpperCase();

  await Promise.all(
    candidates.map(async (c) => {
      try {
        const userDevicesSnap = await db.collection("user_devices")
          .where("uid", "==", c.courierId)
          .where("isActive", "==", true)
          .get();

        const tokens: string[] = [];
        userDevicesSnap.forEach((doc) => {
          const t = doc.data()?.fcmToken;
          if (t && typeof t === "string" && t.length > 20) tokens.push(t);
        });

        if (tokens.length > 0) {
          const resolvedOffer = await NotificationTemplateService.resolve("COMMERCE_ORDER_OFFER", {
            businessName: String(businessName),
            orderCode: String(displayCode),
            courierEarnings: String(displayEarnings),
            distanceKm: String(c.distanceKm),
          });

          await messaging.sendEachForMulticast({
            tokens,
            data: {
              action: "COMMERCE_ORDER_OFFER",
              orderId: session.orderId,
              orderCode: String(orderData.orderCode || ""),
              orderShortCode: String(orderData.orderShortCode || ""),
              businessName: String(businessName),
              serviceType: "COMMERCE_DELIVERY",
              stage: String(session.currentStage),
              radiusKm: String(session.currentRadiusKm),
              screen: "available_orders",
              title: resolvedOffer.title,
              body: resolvedOffer.body,
              expiresAt: expiresAt.toDate().toISOString(),
            },
            android: { priority: "high", directBootOk: true } as any,
          });
        }
      } catch (fcmErr: any) {
        functions.logger.warn(`[COMMERCE_DISPATCH] Error enviando FCM a ${c.courierId}: ${fcmErr.message}`);
      }
    })
  );

  // Registro de Auditoría
  await db.collection("audit_events").add({
    event: "COMMERCE_DISPATCH_OFFERS_SENT",
    orderId: session.orderId,
    stage: session.currentStage,
    radiusKm: session.currentRadiusKm,
    couriersNotifiedCount: notifiedUids.length,
    courierIds: notifiedUids,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return notifiedUids;
}

// ─── Inicio Idempotente de Progressive Dispatch ──────────────────────────────

/**
 * Inicia una sesión de Progressive Dispatch para un pedido Commerce.
 * Idempotente: Si ya existe una sesión activa, retorna la existente sin duplicación.
 */
export async function startCommerceDispatch(
  orderId: string,
  orderData: any
): Promise<{ success: boolean; sessionId: string; stage: number; couriersNotified: number }> {
  // Precondición de Dominio: Exclusivo para COMMERCE_DELIVERY
  const serviceType = (orderData.serviceType || "COMMERCE_DELIVERY").toString().trim();
  if (serviceType !== "COMMERCE_DELIVERY") {
    functions.logger.info(`[COMMERCE_DISPATCH] Ignorado: orden ${orderId} es ${serviceType} (No es COMMERCE_DELIVERY).`);
    return { success: false, sessionId: orderId, stage: 0, couriersNotified: 0 };
  }

  // Precondiciones de Pedido: Sin courier asignado y en estado de preparación/ready
  if (orderData.assignedCourierId || orderData.motorizadoId) {
    functions.logger.info(`[COMMERCE_DISPATCH] Ignorado: orden ${orderId} ya tiene motorizado asignado.`);
    return { success: false, sessionId: orderId, stage: 0, couriersNotified: 0 };
  }

  const muniId = (orderData.commercialMunicipalityId || orderData.municipalityId || orderData.cityId || "").toString().trim().toUpperCase();
  const deptId = (orderData.departmentId || "").toString().trim().toUpperCase();

  const config = await getCommerceProgressiveDispatchConfig(muniId);
  if (!config.enabled) {
    functions.logger.info(`[COMMERCE_DISPATCH] Deshabilitado por Feature Flag para municipio ${muniId}.`);
    return { success: false, sessionId: orderId, stage: 0, couriersNotified: 0 };
  }

  const stage1 = config.stages && config.stages.length > 0
    ? config.stages[0]
    : { stage: 1, fromSecond: 0, radiusKm: 1.0 };
  const stage2 = config.stages[1] || null;

  const nowMs = Date.now();
  const startedAt = admin.firestore.Timestamp.fromMillis(nowMs);
  const timeoutAt = admin.firestore.Timestamp.fromMillis(nowMs + config.timeoutSeconds * 1000);
  const nextExpansionAt = stage2
    ? admin.firestore.Timestamp.fromMillis(nowMs + stage2.fromSecond * 1000)
    : null;

  // Resolver coordenadas de pickup
  const pickupLat = Number(orderData.businessLatitude || orderData.branchLatitude || orderData.originLatitude || 0);
  const pickupLng = Number(orderData.businessLongitude || orderData.branchLongitude || orderData.originLongitude || 0);

  const deliveryLat = Number(orderData.destinationLatitude || 0);
  const deliveryLng = Number(orderData.destinationLongitude || 0);

  if (!pickupLat || !pickupLng) {
    functions.logger.error(`[COMMERCE_DISPATCH] Coordenadas de origen ausentes en orden ${orderId}. Abortando dispatch.`);
    return { success: false, sessionId: orderId, stage: 0, couriersNotified: 0 };
  }

  const sessionRef = db.collection("commerce_dispatch_sessions").doc(orderId);

  // Transacción atómica de creación (Idempotencia create-if-absent)
  const sessionResult = await db.runTransaction(async (transaction) => {
    const existingSnap = await transaction.get(sessionRef);
    if (existingSnap.exists) {
      const existing = existingSnap.data() as CommerceDispatchSession;
      if (existing.status === "SEARCHING" || existing.status === "ASSIGNED") {
        return { isNew: false, session: existing };
      }
    }

    const newSession: CommerceDispatchSession = {
      sessionId: orderId,
      orderId,
      businessId: (orderData.businessId || "").toString(),
      branchId: orderData.branchId || null,
      serviceType: "COMMERCE_DELIVERY",
      orderCityId: muniId,
      departmentId: deptId,
      municipalityId: muniId,
      pickupCoordinates: { latitude: pickupLat, longitude: pickupLng },
      deliveryCoordinates: { latitude: deliveryLat, longitude: deliveryLng },
      status: "SEARCHING",
      currentStage: stage1.stage,
      currentRadiusKm: stage1.radiusKm,
      attemptNumber: 1,
      startedAt,
      stageStartedAt: startedAt,
      nextExpansionAt,
      timeoutAt,
      assignedCourierId: null,
      notifiedCourierIds: [],
      activeOffersCount: 0,
      dispatchProfileVersion: config.profileVersion,
      pricingFrozenSnapshot: {
        deliveryFee: Number(orderData.deliveryFee || 0),
        courierEarnings: Number(orderData.courierEarnings || orderData.courierTotalEarnings || 0),
        pricingMode: orderData.pricingMode || "DISTANCE",
        territorialLevel: orderData.territorialLevel || null,
        pricingPolicyId: orderData.pricingPolicyId || null,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    transaction.set(sessionRef, newSession);
    return { isNew: true, session: newSession };
  });

  if (!sessionResult.isNew) {
    functions.logger.info(`[COMMERCE_DISPATCH] Sesión ya activa para orden ${orderId}. Reutilizando.`);
    return {
      success: true,
      sessionId: orderId,
      stage: sessionResult.session.currentStage,
      couriersNotified: sessionResult.session.notifiedCourierIds.length,
    };
  }

  // Descubrir y ofertar a couriers del Stage 1
  const candidates = await findEligibleCouriersForStage(
    sessionResult.session.pickupCoordinates,
    stage1.radiusKm,
    muniId,
    [],
    config.gpsFreshnessSeconds,
    orderData.commercialTenantId || orderData.tenantId
  );

  const notified = await dispatchOffersToCouriers(
    sessionResult.session,
    candidates,
    config.offerTtlSeconds,
    orderData
  );

  // Registro de Auditoría
  await db.collection("audit_events").add({
    event: "COMMERCE_DISPATCH_STARTED",
    orderId,
    stage: stage1.stage,
    radiusKm: stage1.radiusKm,
    candidatesFound: candidates.length,
    notifiedCount: notified.length,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    sessionId: orderId,
    stage: stage1.stage,
    couriersNotified: notified.length,
  };
}

// ─── Expansión Idempotente de Stage (Scheduler / Worker) ─────────────────────

/**
 * Expande la sesión de dispatch al siguiente radio/etapa.
 * Idempotente: Verifica currentStage y nextExpansionAt dentro de transacción.
 */
export async function expandCommerceDispatchStage(
  sessionId: string
): Promise<{ success: boolean; newStage?: number; newRadiusKm?: number; couriersNotified?: number }> {
  const sessionRef = db.collection("commerce_dispatch_sessions").doc(sessionId);

  const expansionData = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists) return null;

    const session = snap.data() as CommerceDispatchSession;
    if (session.status !== "SEARCHING") return null;

    const config = await getCommerceProgressiveDispatchConfig(session.municipalityId);
    const stages = config.stages;

    const currentIdx = stages.findIndex((s) => s.stage === session.currentStage);
    if (currentIdx < 0 || currentIdx >= stages.length - 1) {
      // Ya estamos en el último stage -> No expandir más
      transaction.update(sessionRef, {
        nextExpansionAt: null,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      return { noMoreStages: true };
    }

    const nextStage = stages[currentIdx + 1];
    const followingStage = stages[currentIdx + 2] || null;

    const now = admin.firestore.Timestamp.now();
    const nextExpansionAt = followingStage
      ? admin.firestore.Timestamp.fromMillis(session.startedAt.toMillis() + followingStage.fromSecond * 1000)
      : null;

    transaction.update(sessionRef, {
      currentStage: nextStage.stage,
      currentRadiusKm: nextStage.radiusKm,
      stageStartedAt: now,
      nextExpansionAt,
      updatedAt: now,
    });

    return {
      session: {
        ...session,
        currentStage: nextStage.stage,
        currentRadiusKm: nextStage.radiusKm,
      },
      nextStage,
      config,
    };
  });

  if (!expansionData || (expansionData as any).noMoreStages) {
    return { success: false };
  }

  const { session, nextStage, config } = expansionData as any;

  // Leer datos de la orden para obtener el nombre comercial
  const orderSnap = await db.collection("orders").doc(sessionId).get();
  const orderData = orderSnap.data() || {};

  // Descubrir couriers en el nuevo radio excluyendo a los ya notificados
  const newCandidates = await findEligibleCouriersForStage(
    session.pickupCoordinates,
    nextStage.radiusKm,
    session.municipalityId,
    session.notifiedCourierIds,
    config.gpsFreshnessSeconds,
    orderData.commercialTenantId || orderData.tenantId
  );

  const newlyNotified = await dispatchOffersToCouriers(
    session,
    newCandidates,
    config.offerTtlSeconds,
    orderData
  );

  // Registro de Auditoría
  await db.collection("audit_events").add({
    event: "COMMERCE_DISPATCH_STAGE_EXPANDED",
    orderId: sessionId,
    previousStage: session.currentStage - 1,
    newStage: nextStage.stage,
    newRadiusKm: nextStage.radiusKm,
    newCandidatesCount: newCandidates.length,
    newlyNotifiedCount: newlyNotified.length,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    newStage: nextStage.stage,
    newRadiusKm: nextStage.radiusKm,
    couriersNotified: newlyNotified.length,
  };
}

// ─── Claim / Aceptación Atómica (Anti-Race & Compare-and-Set) ────────────────

export interface ClaimCommerceOrderResult {
  success: boolean;
  code: string;
  message: string;
  orderId: string;
  courierId?: string;
  assignedAt?: admin.firestore.Timestamp;
  minimumVersion?: string;
  updateUrl?: string;
}

/**
 * Reclamo atómico de orden comercial por parte del motorizado.
 * Anti-Race:
 * 1. Verifica en transacción que session.status == "SEARCHING".
 * 2. Verifica que order.assignedCourierId == null.
 * 3. Asigna de forma indivisible en session y en order.
 * 4. Si dos couriers compiten simultáneamente, el primero gana y el segundo recibe ORDER_ALREADY_ASSIGNED.
 * 5. Si compite contra timeout, la transacción previene estado inconsistente.
 */
export async function claimCommerceOrderAtomically(
  orderId: string,
  courierUid: string,
  courierName?: string,
  clientAppVersion?: string
): Promise<ClaimCommerceOrderResult> {
  const sessionRef = db.collection("commerce_dispatch_sessions").doc(orderId);
  const orderRef = db.collection("orders").doc(orderId);

  const cleanCourierId = courierUid.trim();

  // ─── GATE OPERACIONAL DE VERSIÓN (BSD-SCHEDULED-COMMERCE-STAGE-3B-COURIER-UPDATE-BOOTSTRAP-001) ───
  // FAIL-OPEN: Solo se evalúa si rolePolicies.courier.enabled === true en el SSOT de configuración
  const versionPolicy = await getCanonicalCourierMinimumVersion();

  if (versionPolicy.enabled) {
    const activeDeviceVersion = await getCourierActiveAppVersion(cleanCourierId);

    // 1. Si el cliente envía explícitamente su versión y es inferior a la requerida
    if (clientAppVersion && compareSemVer(clientAppVersion, versionPolicy.minimumVersion) < 0) {
      functions.logger.warn(`[COURIER_VERSION_GATE] Reclamo rechazado por versión cliente: ${clientAppVersion} < ${versionPolicy.minimumVersion} (courier: ${cleanCourierId})`);
      return {
        success: false,
        code: "APP_VERSION_UPGRADE_REQUIRED",
        message: `Tu versión de la app de motorizado (${clientAppVersion}) está desactualizada. Por favor actualiza a la versión ${versionPolicy.minimumVersion} para aceptar pedidos.`,
        orderId,
        minimumVersion: versionPolicy.minimumVersion,
        updateUrl: versionPolicy.updateUrl,
      };
    }

    // 2. Si el dispositivo registrado en /user_devices reporta una versión inferior a la requerida
    if (activeDeviceVersion && compareSemVer(activeDeviceVersion, versionPolicy.minimumVersion) < 0) {
      functions.logger.warn(`[COURIER_VERSION_GATE] Reclamo rechazado por user_devices: ${activeDeviceVersion} < ${versionPolicy.minimumVersion} (courier: ${cleanCourierId})`);
      return {
        success: false,
        code: "APP_VERSION_UPGRADE_REQUIRED",
        message: `Tu versión de la app de motorizado (${activeDeviceVersion}) está desactualizada. Por favor actualiza a la versión ${versionPolicy.minimumVersion} para aceptar pedidos.`,
        orderId,
        minimumVersion: versionPolicy.minimumVersion,
        updateUrl: versionPolicy.updateUrl,
      };
    }
  }

  return await db.runTransaction(async (transaction) => {
    const [sessionSnap, orderSnap, courierDoc, balanceSnap] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(orderRef),
      transaction.get(db.collection("couriers").doc(cleanCourierId)),
      transaction.get(db.collection("courier_balances").doc(cleanCourierId)),
    ]);

    if (!sessionSnap.exists) {
      return {
        success: false,
        code: "DISPATCH_SESSION_NOT_FOUND",
        message: "No existe sesión de búsqueda activa para este pedido.",
        orderId,
      };
    }

    const session = sessionSnap.data() as CommerceDispatchSession;

    if (session.status === "ASSIGNED") {
      return {
        success: false,
        code: "ORDER_ALREADY_ASSIGNED",
        message: "El pedido ya fue asignado a otro motorizado.",
        orderId,
      };
    }

    if (session.status === "TIMED_OUT") {
      return {
        success: false,
        code: "DISPATCH_TIMED_OUT",
        message: "El tiempo de búsqueda para este pedido ha expirado.",
        orderId,
      };
    }

    if (session.status === "CANCELLED") {
      return {
        success: false,
        code: "ORDER_CANCELLED",
        message: "El pedido fue cancelado.",
        orderId,
      };
    }

    if (session.status !== "SEARCHING") {
      return {
        success: false,
        code: "DISPATCH_NOT_ACTIVE",
        message: `La sesión no está activa (estado: ${session.status}).`,
        orderId,
      };
    }

    if (!orderSnap.exists) {
      return {
        success: false,
        code: "ORDER_NOT_FOUND",
        message: "El pedido no existe en el sistema.",
        orderId,
      };
    }

    const orderData = orderSnap.data() || {};
    const existingCourier = (orderData.assignedCourierId || orderData.motorizadoId || "").toString().trim();
    if (existingCourier && existingCourier !== cleanCourierId) {
      return {
        success: false,
        code: "ORDER_ALREADY_ASSIGNED",
        message: "El pedido ya tiene un motorizado asignado.",
        orderId,
      };
    }

    // Validar Elegibilidad y Restricciones del Courier
    const userDoc = courierDoc.exists ? null : await transaction.get(db.collection("users").doc(cleanCourierId));
    const profile = (courierDoc.exists ? courierDoc.data() : userDoc?.data()) || {};

    const isOnline = profile.isOnline !== false && profile.online !== false && profile.estadoTurno !== "OFFLINE";
    const isActive = profile.isActive !== false && profile.active !== false;
    const hasActiveAssignment = Boolean(profile.activeAssignmentId || profile.pedidoActivoId);

    if (!isOnline || !isActive) {
      return {
        success: false,
        code: "COURIER_NOT_AVAILABLE",
        message: "Tu cuenta de motorizado no está en estado activo/disponible.",
        orderId,
      };
    }

    if (hasActiveAssignment) {
      return {
        success: false,
        code: "COURIER_HAS_ACTIVE_ORDER",
        message: "Ya tienes un pedido activo en curso.",
        orderId,
      };
    }

    // Validar Restricción Financiera
    if (balanceSnap.exists) {
      const bData = balanceSnap.data() || {};
      const canReceive = bData.canReceiveNewOrders !== false;
      const state = (bData.financialAccessState || "ALLOW").toString().toUpperCase();
      if (!canReceive || state.startsWith("BLOCKED")) {
        return {
          success: false,
          code: "COURIER_FINANCIAL_BLOCK",
          message: "Límite de efectivo excedido o bloqueo administrativo activo.",
          orderId,
        };
      }
    }

    const now = admin.firestore.Timestamp.now();
    const finalCourierName = courierName || profile.name || profile.nombre || "Motorizado";

    // 1. Mutar Session
    transaction.update(sessionRef, {
      status: "ASSIGNED",
      assignedCourierId: cleanCourierId,
      assignedCourierName: finalCourierName,
      assignmentMode: "AUTO_DISPATCH",
      claimedAt: now,
      updatedAt: now,
    });

    // 2. Mutar Offer si existe
    const offerRef = sessionRef.collection("offers").doc(cleanCourierId);
    transaction.set(offerRef, {
      status: "ACCEPTED",
      acceptedAt: now,
    }, { merge: true });

    // 3. Mutar Order (Sin alterar pricing ni ledger)
    transaction.update(orderRef, {
      assignedCourierId: cleanCourierId,
      motorizadoId: cleanCourierId,
      driverName: finalCourierName,
      assignedCourierName: finalCourierName,
      motorizadoNombre: finalCourierName,
      status: "assigned",
      estado: "asignado",
      assignedAt: now,
      updatedAt: now,
      historialEstados: admin.firestore.FieldValue.arrayUnion({
        estado: "asignado",
        fecha: now.toDate().toISOString(),
        actor: cleanCourierId,
        motivo: "CLAIM_COMMERCE_PROGRESSIVE_DISPATCH",
      }),
    });

    // 4. Marcar asignación activa en el perfil del courier
    const targetProfileRef = courierDoc.exists ? db.collection("couriers").doc(cleanCourierId) : db.collection("users").doc(cleanCourierId);
    transaction.update(targetProfileRef, {
      activeAssignmentId: orderId,
      pedidoActivoId: orderId,
      updatedAt: now,
    });

    return {
      success: true,
      code: "CLAIM_SUCCESS",
      message: "Pedido asignado exitosamente.",
      orderId,
      courierId: cleanCourierId,
      assignedAt: now,
    };
  });
}

// ─── Rechazo de Oferta por Motorizado ────────────────────────────────────────

export async function rejectCommerceOffer(
  orderId: string,
  courierUid: string,
  reason = "REJECTED_BY_COURIER"
): Promise<{ success: boolean; message: string }> {
  const sessionRef = db.collection("commerce_dispatch_sessions").doc(orderId);
  const offerRef = sessionRef.collection("offers").doc(courierUid);

  await offerRef.set({
    status: "REJECTED",
    rejectionReason: reason,
    rejectedAt: admin.firestore.Timestamp.now(),
  }, { merge: true });

  await db.collection("orders").doc(orderId).update({
    rejectedByCouriers: admin.firestore.FieldValue.arrayUnion(courierUid),
    rejectionHistory: admin.firestore.FieldValue.arrayUnion({
      courierId: courierUid,
      reason,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});

  await db.collection("audit_events").add({
    event: "COMMERCE_DISPATCH_REJECTED",
    orderId,
    courierId: courierUid,
    reason,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "Oferta rechazada exitosamente." };
}

// ─── Asignación Manual por Administrador ─────────────────────────────────────

/**
 * Asignación manual autoritativa de motorizado desde Control Tower / Admin Web.
 * Resuelve race conditions con claim automático: si la orden ya fue reclamada, falla con conflicto seguro.
 */
export async function assignCommerceOrderManual(
  orderId: string,
  courierUid: string,
  adminUid: string,
  options?: { allowOutOfRadius?: boolean; reason?: string }
): Promise<ClaimCommerceOrderResult> {
  const sessionRef = db.collection("commerce_dispatch_sessions").doc(orderId);
  const orderRef = db.collection("orders").doc(orderId);
  const cleanCourierId = courierUid.trim();

  return await db.runTransaction(async (transaction) => {
    const [sessionSnap, orderSnap, courierDoc] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(orderRef),
      transaction.get(db.collection("couriers").doc(cleanCourierId)),
    ]);

    if (!orderSnap.exists) {
      return {
        success: false,
        code: "ORDER_NOT_FOUND",
        message: "El pedido no existe.",
        orderId,
      };
    }

    const orderData = orderSnap.data() || {};
    const existingCourier = (orderData.assignedCourierId || orderData.motorizadoId || "").toString().trim();
    if (existingCourier && existingCourier !== cleanCourierId) {
      return {
        success: false,
        code: "ORDER_ALREADY_ASSIGNED",
        message: `El pedido ya está asignado a otro motorizado (${existingCourier}).`,
        orderId,
      };
    }

    const userDoc = courierDoc.exists ? null : await transaction.get(db.collection("users").doc(cleanCourierId));
    const profile = (courierDoc.exists ? courierDoc.data() : userDoc?.data()) || {};
    const courierName = profile.name || profile.nombre || "Motorizado";

    const now = admin.firestore.Timestamp.now();

    // 1. Si existe session, cancelarla/marcarla MANUALLY_ASSIGNED
    if (sessionSnap.exists) {
      const session = sessionSnap.data() as CommerceDispatchSession;
      if (session.status === "ASSIGNED" && session.assignedCourierId && session.assignedCourierId !== cleanCourierId) {
        return {
          success: false,
          code: "ORDER_ALREADY_ASSIGNED",
          message: "El pedido ya fue reclamado por otro motorizado en la sesión de dispatch.",
          orderId,
        };
      }

      transaction.update(sessionRef, {
        status: "MANUALLY_ASSIGNED",
        assignedCourierId: cleanCourierId,
        assignedCourierName: courierName,
        assignmentMode: "MANUAL_ADMIN",
        claimedAt: now,
        updatedAt: now,
      });
    }

    // 2. Asignar en Order
    transaction.update(orderRef, {
      assignedCourierId: cleanCourierId,
      motorizadoId: cleanCourierId,
      driverName: courierName,
      assignedCourierName: courierName,
      status: "assigned",
      estado: "asignado",
      assignedAt: now,
      manualAssignedBy: adminUid,
      manualAssignedAt: now,
      manualAssignmentReason: options?.reason || "ADMIN_MANUAL_ASSIGNMENT",
      updatedAt: now,
      historialEstados: admin.firestore.FieldValue.arrayUnion({
        estado: "asignado",
        fecha: now.toDate().toISOString(),
        actor: adminUid,
        motivo: "MANUAL_ADMIN_OVERRIDE",
      }),
    });

    // 3. Marcar pedido activo en courier
    const targetProfileRef = courierDoc.exists ? db.collection("couriers").doc(cleanCourierId) : db.collection("users").doc(cleanCourierId);
    transaction.update(targetProfileRef, {
      activeAssignmentId: orderId,
      pedidoActivoId: orderId,
      updatedAt: now,
    });

    return {
      success: true,
      code: "MANUAL_ASSIGNMENT_SUCCESS",
      message: "Motorizado asignado manualmente con éxito.",
      orderId,
      courierId: cleanCourierId,
    };
  });
}

// ─── Timeout Global y Fallback Operacional ───────────────────────────────────

/**
 * Procesa timeouts globales de sesiones SEARCHING cuyo timeoutAt <= now.
 */
export async function processCommerceDispatchTimeouts(): Promise<number> {
  const now = admin.firestore.Timestamp.now();

  const searchingSessionsSnap = await db.collection("commerce_dispatch_sessions")
    .where("status", "==", "SEARCHING")
    .limit(100)
    .get();

  if (searchingSessionsSnap.empty) return 0;

  const nowMs = now.toMillis();
  const expiredSessionsDocs = searchingSessionsSnap.docs.filter((doc) => {
    const data = doc.data() as CommerceDispatchSession;
    const timeoutMs = data.timeoutAt?.toMillis ? data.timeoutAt.toMillis() : 0;
    return timeoutMs > 0 && timeoutMs <= nowMs;
  });

  if (expiredSessionsDocs.length === 0) return 0;

  let timedOutCount = 0;

  for (const doc of expiredSessionsDocs) {
    const orderId = doc.id;
    const sessionRef = doc.ref;
    const orderRef = db.collection("orders").doc(orderId);

    try {
      await db.runTransaction(async (transaction) => {
        const sSnap = await transaction.get(sessionRef);
        if (!sSnap.exists) return;
        const session = sSnap.data() as CommerceDispatchSession;
        if (session.status !== "SEARCHING") return; // Ya fue asignado o cancelado

        const oSnap = await transaction.get(orderRef);
        if (!oSnap.exists) return;
        const order = oSnap.data() || {};
        if (order.assignedCourierId || order.motorizadoId) return;

        // Marcar sesión como TIMED_OUT
        transaction.update(sessionRef, {
          status: "TIMED_OUT",
          timedOutAt: now,
          updatedAt: now,
        });

        // Actualizar order sin cancelar pedido ni destruir montos
        transaction.update(orderRef, {
          dispatchStatus: "NO_COURIER_AVAILABLE_TIMEOUT",
          noCourierFoundAt: now,
          updatedAt: now,
          historialEstados: admin.firestore.FieldValue.arrayUnion({
            estado: "no_courier_timeout",
            fecha: now.toDate().toISOString(),
            actor: "COMMERCE_DISPATCH_SCHEDULER",
            motivo: "GLOBAL_SEARCH_TIMEOUT_REACHED",
          }),
        });
      });

      await db.collection("audit_events").add({
        event: "COMMERCE_DISPATCH_TIMED_OUT",
        orderId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      timedOutCount++;
    } catch (err: any) {
      functions.logger.warn(`[COMMERCE_DISPATCH] Error procesando timeout de ${orderId}: ${err.message}`);
    }
  }

  return timedOutCount;
}

// ─── Reintento de Búsqueda (Retry Dispatch) ──────────────────────────────────

/**
 * Permite reiniciar la búsqueda automática para un pedido en TIMED_OUT.
 * Incrementa attemptNumber y reinicia la secuencia de stages.
 */
export async function retryCommerceDispatch(
  orderId: string,
  actorUid: string
): Promise<{ success: boolean; message: string; attemptNumber?: number }> {
  const sessionRef = db.collection("commerce_dispatch_sessions").doc(orderId);
  const orderRef = db.collection("orders").doc(orderId);

  return await db.runTransaction(async (transaction) => {
    const [sSnap, oSnap] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(orderRef),
    ]);

    if (!sSnap.exists) {
      return { success: false, message: "No existe sesión previa para este pedido." };
    }

    const session = sSnap.data() as CommerceDispatchSession;
    if (session.status !== "TIMED_OUT") {
      return { success: false, message: `Solo se pueden reintentar pedidos en TIMED_OUT (actual: ${session.status}).` };
    }

    const order = oSnap.data() || {};
    if (order.assignedCourierId || order.motorizadoId) {
      return { success: false, message: "El pedido ya tiene un motorizado asignado." };
    }

    if (["cancelled", "cancelado", "rejected", "rechazado"].includes(String(order.status || "").toLowerCase())) {
      return { success: false, message: "El pedido está cancelado o rechazado." };
    }

    const config = await getCommerceProgressiveDispatchConfig(session.municipalityId);
    const stage1 = config.stages && config.stages.length > 0
      ? config.stages[0]
      : { stage: 1, fromSecond: 0, radiusKm: 1.0 };
    const stage2 = config.stages[1] || null;

    const now = admin.firestore.Timestamp.now();
    const timeoutAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + config.timeoutSeconds * 1000);
    const nextExpansionAt = stage2
      ? admin.firestore.Timestamp.fromMillis(now.toMillis() + stage2.fromSecond * 1000)
      : null;

    const newAttempt = (session.attemptNumber || 1) + 1;

    transaction.update(sessionRef, {
      status: "SEARCHING",
      currentStage: stage1.stage,
      currentRadiusKm: stage1.radiusKm,
      attemptNumber: newAttempt,
      startedAt: now,
      stageStartedAt: now,
      nextExpansionAt,
      timeoutAt,
      notifiedCourierIds: [], // Reiniciar lista de notificados para el nuevo intento
      activeOffersCount: 0,
      timedOutAt: null,
      updatedAt: now,
    });

    transaction.update(orderRef, {
      dispatchStatus: "SEARCHING",
      dispatchAttemptNumber: newAttempt,
      updatedAt: now,
    });

    return {
      success: true,
      message: "Búsqueda reiniciada exitosamente.",
      attemptNumber: newAttempt,
    };
  });
}

// ─── Cancelación de Dispatch (Cancel Order) ──────────────────────────────────

export async function cancelCommerceDispatch(
  orderId: string,
  reason: string
): Promise<void> {
  const sessionRef = db.collection("commerce_dispatch_sessions").doc(orderId);
  const snap = await sessionRef.get();
  if (snap.exists && snap.data()?.status === "SEARCHING") {
    await sessionRef.update({
      status: "CANCELLED",
      cancelReason: reason,
      cancelledAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    await db.collection("audit_events").add({
      event: "COMMERCE_DISPATCH_CANCELLED",
      orderId,
      reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
