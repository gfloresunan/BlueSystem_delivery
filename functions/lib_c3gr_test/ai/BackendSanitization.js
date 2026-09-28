"use strict";
/**
 * BlueSystem Delivery Enterprise — Capa de Sanitización Backend para IA
 *
 * INVARIANTE ABSOLUTA:
 * RAW BACKEND OBJECT ≠ TOOL RESULT ≠ LLM CONTEXT
 *
 * Elimina:
 * - Contraseñas, tokens JWT/FCM, credenciales
 * - Coordenadas GPS crudas (latitud, longitud)
 * - Identificadores privados de repartidores (courier UID)
 * - Costos, márgenes y cuentas bancarias de comercios
 * - Estructuras internas de base de datos o stack traces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendSanitization = void 0;
class BackendSanitization {
    /**
     * Sanitiza el contexto del perfil del cliente.
     */
    static sanitizeCustomerContext(userData) {
        if (!userData) {
            return "No se encontró información del perfil del cliente.";
        }
        const name = userData.nombre || userData.displayName || "Cliente";
        const address = userData.direccion || userData.address || "Sin dirección registrada";
        const loyaltyPoints = typeof userData.puntos === "number" ? userData.puntos : 0;
        return `Perfil del Cliente:\n- Nombre: ${name}\n- Dirección principal: ${address}\n- Puntos de lealtad: ${loyaltyPoints}`;
    }
    /**
     * Sanitiza una orden activa para la IA.
     */
    static sanitizeActiveOrder(orderData, orderId) {
        if (!orderData) {
            return "No hay pedidos activos actualmente para tu cuenta.";
        }
        const statusMap = {
            pending: "Pendiente de confirmación",
            accepted: "Aceptado por el comercio",
            in_preparation: "En preparación",
            ready: "Listo para recolectar",
            assigned: "Repartidor asignado",
            on_the_way: "En camino",
            delivered: "Entregado",
            cancelled: "Cancelado",
        };
        const status = orderData.status || "pending";
        const statusLabel = statusMap[status] || status;
        const businessName = orderData.businessName || "Comercio";
        const total = typeof orderData.total === "number" ? orderData.total : 0;
        const itemCount = Array.isArray(orderData.items) ? orderData.items.length : 0;
        return `Pedido Activo [ID: ${orderId}]:\n- Comercio: ${businessName}\n- Estado: ${statusLabel}\n- Total: C$ ${Math.round(total)}\n- Cantidad de ítems: ${itemCount}`;
    }
    /**
     * Sanitiza el historial de pedidos recientes.
     */
    static sanitizeOrderHistory(orders) {
        if (!orders || orders.length === 0) {
            return "No tienes pedidos previos registrados en tu historial.";
        }
        const itemsSummary = orders.slice(0, 5).map((o, idx) => {
            const biz = o.data.businessName || "Comercio";
            const total = Math.round(Number(o.data.total) || 0);
            const status = o.data.status || "completado";
            return `${idx + 1}. [ID: ${o.id}] ${biz} - Total: C$ ${total} (Estado: ${status})`;
        });
        return `Tus últimos ${itemsSummary.length} pedidos:\n` + itemsSummary.join("\n");
    }
    /**
     * Sanitiza la telemetría del repartidor.
     * PROHIBIDO EXPONER: latitud, longitud, courierUid, FCM token, teléfono privado.
     * PERMITIDO: distanciaKm, etaMinutes, signalFreshnessSeconds, isMoving, estado seguro.
     */
    static sanitizeTracking(orderData, telemetry) {
        const businessName = orderData.businessName || "Comercio";
        const status = orderData.status || "en_camino";
        if (!telemetry) {
            return `Tracking del Pedido (${businessName}):\n- Estado: ${status}\n- Telemetría: El repartidor está asignado y en proceso de recolección.`;
        }
        const freshness = telemetry.signalFreshnessSeconds <= 60
            ? "En tiempo real (< 1 min)"
            : `Actualizado hace ${Math.round(telemetry.signalFreshnessSeconds / 60)} min`;
        const movingStatus = telemetry.isMoving ? "En movimiento hacia tu ubicación" : "Detenido temporalmente";
        return (`Tracking del Pedido (${businessName}):\n` +
            `- Estado: En ruta de entrega\n` +
            `- Distancia estimada: ${telemetry.distanceKm.toFixed(1)} km\n` +
            `- Tiempo estimado de llegada (ETA): ~${Math.round(telemetry.etaMinutes)} minutos\n` +
            `- Dinámica: ${movingStatus}\n` +
            `- Señal GPS: ${freshness}`);
    }
}
exports.BackendSanitization = BackendSanitization;
