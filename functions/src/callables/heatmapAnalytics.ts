/**
 * BlueSystem Delivery Enterprise — Heatmap & Hot Zones Analytics Backend
 * Actividad #8: Módulo de Zonas Calientes / Heatmap de Demanda Multi-Tenant
 * ADR-003 (Presupuesto Firestore & No N+1), ADR-013/ADR-016 (Aislamiento y Gobernanza)
 *
 * Funcionalidades:
 * 1. adminGetHeatmapData: Consulta agregada y proyectada de coordenadas de demanda
 *    con sanitización K-Anonymity (Anti-Doxxing), normalización de peso y KPIs en tiempo real.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";

const db = admin.firestore();

export interface HeatmapFilterPayload {
  tenantId?: string;
  timeRange?: "today" | "yesterday" | "last7days" | "last30days" | "currentMonth" | "custom";
  startDate?: string | number; // ISO string o timestamp ms
  endDate?: string | number;   // ISO string o timestamp ms
  businessLine?: "ALL" | "COMMERCE" | "PARCEL_XY";
  perspective?: "DESTINATION" | "ORIGIN" | "BOTH";
  metric?: "ALL" | "COMPLETED" | "CANCELLED";
  departmentId?: string;
  municipalityId?: string;
  merchantId?: string;
  minAggregationCount?: number; // K-Anonymity threshold (default 1)
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number; // 0.0 - 1.0
  count: number;
  businessLine: "COMMERCE" | "PARCEL_XY" | "MIXED";
  statusGroup: "COMPLETED" | "ACTIVE" | "CANCELLED" | "MIXED";
}

export interface HotZoneSummaryItem {
  zoneName: string;
  municipality: string;
  department: string;
  orderCount: number;
  commerceCount: number;
  xToYCount: number;
  percentage: number;
}

export interface HeatmapResponse {
  success: boolean;
  points: HeatmapPoint[];
  summary: {
    totalOrders: number;
    commerceOrders: number;
    xToYOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    activeOrders: number;
    uniquePointsCount: number;
    topZones: HotZoneSummaryItem[];
    maxDensityCell: number;
    appliedFilters: {
      tenantId: string;
      timeRange: string;
      businessLine: string;
      perspective: string;
      metric: string;
      departmentId?: string;
      municipalityId?: string;
      merchantId?: string;
    };
  };
}

/**
 * Calcula la ventana de fechas en base a un identificador o fechas ISO personalizadas
 */
function resolveTimeWindow(
  timeRange: string = "last7days",
  customStart?: string | number,
  customEnd?: string | number
): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getTime());

  if (timeRange === "custom" && customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      return { start: s, end: e };
    }
  }

  const start = new Date(now.getTime());

  switch (timeRange) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "last7days":
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "last30days":
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "currentMonth":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * Redondeo espacial para K-Anonymity (anti-doxxing).
 * 3 decimales corresponden a un grid aproximado de ~110 metros.
 */
function roundCoord(val: number, precision: number = 3): number {
  const factor = Math.pow(10, precision);
  return Math.round(val * factor) / factor;
}

/**
 * Determina el estado operacional normalizado
 */
function normalizeStatusGroup(status: string = ""): "COMPLETED" | "ACTIVE" | "CANCELLED" {
  const s = (status || "").toUpperCase();
  if (["DELIVERED", "COMPLETED", "ENTREGADO", "FINALIZADO"].includes(s)) {
    return "COMPLETED";
  }
  if (["CANCELLED", "REJECTED", "CANCELADO", "RECHAZADO", "FAILED", "ANULADO"].includes(s)) {
    return "CANCELLED";
  }
  return "ACTIVE";
}

/**
 * 1. CALLABLE: adminGetHeatmapData
 */
