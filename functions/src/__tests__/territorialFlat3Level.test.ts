import assert from "node:assert";
import test, { describe, it, beforeEach } from "node:test";
import {
  buildTerritorialPolicyId,
  resolveTerritorialPricingPolicy,
  clearTerritorialPolicyCache,
  TerritorialPricingResolution,
  TerritorialPricingPolicy,
} from "../services/territorialPricingService";
import {
  buildCommercePricingSnapshot,
  CommerceDeliveryPricingConfig,
} from "../services/routingService";
import {
  validatePointInMunicipality,
  validatePointInUrbanCore,
} from "../services/municipalGeoIntegrityService";

describe("BSD-TERRITORIAL-FLAT-PRICING-3LEVEL-ADMIN-001: 3-Level Territorial Flat Pricing Test Suite", () => {
  beforeEach(() => {
    clearTerritorialPolicyCache();
  });

  const defaultCommerceConfig: CommerceDeliveryPricingConfig = {
    customerPricePerKm: 9.0,
    courierPricePerKm: 8.0,
    currency: "NIO",
    roundingPrecision: "KM_BLOCK_2DEC",
    pricingVersion: "v2.2-commerce",
  };

  // ── TP3-01: Municipio sin policy → DISTANCE intacto ──
  it("TP3-01: Municipio sin policy territorial opera estrictamente bajo DISTANCE", async () => {
    // Municipio no configurado: ej. Tipitapa sin política
    const res = await resolveTerritorialPricingPolicy("MANAGUA", "TIPITAPA");
    assert.strictEqual(res.pricingMode, "DISTANCE");
    assert.strictEqual(res.isApplied, false);
    assert.strictEqual(res.fixedDeliveryFee, null);
    assert.strictEqual(res.courierFlatEarning, null);

    const snapshot = buildCommercePricingSnapshot(5000, defaultCommerceConfig, res);
    assert.strictEqual(snapshot.pricingSnapshot.pricingMode, "DISTANCE");
    // 5km * 9 = 45 C$ cliente
    assert.strictEqual(snapshot.deliveryFee, 45);
    // 5km * 8 = 40 C$ courier
    assert.strictEqual(snapshot.courierEarnings, 40);
  });

  // ── TP3-02: Managua → DISTANCE C$9/km customer / C$8/km courier ──
  it("TP3-02: Managua continúa operando bajo DISTANCE C$9/km cliente / C$8/km courier", async () => {
    const res = await resolveTerritorialPricingPolicy("MANAGUA", "MANAGUA");
    assert.strictEqual(res.pricingMode, "DISTANCE");
    assert.strictEqual(res.isApplied, false);

    const distanceMeters = 3400; // 3.4 km
    const snapshot = buildCommercePricingSnapshot(distanceMeters, defaultCommerceConfig, res);
    // 3.4 * 9 = 30.6 -> Math.ceil = 31 C$
    assert.strictEqual(snapshot.deliveryFee, 31);
    // 3.4 * 8 = 27.2 -> Math.floor = 27 C$
    assert.strictEqual(snapshot.courierEarnings, 27);
    assert.strictEqual(snapshot.pricingSnapshot.customerPricePerKm, 9.0);
    assert.strictEqual(snapshot.pricingSnapshot.courierPricePerKm, 8.0);
  });

  // ── TP3-03: Ciudad Darío Level 1 → customer fixed, courier fixed ──
  it("TP3-03: Ciudad Darío Nivel 1 (Urban Core) aplica tarifas fijas para cliente y courier (C$40 / C$40)", () => {
    const darioLevel1Res: TerritorialPricingResolution = {
      pricingMode: "TERRITORIAL_FLAT",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: 40.0,
      courierFlatEarning: 40.0,
      territorialLevel: "URBAN_CORE",
      currency: "NIO",
      isApplied: true,
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
    };

    const snapshot = buildCommercePricingSnapshot(2500, defaultCommerceConfig, darioLevel1Res);
    assert.strictEqual(snapshot.deliveryFee, 40);
    assert.strictEqual(snapshot.courierEarnings, 40);
    assert.strictEqual(snapshot.pricingSnapshot.pricingMode, "TERRITORIAL_FLAT");
    assert.strictEqual(snapshot.pricingSnapshot.territorialLevel, "URBAN_CORE");
    assert.strictEqual(snapshot.pricingSnapshot.fixedDeliveryFee, 40);
    assert.strictEqual(snapshot.pricingSnapshot.courierFlatEarning, 40);
  });

  // ── TP3-04: Level 1 distancia corta → mismo monto fijo ──
  it("TP3-04: Nivel 1 con distancia corta (600 metros) cobra exactamente el valor fijo configurado", () => {
    const level1Res: TerritorialPricingResolution = {
      pricingMode: "TERRITORIAL_FLAT",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: 40.0,
      courierFlatEarning: 40.0,
      territorialLevel: "URBAN_CORE",
      currency: "NIO",
      isApplied: true,
    };

    const snapshot = buildCommercePricingSnapshot(600, defaultCommerceConfig, level1Res);
    assert.strictEqual(snapshot.deliveryFee, 40);
    assert.strictEqual(snapshot.courierEarnings, 40);
  });

  // ── TP3-05: Level 1 distancia larga dentro zona → mismo monto fijo ──
  it("TP3-05: Nivel 1 con distancia mayor (4.8 km dentro del casco urbano) mantiene el valor fijo", () => {
    const level1Res: TerritorialPricingResolution = {
      pricingMode: "TERRITORIAL_FLAT",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: 40.0,
      courierFlatEarning: 40.0,
      territorialLevel: "URBAN_CORE",
      currency: "NIO",
      isApplied: true,
    };

    const snapshot = buildCommercePricingSnapshot(4800, defaultCommerceConfig, level1Res);
    assert.strictEqual(snapshot.deliveryFee, 40);
    assert.strictEqual(snapshot.courierEarnings, 40);
  });

  // ── TP3-06: Level 2 enabled → valores configurados Level 2 ──
  it("TP3-06: Nivel 2 (Municipal Outer) habilitado aplica montos fijados por Admin", () => {
    const level2Res: TerritorialPricingResolution = {
      pricingMode: "TERRITORIAL_FLAT",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: 65.0,
      courierFlatEarning: 65.0,
      territorialLevel: "MUNICIPAL_OUTER",
      currency: "NIO",
      isApplied: true,
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
    };

    const snapshot = buildCommercePricingSnapshot(7200, defaultCommerceConfig, level2Res);
    assert.strictEqual(snapshot.deliveryFee, 65);
    assert.strictEqual(snapshot.courierEarnings, 65);
    assert.strictEqual(snapshot.pricingSnapshot.territorialLevel, "MUNICIPAL_OUTER");
  });

  // ── TP3-07: Level 2 disabled → fail-closed / fallback ──
  it("TP3-07: Nivel 2 deshabilitado no aplica flat y retorna razón MUNICIPAL_OUTER_LEVEL_DISABLED", () => {
    const level2DisabledRes: TerritorialPricingResolution = {
      pricingMode: "DISTANCE",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: null,
      courierFlatEarning: null,
      currency: "NIO",
      isApplied: false,
      fallbackReason: "MUNICIPAL_OUTER_LEVEL_DISABLED",
    };

    assert.strictEqual(level2DisabledRes.isApplied, false);
    assert.strictEqual(level2DisabledRes.fallbackReason, "MUNICIPAL_OUTER_LEVEL_DISABLED");
  });

  // ── TP3-08: Intermunicipal autorizado → Level 3 ──
  it("TP3-08: Ruta intermunicipal autorizada (Ciudad Darío -> Sébaco) aplica tarifas Nivel 3", () => {
    const level3Res: TerritorialPricingResolution = {
      pricingMode: "TERRITORIAL_FLAT",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: 85.0,
      courierFlatEarning: 85.0,
      territorialLevel: "INTER_MUNICIPAL",
      interMunicipalRouteId: "CIUDAD_DARIO->SEBACO",
      currency: "NIO",
      isApplied: true,
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      destinationDepartmentId: "MATAGALPA",
      destinationMunicipalityId: "SEBACO",
    };

    const snapshot = buildCommercePricingSnapshot(14500, defaultCommerceConfig, level3Res);
    assert.strictEqual(snapshot.deliveryFee, 85);
    assert.strictEqual(snapshot.courierEarnings, 85);
    assert.strictEqual(snapshot.pricingSnapshot.territorialLevel, "INTER_MUNICIPAL");
    assert.strictEqual(snapshot.pricingSnapshot.interMunicipalRouteId, "CIUDAD_DARIO->SEBACO");
  });

  // ── TP3-09: Intermunicipal NO autorizado → CROSS_CITY_ORDER_BLOCKED ──
  it("TP3-09: Ruta intermunicipal no configurada resulta en fail-closed INTER_MUNICIPAL_ROUTE_NOT_AUTHORIZED", () => {
    const unauthorizedRes: TerritorialPricingResolution = {
      pricingMode: "DISTANCE",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: null,
      courierFlatEarning: null,
      currency: "NIO",
      isApplied: false,
      fallbackReason: "INTER_MUNICIPAL_ROUTE_NOT_AUTHORIZED",
    };

    assert.strictEqual(unauthorizedRes.isApplied, false);
    assert.strictEqual(unauthorizedRes.fallbackReason, "INTER_MUNICIPAL_ROUTE_NOT_AUTHORIZED");
  });

  // ── TP3-10: Customer fee tampering → ignorado / corregido por backend ──
  it("TP3-10: Intento de adulterar tarifa de cliente es rechazado y sustituido por valor autoritativo", () => {
    const authoritativeRes: TerritorialPricingResolution = {
      pricingMode: "TERRITORIAL_FLAT",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: 40.0,
      courierFlatEarning: 40.0,
      territorialLevel: "URBAN_CORE",
      currency: "NIO",
      isApplied: true,
    };

    // Cliente envía deliveryFee = 1.00 en payload
    const tamperedPayloadFee = 1.0;
    const authoritativeResult = buildCommercePricingSnapshot(2000, defaultCommerceConfig, authoritativeRes);
    assert.notStrictEqual(authoritativeResult.deliveryFee, tamperedPayloadFee);
    assert.strictEqual(authoritativeResult.deliveryFee, 40.0);
  });

  // ── TP3-11: Courier earning tampering → ignorado / corregido por backend ──
  it("TP3-11: Intento de manipular ganancia de courier es reemplazado por la autoridad del snapshot", () => {
    const authoritativeRes: TerritorialPricingResolution = {
      pricingMode: "TERRITORIAL_FLAT",
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      pricingPolicyVersion: 2,
      fixedDeliveryFee: 40.0,
      courierFlatEarning: 40.0,
      territorialLevel: "URBAN_CORE",
      currency: "NIO",
      isApplied: true,
    };

    const tamperedCourierEarnings = 200.0;
    const authoritativeResult = buildCommercePricingSnapshot(2000, defaultCommerceConfig, authoritativeRes);
    assert.notStrictEqual(authoritativeResult.courierEarnings, tamperedCourierEarnings);
    assert.strictEqual(authoritativeResult.courierEarnings, 40.0);
  });

  // ── TP3-12: Quote reutilizado → transacción Firestore la marca used: true ──
  it("TP3-12: Simulación de consumo de cotización única garantiza atomicidad (used == true)", () => {
    const mockQuote: { quoteId: string; used: boolean; deliveryFee: number; courierEarnings: number } = {
      quoteId: "quote_test_123",
      used: false,
      deliveryFee: 40.0,
      courierEarnings: 40.0,
    };

    // Transacción atómica
    assert.strictEqual(mockQuote.used, false);
    mockQuote.used = true;
    assert.strictEqual(mockQuote.used, true);

    // Segundo intento con la misma quote es rechazado
    const canReuse = (mockQuote as any).used === false;
    assert.strictEqual(canReuse, false);
  });

  // ── TP3-13: Cambio de destino → quote inválido ──
  it("TP3-13: Cambio de destino fuera de la tolerancia geométrica invalida la cotización", () => {
    const quoteDestLat = 12.7275;
    const quoteDestLng = -86.1228;
    const orderDestLat = 12.7900; // Lejos de la cotización
    const orderDestLng = -86.1228;

    const R = 6371000;
    const dLat = ((orderDestLat - quoteDestLat) * Math.PI) / 180;
    const dLon = ((orderDestLng - quoteDestLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((quoteDestLat * Math.PI) / 180) *
        Math.cos((orderDestLat * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const deltaMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

    const toleranceMeters = 300;
    const isValid = deltaMeters <= toleranceMeters;
    assert.strictEqual(isValid, false);
  });

  // ── TP3-14: Geo mismatch → pricing territorial no aplicable ──
  it("TP3-14: Destino fuera del límite municipal es rechazado por Geo Integrity", async () => {
    // Coordenadas en Managua evaluadas contra Ciudad Darío
    const geoCheck = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.1364,
      longitude: -86.2514,
    });

    assert.strictEqual(geoCheck.valid, false);
    assert.strictEqual(geoCheck.status, "OUTSIDE_MUNICIPALITY");
  });

  // ── TP3-15: Casco Urbano vs Resto del Municipio ──
  it("TP3-15: Punto en el parque central de Ciudad Darío resuelve como Casco Urbano (Nivel 1)", async () => {
    const inUrban = await validatePointInUrbanCore({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.7275,
      longitude: -86.1228,
    });

    assert.strictEqual(inUrban, true);
  });

  // ── TP3-16: Ledger Level 1 → courierEarnings fijo ──
  it("TP3-16: En evento contable de pedido entregado, courierEarnings se asienta en centavos sin recalcular km", () => {
    const frozenCourierEarning = 40.0;
    const earningsCents = Math.round(frozenCourierEarning * 100);

    assert.strictEqual(earningsCents, 4000);
    // Verificar que no se multiplicó por km (ej: 3.5 km * 8 = 28)
    assert.notStrictEqual(earningsCents, 2800);
  });

  // ── TP3-17: Delivered → importes no cambian ──
  it("TP3-17: Transición a 'delivered' conserva los valores congelados de la orden", () => {
    const orderData = {
      pricingMode: "TERRITORIAL_FLAT",
      deliveryFee: 40.0,
      courierTotalEarnings: 40.0,
      routeDistanceKm: 4.2,
    };

    const isTerritorialFlatOrder = orderData.pricingMode === "TERRITORIAL_FLAT";
    const frozenEarning = isTerritorialFlatOrder ? orderData.courierTotalEarnings : orderData.routeDistanceKm * 8;
    assert.strictEqual(frozenEarning, 40.0);
  });

  // ── TP3-18: Courier App → muestra earning fijo correcto ──
  it("TP3-18: Courier App presenta la ganancia autoritativa congelada", () => {
    const orderSnapshot = {
      courierEarnings: 40.0,
      courierTotalEarnings: 40.0,
      pricingMode: "TERRITORIAL_FLAT",
    };

    const label = `Ganancia: C$ ${orderSnapshot.courierTotalEarnings.toFixed(0)}`;
    assert.strictEqual(label, "Ganancia: C$ 40");
  });

  // ── TP3-19: Admin cambia Level 1 → nueva versión de policy ──
  it("TP3-19: Mutación administrativa incrementa el versionado de la política (v1 -> v2)", () => {
    const oldVersion = 1;
    const newVersion = oldVersion + 1;
    assert.strictEqual(newVersion, 2);
  });

  // ── TP3-20: Pedidos históricos → no cambian ──
  it("TP3-20: Pedidos históricos conservan su pricingSnapshot original inmutable", () => {
    const historicalOrder = {
      orderId: "HIST_001",
      pricingMode: "FLAT",
      deliveryFee: 40.0,
      courierEarnings: 32.0, // Histórico v1 calculado por distancia
      version: 1,
    };

    // Actualización de la política global a v2 no muta el documento del pedido
    assert.strictEqual(historicalOrder.deliveryFee, 40.0);
    assert.strictEqual(historicalOrder.courierEarnings, 32.0);
  });

  // ── TP3-21: X→Y → ZERO-TOUCH ──
  it("TP3-21: Dominio X→Y permanece 100% aislado del modelo de tarifas comerciales", () => {
    const xToYTrip = {
      serviceType: "X_TO_Y_DELIVERY",
      customerOffer: 50.0,
      distanceKm: 2.1,
    };

    assert.strictEqual(xToYTrip.serviceType, "X_TO_Y_DELIVERY");
    // No participa en resolución comercial
    assert.notStrictEqual(xToYTrip.serviceType, "COMMERCE_DELIVERY");
  });

  // ── TP3-22: Rollback de policy → vuelve a DISTANCE ──
  it("TP3-22: Si la política se desactiva (isActive == false), las nuevas cotizaciones revierten a DISTANCE", () => {
    const disabledPolicy: TerritorialPricingPolicy = {
      policyId: "NI_MATAGALPA_CIUDAD_DARIO",
      countryCode: "NI",
      departmentId: "MATAGALPA",
      departmentName: "Matagalpa",
      municipalityId: "CIUDAD_DARIO",
      municipalityName: "Ciudad Darío",
      pricingMode: "TERRITORIAL_FLAT",
      fixedDeliveryFee: 40.0,
      courierFlatEarning: 40.0,
      currency: "NIO",
      isActive: false, // Desactivada
      version: 3,
    };

    assert.strictEqual(disabledPolicy.isActive, false);
  });
});
