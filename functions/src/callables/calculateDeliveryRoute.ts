import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  calculateDeliveryRoute,
  calculateCommerceDeliveryRoute,
  RoutingOptions,
} from "../services/routingService";
import { validatePointInMunicipality } from "../services/municipalGeoIntegrityService";
import { resolveTerritorialPricingPolicy } from "../services/territorialPricingService";

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

    let deptInput = departmentId;
    let muniInput = municipalityId;

    if (isCommerce && !muniInput && businessId) {
      try {
        const bDoc = await admin.firestore().collection("businesses").doc(businessId).get();
        if (bDoc.exists) {
          const bData = bDoc.data() || {};
          deptInput = deptInput || bData.departmentId || bData.departamento || bData.department;
          muniInput = bData.municipalityId || bData.municipio || bData.municipality || bData.cityId || bData.city;
        }
      } catch (bErr) {
        functions.logger.warn(`[CALLABLE] No se pudo leer municipio del comercio ${businessId}:`, bErr);
      }
    }

    // ── MUNICIPAL GEO INTEGRITY GATE (BSD-MUNICIPAL-GEO-INTEGRITY-GATE-001) ──
    let originGeoCheck: any = null;
    let destGeoCheck: any = null;

    if (isCommerce) {
      const declaredMuni = muniInput || "UNKNOWN";
      originGeoCheck = await validatePointInMunicipality({
        countryCode: "NI",
        departmentId: deptInput,
        municipalityId: declaredMuni,
        latitude: originLat,
        longitude: originLng,
      });

      if (!originGeoCheck.valid) {
        if (originGeoCheck.status === "OUTSIDE_MUNICIPALITY") {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `ORIGIN_MUNICIPALITY_MISMATCH: Las coordenadas del comercio no pertenecen al municipio configurado (${declaredMuni}).`
          );
        } else if (originGeoCheck.status === "BOUNDARY_UNAVAILABLE") {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `MUNICIPAL_BOUNDARY_UNAVAILABLE: Polígono municipal no disponible para validar el comercio.`
          );
        } else {
          throw new functions.https.HttpsError(
            "invalid-argument",
            `INVALID_ORIGIN_COORDINATES: Coordenadas de origen inválidas.`
          );
        }
      }

      const destMuniInput = (data?.destinationMunicipalityId || data?.destMunicipalityId || declaredMuni).toString().trim().toUpperCase();

      destGeoCheck = await validatePointInMunicipality({
        countryCode: "NI",
        departmentId: deptInput,
        municipalityId: destMuniInput,
        latitude: destLat,
        longitude: destLng,
      });

      if (!destGeoCheck.valid) {
        if (destGeoCheck.status === "OUTSIDE_MUNICIPALITY") {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `DESTINATION_MUNICIPALITY_MISMATCH: La dirección de destino se encuentra fuera de los límites de ${destMuniInput}.`
          );
        } else if (destGeoCheck.status === "BOUNDARY_UNAVAILABLE") {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `MUNICIPAL_BOUNDARY_UNAVAILABLE: Polígono municipal no disponible para validar el destino.`
          );
        } else {
          throw new functions.https.HttpsError(
            "invalid-argument",
            `INVALID_DESTINATION_COORDINATES: Coordenadas de destino inválidas.`
          );
        }
      }

      // Verificación estricta de aislamiento intramunicipal Commerce con excepción de Nivel 3 autorizado
      if (originGeoCheck.declaredMunicipalityId && destGeoCheck.declaredMunicipalityId &&
          originGeoCheck.declaredMunicipalityId !== destGeoCheck.declaredMunicipalityId) {
        const territorialRes = await resolveTerritorialPricingPolicy(deptInput, originGeoCheck.declaredMunicipalityId, {
          destinationCoordinates: { latitude: destLat, longitude: destLng },
          originCoordinates: { latitude: originLat, longitude: originLng },
          destinationMunicipalityInput: destGeoCheck.declaredMunicipalityId,
          destinationDepartmentInput: data?.destinationDepartmentId || deptInput,
        });

        if (!territorialRes.isApplied || territorialRes.territorialLevel !== "INTER_MUNICIPAL") {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `CROSS_CITY_ORDER_BLOCKED: Envíos comerciales entre municipios no autorizados (${originGeoCheck.declaredMunicipalityId} -> ${destGeoCheck.declaredMunicipalityId}). Utilice X->Y o configure ruta Nivel 3.`
          );
        }
      }
    }

    const options: RoutingOptions = {
      origin: { latitude: originLat, longitude: originLng },
      destination: { latitude: destLat, longitude: destLng },
      transportProfile,
      tenantId,
      departmentId: deptInput,
      municipalityId: muniInput,
      destinationDepartmentId: data?.destinationDepartmentId || deptInput,
      destinationMunicipalityId: destGeoCheck?.declaredMunicipalityId || data?.destinationMunicipalityId || muniInput,
      businessId,
      branchId,
    };

    const routingResult = isCommerce
      ? await calculateCommerceDeliveryRoute(options)
      : await calculateDeliveryRoute(options);

    let quoteId: string | null = null;
    let quoteExpiresAt: string | null = null;

    // FEATURE GATE: /pricing_quotes solo se genera cuando la resolución territorial es FLAT / TERRITORIAL_FLAT y el usuario está autenticado.
    // Esto garantiza que sea 100% inerte para todos los municipios DISTANCE (cero writes, cero reads, cero costo adicional).
    const isFlatPolicyApplied = isCommerce &&
      (routingResult.pricingSnapshot?.pricingMode === "FLAT" || routingResult.pricingSnapshot?.pricingMode === "TERRITORIAL_FLAT") &&
      (routingResult.pricingSnapshot?.fixedDeliveryFee != null || routingResult.calculatedFee != null);

    const authenticatedUid = context.auth?.uid;

    const geoIntegritySnapshot = isCommerce && originGeoCheck && destGeoCheck ? {
      originMunicipalityId: originGeoCheck.declaredMunicipalityId,
      destinationMunicipalityId: destGeoCheck.declaredMunicipalityId,
      originValidation: originGeoCheck.status,
      destinationValidation: destGeoCheck.status,
      boundaryVersion: originGeoCheck.boundaryVersion || destGeoCheck.boundaryVersion || "v1.0",
      validatedAt: new Date().toISOString(),
    } : null;

    if (geoIntegritySnapshot) {
      (routingResult as any).geoIntegritySnapshot = geoIntegritySnapshot;
      if (routingResult.pricingSnapshot) {
        (routingResult.pricingSnapshot as any).geoIntegritySnapshot = geoIntegritySnapshot;
      }
    }

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
        const quotePricingMode = routingResult.pricingSnapshot?.pricingMode || "FLAT";
        const quoteTerritorialLevel = (routingResult.pricingSnapshot as any)?.territorialLevel || null;
        const quoteInterMunicipalRouteId = (routingResult.pricingSnapshot as any)?.interMunicipalRouteId || null;
        const quoteDestDeptId = (options.destinationDepartmentId || (routingResult.pricingSnapshot as any)?.destinationDepartmentId || quoteDeptId || "").toString().trim() || null;
        const quoteDestMuniId = (options.destinationMunicipalityId || (routingResult.pricingSnapshot as any)?.destinationMunicipalityId || quoteMuniId || "").toString().trim() || null;

        await quoteRef.set({
          quoteId,
          customerId: authenticatedUid,
          businessId: quoteBizId,
          branchId: quoteBranchId,
          departmentId: quoteDeptId,
          municipalityId: quoteMuniId,
          destinationDepartmentId: quoteDestDeptId,
          destinationMunicipalityId: quoteDestMuniId,
          countryCode: (routingResult.pricingSnapshot?.countryCode || "NI").toString().trim().toUpperCase(),
          deliveryFee: routingResult.calculatedFee,
          courierEarnings: routingResult.pricingSnapshot?.courierEarnings ?? 0,
          pricingMode: quotePricingMode,
          territorialLevel: quoteTerritorialLevel,
          interMunicipalRouteId: quoteInterMunicipalRouteId,
          pricingPolicyId: routingResult.pricingSnapshot?.pricingPolicyId ?? null,
          pricingPolicyVersion: routingResult.pricingSnapshot?.pricingPolicyVersion ?? null,
          distanceMeters: routingResult.routeDistanceMeters,
          distanceKm: routingResult.pricingSnapshot?.distanceKm ?? (routingResult.routeDistanceMeters / 1000),
          originLat: Math.round(options.origin.latitude * 10000) / 10000,
          originLng: Math.round(options.origin.longitude * 10000) / 10000,
          destLat: Math.round(options.destination.latitude * 10000) / 10000,
          destLng: Math.round(options.destination.longitude * 10000) / 10000,
          currency: routingResult.pricingSnapshot?.currency || "NIO",
          geoIntegritySnapshot: geoIntegritySnapshot || null,
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

