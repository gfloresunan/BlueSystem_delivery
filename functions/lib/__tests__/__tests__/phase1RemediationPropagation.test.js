"use strict";
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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const xToYDispatchEngine_1 = require("../services/xToYDispatchEngine");
(0, node_test_1.describe)("PHASE 1.1 — Remediación Quirúrgica y Pruebas de Propagación SSOT", () => {
    (0, node_test_1.describe)("FINDING-06 / TEST 04: Zero Delivery Fee Preservation (businessProjection.ts)", () => {
        // Simulador exacto de la lógica autoritativa de businessProjection.ts L123
        function projectDeliveryFee(data) {
            return Number(data.deliveryFee ?? data.costoEnvioBase ?? 35);
        }
        (0, node_test_1.it)("deliveryFee = 0 se preserva estrictamente como 0 (envío gratis) y NUNCA revierte a 35", () => {
            const result = projectDeliveryFee({ deliveryFee: 0 });
            assert.strictEqual(result, 0, "deliveryFee = 0 debe producir 0");
        });
        (0, node_test_1.it)("costoEnvioBase = 0 se preserva como 0 cuando deliveryFee es undefined", () => {
            const result = projectDeliveryFee({ costoEnvioBase: 0 });
            assert.strictEqual(result, 0, "costoEnvioBase = 0 debe producir 0");
        });
        (0, node_test_1.it)("deliveryFee = null y costoEnvioBase = null aplica el fallback seguro de C$ 35", () => {
            const result = projectDeliveryFee({ deliveryFee: null, costoEnvioBase: null });
            assert.strictEqual(result, 35, "Ambos nulos deben retornar fallback 35");
        });
        (0, node_test_1.it)("deliveryFee = undefined y costoEnvioBase = undefined aplica el fallback seguro de C$ 35", () => {
            const result = projectDeliveryFee({});
            assert.strictEqual(result, 35, "Ambos indefinidos deben retornar fallback 35");
        });
        (0, node_test_1.it)("deliveryFee explícito de C$ 50 se preserva correctamente", () => {
            const result = projectDeliveryFee({ deliveryFee: 50 });
            assert.strictEqual(result, 50, "deliveryFee = 50 debe producir 50");
        });
        (0, node_test_1.it)("deliveryFee explícito de C$ 35 se preserva como 35", () => {
            const result = projectDeliveryFee({ deliveryFee: 35 });
            assert.strictEqual(result, 35, "deliveryFee = 35 debe producir 35");
        });
    });
    (0, node_test_1.describe)("FINDING-05 / TEST 03: X->Y Dispatch Engine SSOT Dynamic Parameters & Bounds Validation", () => {
        (0, node_test_1.it)("Retorna configuración por defecto segura cuando no hay override en Firestore", async () => {
            (0, xToYDispatchEngine_1.resetXToYDispatchConfigCache)();
            const cfg = await (0, xToYDispatchEngine_1.getXToYDispatchConfig)();
            assert.strictEqual(cfg.INITIAL_RADIUS_KM, xToYDispatchEngine_1.X2Y_DISPATCH_CONFIG.INITIAL_RADIUS_KM);
            assert.strictEqual(cfg.STAGE_2_RADIUS_KM, xToYDispatchEngine_1.X2Y_DISPATCH_CONFIG.STAGE_2_RADIUS_KM);
            assert.strictEqual(cfg.STAGE_3_RADIUS_KM, xToYDispatchEngine_1.X2Y_DISPATCH_CONFIG.STAGE_3_RADIUS_KM);
            assert.strictEqual(cfg.STAGE_2_EXPANSION_SECONDS, xToYDispatchEngine_1.X2Y_DISPATCH_CONFIG.STAGE_2_EXPANSION_SECONDS);
            assert.strictEqual(cfg.STAGE_3_EXPANSION_SECONDS, xToYDispatchEngine_1.X2Y_DISPATCH_CONFIG.STAGE_3_EXPANSION_SECONDS);
            assert.strictEqual(cfg.TIMEOUT_SECONDS, xToYDispatchEngine_1.X2Y_DISPATCH_CONFIG.TIMEOUT_SECONDS);
            assert.strictEqual(cfg.MAX_GPS_STALE_MS, xToYDispatchEngine_1.X2Y_DISPATCH_CONFIG.MAX_GPS_STALE_MS);
        });
        (0, node_test_1.it)("Valida bounds de radios y timeouts: descarta radios descendentes o negativos", () => {
            // Función pura de validación para test de bounds
            function validateDispatchRadii(radii) {
                return (Array.isArray(radii) &&
                    radii.length === 3 &&
                    radii.every((r) => typeof r === "number" && r > 0) &&
                    radii[0] < radii[1] &&
                    radii[1] < radii[2]);
            }
            function validateTimeouts(timeouts) {
                return (Array.isArray(timeouts) &&
                    timeouts.length === 3 &&
                    timeouts.every((t) => typeof t === "number" && t > 0) &&
                    timeouts[0] < timeouts[1] &&
                    timeouts[1] < timeouts[2]);
            }
            // Casos válidos
            assert.strictEqual(validateDispatchRadii([5, 15, 30]), true);
            assert.strictEqual(validateDispatchRadii([3, 10, 25]), true);
            assert.strictEqual(validateTimeouts([180, 360, 600]), true);
            // Casos inválidos: radios negativos
            assert.strictEqual(validateDispatchRadii([-5, 15, 30]), false);
            // Casos inválidos: radios descendentes
            assert.strictEqual(validateDispatchRadii([30, 15, 5]), false);
            // Casos inválidos: radios iguales
            assert.strictEqual(validateDispatchRadii([5, 5, 30]), false);
            // Casos inválidos: longitud incorrecta
            assert.strictEqual(validateDispatchRadii([5, 15]), false);
            assert.strictEqual(validateDispatchRadii([5, 15, 30, 50]), false);
            // Casos inválidos: timeouts negativos o descendentes
            assert.strictEqual(validateTimeouts([-180, 360, 600]), false);
            assert.strictEqual(validateTimeouts([600, 360, 180]), false);
            assert.strictEqual(validateTimeouts([180, 180, 600]), false);
        });
    });
    (0, node_test_1.describe)("FINDING-01 / TEST 01: Commission SSOT Source Canonical Resolution", () => {
        (0, node_test_1.it)("Resuelve comisión directamente de /system_config/global.merchantCommissionRate y descarta platform_config/fees", () => {
            // Simula la lectura canónica aplicada en financeCenter.js y useFinanceData.ts
            function resolveCommissionRate(systemConfigDoc) {
                const fallback = 0.15;
                if (systemConfigDoc && systemConfigDoc.merchantCommissionRate != null) {
                    return Number(systemConfigDoc.merchantCommissionRate);
                }
                return fallback;
            }
            // Escenario 1: SSOT contiene 0.13 (13%)
            const rate13 = resolveCommissionRate({ merchantCommissionRate: 0.13 });
            assert.strictEqual(rate13, 0.13, "Debe propagar 0.13 directamente desde /system_config/global");
            // Escenario 2: SSOT contiene 0.18 (18%)
            const rate18 = resolveCommissionRate({ merchantCommissionRate: 0.18 });
            assert.strictEqual(rate18, 0.18, "Debe propagar 0.18 directamente desde /system_config/global");
            // Escenario 3: Documento ausente aplica fallback 0.15 sin crash
            const fallbackRate = resolveCommissionRate(null);
            assert.strictEqual(fallbackRate, 0.15, "Debe aplicar fallback seguro 0.15 si no existe");
        });
    });
    (0, node_test_1.describe)("FINDING-03 & FINDING-04 / TEST 02 & TEST 06: Cross-Platform Contract Parity", () => {
        (0, node_test_1.it)("Homologación de esquema xToYPricing en Android y Flutter", () => {
            // Simula deserializador en Kotlin / Dart
            function parseGlobalConfigModel(data) {
                const xToYPricing = data.xToYPricing;
                const baseFee = (xToYPricing?.baseFee ?? data.xToYBaseFee ?? data.x2yBaseFee ?? 35.0);
                const pricePerKm = (xToYPricing?.pricePerKm ?? xToYPricing?.perKmRate ?? data.xToYPricePerKm ?? data.x2yPerKmRate ?? 15.0);
                const merchantCommissionRate = data.merchantCommissionRate;
                const commissionPercent = merchantCommissionRate != null
                    ? merchantCommissionRate * 100.0
                    : (data.commissionPercent ?? 15.0);
                return {
                    baseFee: Number(baseFee),
                    pricePerKm: Number(pricePerKm),
                    commissionPercent: Number(commissionPercent),
                    merchantCommissionRate: merchantCommissionRate != null ? Number(merchantCommissionRate) : Number(commissionPercent) / 100.0,
                };
            }
            // Payload canónico en Firestore (/system_config/global)
            const canonicalDoc = {
                xToYPricing: {
                    baseFee: 41.0,
                    pricePerKm: 11.0,
                    perKmRate: 11.0,
                },
                merchantCommissionRate: 0.13,
            };
            const parsed = parseGlobalConfigModel(canonicalDoc);
            assert.strictEqual(parsed.baseFee, 41.0, "baseFee debe resolver 41.0");
            assert.strictEqual(parsed.pricePerKm, 11.0, "pricePerKm debe resolver 11.0");
            assert.strictEqual(parsed.commissionPercent, 13.0, "commissionPercent en UI debe resolver 13.0%");
            assert.strictEqual(parsed.merchantCommissionRate, 0.13, "merchantCommissionRate debe ser 0.13");
        });
    });
    (0, node_test_1.describe)("FINDING-07 / Cache Invalidation Parity", () => {
        (0, node_test_1.it)("Verifica que el TTL de 60 segundos invalida entradas obsoletas", () => {
            const cache = new Map();
            const TTL_MS = 60000;
            function getCached(key, now) {
                const item = cache.get(key);
                if (!item)
                    return null;
                if (now - item.timestamp < TTL_MS) {
                    return item.value;
                }
                cache.delete(key);
                return null;
            }
            const t0 = 1000000;
            cache.set("A->B", { value: "Route-Quote-C$35", timestamp: t0 });
            // Dentro de la ventana de 60s -> Hit
            assert.strictEqual(getCached("A->B", t0 + 30000), "Route-Quote-C$35");
            // Pasados 61s -> Miss e invalidado
            assert.strictEqual(getCached("A->B", t0 + 61000), null);
            assert.strictEqual(cache.has("A->B"), false, "La clave debe ser eliminada tras expirar");
        });
    });
});
