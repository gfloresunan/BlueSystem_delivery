/**
 * BlueSystem Delivery Enterprise — Domain Engine: Loyalty & Rewards Engine v1.0
 * Pure, deterministic, and authoritative evaluation for points, FIFO allocation, levels, and redemptions.
 */

export type LoyaltyComboItemType = "PRODUCT" | "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "FREE_DELIVERY";

export interface LoyaltyComboItemEntity {
  type: LoyaltyComboItemType;
  productId?: string;
  productName?: string;
  quantity?: number;
  value?: number;
  businessId?: string;
  businessName?: string;
}

export interface LoyaltyRewardEntity {
  id?: string;
  name: string;
  description: string;
  imageUrl?: string;
  rewardType: "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "FREE_PRODUCT" | "FREE_DELIVERY" | "COMBO";
  pointsCost: number;
  scope: "GLOBAL" | "MERCHANT_SPECIFIC";
  businessId?: string | null;
  businessName?: string | null;
  discountType?: "FIXED_AMOUNT" | "PERCENTAGE" | "FREE_DELIVERY";
  discountValue?: number;
  freeProductId?: string | null;
  deliveryFree?: boolean;
  comboItems?: LoyaltyComboItemEntity[];
  active: boolean;
  startAt?: any;
  endAt?: any;
  maxRedemptions?: number | null;
  maxRedemptionsPerCustomer?: number | null;
  currentRedemptionsCount?: number;
  validityDays?: number;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface LoyaltyLevelEntity {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  icon: string;
  sortOrder: number;
  active: boolean;
}

export interface MerchantBalanceItem {
  businessId: string;
  businessName: string;
  pointsBalance: number;
  lifetimePointsEarned?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface FifoAllocationResult {
  allocations: Array<{
    businessId: string;
    businessName: string;
    points: number; // positive number consumed
  }>;
  totalAllocated: number;
  isSufficient: boolean;
  remainingBalances: Map<string, number>;
}

/**
 * Calcula la asignación FIFO determinista de puntos consumidos sobre los saldos comerciales.
 * Ordena los comercios por antigüedad (más antiguos primero) y consume hasta cubrir requiredPoints.
 */
export function calculateFifoAllocation(
  merchantBalances: MerchantBalanceItem[],
  requiredPoints: number
): FifoAllocationResult {
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
  const allocations: Array<{ businessId: string; businessName: string; points: number }> = [];
  const remainingBalances = new Map<string, number>();

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
export function determineCustomerLevel(
  lifetimePointsEarned: number,
  levels: LoyaltyLevelEntity[]
): { currentLevel: LoyaltyLevelEntity | null; nextLevel: LoyaltyLevelEntity | null; pointsToNext: number } {
  if (!levels || levels.length === 0) {
    return { currentLevel: null, nextLevel: null, pointsToNext: 0 };
  }

  const activeSorted = [...levels]
    .filter((l) => l.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let currentLevel: LoyaltyLevelEntity | null = null;
  let nextLevel: LoyaltyLevelEntity | null = null;

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
    } else {
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
export function validateComboReward(reward: LoyaltyRewardEntity): { valid: boolean; error?: string } {
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
    } else if (item.type === "FIXED_DISCOUNT" || item.type === "PERCENTAGE_DISCOUNT") {
      if (item.value === undefined || Number(item.value) <= 0) {
        return { valid: false, error: `Componente #${i + 1} (${item.type}) requiere un valor de descuento mayor a 0.` };
      }
      if (item.type === "PERCENTAGE_DISCOUNT" && Number(item.value) > 100) {
        return { valid: false, error: `Componente #${i + 1} (% Descuento) no puede superar el 100%.` };
      }
    } else if (item.type !== "FREE_DELIVERY") {
      return { valid: false, error: `Tipo de componente desconocido: ${item.type}` };
    }
  }

  return { valid: true };
}

