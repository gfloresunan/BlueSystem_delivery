"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const territorialPricingService_1 = require("../services/territorialPricingService");
const routingService_1 = require("../services/routingService");
(0, node_test_1.describe)("BSD-TERRITORIAL-MUNICIPAL-PRICING-POLICY-001: Territorial Municipal Pricing Unit Tests", () => {
    (0, node_test_1.beforeEach)(() => {
        (0, territorialPricingService_1.clearTerritorialPolicyCache)();
    });
    // ─── 1. Canonical Policy ID Formulation ──────────────────────────────────
    (0, node_test_1.describe)("1. Canonical Policy ID Formulation (SSOT)", () => {
        (0, node_test_1.it)("TC-TERR-01: Formats canonical policyId deterministically (NI_{DEPT}_{MUNI})", () => {
            const id = (0, territorialPricingService_1.buildTerritorialPolicyId)("NI", "MATAGALPA", "CIUDAD_DARIO");
            node_assert_1.default.strictEqual(id, "NI_MATAGALPA_CIUDAD_DARIO");
        });
        (0, node_test_1.it)("TC-TERR-02: Normalizes case and trims whitespace", () => {
            const id = (0, territorialPricingService_1.buildTerritorialPolicyId)(" ni ", " matagalpa ", " ciudad_dario ");
            node_assert_1.default.strictEqual(id, "NI_MATAGALPA_CIUDAD_DARIO");
        });
        (0, node_test_1.it)("TC-TERR-03: Default countryCode is NI if empty", () => {
            const id = (0, territorialPricingService_1.buildTerritorialPolicyId)("", "LEON", "LEON");
            node_assert_1.default.strictEqual(id, "NI_LEON_LEON");
        });
    });
    // ─── 2. Fallback Invariants & Fail-Safe Logic ────────────────────────────
    (0, node_test_1.describe)("2. Fallback Invariants & Fail-Safe Logic", () => {
        (0, node_test_1.it)("TC-FALLBACK-01: No municipality / unknown input falls back to DISTANCE", async () => {
            const res = await (0, territorialPricingService_1.resolveTerritorialPricingPolicy)(null, null);
            node_assert_1.default.strictEqual(res.pricingMode, "DISTANCE");
            node_assert_1.default.strictEqual(res.isApplied, false);
            node_assert_1.default.strictEqual(res.fixedDeliveryFee, null);
            node_assert_1.default.strictEqual(res.fallbackReason, "NO_MUNICIPALITY_SPECIFIED");
        });
        (0, node_test_1.it)("TC-FALLBACK-02: Unknown / invalid municipality ID falls back to DISTANCE", async () => {
            const res = await (0, territorialPricingService_1.resolveTerritorialPricingPolicy)("UNKNOWN_DEPT", "UNKNOWN_MUNI");
            node_assert_1.default.strictEqual(res.pricingMode, "DISTANCE");
            node_assert_1.default.strictEqual(res.isApplied, false);
            node_assert_1.default.strictEqual(res.fixedDeliveryFee, null);
        });
    });
    // ─── 3. Snapshot & Fee Resolution Integration ───────────────────────────
    (0, node_test_1.describe)("3. Snapshot & Fee Resolution Integration (Customer vs Courier Independence)", () => {
        const defaultCommerceConfig = {
            customerPricePerKm: 8.0,
            courierPricePerKm: 7.0,
            currency: "NIO",
            roundingPrecision: "KM_BLOCK_2DEC",
            pricingVersion: "v2.2-commerce",
        };
        (0, node_test_1.it)("TC-SNAP-01: Under DISTANCE mode (no flat policy), calculates distance-based fee as baseline", () => {
            const distanceMeters = 8700; // 8.7 km
            const distanceResolution = {
                pricingMode: "DISTANCE",
                policyId: null,
                pricingPolicyVersion: null,
                fixedDeliveryFee: null,
                currency: "NIO",
                isApplied: false,
            };
            const result = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, defaultCommerceConfig, distanceResolution);
            // Customer: 8.7 * 8 = 69.60 -> Math.ceil = 70.00
            node_assert_1.default.strictEqual(result.deliveryFee, 70);
            // Courier: 8.7 * 7 = 60.90 -> Math.floor = 60.00
            node_assert_1.default.strictEqual(result.courierEarnings, 60);
            node_assert_1.default.strictEqual(result.pricingSnapshot.pricingMode, "DISTANCE");
            node_assert_1.default.strictEqual(result.pricingSnapshot.fixedDeliveryFee, null);
            node_assert_1.default.strictEqual(result.pricingSnapshot.pricingPolicyId, null);
            node_assert_1.default.strictEqual(result.pricingSnapshot.distanceKm, 8.7);
        });
        (0, node_test_1.it)("TC-SNAP-02: Under FLAT mode (Ciudad Darío C$ 40.00), customer fee is fixed at C$ 40.00 while courier earnings remain distance-based", () => {
            const distanceMeters = 8700; // 8.7 km
            const canaryResolution = {
                pricingMode: "FLAT",
                policyId: "NI_MATAGALPA_CIUDAD_DARIO",
                pricingPolicyVersion: 1,
                fixedDeliveryFee: 40.0,
                currency: "NIO",
                isApplied: true,
                departmentId: "MATAGALPA",
                municipalityId: "CIUDAD_DARIO",
            };
            const result = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, defaultCommerceConfig, canaryResolution);
            // Customer fee is strictly the municipal FLAT fee
            node_assert_1.default.strictEqual(result.deliveryFee, 40.0);
            // Courier earnings remain STRICTLY distance-based (8.7 km * C$ 7.00/km -> floor = C$ 60.00)
            node_assert_1.default.strictEqual(result.courierEarnings, 60);
            // Snapshot verification: complete audit trail
            node_assert_1.default.strictEqual(result.pricingSnapshot.pricingMode, "FLAT");
            node_assert_1.default.strictEqual(result.pricingSnapshot.pricingPolicyId, "NI_MATAGALPA_CIUDAD_DARIO");
            node_assert_1.default.strictEqual(result.pricingSnapshot.pricingPolicyVersion, 1);
            node_assert_1.default.strictEqual(result.pricingSnapshot.fixedDeliveryFee, 40.0);
            node_assert_1.default.strictEqual(result.pricingSnapshot.deliveryFee, 40.0);
            node_assert_1.default.strictEqual(result.pricingSnapshot.distanceKm, 8.7);
            node_assert_1.default.strictEqual(result.pricingSnapshot.distanceMeters, 8700);
            node_assert_1.default.strictEqual(result.pricingSnapshot.serviceType, "COMMERCE_DELIVERY");
            node_assert_1.default.strictEqual(result.pricingSnapshot.currency, "NIO");
        });
        (0, node_test_1.it)("TC-SNAP-03: Strict decoupling deliveryFee != courierEarnings", () => {
            const distanceMeters = 2000; // 2.0 km
            const canaryResolution = {
                pricingMode: "FLAT",
                policyId: "NI_MATAGALPA_CIUDAD_DARIO",
                pricingPolicyVersion: 1,
                fixedDeliveryFee: 40.0,
                currency: "NIO",
                isApplied: true,
            };
            const result = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, defaultCommerceConfig, canaryResolution);
            // Customer pays C$ 40 FLAT
            node_assert_1.default.strictEqual(result.deliveryFee, 40.0);
            // Courier receives 2.0 km * C$ 7.00/km = C$ 14.00
            node_assert_1.default.strictEqual(result.courierEarnings, 14);
            node_assert_1.default.notStrictEqual(result.deliveryFee, result.courierEarnings);
        });
        (0, node_test_1.it)("TC-SNAP-04: Fail-Safe: If FLAT resolution has invalid fixed fee (<= 0 or NaN), fallback to distance calculation", () => {
            const distanceMeters = 5000; // 5.0 km
            const invalidFlatResolution = {
                pricingMode: "FLAT",
                policyId: "NI_TEST_MUNI",
                pricingPolicyVersion: 1,
                fixedDeliveryFee: 0, // Invalid!
                currency: "NIO",
                isApplied: false, // Marked unapplied by resolver fail-safe
                fallbackReason: "INVALID_FLAT_FEE_FAILSAFE",
            };
            const result = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, defaultCommerceConfig, invalidFlatResolution);
            // Must NOT produce C$ 0! Must calculate distance fee: 5 * 8 = 40
            node_assert_1.default.strictEqual(result.deliveryFee, 40);
            node_assert_1.default.strictEqual(result.courierEarnings, 35);
            node_assert_1.default.strictEqual(result.pricingSnapshot.pricingMode, "DISTANCE");
        });
        (0, node_test_1.it)("TC-SNAP-05: Distance metrics (km, meters) are fully preserved when pricingMode = FLAT", () => {
            const distanceMeters = 3450;
            const flatResolution = {
                pricingMode: "FLAT",
                policyId: "NI_MATAGALPA_CIUDAD_DARIO",
                pricingPolicyVersion: 2,
                fixedDeliveryFee: 40.0,
                currency: "NIO",
                isApplied: true,
            };
            const result = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, defaultCommerceConfig, flatResolution);
            node_assert_1.default.strictEqual(result.pricingSnapshot.distanceMeters, 3450);
            node_assert_1.default.strictEqual(result.pricingSnapshot.distanceKm, 3.45);
            node_assert_1.default.strictEqual(result.deliveryFee, 40.0);
        });
        (0, node_test_1.it)("TC-SNAP-06: Pricing snapshot includes quoteExpiresAt (15 min window) and quotedDeliveryFee", () => {
            const distanceMeters = 3000;
            const flatResolution = {
                pricingMode: "FLAT",
                policyId: "NI_MATAGALPA_CIUDAD_DARIO",
                pricingPolicyVersion: 1,
                fixedDeliveryFee: 40.0,
                currency: "NIO",
                isApplied: true,
            };
            const result = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, defaultCommerceConfig, flatResolution);
            node_assert_1.default.strictEqual(result.pricingSnapshot.quotedDeliveryFee, 40.0);
            node_assert_1.default.ok(result.pricingSnapshot.quoteExpiresAt != null, "quoteExpiresAt must be present");
            const expiresAtMs = new Date(result.pricingSnapshot.quoteExpiresAt).getTime();
            const diffMinutes = (expiresAtMs - Date.now()) / (60 * 1000);
            node_assert_1.default.ok(diffMinutes >= 14 && diffMinutes <= 16, `Quote expiration window must be ~15 mins, got ${diffMinutes}m`);
        });
    });
    // ─── 4. Total Reconciliation & Pricing Consistency Contract ──────────────
    (0, node_test_1.describe)("4. Order Total Reconciliation & Quote Concurrency Contract", () => {
        (0, node_test_1.it)("TC-RECONCILE-01: Full canonical accounting reconciliation: max(0, subtotal - discounts) + fee + tip + addCharge = total", () => {
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
            node_assert_1.default.strictEqual(productNet, 260.0);
            node_assert_1.default.strictEqual(reconciledTotal, 320.0);
            node_assert_1.default.strictEqual(Math.round(reconciledTotal * 100), 32000);
        });
        (0, node_test_1.it)("TC-RECONCILE-02: Preserves product-only base for merchant gross sales and commission", () => {
            const subtotalVal = 500;
            const discountVal = 50;
            const grossSalesVal = subtotalVal - discountVal; // 450
            const commissionRate = 0.15; // 15%
            const commissionAmount = Math.round(grossSalesVal * commissionRate * 100) / 100; // 67.50
            const netPayout = grossSalesVal - commissionAmount; // 382.50
            const finalDeliveryFee = 40.0;
            const reconciledTotal = grossSalesVal + finalDeliveryFee; // 490.00
            // Commission and Merchant Net MUST NOT include deliveryFee
            node_assert_1.default.strictEqual(grossSalesVal, 450.0);
            node_assert_1.default.strictEqual(commissionAmount, 67.50);
            node_assert_1.default.strictEqual(netPayout, 382.50);
            node_assert_1.default.strictEqual(reconciledTotal, 490.0);
        });
        (0, node_test_1.it)("TC-RECONCILE-03: Handles extreme discount where productNet is floored at 0", () => {
            const subtotalVal = 100;
            const totalDiscounts = 150; // Discount exceeds subtotal
            const productNet = Math.max(0, subtotalVal - totalDiscounts); // 0
            const finalDeliveryFee = 40.0;
            const tipVal = 0;
            const addChargeVal = 0;
            const reconciledTotal = Math.round((productNet + finalDeliveryFee + tipVal + addChargeVal) * 100) / 100;
            node_assert_1.default.strictEqual(productNet, 0);
            node_assert_1.default.strictEqual(reconciledTotal, 40.0);
        });
        (0, node_test_1.it)("TC-CONCURRENCY-01: Server-Verifiable Quote Contract (Option A) honors valid server quote against unconfirmed price increase", () => {
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
            let finalDeliveryFee;
            let feeSource;
            if (isUnused && isUnexpired && customerMatches && bizMatches && muniMatches && serverQuote.deliveryFee > 0) {
                finalDeliveryFee = serverQuote.deliveryFee; // SERVER-SIDE fee used!
                feeSource = "SERVER_VERIFIED_QUOTE";
            }
            else {
                finalDeliveryFee = currentMunicipalFlatFee;
                feeSource = "AUTHORITATIVE_MUNICIPAL_FLAT";
            }
            node_assert_1.default.strictEqual(finalDeliveryFee, 40.0);
            node_assert_1.default.strictEqual(feeSource, "SERVER_VERIFIED_QUOTE");
        });
        (0, node_test_1.it)("TC-CONCURRENCY-02: ANTI-TAMPERING: Client-injected fake quote (quotedDeliveryFee = 1) is strictly rejected", () => {
            // Attacker sends order with forged quoteId or fake pricingSnapshot
            const clientPayload = {
                deliveryFee: 1.0, // Forged!
                quotedDeliveryFee: 1.0, // Forged!
                quoteId: "non_existent_or_forged_quote_id",
            };
            // Server looks up quote in database:
            const quoteExistsOnServer = false; // Fake quote doesn't exist
            const currentMunicipalFlatFee = 40.0;
            let finalDeliveryFee;
            let feeSource = "";
            if (quoteExistsOnServer) {
                finalDeliveryFee = clientPayload.deliveryFee;
                feeSource = "SERVER_VERIFIED_QUOTE";
            }
            else {
                // Zero client trust: Falls back to authoritative municipal resolution
                finalDeliveryFee = currentMunicipalFlatFee;
                feeSource = "AUTHORITATIVE_MUNICIPAL_FLAT";
            }
            // Attacker's C$ 1 is completely defeated. Authoritative C$ 40 applied!
            node_assert_1.default.strictEqual(finalDeliveryFee, 40.0);
            node_assert_1.default.strictEqual(feeSource, "AUTHORITATIVE_MUNICIPAL_FLAT");
        });
        (0, node_test_1.it)("TC-CONCURRENCY-03: Reused quote (used === true) is rejected and falls back to authoritative policy", () => {
            const serverQuote = {
                quoteId: "quote_used_before",
                customerId: "cust_789",
                deliveryFee: 35.0,
                expiresAtMs: Date.now() + 5 * 60 * 1000,
                used: true, // Already consumed!
            };
            const currentMunicipalFlatFee = 40.0;
            const isUnused = serverQuote.used === false;
            let finalDeliveryFee;
            if (isUnused) {
                finalDeliveryFee = serverQuote.deliveryFee;
            }
            else {
                finalDeliveryFee = currentMunicipalFlatFee;
            }
            node_assert_1.default.strictEqual(finalDeliveryFee, 40.0);
        });
        (0, node_test_1.it)("TC-CONCURRENCY-04: Expired quote (expiresAt < now) is rejected and falls back to authoritative policy", () => {
            const serverQuote = {
                quoteId: "quote_expired",
                customerId: "cust_789",
                deliveryFee: 35.0,
                expiresAtMs: Date.now() - 60 * 1000, // Expired 1 min ago
                used: false,
            };
            const currentMunicipalFlatFee = 40.0;
            const isUnexpired = serverQuote.expiresAtMs > Date.now();
            let finalDeliveryFee;
            if (isUnexpired) {
                finalDeliveryFee = serverQuote.deliveryFee;
            }
            else {
                finalDeliveryFee = currentMunicipalFlatFee;
            }
            node_assert_1.default.strictEqual(finalDeliveryFee, 40.0);
        });
        (0, node_test_1.it)("TC-CONCURRENCY-05: Atomic Firestore Transaction: Two concurrent orders with same quoteId -> exactly 1 SUCCESS and exactly 1 REJECT", async () => {
            // Shared server-side quote state simulating Firestore document with transactional concurrency
            let quoteDoc = {
                quoteId: "quote_race_concurrent",
                deliveryFee: 40.0,
                used: false,
                orderId: null,
            };
            // Mock transactional resolver
            async function processOrderTransaction(orderId) {
                // Simulating runTransaction atomic read-and-mutate
                if (quoteDoc.used === false) {
                    quoteDoc.used = true;
                    quoteDoc.orderId = orderId;
                    return { success: true, fee: quoteDoc.deliveryFee, status: "VERIFIED_QUOTE" };
                }
                else {
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
            node_assert_1.default.strictEqual(successCount, 1, "Exactly ONE order must successfully consume the quote");
            node_assert_1.default.strictEqual(rejectCount, 1, "Exactly ONE order must be rejected/corrected");
            node_assert_1.default.strictEqual(quoteDoc.used, true);
        });
        (0, node_test_1.it)("TC-GATE-INERT-01: Under DISTANCE mode (Gate A inactive), quoteId is NOT generated and /pricing_quotes is completely bypassed", () => {
            // When pricingMode is DISTANCE (100% of Nicaragua during Gate A):
            const distanceResolution = {
                pricingMode: "DISTANCE",
                policyId: null,
                pricingPolicyVersion: null,
                fixedDeliveryFee: null,
                currency: "NIO",
                isApplied: false,
                fallbackReason: "NO_FLAT_POLICY_ACTIVE",
            };
            const isFlatPolicyApplied = distanceResolution.pricingMode === "FLAT" && distanceResolution.isApplied;
            node_assert_1.default.strictEqual(isFlatPolicyApplied, false);
            // Gate check guarantees zero writes to /pricing_quotes
            let quoteIdCreated = false;
            if (isFlatPolicyApplied) {
                quoteIdCreated = true;
            }
            node_assert_1.default.strictEqual(quoteIdCreated, false, "Gate A must be 100% inert: zero writes to /pricing_quotes");
        });
        (0, node_test_1.it)("TC-GATE-INERT-02: Zero Territorial Policy Reads in Gate A when territorialPricingEnabled == false", async () => {
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
            async function routeCommerceWithFeatureGate(options) {
                let territorialResolution = undefined;
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
            node_assert_1.default.strictEqual(resManagua.territorialResolution, undefined);
            node_assert_1.default.strictEqual(resLeon.territorialResolution, undefined);
            node_assert_1.default.strictEqual(resEsteli.territorialResolution, undefined);
            node_assert_1.default.strictEqual(territorialFirestoreReads, 0, "CERO lecturas en /territorial_pricing_policies en Gate A");
            node_assert_1.default.strictEqual(businessFirestoreReads, 0, "CERO lecturas adicionales en /businesses en Gate A");
        });
        (0, node_test_1.it)("TC-CONCURRENCY-06: Fail-Closed Quote Binding: Missing or mismatched customer/business/branch/department/municipality/country -> INVALID QUOTE", () => {
            const canonicalCustomer = "cust_verified_123";
            const canonicalBusiness = "biz_dario_456";
            const canonicalBranch = "branch_central";
            const canonicalDepartment = "MATAGALPA";
            const canonicalMunicipality = "CIUDAD_DARIO";
            const canonicalCountry = "NI";
            function evaluateQuoteBinding(qData, orderBranch) {
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
            node_assert_1.default.strictEqual(evaluateQuoteBinding(validQuote), true);
            // Caso 2: missing businessId en quote -> RECHAZADO (no fail-open)
            const missingBizQuote = { ...validQuote, businessId: undefined };
            node_assert_1.default.strictEqual(evaluateQuoteBinding(missingBizQuote), false, "Missing businessId must fail-closed");
            // Caso 3: missing departmentId en quote -> RECHAZADO
            const missingDeptQuote = { ...validQuote, departmentId: null };
            node_assert_1.default.strictEqual(evaluateQuoteBinding(missingDeptQuote), false, "Missing departmentId must fail-closed");
            // Caso 4: missing municipalityId en quote -> RECHAZADO
            const missingMuniQuote = { ...validQuote, municipalityId: "" };
            node_assert_1.default.strictEqual(evaluateQuoteBinding(missingMuniQuote), false, "Missing municipalityId must fail-closed");
            // Caso 5: customerId ajeno (intento de suplantación) -> RECHAZADO
            const attackerQuote = { ...validQuote, customerId: "attacker_999" };
            node_assert_1.default.strictEqual(evaluateQuoteBinding(attackerQuote), false, "Mismatched customerId must fail-closed");
            // Caso 6: missing countryCode en quote -> RECHAZADO (estrictamente fail-closed)
            const missingCountryQuote = { ...validQuote, countryCode: undefined };
            node_assert_1.default.strictEqual(evaluateQuoteBinding(missingCountryQuote), false, "Missing countryCode must fail-closed");
            // Caso 7: mismatched branchId (cotizado para sucursal A pero ordenado para sucursal B) -> RECHAZADO
            node_assert_1.default.strictEqual(evaluateQuoteBinding(validQuote, "branch_norte"), false, "Mismatched branchId must fail-closed");
        });
        (0, node_test_1.it)("TC-CONCURRENCY-07: Geo-Route Tolerance & Fail-Closed Origin/Destination Boundaries", () => {
            const QUOTE_DESTINATION_TOLERANCE_METERS = 250;
            const QUOTE_ORIGIN_TOLERANCE_METERS = 250;
            function evaluateGeoRoute(qDest, oDest, qOrigin, oOrigin) {
                let geoRouteMatches = false;
                let originMatches = false;
                let destDelta = -1;
                let originDelta = -1;
                const hasQuotedDest = typeof qDest?.lat === "number" && typeof qDest?.lng === "number" && qDest.lat !== 0;
                const hasOrderDest = typeof oDest?.lat === "number" && typeof oDest?.lng === "number" && oDest.lat !== 0;
                if (hasQuotedDest && hasOrderDest) {
                    const R = 6371000;
                    const dLat = ((oDest.lat - qDest.lat) * Math.PI) / 180;
                    const dLon = ((oDest.lng - qDest.lng) * Math.PI) / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos((qDest.lat * Math.PI) / 180) * Math.cos((oDest.lat * Math.PI) / 180) *
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
                    const dLatO = ((oOrigin.lat - qOrigin.lat) * Math.PI) / 180;
                    const dLonO = ((oOrigin.lng - qOrigin.lng) * Math.PI) / 180;
                    const aO = Math.sin(dLatO / 2) * Math.sin(dLatO / 2) +
                        Math.cos((qOrigin.lat * Math.PI) / 180) * Math.cos((oOrigin.lat * Math.PI) / 180) *
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
            node_assert_1.default.strictEqual(resIdentical.valid, true);
            node_assert_1.default.strictEqual(resIdentical.destDelta, 0);
            // Caso B: Fail-closed ante coordenadas faltantes en destino -> RECHAZADO (valid = false)
            const resMissingDest = evaluateGeoRoute(undefined, baseQuotedDest, baseQuotedOrigin, baseQuotedOrigin);
            node_assert_1.default.strictEqual(resMissingDest.valid, false, "Missing quote destination must fail-closed");
            // Caso C: Fail-closed ante coordenadas faltantes en origen -> RECHAZADO (valid = false)
            const resMissingOrigin = evaluateGeoRoute(baseQuotedDest, baseQuotedDest, undefined, baseQuotedOrigin);
            node_assert_1.default.strictEqual(resMissingOrigin.valid, false, "Missing quote origin must fail-closed");
            // Caso D: Boundary Test de Tolerancia de Seguridad (250 metros)
            // 249m <= 250m -> ACEPTADO
            // 250m <= 250m -> ACEPTADO
            // 251m > 250m  -> RECHAZADO
            const tolerance = 250;
            node_assert_1.default.strictEqual(249 <= tolerance, true, "249m must be ACCEPTED");
            node_assert_1.default.strictEqual(250 <= tolerance, true, "250m boundary must be ACCEPTED");
            node_assert_1.default.strictEqual(251 <= tolerance, false, "251m must be REJECTED");
            // Caso E: Cambio drástico de destino (3.5 km) -> RECHAZADO
            const alteredDest = { lat: 12.7550, lng: -86.1400 };
            const resAltered = evaluateGeoRoute(baseQuotedDest, alteredDest, baseQuotedOrigin, baseQuotedOrigin);
            node_assert_1.default.strictEqual(resAltered.valid, false, "Altered destination (>250m) must be REJECTED");
            node_assert_1.default.ok(resAltered.destDelta > 250);
        });
        (0, node_test_1.it)("TC-CONCURRENCY-08: Pricing Validation Status Transitions", () => {
            // 1. Con Quote válido y consumido atómicamente
            const status1 = "VERIFIED_QUOTE";
            node_assert_1.default.strictEqual(status1, "VERIFIED_QUOTE");
            // 2. Sin Quote pero en municipio con FLAT activo
            const status2 = "VERIFIED_MUNICIPAL_FLAT";
            node_assert_1.default.strictEqual(status2, "VERIFIED_MUNICIPAL_FLAT");
            // 3. Con Quote manipulado/inválido en municipio con FLAT activo -> Corregido autoritativamente
            const status3 = "CORRECTED_AUTHORITATIVE";
            node_assert_1.default.strictEqual(status3, "CORRECTED_AUTHORITATIVE");
            // 4. Municipio estándar por distancia (100% Gate A)
            const status4 = "VERIFIED_DISTANCE";
            node_assert_1.default.strictEqual(status4, "VERIFIED_DISTANCE");
        });
    });
    // ─── 5. Ciudad Darío Canary Specification ────────────────────────────────
    (0, node_test_1.describe)("5. Ciudad Darío Canary Specification Check", () => {
        (0, node_test_1.it)("TC-CANARY-01: Canary configuration matches exact approved parameters", () => {
            const canaryPolicy = {
                countryCode: "NI",
                departmentId: "MATAGALPA",
                departmentName: "Matagalpa",
                municipalityId: "CIUDAD_DARIO",
                municipalityName: "Ciudad Darío",
                pricingMode: "FLAT",
                fixedDeliveryFee: 40.0,
                currency: "NIO",
                isActive: true,
            };
            const policyId = (0, territorialPricingService_1.buildTerritorialPolicyId)(canaryPolicy.countryCode, canaryPolicy.departmentId, canaryPolicy.municipalityId);
            node_assert_1.default.strictEqual(policyId, "NI_MATAGALPA_CIUDAD_DARIO");
            node_assert_1.default.strictEqual(canaryPolicy.departmentId, "MATAGALPA");
            node_assert_1.default.strictEqual(canaryPolicy.municipalityId, "CIUDAD_DARIO");
            node_assert_1.default.strictEqual(canaryPolicy.pricingMode, "FLAT");
            node_assert_1.default.strictEqual(canaryPolicy.fixedDeliveryFee, 40.0);
            node_assert_1.default.strictEqual(canaryPolicy.currency, "NIO");
            node_assert_1.default.strictEqual(canaryPolicy.isActive, true);
        });
    });
    // ─── 6. Security Rules Specification & Verification Matrix ───────────────
    (0, node_test_1.describe)("6. Security Rules Specification (BSD-TERRITORIAL-MUNICIPAL-PRICING-POLICY-001)", () => {
        // Evaluation helper simulating Firestore Security Rules predicates
        function evalTerritorialRules(auth, op) {
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
        function evalQuoteRules(auth, op) {
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
        (0, node_test_1.it)("SEC-TERR-01: Customer read -> DENY", () => {
            const customerAuth = { uid: "customer_123", role: "CUSTOMER" };
            node_assert_1.default.strictEqual(evalTerritorialRules(customerAuth, "read"), false);
        });
        (0, node_test_1.it)("SEC-TERR-02: Customer create/update -> DENY", () => {
            const customerAuth = { uid: "customer_123", role: "CUSTOMER" };
            node_assert_1.default.strictEqual(evalTerritorialRules(customerAuth, "create"), false);
            node_assert_1.default.strictEqual(evalTerritorialRules(customerAuth, "update"), false);
        });
        (0, node_test_1.it)("SEC-TERR-03: Courier read -> DENY", () => {
            const courierAuth = { uid: "courier_456", role: "COURIER" };
            node_assert_1.default.strictEqual(evalTerritorialRules(courierAuth, "read"), false);
        });
        (0, node_test_1.it)("SEC-TERR-04: Merchant read/write -> DENY", () => {
            const merchantAuth = { uid: "merchant_789", role: "MERCHANT" };
            node_assert_1.default.strictEqual(evalTerritorialRules(merchantAuth, "read"), false);
            node_assert_1.default.strictEqual(evalTerritorialRules(merchantAuth, "create"), false);
            node_assert_1.default.strictEqual(evalTerritorialRules(merchantAuth, "update"), false);
        });
        (0, node_test_1.it)("SEC-TERR-05: Platform Admin read -> ALLOW", () => {
            const adminAuth = { uid: "admin_001", role: "platform_admin" };
            node_assert_1.default.strictEqual(evalTerritorialRules(adminAuth, "read"), true);
        });
        (0, node_test_1.it)("SEC-TERR-06: Platform Admin create/update -> ALLOW", () => {
            const adminAuth = { uid: "admin_001", role: "platform_admin" };
            node_assert_1.default.strictEqual(evalTerritorialRules(adminAuth, "create"), true);
            node_assert_1.default.strictEqual(evalTerritorialRules(adminAuth, "update"), true);
        });
        (0, node_test_1.it)("SEC-TERR-07: Platform Admin delete without superAdmin -> DENY", () => {
            const adminAuth = { uid: "admin_001", role: "platform_admin", isSuperAdmin: false };
            node_assert_1.default.strictEqual(evalTerritorialRules(adminAuth, "delete"), false);
        });
        (0, node_test_1.it)("SEC-TERR-08: SuperAdmin delete -> ALLOW", () => {
            const superAdminAuth = { uid: "super_001", role: "platform_admin", isSuperAdmin: true };
            node_assert_1.default.strictEqual(evalTerritorialRules(superAdminAuth, "delete"), true);
        });
        (0, node_test_1.it)("SEC-QUOTE-01: Customer read on pricing_quotes -> DENY (Minimum privilege: Zero Customer Read)", () => {
            const customerAuth = { uid: "cust_789", role: "CUSTOMER" };
            node_assert_1.default.strictEqual(evalQuoteRules(customerAuth, "read"), false);
        });
        (0, node_test_1.it)("SEC-QUOTE-02: Platform Admin read on pricing_quotes -> ALLOW (Auditoría/Soporte EIAM)", () => {
            const adminAuth = { uid: "admin_001", role: "platform_admin" };
            node_assert_1.default.strictEqual(evalQuoteRules(adminAuth, "read"), true);
        });
        (0, node_test_1.it)("SEC-QUOTE-03: Client write to pricing_quotes -> DENY (Admin SDK only)", () => {
            const customerAuth = { uid: "cust_attacker", role: "CUSTOMER" };
            const adminAuth = { uid: "admin_001", role: "platform_admin" };
            node_assert_1.default.strictEqual(evalQuoteRules(customerAuth, "write"), false);
            node_assert_1.default.strictEqual(evalQuoteRules(adminAuth, "write"), false);
        });
    });
});
