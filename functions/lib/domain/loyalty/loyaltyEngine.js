"use strict";
/**
 * BlueSystem Delivery Enterprise — Domain Engine: Loyalty & Rewards Engine v1.0
 * Pure, deterministic, and authoritative evaluation for points, FIFO allocation, levels, and redemptions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFifoAllocation = calculateFifoAllocation;
exports.determineCustomerLevel = determineCustomerLevel;
exports.validateComboReward = validateComboReward;
/**
 * Calcula la asignación FIFO determinista de puntos consumidos sobre los saldos comerciales.
 * Ordena los comercios por antigüedad (más antiguos primero) y consume hasta cubrir requiredPoints.
 */
function calculateFifoAllocation(merchantBalances, requiredPoints) {
    if (requiredPoints <= 0) {
        return {
            allocations: [],
            totalAllocated: 0,
            isSufficient: true,
            remainingBalances: new Map(),
        };
    }
    // Filtrar solo comercios con saldo positivo
    const activeBalances = merchantBalances.filter((m) => m.pointsBalance > 0);
    const totalAvailable = activeBalances.reduce((sum, m) => sum + m.pointsBalance, 0);
    if (totalAvailable < requiredPoints) {
        return {
            allocations: [],
            totalAllocated: 0,
            isSufficient: false,
            remainingBalances: new Map(),
        };
    }
    let pointsNeeded = requiredPoints;
    const allocations = [];
    const remainingBalances = new Map();
    for (const m of activeBalances) {
        if (pointsNeeded <= 0) {
            remainingBalances.set(m.businessId, m.pointsBalance);
            continue;
        }
        const consume = Math.min(m.pointsBalance, pointsNeeded);
        allocations.push({
            businessId: m.businessId,
            businessName: m.businessName || "Comercio",
            points: consume,
        });
        remainingBalances.set(m.businessId, m.pointsBalance - consume);
        pointsNeeded -= consume;
    }
    return {
        allocations,
        totalAllocated: requiredPoints - pointsNeeded,
        isSufficient: pointsNeeded === 0,
        remainingBalances,
    };
}
/**
 * Determina el nivel del cliente a partir de sus puntos históricos acumulados (lifetimePointsEarned).
 */
function determineCustomerLevel(lifetimePointsEarned, levels) {
    if (!levels || levels.length === 0) {
        return { currentLevel: null, nextLevel: null, pointsToNext: 0 };
    }
    const activeSorted = [...levels]
        .filter((l) => l.active)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    let currentLevel = null;
    let nextLevel = null;
    for (let i = 0; i < activeSorted.length; i++) {
        const lvl = activeSorted[i];
        if (lifetimePointsEarned >= lvl.minPoints && (lvl.maxPoints <= 0 || lifetimePointsEarned <= lvl.maxPoints)) {
            currentLevel = lvl;
            if (i + 1 < activeSorted.length) {
                nextLevel = activeSorted[i + 1];
            }
            break;
        }
    }
    // Si no coincide con ninguno por encima del tope, asignar el máximo nivel
    if (!currentLevel && activeSorted.length > 0) {
        const highest = activeSorted[activeSorted.length - 1];
        if (lifetimePointsEarned >= highest.minPoints) {
            currentLevel = highest;
            nextLevel = null;
        }
        else {
            currentLevel = activeSorted[0];
            nextLevel = activeSorted.length > 1 ? activeSorted[1] : null;
        }
    }
    const pointsToNext = nextLevel ? Math.max(0, nextLevel.minPoints - lifetimePointsEarned) : 0;
    return { currentLevel, nextLevel, pointsToNext };
}
/**
 * Valida de forma pura y determinista la estructura de una recompensa tipo COMBO.
 */
function validateComboReward(reward) {
    if (reward.rewardType !== "COMBO") {
        return { valid: true };
    }
    if (!reward.name || !reward.name.trim()) {
        return { valid: false, error: "El nombre del combo es requerido." };
    }
    if (!reward.pointsCost || Number(reward.pointsCost) <= 0) {
        return { valid: false, error: "El costo en puntos debe ser mayor a 0." };
    }
    if (!reward.comboItems || !Array.isArray(reward.comboItems) || reward.comboItems.length === 0) {
        return { valid: false, error: "El combo debe contener al menos un componente." };
    }
    if (reward.scope === "MERCHANT_SPECIFIC" && (!reward.businessId || !reward.businessId.trim())) {
        return { valid: false, error: "Un combo específico de comercio debe incluir un businessId válido." };
    }
    for (let i = 0; i < reward.comboItems.length; i++) {
        const item = reward.comboItems[i];
        if (!item.type) {
            return { valid: false, error: `Componente #${i + 1} no tiene un tipo definido.` };
        }
        if (item.type === "PRODUCT") {
            if (!item.productId || !item.productId.trim()) {
                return { valid: false, error: `Componente #${i + 1} (PRODUCT) requiere un productId válido.` };
            }
            if (!item.quantity || Number(item.quantity) <= 0) {
                return { valid: false, error: `Componente #${i + 1} (PRODUCT) requiere una cantidad mayor a 0.` };
            }
            if (reward.scope === "MERCHANT_SPECIFIC" && item.businessId && item.businessId !== reward.businessId) {
                return { valid: false, error: `El producto ${item.productId} no pertenece al comercio ${reward.businessId}.` };
            }
        }
        else if (item.type === "FIXED_DISCOUNT" || item.type === "PERCENTAGE_DISCOUNT") {
            if (item.value === undefined || Number(item.value) <= 0) {
                return { valid: false, error: `Componente #${i + 1} (${item.type}) requiere un valor de descuento mayor a 0.` };
            }
            if (item.type === "PERCENTAGE_DISCOUNT" && Number(item.value) > 100) {
                return { valid: false, error: `Componente #${i + 1} (% Descuento) no puede superar el 100%.` };
            }
        }
        else if (item.type !== "FREE_DELIVERY") {
            return { valid: false, error: `Tipo de componente desconocido: ${item.type}` };
        }
    }
    return { valid: true };
}
//# sourceMappingURL=loyaltyEngine.js.map