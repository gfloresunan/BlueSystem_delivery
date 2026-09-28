import * as functions from "firebase-functions";
import {
  calculateDeliveryRoute,
  calculateCommerceDeliveryRoute,
  RoutingOptions,
} from "../services/routingService";

/**
 * Callable HTTPS: calculateDeliveryRouteCallable
 * Punto de entrada autoritativo del backend para cotizar distancias reales y tarifas de entrega.
 * Soporta DOMINIO A (COMMERCE_DELIVERY) y DOMINIO B (X_TO_Y_DELIVERY) con contratos canónicos separados.
 */
export const calculateDeliveryRouteCallable = functions.https.onCall(async (data, context) => {
  // Verificación opcional de autenticación (requerido para clientes autenticados)
  const callerUid = context.auth ? context.auth.uid : "ANONYMOUS_CLIENT";

  const originLat = Number(data?.origin?.latitude ?? data?.originLat);
  const originLng = Number(data?.origin?.longitude ?? data?.originLng);
  const destLat = Number(data?.destination?.latitude ?? data?.destLat);
  const destLng = Number(data?.destination?.longitude ?? data?.destLng);
  const transportProfile = (data?.transportProfile === "DRIVE" ? "DRIVE" : "TWO_WHEELER") as "TWO_WHEELER" | "DRIVE";
  const tenantId = data?.tenantId || (context.auth?.token as any)?.tenantId || "default";
  const rawServiceType = (data?.serviceType || data?.type || "").toString().trim().toUpperCase();
  const isCommerce = rawServiceType === "COMMERCE" || rawServiceType === "COMMERCE_DELIVERY" || rawServiceType === "COMMERCIAL";

  if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "MISSING_OR_INVALID_COORDINATES: Se requieren origin y destination con latitude y longitude válidas."
    );
  }

  try {
    const options: RoutingOptions = {
      origin: { latitude: originLat, longitude: originLng },
      destination: { latitude: destLat, longitude: destLng },
      transportProfile,
      tenantId,
    };

    const routingResult = isCommerce
      ? await calculateCommerceDeliveryRoute(options)
      : await calculateDeliveryRoute(options);

    functions.logger.info(
      `[ROUTING_CALLABLE] Rutas calculadas para caller=${callerUid} (service=${isCommerce ? "COMMERCE" : "X_TO_Y"}): dist=${routingResult.routeDistanceMeters}m, dur=${routingResult.routeDurationSeconds}s, fee=C$${routingResult.calculatedFee}, provider=${routingResult.routingProvider}`
    );

    return {
      success: true,
      data: routingResult,
    };
  } catch (error: any) {
    functions.logger.error(`[ROUTING_CALLABLE] Error en cálculo de ruta: ${error?.message || error}`);
    throw new functions.https.HttpsError(
      "internal",
      error?.message || "Error al procesar la ruta y cotización de entrega."
    );
  }
});

