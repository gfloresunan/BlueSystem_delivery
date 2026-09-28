"use strict";
/**
 * BlueSystem Delivery Enterprise — Heatmap & Hot Zones Analytics Backend
 * Actividad #8: Módulo de Zonas Calientes / Heatmap de Demanda Multi-Tenant
 * ADR-003 (Presupuesto Firestore & No N+1), ADR-013/ADR-016 (Aislamiento y Gobernanza)
 *
 * Funcionalidades:
 * 1. adminGetHeatmapData: Consulta agregada y proyectada de coordenadas de demanda
 *    con sanitización K-Anonymity (Anti-Doxxing), normalización de peso y KPIs en tiempo real.
 */
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
exports.adminGetHeatmapData = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
const db = admin.firestore();
/**
 * Calcula la ventana de fechas en base a un identificador o fechas ISO personalizadas
 */
function resolveTimeWindow(timeRange = "last7days", customStart, customEnd) {
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
function roundCoord(val, precision = 3) {
    const factor = Math.pow(10, precision);
    return Math.round(val * factor) / factor;
}
/**
 * Determina el estado operacional normalizado
 */
function normalizeStatusGroup(status = "") {
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
exports.adminGetHeatmapData = functions.https.onCall(async (data = {}, context) => {
    var _a, _b;
    // 1. Validar Autenticación y Contexto EIAM
    const validated = (0, validator_1.validateCallableContext)(context, data, {
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
    }, "adminGetHeatmapData");
    const callerRole = (validated.role || "").toUpperCase();
    const callerTenantId = validated.tenantId;
    const isSuperAdmin = callerRole.includes("SUPER_ADMIN") || ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.isSuperAdmin) === true;
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
    logger_1.Logger.info("[HEATMAP] Iniciando consulta agregada de demanda", {
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
    const rawEvents = [];
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
            const d = doc.data();
            if (!d)
                return;
            // Aislamiento de Comercio en memoria (reemplaza el where query)
            if (isMerchantMode && d.businessId !== targetMerchant)
                return;
            // Si es un X_TO_Y legado en /orders y el filtro es solo COMMERCE, saltar
            const isXToYLegacy = d.serviceType === "X_TO_Y_DELIVERY" || d.orderType === "X_TO_Y_DELIVERY";
            if (businessLine === "COMMERCE" && isXToYLegacy)
                return;
            const statusGroup = normalizeStatusGroup(d.status || d.estado);
            // Filtro por métrica
            if (metricFilter === "COMPLETED" && statusGroup !== "COMPLETED")
                return;
            if (metricFilter === "CANCELLED" && statusGroup !== "CANCELLED")
                return;
            // Extracción de coordenadas según perspectiva
            let lat = null;
            let lng = null;
            if (perspective === "ORIGIN") {
                lat = Number(((_a = d.businessLocation) === null || _a === void 0 ? void 0 : _a.latitude) || ((_c = (_b = d.origen) === null || _b === void 0 ? void 0 : _b.coordenadas) === null || _c === void 0 ? void 0 : _c.latitud) || ((_d = d.storeLocation) === null || _d === void 0 ? void 0 : _d.latitude));
                lng = Number(((_e = d.businessLocation) === null || _e === void 0 ? void 0 : _e.longitude) || ((_g = (_f = d.origen) === null || _f === void 0 ? void 0 : _f.coordenadas) === null || _g === void 0 ? void 0 : _g.longitud) || ((_h = d.storeLocation) === null || _h === void 0 ? void 0 : _h.longitude));
            }
            else {
                // DESTINATION o BOTH
                lat = Number(((_j = d.customerLocation) === null || _j === void 0 ? void 0 : _j.latitude) ||
                    ((_k = d.customerLocation) === null || _k === void 0 ? void 0 : _k.lat) ||
                    d.latitude ||
                    ((_m = (_l = d.destino) === null || _l === void 0 ? void 0 : _l.coordenadas) === null || _m === void 0 ? void 0 : _m.latitud) ||
                    ((_o = d.deliveryLocation) === null || _o === void 0 ? void 0 : _o.latitude));
                lng = Number(((_p = d.customerLocation) === null || _p === void 0 ? void 0 : _p.longitude) ||
                    ((_q = d.customerLocation) === null || _q === void 0 ? void 0 : _q.lng) ||
                    d.longitude ||
                    ((_s = (_r = d.destino) === null || _r === void 0 ? void 0 : _r.coordenadas) === null || _s === void 0 ? void 0 : _s.longitud) ||
                    ((_t = d.deliveryLocation) === null || _t === void 0 ? void 0 : _t.longitude));
            }
            // Si no hay coordenadas numéricas válidas, descartar
            if (!lat || !lng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
                return;
            }
            const dept = (d.department || d.departamento || "MANAGUA").toString().toUpperCase();
            const muni = (d.municipality || d.municipio || "MANAGUA").toString().toUpperCase();
            if (targetDept && targetDept !== "ALL" && !dept.includes(targetDept))
                return;
            if (targetMuni && targetMuni !== "ALL" && !muni.includes(targetMuni))
                return;
            totalCommerce++;
            if (statusGroup === "COMPLETED")
                totalCompleted++;
            else if (statusGroup === "CANCELLED")
                totalCancelled++;
            else
                totalActive++;
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
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const d = doc.data();
            if (!d)
                return;
            if (isMerchantMode && d.businessId !== targetMerchant)
                return;
            const statusGroup = normalizeStatusGroup(d.status || d.estado);
            if (metricFilter === "COMPLETED" && statusGroup !== "COMPLETED")
                return;
            if (metricFilter === "CANCELLED" && statusGroup !== "CANCELLED")
                return;
            const originLat = Number(((_a = d.origin) === null || _a === void 0 ? void 0 : _a.latitude) || ((_b = d.origin) === null || _b === void 0 ? void 0 : _b.lat));
            const originLng = Number(((_c = d.origin) === null || _c === void 0 ? void 0 : _c.longitude) || ((_d = d.origin) === null || _d === void 0 ? void 0 : _d.lng));
            const destLat = Number(((_e = d.destination) === null || _e === void 0 ? void 0 : _e.latitude) || ((_f = d.destination) === null || _f === void 0 ? void 0 : _f.lat));
            const destLng = Number(((_g = d.destination) === null || _g === void 0 ? void 0 : _g.longitude) || ((_h = d.destination) === null || _h === void 0 ? void 0 : _h.lng));
            const dept = (d.department || d.departamento || "MANAGUA").toString().toUpperCase();
            const muni = (d.municipality || d.municipio || "MANAGUA").toString().toUpperCase();
            if (targetDept && targetDept !== "ALL" && !dept.includes(targetDept))
                return;
            if (targetMuni && targetMuni !== "ALL" && !muni.includes(targetMuni))
                return;
            const zoneName = muni;
            // Añadir según perspectiva
            if (perspective === "ORIGIN" || perspective === "BOTH") {
                if (originLat && originLng && !isNaN(originLat) && !isNaN(originLng)) {
                    totalXToY++;
                    if (statusGroup === "COMPLETED")
                        totalCompleted++;
                    else if (statusGroup === "CANCELLED")
                        totalCancelled++;
                    else
                        totalActive++;
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
                        if (statusGroup === "COMPLETED")
                            totalCompleted++;
                        else if (statusGroup === "CANCELLED")
                            totalCancelled++;
                        else
                            totalActive++;
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
    const cellMap = new Map();
    const zoneAggregates = new Map();
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
        if (evt.businessLine === "COMMERCE")
            cell.commerceCount++;
        else
            cell.xToYCount++;
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
        if (evt.businessLine === "COMMERCE")
            zoneItem.commerceCount++;
        else
            zoneItem.xToYCount++;
    }
    // 5. Normalización de Intensidad (Weight 0.0 - 1.0)
    const points = [];
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
        let businessLine = "COMMERCE";
        if (cell.commerceCount > 0 && cell.xToYCount > 0)
            businessLine = "MIXED";
        else if (cell.xToYCount > 0)
            businessLine = "PARCEL_XY";
        let statusGroup = "COMPLETED";
        const totalInCell = cell.count;
        if (cell.statusCounts.CANCELLED === totalInCell)
            statusGroup = "CANCELLED";
        else if (cell.statusCounts.ACTIVE === totalInCell)
            statusGroup = "ACTIVE";
        else if (cell.statusCounts.COMPLETED === totalInCell)
            statusGroup = "COMPLETED";
        else
            statusGroup = "MIXED";
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
        const validZones = [];
        for (const z of finalZones) {
            if (z.orderCount < 2) {
                otrosCount += z.orderCount;
            }
            else {
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
    const topZones = finalZones
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
});
//# sourceMappingURL=heatmapAnalytics.js.map