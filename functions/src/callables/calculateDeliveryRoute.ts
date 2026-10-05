import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
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
    const departmentId = (data?.departmentId || data?.originDepartmentId || "").toString().trim() || undefined;
    const municipalityId = (data?.municipalityId || data?.originMunicipalityId || data?.cityId || "").toString().trim() || undefined;
    const businessId = (data?.businessId || data?.storeId || data?.comercioId || "").toString().trim() || undefined;
    const branchId = (data?.branchId || data?.sucursalId || "").toString().trim() || undefined;

    const options: RoutingOptions = {
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
      ? await calculateCommerceDeliveryRoute(options)
      : await calculateDeliveryRoute(options);

    let quoteId: string | null = null;
    let quoteExpiresAt: string | null = null;

    // FEATURE GATE: /pricing_quotes solo se genera cuando la resolución territorial es FLAT y el usuario está autenticado.
    // Esto garantiza que Gate A sea 100% inerte para todos los municipios DISTANCE (cero writes, cero reads, cero costo adicional).
    const isFlatPolicyApplied = isCommerce &&
      routingResult.pricingSnapshot?.pricingMode === "FLAT" &&
      routingResult.pricingSnapshot?.fixedDeliveryFee != null &&
      routingResult.calculatedFee != null;

    const authenticatedUid = context.auth?.uid;

    if (isFlatPolicyApplied && authenticatedUid) {
      try {
        const quoteRef = admin.firestore().collection("pricing_quotes").doc();
        quoteId = quoteRef.id;
        const now = Date.now();
        const expiresAtDate = new Date(now + 15 * 60 * 1000); // 15 minutos de vigencia para redimir
        const ttlExpiresAtDate = new Date(now + 24 * 60 * 60 * 1000); // 24 horas para retención/auditoría y purga TTL
        quoteExpiresAt = expiresAtDate.toISOString();

        const quoteDeptId = (options.departmentId || routingResult.pricingSnapshot?.departmentId || "").toString().trim() || null;
        const quoteMuniId = (options.municipalityId || routingResult.pricingSnapshot?.municipalityId || "").toString().trim() || null;
        const quoteBizId = (options.businessId || "").toString().trim() || null;
        const quoteBranchId = (options.branchId || "").toString().trim() || null;

        await quoteRef.set({
          quoteId,
          customerId: authenticatedUid,
          businessId: quoteBizId,
          branchId: quoteBranchId,
          departmentId: quoteDeptId,
          municipalityId: quoteMuniId,
          countryCode: (routingResult.pricingSnapshot?.countryCode || "NI").toString().trim().toUpperCase(),
          deliveryFee: routingResult.calculatedFee,
          courierEarnings: routingResult.pricingSnapshot?.courierEarnings ?? 0,
          pricingMode: "FLAT",
          pricingPolicyId: routingResult.pricingSnapshot?.pricingPolicyId ?? null,
          pricingPolicyVersion: routingResult.pricingSnapshot?.pricingPolicyVersion ?? null,
          distanceMeters: routingResult.routeDistanceMeters,
          distanceKm: routingResult.pricingSnapshot?.distanceKm ?? (routingResult.routeDistanceMeters / 1000),
          originLat: Math.round(options.origin.latitude * 10000) / 10000,
          originLng: Math.round(options.origin.longitude * 10000) / 10000,
          destLat: Math.round(options.destination.latitude * 10000) / 10000,
          destLng: Math.round(options.destination.longitude * 10000) / 10000,
          currency: routingResult.pricingSnapshot?.currency || "NIO",
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
          ttlExpiresAt: admin.firestore.Timestamp.fromDate(ttlExpiresAtDate),
          used: false,
          orderId: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        (routingResult as any).quoteId = quoteId;
        (routingResult as any).quoteExpiresAt = quoteExpiresAt;
        if (routingResult.pricingSnapshot) {
          (routingResult.pricingSnapshot as any).quoteId = quoteId;
          (routingResult.pricingSnapshot as any).quoteExpiresAt = quoteExpiresAt;
        }
      } catch (qErr: any) {
        functions.logger.warn(`[ROUTING_CALLABLE] Error al persistir server-side quote: ${qErr.message}`);
      }
    }

    functions.logger.info(
      `[ROUTING_CALLABLE] Rutas calculadas para caller=${callerUid} (service=${isCommerce ? "COMMERCE" : "X_TO_Y"}): dist=${routingResult.routeDistanceMeters}m, dur=${routingResult.routeDurationSeconds}s, fee=C$${routingResult.calculatedFee}, quoteId=${quoteId || "none"}, provider=${routingResult.routingProvider}`
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