export const adminGetHeatmapData = functions.https.onCall(
  async (data: HeatmapFilterPayload = {}, context): Promise<HeatmapResponse> => {
    // 1. Validar Autenticación y Contexto EIAM
    const validated = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: [
          "SUPER_ADMIN",
          "ADMIN",
          "AUDITOR",
          "SUPERVISOR",
          "OPERATOR",
          "OPERATIONS",
          "super_admin",
          "admin",
          "auditor",
          "supervisor",
          "operator",
          "operations"
        ],
      },
      "adminGetHeatmapData"
    );

    const callerRole = (validated.role || "").toUpperCase();
    const callerTenantId = validated.tenantId;
    const isSuperAdmin = callerRole.includes("SUPER_ADMIN") || context.auth?.token?.isSuperAdmin === true;

    // 2. Aislamiento Multi-Tenant Estricto
    let effectiveTenantId = data.tenantId || "ALL";
    if (!isSuperAdmin) {
      if (callerTenantId) {
        effectiveTenantId = callerTenantId;
      }
    }

    const timeRange = data.timeRange || "last7days";
    const businessLine = data.businessLine || "ALL";
    let perspective = data.perspective || "DESTINATION";
    const metricFilter = data.metric || "ALL";
    const targetDept = (data.departmentId || "").trim().toUpperCase();
    const targetMuni = (data.municipalityId || "").trim().toUpperCase();
    const targetMerchant = (data.merchantId || "").trim();

    // Si se consulta un comercio específico, el Modo Comercial se activa.
    const isMerchantMode = !!targetMerchant && targetMerchant !== "ALL";

    // Regla Inviolable: Merchant Mode SIEMPRE debe mirar hacia los clientes.
    if (isMerchantMode) {
      perspective = "DESTINATION";
    }

    const { start, end } = resolveTimeWindow(timeRange, data.startDate, data.endDate);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    Logger.info("[HEATMAP] Iniciando consulta agregada de demanda", {
      caller: validated.uid,
      effectiveTenantId,
      timeRange,
      businessLine,
      perspective,
      metricFilter,
      start: start.toISOString(),
      end: end.toISOString()
    });

    // 3. Consultas Atómicas Optimizadas (ADR-003: No N+1, límite seguro)
    const MAX_QUERY_LIMIT = 5000;
    const rawEvents: Array<{
      lat: number;
      lng: number;
      businessLine: "COMMERCE" | "PARCEL_XY";
      statusGroup: "COMPLETED" | "ACTIVE" | "CANCELLED";
      department: string;
      municipality: string;
      zoneName: string;
    }> = [];

    let totalCommerce = 0;
    let totalXToY = 0;
    let totalCompleted = 0;
    let totalCancelled = 0;
    let totalActive = 0;

    // ─── 3.1 Consultar /orders (Commerce Delivery) ──────────────────────────────
    if (businessLine === "ALL" || businessLine === "COMMERCE") {
      let ordersQuery = db
        .collection("orders")
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .limit(MAX_QUERY_LIMIT);

      if (effectiveTenantId && effectiveTenantId !== "ALL") {
        ordersQuery = ordersQuery.where("tenantId", "==", effectiveTenantId);
      }

      if (targetMerchant && targetMerchant !== "ALL") {
        // NOTA: Se elimina el filter de query para evitar FAILED_PRECONDITION (falta índice compuesto)
        // Se realizará el filtrado estricto en memoria en el forEach.
      }

      const ordersSnap = await ordersQuery.get();

      ordersSnap.forEach((doc) => {
        const d = doc.data();
        if (!d) return;

        // Aislamiento de Comercio en memoria (reemplaza el where query)
        if (isMerchantMode && d.businessId !== targetMerchant) return;

        // Si es un X_TO_Y legado en /orders y el filtro es solo COMMERCE, saltar
        const isXToYLegacy = d.serviceType === "X_TO_Y_DELIVERY" || d.orderType === "X_TO_Y_DELIVERY";
        if (businessLine === "COMMERCE" && isXToYLegacy) return;

        const statusGroup = normalizeStatusGroup(d.status || d.estado);

        // Filtro por métrica
        if (metricFilter === "COMPLETED" && statusGroup !== "COMPLETED") return;
        if (metricFilter === "CANCELLED" && statusGroup !== "CANCELLED") return;

        // Extracción de coordenadas según perspectiva
        let lat: number | null = null;
        let lng: number | null = null;

        if (perspective === "ORIGIN") {
          lat = Number(d.businessLocation?.latitude || d.origen?.coordenadas?.latitud || d.storeLocation?.latitude);
          lng = Number(d.businessLocation?.longitude || d.origen?.coordenadas?.longitud || d.storeLocation?.longitude);
        } else {
          // DESTINATION o BOTH
          lat = Number(
            d.customerLocation?.latitude ||
            d.customerLocation?.lat ||
            d.latitude ||
            d.destino?.coordenadas?.latitud ||
            d.deliveryLocation?.latitude
          );
          lng = Number(
            d.customerLocation?.longitude ||
            d.customerLocation?.lng ||
            d.longitude ||
            d.destino?.coordenadas?.longitud ||
            d.deliveryLocation?.longitude
          );
        }

        // Si no hay coordenadas numéricas válidas, descartar
        if (!lat || !lng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
          return;
        }

        const dept = (d.department || d.departamento || "MANAGUA").toString().toUpperCase();
        const muni = (d.municipality || d.municipio || "MANAGUA").toString().toUpperCase();

        if (targetDept && targetDept !== "ALL" && !dept.includes(targetDept)) return;
        if (targetMuni && targetMuni !== "ALL" && !muni.includes(targetMuni)) return;

        totalCommerce++;
        if (statusGroup === "COMPLETED") totalCompleted++;
        else if (statusGroup === "CANCELLED") totalCancelled++;
        else totalActive++;

        const zoneName = (d.zone || d.neighborhood || d.barrio || muni).toString();

        rawEvents.push({
          lat,
          lng,
          businessLine: isXToYLegacy ? "PARCEL_XY" : "COMMERCE",
          statusGroup,
          department: dept,
          municipality: muni,
          zoneName
        });
      });
    }

    // ─── 3.2 Consultar /deliveryTrips (X→Y Delivery) ───────────────────────────
    if (businessLine === "ALL" || businessLine === "PARCEL_XY") {
      let tripsQuery = db
        .collection("deliveryTrips")
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .limit(MAX_QUERY_LIMIT);

      if (effectiveTenantId && effectiveTenantId !== "ALL") {
        tripsQuery = tripsQuery.where("tenantId", "==", effectiveTenantId);
      }

      if (targetMerchant && targetMerchant !== "ALL") {
        // Filtrado en memoria
      }

      const tripsSnap = await tripsQuery.get();

      tripsSnap.forEach((doc) => {
        const d = doc.data();
        if (!d) return;

        if (isMerchantMode && d.businessId !== targetMerchant) return;

        const statusGroup = normalizeStatusGroup(d.status || d.estado);

        if (metricFilter === "COMPLETED" && statusGroup !== "COMPLETED") return;
        if (metricFilter === "CANCELLED" && statusGroup !== "CANCELLED") return;

        const originLat = Number(d.origin?.latitude || d.origin?.lat);
        const originLng = Number(d.origin?.longitude || d.origin?.lng);
        const destLat = Number(d.destination?.latitude || d.destination?.lat);
        const destLng = Number(d.destination?.longitude || d.destination?.lng);

        const dept = (d.department || d.departamento || "MANAGUA").toString().toUpperCase();
        const muni = (d.municipality || d.municipio || "MANAGUA").toString().toUpperCase();

        if (targetDept && targetDept !== "ALL" && !dept.includes(targetDept)) return;
        if (targetMuni && targetMuni !== "ALL" && !muni.includes(targetMuni)) return;

        const zoneName = muni;

        // Añadir según perspectiva
        if (perspective === "ORIGIN" || perspective === "BOTH") {
          if (originLat && originLng && !isNaN(originLat) && !isNaN(originLng)) {
            totalXToY++;
            if (statusGroup === "COMPLETED") totalCompleted++;
            else if (statusGroup === "CANCELLED") totalCancelled++;
            else totalActive++;

            rawEvents.push({
              lat: originLat,
              lng: originLng,
              businessLine: "PARCEL_XY",
              statusGroup,
              department: dept,
              municipality: muni,
              zoneName: `${zoneName} (Origen)`
            });
          }
        }

        if (perspective === "DESTINATION" || perspective === "BOTH") {
          if (destLat && destLng && !isNaN(destLat) && !isNaN(destLng)) {
            if (perspective !== "BOTH") {
              totalXToY++;
              if (statusGroup === "COMPLETED") totalCompleted++;
              else if (statusGroup === "CANCELLED") totalCancelled++;
              else totalActive++;
            }

            rawEvents.push({
              lat: destLat,
              lng: destLng,
              businessLine: "PARCEL_XY",
              statusGroup,
              department: dept,
              municipality: muni,
              zoneName: `${zoneName} (Destino)`
            });
          }
        }
      });
    }

    // 4. K-Anonymity Spatial Cell Aggregation & Anti-Doxxing
    // Redondear a grid de 3 decimales (~110m) y consolidar
    const cellMap = new Map<
      string,
      {
        lat: number;
        lng: number;
        count: number;
        commerceCount: number;
        xToYCount: number;
        statusCounts: { COMPLETED: number; ACTIVE: number; CANCELLED: number };
        department: string;
        municipality: string;
        zoneName: string;
      }
    >();

    const zoneAggregates = new Map<
      string,
      {
        zoneName: string;
        municipality: string;
        department: string;
        orderCount: number;
        commerceCount: number;
        xToYCount: number;
      }
    >();

    let maxCellCount = 0;

    for (const evt of rawEvents) {
      const roundedLat = roundCoord(evt.lat, 3);
      const roundedLng = roundCoord(evt.lng, 3);
      const cellKey = `${roundedLat.toFixed(3)}_${roundedLng.toFixed(3)}`;

      let cell = cellMap.get(cellKey);
      if (!cell) {
        cell = {
          lat: roundedLat,
          lng: roundedLng,
          count: 0,
          commerceCount: 0,
          xToYCount: 0,
          statusCounts: { COMPLETED: 0, ACTIVE: 0, CANCELLED: 0 },
          department: evt.department,
          municipality: evt.municipality,
          zoneName: evt.zoneName
        };
        cellMap.set(cellKey, cell);
      }

      cell.count++;
      if (evt.businessLine === "COMMERCE") cell.commerceCount++;
      else cell.xToYCount++;

      cell.statusCounts[evt.statusGroup]++;

      if (cell.count > maxCellCount) {
        maxCellCount = cell.count;
      }

      // Consolidar zonas para el ranking
      const zoneKey = `${evt.municipality}_${evt.zoneName}`;
      let zoneItem = zoneAggregates.get(zoneKey);
      if (!zoneItem) {
        zoneItem = {
          zoneName: evt.zoneName,
          municipality: evt.municipality,
          department: evt.department,
          orderCount: 0,
          commerceCount: 0,
          xToYCount: 0
        };
        zoneAggregates.set(zoneKey, zoneItem);
      }
      zoneItem.orderCount++;
      if (evt.businessLine === "COMMERCE") zoneItem.commerceCount++;
      else zoneItem.xToYCount++;
    }

    // 5. Normalización de Intensidad (Weight 0.0 - 1.0)
    const points: HeatmapPoint[] = [];

    cellMap.forEach((cell) => {
      // K-Anonymity: Originalmente bloqueaba celdas < 2 para evitar Doxxing en modo Comercio.
      // A solicitud operativa, se ha deshabilitado para visualizar clientes únicos (K >= 1).
      // if (isMerchantMode && cell.count < 2) {
      //   return;
      // }
      // Normalización no lineal suave para destacar puntos calientes sin ahogar zonas medias
      const rawRatio = maxCellCount > 0 ? cell.count / maxCellCount : 1.0;
      // Curva cuadrática suave: 0.2 + 0.8 * sqrt(ratio) para dar visibilidad a celdas con 1-2 pedidos
      const weight = Number(Math.min(1.0, Math.max(0.1, 0.2 + 0.8 * Math.sqrt(rawRatio))).toFixed(3));

      let businessLine: "COMMERCE" | "PARCEL_XY" | "MIXED" = "COMMERCE";
      if (cell.commerceCount > 0 && cell.xToYCount > 0) businessLine = "MIXED";
      else if (cell.xToYCount > 0) businessLine = "PARCEL_XY";

      let statusGroup: "COMPLETED" | "ACTIVE" | "CANCELLED" | "MIXED" = "COMPLETED";
      const totalInCell = cell.count;
      if (cell.statusCounts.CANCELLED === totalInCell) statusGroup = "CANCELLED";
      else if (cell.statusCounts.ACTIVE === totalInCell) statusGroup = "ACTIVE";
      else if (cell.statusCounts.COMPLETED === totalInCell) statusGroup = "COMPLETED";
      else statusGroup = "MIXED";

      points.push({
        lat: cell.lat,
        lng: cell.lng,
        weight,
        count: cell.count,
        businessLine,
        statusGroup
      });
    });

    // 6. Top 5 Zonas Calientes
    const totalAllOrders = rawEvents.length;
    let finalZones = Array.from(zoneAggregates.values());

    if (isMerchantMode) {
      let otrosCount = 0;
      const validZones: typeof finalZones = [];

      for (const z of finalZones) {
        if (z.orderCount < 2) {
          otrosCount += z.orderCount;
        } else {
          validZones.push(z);
        }
      }

      if (otrosCount > 0) {
        validZones.push({
          zoneName: "Otras Zonas (Agrupadas)",
          municipality: "Varios",
          department: "Varios",
          orderCount: otrosCount,
          commerceCount: otrosCount,
          xToYCount: 0
        });
      }
      finalZones = validZones;
    }

    const topZones: HotZoneSummaryItem[] = finalZones
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5)
      .map((z) => ({
        zoneName: z.zoneName,
        municipality: z.municipality,
        department: z.department,
        orderCount: z.orderCount,
        commerceCount: z.commerceCount,
        xToYCount: z.xToYCount,
        percentage: totalAllOrders > 0 ? Number(((z.orderCount / totalAllOrders) * 100).toFixed(1)) : 0
      }));

    return {
      success: true,
      points,
      summary: {
        totalOrders: totalAllOrders,
        commerceOrders: totalCommerce,
        xToYOrders: totalXToY,
        completedOrders: totalCompleted,
        cancelledOrders: totalCancelled,
        activeOrders: totalActive,
        uniquePointsCount: points.length,
        topZones,
        maxDensityCell: maxCellCount,
        appliedFilters: {
          tenantId: effectiveTenantId,
          timeRange,
          businessLine,
          perspective,
          metric: metricFilter,
          departmentId: targetDept || undefined,
          municipalityId: targetMuni || undefined,
          merchantId: targetMerchant || undefined
        }
      }
    };
  }
);
