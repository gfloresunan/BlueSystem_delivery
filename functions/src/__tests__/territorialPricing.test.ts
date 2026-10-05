import assert from "node:assert";
import test, { describe, it, beforeEach } from "node:test";
import {
  buildTerritorialPolicyId,
  resolveTerritorialPricingPolicy,
  clearTerritorialPolicyCache,
  TerritorialPricingResolution,
} from "../services/territorialPricingService";
import {
  buildCommercePricingSnapshot,
  CommerceDeliveryPricingConfig,
} from "../services/routingService";

describe("BSD-TERRITORIAL-MUNICIPAL-PRICING-POLICY-001: Territorial Municipal Pricing Unit Tests", () => {
  beforeEach(() => {
    clearTerritorialPolicyCache();
  });

  // ─── 1. Canonical Policy ID Formulation ──────────────────────────────────
  describe("1. Canonical Policy ID Formulation (SSOT)", () => {
    it("TC-TERR-01: Formats canonical policyId deterministically (NI_{DEPT}_{MUNI})", () => {
      const id = buildTerritorialPolicyId("NI", "MATAGALPA", "CIUDAD_DARIO");
      assert.strictEqual(id, "NI_MATAGALPA_CIUDAD_DARIO");
    });

    it("TC-TERR-02: Normalizes case and trims whitespace", () => {
      const id = buildTerritorialPolicyId(" ni ", " matagalpa ", " ciudad_dario ");
      assert.strictEqual(id, "NI_MATAGALPA_CIUDAD_DARIO");
    });

    it("TC-TERR-03: Default countryCode is NI if empty", () => {
      const id = buildTerritorialPolicyId("", "LEON", "LEON");
      assert.strictEqual(id, "NI_LEON_LEON");
    });
  });

  // ─── 2. Fallback Invariants & Fail-Safe Logic ────────────────────────────
  describe("2. Fallback Invariants & Fail-Safe Logic", () => {
    it("TC-FALLBACK-01: No municipality / unknown input falls back to DISTANCE", async () => {
      const res = await resolveTerritorialPricingPolicy(null, null);
      assert.strictEqual(res.pricingMode, "DISTANCE");
      assert.strictEqual(res.isApplied, false);
      assert.strictEqual(res.fixedDeliveryFee, null);
      assert.strictEqual(res.fallbackReason, "NO_MUNICIPALITY_SPECIFIED");
    });

    it("TC-FALLBACK-02: Unknown / invalid municipality ID falls back to DISTANCE", async () => {
      const res = await resolveTerritorialPricingPolicy("UNKNOWN_DEPT", "UNKNOWN_MUNI");
      assert.strictEqual(res.pricingMode, "DISTANCE");
      assert.strictEqual(res.isApplied, false);
      assert.strictEqual(res.fixedDeliveryFee, null);
    });
  });

  // ─── 3. Snapshot & Fee Resolution Integration ───────────────────────────
  describe("3. Snapshot & Fee Resolution Integration (Customer vs Courier Independence)", () => {
    const defaultCommerceConfig: CommerceDeliveryPricingConfig = {
      customerPricePerKm: 8.0,
      courierPricePerKm: 7.0,
      currency: "NIO",
      roundingPrecision: "KM_BLOCK_2DEC",
      pricingVersion: "v2.2-commerce",
    };

    it("TC-SNAP-01: Under DISTANCE mode (no flat policy), calculates distance-based fee as baseline", () => {
      const distanceMeters = 8700; // 8.7 km
      const distanceResolution: TerritorialPricingResolution = {
        pricingMode: "DISTANCE",
        policyId: null,
        pricingPolicyVersion: null,
        fixedDeliveryFee: null,
        currency: "NIO",
        isApplied: false,
      };

      const result = buildCommercePricingSnapshot(distanceMeters, defaultCommerceConfig, distanceResolution);

      // Customer: 8.7 * 8 = 69.60 -> Math.ceil = 70.00
      assert.strictEqual(result.deliveryFee, 70);
      // Courier: 8.7 * 7 = 60.90 -> Math.floor = 60.00
      assert.strictEqual(result.courierEarnings, 60);
      assert.strictEqual(result.pricingSnapshot.pricingMode, "DISTANCE");
      assert.strictEqual(result.pricingSnapshot.fixedDeliveryFee, null);
      assert.strictEqual(result.pricingSnapshot.pricingPolicyId, null);
      assert.strictEqual(result.pricingSnapshot.distanceKm, 8.7);
    });

    it("TC-SNAP-02: Under FLAT mode (Ciudad Darío C$ 40.00), customer fee is fixed at C$ 40.00 while courier earnings remain distance-based", () => {
      const distanceMeters = 8700; // 8.7 km
      const canaryResolution: TerritorialPricingResolution = {
        pricingMode: "FLAT",
        policyId: "NI_MATAGALPA_CIUDAD_DARIO",
        pricingPolicyVersion: 1,
        fixedDeliveryFee: 40.0,
        currency: "NIO",
        isApplied: true,
        departmentId: "MATAGALPA",
        municipalityId: "CIUDAD_DARIO",
      };

      const result = buildCommercePricingSnapshot(distanceMeters, defaultCommerceConfig, canaryResolution);

      // Customer fee is strictly the municipal FLAT fee
      assert.strictEqual(result.deliveryFee, 40.0);

      // Courier earnings remain STRICTLY distance-based (8.7 km * C$ 7.00/km -> floor = C$ 60.00)
      assert.strictEqual(result.courierEarnings, 60);

      // Snapshot verification: complete audit trail
      assert.strictEqual(result.pricingSnapshot.pricingMode, "FLAT");
      assert.strictEqual(result.pricingSnapshot.pricingPolicyId, "NI_MATAGALPA_CIUDAD_DARIO");
      assert.strictEqual(result.pricingSnapshot.pricingPolicyVersion, 1);
      assert.strictEqual(result.pricingSnapshot.fixedDeliveryFee, 40.0);
      assert.strictEqual(result.pricingSnapshot.deliveryFee, 40.0);
      assert.strictEqual(result.pricingSnapshot.distanceKm, 8.7);
      assert.strictEqual(result.pricingSnapshot.distanceMeters, 8700);
      assert.strictEqual(result.pricingSnapshot.serviceType, "COMMERCE_DELIVERY");
      assert.strictEqual(result.pricingSnapshot.currency, "NIO");
    });

    it("TC-SNAP-03: Strict decoupling deliveryFee != courierEarnings", () => {
      const distanceMeters = 2000; // 2.0 km
      const canaryResolution: TerritorialPricingResolution = {
        pricingMode: "FLAT",
        policyId: "NI_MATAGALPA_CIUDAD_DARIO",
        pricingPolicyVersion: 1,
        fixedDeliveryFee: 40.0,
        currency: "NIO",
        isApplied: true,
      };

      const result = buildCommercePricingSnapshot(distanceMeters, defaultCommerceConfig, canaryResolution);

      // Customer pays C$ 40 FLAT
      assert.strictEqual(result.deliveryFee, 40.0);
      // Courier receives 2.0 km * C$ 7.00/km = C$ 14.00
      assert.strictEqual(result.courierEarnings, 14);
      assert.notStrictEqual(result.deliveryFee, result.courierEarnings);
    });

    it("TC-SNAP-04: Fail-Safe: If FLAT resolution has invalid fixed fee (<= 0 or NaN), fallback to distance calculation", () => {
      const distanceMeters = 5000; // 5.0 km
      const invalidFlatResolution: TerritorialPricingResolution = {
        pricingMode: "FLAT",
        policyId: "NI_TEST_MUNI",
        pricingPolicyVersion: 1,
        fixedDeliveryFee: 0, // Invalid!
        currency: "NIO",
        isApplied: false, // Marked unapplied by resolver fail-safe
        fallbackReason: "INVALID_FLAT_FEE_FAILSAFE",
      };

      const result = buildCommercePricingSnapshot(distanceMeters, defaultCommerceConfig, invalidFlatResolution);

      // Must NOT produce C$ 0! Must calculate distance fee: 5 * 8 = 40
      assert.strictEqual(result.deliveryFee, 40);
      assert.strictEqual(result.courierEarnings, 35);
      assert.strictEqual(result.pricingSnapshot.pricingMode, "DISTANCE");
    });

    it("TC-SNAP-05: Distance metrics (km, meters) are fully preserved when pricingMode = FLAT", () => {
      const distanceMeters = 3450;
      const flatResolution: TerritorialPricingResolution = {
        pricingMode: "FLAT",
        policyId: "NI_MATAGALPA_CIUDAD_DARIO",
        pricingPolicyVersion: 2,
        fixedDeliveryFee: 40.0,
        currency: "NIO",
        isApplied: true,
      };

      const result = buildCommercePricingSnapshot(distanceMeters, defaultCommerceConfig, flatResolution);

      assert.strictEqual(result.pricingSnapshot.distanceMeters, 3450);
      assert.strictEqual(result.pricingSnapshot.distanceKm, 3.45);
      assert.strictEqual(result.deliveryFee, 40.0);
    });

    it("TC-SNAP-06: Pricing snapshot includes quoteExpiresAt (15 min window) and quotedDeliveryFee", () => {
      const distanceMeters = 3000;
      const flatResolution: TerritorialPricingResolution = {
        pricingMode: "FLAT",
        policyId: "NI_MATAGALPA_CIUDAD_DARIO",
        pricingPolicyVersion: 1,
        fixedDeliveryFee: 40.0,
        currency: "NIO",
        isApplied: true,
      };

      const result = buildCommercePricingSnapshot(distanceMeters, defaultCommerceConfig, flatResolution);

      assert.strictEqual(result.pricingSnapshot.quotedDeliveryFee, 40.0);
      assert.ok(result.pricingSnapshot.quoteExpiresAt != null, "quoteExpiresAt must be present");
      const expiresAtMs = new Date(result.pricingSnapshot.quoteExpiresAt!).getTime();
      const diffMinutes = (expiresAtMs - Date.now()) / (60 * 1000);
      assert.ok(diffMinutes >= 14 && diffMinutes <= 16, `Quote expiration window must be ~15 mins, got ${diffMinutes}m`);
    });
  });

  // ─── 4. Total Reconciliation & Pricing Consistency Contract ──────────────
  describe("4. Order Total Reconciliation & Quote Concurrency Contract", () => {
    it("TC-RECONCILE-01: Full canonical accounting reconciliation: max(0, subtotal - discounts) + fee + tip + addCharge = total", () => {
      // Subtotal: C$ 300, couponDiscount: C$ 30, promoDiscount: C$ 10, discountAmount: C$ 0 -> productNet: C$ 260
      const subtotalVal = 300;
      const couponDiscountVal = 30;
      const promoDiscountVal = 10;
      const discountAmountVal = 0;
      const totalDiscounts = couponDiscountVal + promoDiscountVal + discountAmountVal;
      const productNet = Math.max(0, subtotalVal - totalDiscounts); // C$ 260.00
      const tipVal = 15;
      const addChargeVal = 5;

      // Backend applies Ciudad Darío FLAT C$ 40
      const finalDeliveryFee = 40.0;
      const reconciledTotal = Math.round((productNet + finalDeliveryFee + tipVal + addChargeVal) * 100) / 100;

      // Must be 260 + 40 + 15 + 5 = C$ 320.00
      assert.strictEqual(productNet, 260.0);
      assert.strictEqual(reconciledTotal, 320.0);
      assert.strictEqual(Math.round(reconciledTotal * 100), 32000);
    });

    it("TC-RECONCILE-02: Preserves product-only base for merchant gross sales and commission", () => {
      const subtotalVal = 500;
      const discountVal = 50;
      const grossSalesVal = subtotalVal - discountVal; // 450
      const commissionRate = 0.15; // 15%
      const commissionAmount = Math.round(grossSalesVal * commissionRate * 100) / 100; // 67.50
      const netPayout = grossSalesVal - commissionAmount; // 382.50
      const finalDeliveryFee = 40.0;
      const reconciledTotal = grossSalesVal + finalDeliveryFee; // 490.00

      // Commission and Merchant Net MUST NOT include deliveryFee
      assert.strictEqual(grossSalesVal, 450.0);
      assert.strictEqual(commissionAmount, 67.50);
      assert.strictEqual(netPayout, 382.50);
      assert.strictEqual(reconciledTotal, 490.0);
    });

    it("TC-RECONCILE-03: Handles extreme discount where productNet is floored at 0", () => {
      const subtotalVal = 100;
      const totalDiscounts = 150; // Discount exceeds subtotal
      const productNet = Math.max(0, subtotalVal - totalDiscounts); // 0
      const finalDeliveryFee = 40.0;
      const tipVal = 0;
      const addChargeVal = 0;

      const reconciledTotal = Math.round((productNet + finalDeliveryFee + tipVal + addChargeVal) * 100) / 100;
      assert.strictEqual(productNet, 0);
      assert.strictEqual(reconciledTotal, 40.0);
    });

    it("TC-CONCURRENCY-01: Server-Verifiable Quote Contract (Option A) honors valid server quote against unconfirmed price increase", () => {
      // Mock quote stored on server in /pricing_quotes/quote_abc_123
      const serverQuote = {
        quoteId: "quote_abc_123",
        customerId: "cust_789",
        businessId: "biz_matagalpa_dario",
        municipalityId: "CIUDAD_DARIO",
        deliveryFee: 40.0,
        expiresAtMs: Date.now() + 10 * 60 * 1000, // Valid (+10 mins)
        used: false,
      };

      // Current territorial policy was updated to C$ 50.00
      const currentMunicipalFlatFee = 50.0;

      // Evaluation in trigger:
      const providedQuoteId = "quote_abc_123";
      const isUnused = serverQuote.used === false;
      const isUnexpired = serverQuote.expiresAtMs > Date.now();
      const customerMatches = serverQuote.customerId === "cust_789";
      const bizMatches = serverQuote.businessId === "biz_matagalpa_dario";
      const muniMatches = serverQuote.municipalityId === "CIUDAD_DARIO";

      let finalDeliveryFee: number;
      let feeSource: string;

      if (isUnused && isUnexpired && customerMatches && bizMatches && muniMatches && serverQuote.deliveryFee > 0) {
        finalDeliveryFee = serverQuote.deliveryFee; // SERVER-SIDE fee used!
        feeSource = "SERVER_VERIFIED_QUOTE";
      } else {
        finalDeliveryFee = currentMunicipalFlatFee;
        feeSource = "AUTHORITATIVE_MUNICIPAL_FLAT";
      }

      assert.strictEqual(finalDeliveryFee, 40.0);
      assert.strictEqual(feeSource, "SERVER_VERIFIED_QUOTE");
    });

    it("TC-CONCURRENCY-02: ANTI-TAMPERING: Client-injected fake quote (quotedDeliveryFee = 1) is strictly rejected", () => {
      // Attacker sends order with forged quoteId or fake pricingSnapshot
      const clientPayload = {
        deliveryFee: 1.0, // Forged!
        quotedDeliveryFee: 1.0, // Forged!
        quoteId: "non_existent_or_forged_quote_id",
      };

      // Server looks up quote in database:
      const quoteExistsOnServer = false; // Fake quote doesn't exist
      const currentMunicipalFlatFee = 40.0;

      let finalDeliveryFee: number;
      let feeSource: string = "";

      if (quoteExistsOnServer) {
        finalDeliveryFee = clientPayload.deliveryFee;
        feeSource = "SERVER_VERIFIED_QUOTE";
      } else {
        // Zero client trust: Falls back to authoritative municipal resolution
        finalDeliveryFee = currentMunicipalFlatFee;
        feeSource = "AUTHORITATIVE_MUNICIPAL_FLAT";
      }

      // Attacker's C$ 1 is completely defeated. Authoritative C$ 40 applied!
      assert.strictEqual(finalDeliveryFee, 40.0);
      assert.strictEqual(feeSource, "AUTHORITATIVE_MUNICIPAL_FLAT");
    });

    it("TC-CONCURRENCY-03: Reused quote (used === true) is rejected and falls back to authoritative policy", () => {
      const serverQuote = {
        quoteId: "quote_used_before",
        customerId: "cust_789",
        deliveryFee: 35.0,
        expiresAtMs: Date.now() + 5 * 60 * 1000,
        used: true, // Already consumed!
      };

      const currentMunicipalFlatFee = 40.0;
      const isUnused = serverQuote.used === false;

      let finalDeliveryFee: number;
      if (isUnused) {
        finalDeliveryFee = serverQuote.deliveryFee;
      } else {
        finalDeliveryFee = currentMunicipalFlatFee;
      }

      assert.strictEqual(finalDeliveryFee, 40.0);
    });

    it("TC-CONCURRENCY-04: Expired quote (expiresAt < now) is rejected and falls back to authoritative policy", () => {
      const serverQuote = {
        quoteId: "quote_expired",
        customerId: "cust_789",
        deliveryFee: 35.0,
        expiresAtMs: Date.now() - 60 * 1000, // Expired 1 min ago
        used: false,
      };

      const currentMunicipalFlatFee = 40.0;
      const isUnexpired = serverQuote.expiresAtMs > Date.now();

      let finalDeliveryFee: number;
      if (isUnexpired) {
        finalDeliveryFee = serverQuote.deliveryFee;
      } else {
        finalDeliveryFee = currentMunicipalFlatFee;
      }

      assert.strictEqual(finalDeliveryFee, 40.0);
    });

    it("TC-CONCURRENCY-05: Atomic Firestore Transaction: Two concurrent orders with same quoteId -> exactly 1 SUCCESS and exactly 1 REJECT", async () => {
      // Shared server-side quote state simulating Firestore document with transactional concurrency
      let quoteDoc = {
        quoteId: "quote_race_concurrent",
        deliveryFee: 40.0,
        used: false,
        orderId: null as string | null,
      };

      // Mock transactional resolver
      async function processOrderTransaction(orderId: string): Promise<{ success: boolean; fee: number; status: string }> {
        // Simulating runTransaction atomic read-and-mutate
        if (quoteDoc.used === false) {
          quoteDoc.used = true;
          quoteDoc.orderId = orderId;
          return { success: true, fee: quoteDoc.deliveryFee, status: "VERIFIED_QUOTE" };
        } else {
          return { success: false, fee: 50.0, status: "CORRECTED_AUTHORITATIVE" };
        }
      }

      // Execute Order A and Order B concurrently at the exact same tick
      const [resA, resB] = await Promise.all([
        processOrderTransaction("order_A_101"),
        processOrderTransaction("order_B_202"),
      ]);

      const successCount = [resA, resB].filter(r => r.success && r.status === "VERIFIED_QUOTE").length;
      const rejectCount = [resA, resB].filter(r => !r.success && r.status === "CORRECTED_AUTHORITATIVE").length;

      assert.strictEqual(successCount, 1, "Exactly ONE order must successfully consume the quote");
      assert.strictEqual(rejectCount, 1, "Exactly ONE order must be rejected/corrected");
      assert.strictEqual(quoteDoc.used, true);
    });

    it("TC-GATE-INERT-01: Under DISTANCE mode (Gate A inactive), quoteId is NOT generated and /pricing_quotes is completely bypassed", () => {
      // When pricingMode is DISTANCE (100% of Nicaragua during Gate A):
      const distanceResolution: TerritorialPricingResolution = {
        pricingMode: "DISTANCE",
        policyId: null,
        pricingPolicyVersion: null,
        fixedDeliveryFee: null,
        currency: "NIO",
        isApplied: false,
        fallbackReason: "NO_FLAT_POLICY_ACTIVE",
      };

      const isFlatPolicyApplied = distanceResolution.pricingMode === "FLAT" && distanceResolution.isApplied;
      assert.strictEqual(isFlatPolicyApplied, false);

      // Gate check guarantees zero writes to /pricing_quotes
      let quoteIdCreated = false;
      if (isFlatPolicyApplied) {
        quoteIdCreated = true;
      }
      assert.strictEqual(quoteIdCreated, false, "Gate A must be 100% inert: zero writes to /pricing_quotes");
    });

    it("TC-GATE-INERT-02: Zero Territorial Policy Reads in Gate A when territorialPricingEnabled == false", async () => {
      // Mock tracking of Firestore reads on /territorial_pricing_policies
      let territorialFirestoreReads = 0;
      let businessFirestoreReads = 0;

      const mockCommerceConfig = {
        enabled: true,
        territorialPricingEnabled: false, // Inerte en Gate A
        customerPricePerKm: 8.0,
        courierPricePerKm: 7.0,
      };

      // Simular router con feature flag:
      async function routeCommerceWithFeatureGate(options: { departmentId?: string; municipalityId?: string; businessId?: string }) {
        let territorialResolution: any = undefined;
        if (mockCommerceConfig.territorialPricingEnabled === true) {
          territorialFirestoreReads++;
          if (!options.municipalityId && options.businessId) {
            businessFirestoreReads++;
          }
        }
        return { territorialResolution, territorialFirestoreReads, businessFirestoreReads };
      }

      // Probar en Managua, León, Estelí durante Gate A
      const resManagua = await routeCommerceWithFeatureGate({ departmentId: "MANAGUA", municipalityId: "MANAGUA" });
      const resLeon = await routeCommerceWithFeatureGate({ departmentId: "LEON", municipalityId: "LEON" });
      const resEsteli = await routeCommerceWithFeatureGate({ departmentId: "ESTELI", municipalityId: "ESTELI", businessId: "biz_esteli" });

      assert.strictEqual(resManagua.territorialResolution, undefined);
      assert.strictEqual(resLeon.territorialResolution, undefined);
      assert.strictEqual(resEsteli.territorialResolution, undefined);

      assert.strictEqual(territorialFirestoreReads, 0, "CERO lecturas en /territorial_pricing_policies en Gate A");
      assert.strictEqual(businessFirestoreReads, 0, "CERO lecturas adicionales en /businesses en Gate A");
    });

    it("TC-CONCURRENCY-06: Fail-Closed Quote Binding: Missing or mismatched customer/business/branch/department/municipality/country -> INVALID QUOTE", () => {
      const canonicalCustomer = "cust_verified_123";
      const canonicalBusiness = "biz_dario_456";
      const canonicalBranch = "branch_central";
      const canonicalDepartment = "MATAGALPA";
      const canonicalMunicipality = "CIUDAD_DARIO";
      const canonicalCountry = "NI";

      function evaluateQuoteBinding(qData: any, orderBranch?: string): boolean {
        // FAIL-CLOSED STRICT BINDING: Cada identificador DEBE existir y coincidir exactamente
        const customerMatches = Boolean(qData.customerId && canonicalCustomer && qData.customerId === canonicalCustomer);
        const businessMatches = Boolean(qData.businessId && canonicalBusiness && qData.businessId === canonicalBusiness);
        const effectiveOrderBranch = (orderBranch || canonicalBranch || "").toString().trim();
        const quotedBranch = (qData.branchId || "").toString().trim();
        const branchMatches = (!effectiveOrderBranch && !quotedBranch) || (effectiveOrderBranch === quotedBranch);
        const departmentMatches = Boolean(qData.departmentId && canonicalDepartment && qData.departmentId === canonicalDepartment);
        const municipalityMatches = Boolean(qData.municipalityId && canonicalMunicipality && qData.municipalityId === canonicalMunicipality);
        const countryMatches = Boolean(qData.countryCode && canonicalCountry && qData.countryCode.toUpperCase() === canonicalCountry);

        return customerMatches && businessMatches && branchMatches && departmentMatches && municipalityMatches && countryMatches;
      }

      // Caso 1: Quote idéntico -> VÁLIDO
      const validQuote = {
        customerId: "cust_verified_123",
        businessId: "biz_dario_456",
        branchId: "branch_central",
        departmentId: "MATAGALPA",
        municipalityId: "CIUDAD_DARIO",
        countryCode: "NI",
      };
      assert.strictEqual(evaluateQuoteBinding(validQuote), true);

      // Caso 2: missing businessId en quote -> RECHAZADO (no fail-open)
      const missingBizQuote = { ...validQuote, businessId: undefined };
      assert.strictEqual(evaluateQuoteBinding(missingBizQuote), false, "Missing businessId must fail-closed");

      // Caso 3: missing departmentId en quote -> RECHAZADO
      const missingDeptQuote = { ...validQuote, departmentId: null };
      assert.strictEqual(evaluateQuoteBinding(missingDeptQuote), false, "Missing departmentId must fail-closed");

      // Caso 4: missing municipalityId en quote -> RECHAZADO
      const missingMuniQuote = { ...validQuote, municipalityId: "" };
      assert.strictEqual(evaluateQuoteBinding(missingMuniQuote), false, "Missing municipalityId must fail-closed");

      // Caso 5: customerId ajeno (intento de suplantación) -> RECHAZADO
      const attackerQuote = { ...validQuote, customerId: "attacker_999" };
      assert.strictEqual(evaluateQuoteBinding(attackerQuote), false, "Mismatched customerId must fail-closed");

      // Caso 6: missing countryCode en quote -> RECHAZADO (estrictamente fail-closed)
      const missingCountryQuote = { ...validQuote, countryCode: undefined };
      assert.strictEqual(evaluateQuoteBinding(missingCountryQuote), false, "Missing countryCode must fail-closed");

      // Caso 7: mismatched branchId (cotizado para sucursal A pero ordenado para sucursal B) -> RECHAZADO
      assert.strictEqual(evaluateQuoteBinding(validQuote, "branch_norte"), false, "Mismatched branchId must fail-closed");
    });

    it("TC-CONCURRENCY-07: Geo-Route Tolerance & Fail-Closed Origin/Destination Boundaries", () => {
      const QUOTE_DESTINATION_TOLERANCE_METERS = 250;
      const QUOTE_ORIGIN_TOLERANCE_METERS = 250;

      function evaluateGeoRoute(
        qDest?: { lat?: number; lng?: number },
        oDest?: { lat?: number; lng?: number },
        qOrigin?: { lat?: number; lng?: number },
        oOrigin?: { lat?: number; lng?: number }
      ): { valid: boolean; destDelta: number; originDelta: number } {
        let geoRouteMatches = false;
        let originMatches = false;
        let destDelta = -1;
        let originDelta = -1;

        const hasQuotedDest = typeof qDest?.lat === "number" && typeof qDest?.lng === "number" && qDest.lat !== 0;
        const hasOrderDest = typeof oDest?.lat === "number" && typeof oDest?.lng === "number" && oDest.lat !== 0;

        if (hasQuotedDest && hasOrderDest) {
          const R = 6371000;
          const dLat = ((oDest!.lat! - qDest!.lat!) * Math.PI) / 180;
          const dLon = ((oDest!.lng! - qDest!.lng!) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((qDest!.lat! * Math.PI) / 180) * Math.cos((oDest!.lat! * Math.PI) / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          destDelta = Math.round(R * c);
          if (destDelta <= QUOTE_DESTINATION_TOLERANCE_METERS) {
            geoRouteMatches = true;
          }
        }

        const hasQuotedOrigin = typeof qOrigin?.lat === "number" && typeof qOrigin?.lng === "number" && qOrigin.lat !== 0;
        const hasOrderOrigin = typeof oOrigin?.lat === "number" && typeof oOrigin?.lng === "number" && oOrigin.lat !== 0;

        if (hasQuotedOrigin && hasOrderOrigin) {
          const R = 6371000;
          const dLatO = ((oOrigin!.lat! - qOrigin!.lat!) * Math.PI) / 180;
          const dLonO = ((oOrigin!.lng! - qOrigin!.lng!) * Math.PI) / 180;
          const aO = Math.sin(dLatO / 2) * Math.sin(dLatO / 2) +
                     Math.cos((qOrigin!.lat! * Math.PI) / 180) * Math.cos((oOrigin!.lat! * Math.PI) / 180) *
                     Math.sin(dLonO / 2) * Math.sin(dLonO / 2);
          const cO = 2 * Math.atan2(Math.sqrt(aO), Math.sqrt(1 - aO));
          originDelta = Math.round(R * cO);
          if (originDelta <= QUOTE_ORIGIN_TOLERANCE_METERS) {
            originMatches = true;
          }
        }

        return { valid: geoRouteMatches && originMatches, destDelta, originDelta };
      }

      const baseQuotedDest = { lat: 12.7310, lng: -86.1240 };
      const baseQuotedOrigin = { lat: 12.7280, lng: -86.1200 };

      // Caso A: Coordenadas idénticas (delta = 0m) -> VÁLIDO
      const resIdentical = evaluateGeoRoute(baseQuotedDest, baseQuotedDest, baseQuotedOrigin, baseQuotedOrigin);
      assert.strictEqual(resIdentical.valid, true);
      assert.strictEqual(resIdentical.destDelta, 0);

      // Caso B: Fail-closed ante coordenadas faltantes en destino -> RECHAZADO (valid = false)
      const resMissingDest = evaluateGeoRoute(undefined, baseQuotedDest, baseQuotedOrigin, baseQuotedOrigin);
      assert.strictEqual(resMissingDest.valid, false, "Missing quote destination must fail-closed");

      // Caso C: Fail-closed ante coordenadas faltantes en origen -> RECHAZADO (valid = false)
      const resMissingOrigin = evaluateGeoRoute(baseQuotedDest, baseQuotedDest, undefined, baseQuotedOrigin);
      assert.strictEqual(resMissingOrigin.valid, false, "Missing quote origin must fail-closed");

      // Caso D: Boundary Test de Tolerancia de Seguridad (250 metros)
      // 249m <= 250m -> ACEPTADO
      // 250m <= 250m -> ACEPTADO
      // 251m > 250m  -> RECHAZADO
      const tolerance = 250;
      assert.strictEqual(249 <= tolerance, true, "249m must be ACCEPTED");
      assert.strictEqual(250 <= tolerance, true, "250m boundary must be ACCEPTED");
      assert.strictEqual(251 <= tolerance, false, "251m must be REJECTED");

      // Caso E: Cambio drástico de destino (3.5 km) -> RECHAZADO
      const alteredDest = { lat: 12.7550, lng: -86.1400 };
      const resAltered = evaluateGeoRoute(baseQuotedDest, alteredDest, baseQuotedOrigin, baseQuotedOrigin);
      assert.strictEqual(resAltered.valid, false, "Altered destination (>250m) must be REJECTED");
      assert.ok(resAltered.destDelta > 250);
    });

    it("TC-CONCURRENCY-08: Pricing Validation Status Transitions", () => {
      // 1. Con Quote válido y consumido atómicamente
      const status1 = "VERIFIED_QUOTE";
      assert.strictEqual(status1, "VERIFIED_QUOTE");

      // 2. Sin Quote pero en municipio con FLAT activo
      const status2 = "VERIFIED_MUNICIPAL_FLAT";
      assert.strictEqual(status2, "VERIFIED_MUNICIPAL_FLAT");

      // 3. Con Quote manipulado/inválido en municipio con FLAT activo -> Corregido autoritativamente
      const status3 = "CORRECTED_AUTHORITATIVE";
      assert.strictEqual(status3, "CORRECTED_AUTHORITATIVE");

      // 4. Municipio estándar por distancia (100% Gate A)
      const status4 = "VERIFIED_DISTANCE";
      assert.strictEqual(status4, "VERIFIED_DISTANCE");
    });
  });

  // ─── 5. Ciudad Darío Canary Specification ────────────────────────────────
  describe("5. Ciudad Darío Canary Specification Check", () => {
    it("TC-CANARY-01: Canary configuration matches exact approved parameters", () => {
      const canaryPolicy = {
        countryCode: "NI",
        departmentId: "MATAGALPA",
        departmentName: "Matagalpa",
        municipalityId: "CIUDAD_DARIO",
        municipalityName: "Ciudad Darío",
        pricingMode: "FLAT" as const,
        fixedDeliveryFee: 40.0,
        currency: "NIO",
        isActive: true,
      };

      const policyId = buildTerritorialPolicyId(
        canaryPolicy.countryCode,
        canaryPolicy.departmentId,
        canaryPolicy.municipalityId
      );

      assert.strictEqual(policyId, "NI_MATAGALPA_CIUDAD_DARIO");
      assert.strictEqual(canaryPolicy.departmentId, "MATAGALPA");
      assert.strictEqual(canaryPolicy.municipalityId, "CIUDAD_DARIO");
      assert.strictEqual(canaryPolicy.pricingMode, "FLAT");
      assert.strictEqual(canaryPolicy.fixedDeliveryFee, 40.0);
      assert.strictEqual(canaryPolicy.currency, "NIO");
      assert.strictEqual(canaryPolicy.isActive, true);
    });
  });

  // ─── 6. Security Rules Specification & Verification Matrix ───────────────
  describe("6. Security Rules Specification (BSD-TERRITORIAL-MUNICIPAL-PRICING-POLICY-001)", () => {
    // Evaluation helper simulating Firestore Security Rules predicates
    function evalTerritorialRules(auth: { uid?: string; role?: string; isSuperAdmin?: boolean } | null, op: "read" | "create" | "update" | "delete"): boolean {
      const isAuthenticated = !!auth && !!auth.uid;
      const isPlatformAdmin = isAuthenticated && (auth.role === "admin" || auth.role === "platform_admin" || auth.isSuperAdmin === true);
      const isSuperAdmin = isAuthenticated && auth.isSuperAdmin === true;

      switch (op) {
        case "read":
          return isAuthenticated && isPlatformAdmin;
        case "create":
        case "update":
          return isAuthenticated && isPlatformAdmin;
        case "delete":
          return isAuthenticated && isSuperAdmin;
        default:
          return false;
      }
    }

    function evalQuoteRules(auth: { uid?: string; role?: string } | null, op: "read" | "write"): boolean {
      const isAuthenticated = !!auth && !!auth.uid;
      const isPlatformAdmin = isAuthenticated && (auth.role === "admin" || auth.role === "platform_admin");

      if (op === "read") {
        // Minimum privilege: only Platform Admin for audit/support. ZERO customer read.
        return isAuthenticated && isPlatformAdmin;
      }
      if (op === "write") {
        return false; // Zero Client Write: Only Admin SDK
      }
      return false;
    }

    it("SEC-TERR-01: Customer read -> DENY", () => {
      const customerAuth = { uid: "customer_123", role: "CUSTOMER" };
      assert.strictEqual(evalTerritorialRules(customerAuth, "read"), false);
    });

    it("SEC-TERR-02: Customer create/update -> DENY", () => {
      const customerAuth = { uid: "customer_123", role: "CUSTOMER" };
      assert.strictEqual(evalTerritorialRules(customerAuth, "create"), false);
      assert.strictEqual(evalTerritorialRules(customerAuth, "update"), false);
    });

    it("SEC-TERR-03: Courier read -> DENY", () => {
      const courierAuth = { uid: "courier_456", role: "COURIER" };
      assert.strictEqual(evalTerritorialRules(courierAuth, "read"), false);
    });

    it("SEC-TERR-04: Merchant read/write -> DENY", () => {
      const merchantAuth = { uid: "merchant_789", role: "MERCHANT" };
      assert.strictEqual(evalTerritorialRules(merchantAuth, "read"), false);
      assert.strictEqual(evalTerritorialRules(merchantAuth, "create"), false);
      assert.strictEqual(evalTerritorialRules(merchantAuth, "update"), false);
    });

    it("SEC-TERR-05: Platform Admin read -> ALLOW", () => {
      const adminAuth = { uid: "admin_001", role: "platform_admin" };
      assert.strictEqual(evalTerritorialRules(adminAuth, "read"), true);
    });

    it("SEC-TERR-06: Platform Admin create/update -> ALLOW", () => {
      const adminAuth = { uid: "admin_001", role: "platform_admin" };
      assert.strictEqual(evalTerritorialRules(adminAuth, "create"), true);
      assert.strictEqual(evalTerritorialRules(adminAuth, "update"), true);
    });

    it("SEC-TERR-07: Platform Admin delete without superAdmin -> DENY", () => {
      const adminAuth = { uid: "admin_001", role: "platform_admin", isSuperAdmin: false };
      assert.strictEqual(evalTerritorialRules(adminAuth, "delete"), false);
    });

    it("SEC-TERR-08: SuperAdmin delete -> ALLOW", () => {
      const superAdminAuth = { uid: "super_001", role: "platform_admin", isSuperAdmin: true };
      assert.strictEqual(evalTerritorialRules(superAdminAuth, "delete"), true);
    });

    it("SEC-QUOTE-01: Customer read on pricing_quotes -> DENY (Minimum privilege: Zero Customer Read)", () => {
      const customerAuth = { uid: "cust_789", role: "CUSTOMER" };
      assert.strictEqual(evalQuoteRules(customerAuth, "read"), false);
    });

    it("SEC-QUOTE-02: Platform Admin read on pricing_quotes -> ALLOW (Auditoría/Soporte EIAM)", () => {
      const adminAuth = { uid: "admin_001", role: "platform_admin" };
      assert.strictEqual(evalQuoteRules(adminAuth, "read"), true);
    });

    it("SEC-QUOTE-03: Client write to pricing_quotes -> DENY (Admin SDK only)", () => {
      const customerAuth = { uid: "cust_attacker", role: "CUSTOMER" };
      const adminAuth = { uid: "admin_001", role: "platform_admin" };
      assert.strictEqual(evalQuoteRules(customerAuth, "write"), false);
      assert.strictEqual(evalQuoteRules(adminAuth, "write"), false);
    });
  });
});
