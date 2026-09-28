/**
 * COURIER IDENTITY RESOLVER — BLUE SYSTEM DELIVERY ENTERPRISE
 * Centralized Canonical Resolver for Courier Identity (AC-21 to AC-27)
 * 
 * Rules:
 * - Priority: assignedCourierName > driverName > motorizadoNombre > Canonical Profile Cache (/users /couriers)
 * - Zero Technical Identifier Exposure: NEVER leak Firebase UIDs, short hashes (e.g. 9QHYGK), or 'Motorizado (ID)'.
 * - Unassigned State: Exactly 'Sin asignar' (never 'Motorizado (null)', 'Motorizado (undefined)', '—', etc.).
 * - Cross-view Consistency: Omnichannel parity across Historial, Kanban, List, Detalle, Modals.
 */

export interface CourierOption {
  id: string;
  name: string;
  driverId?: string;
  plate?: string;
  phone?: string;
  status?: string;
  isAvailable?: boolean;
  tenantId?: string;
  cityId?: string;
  departmentId?: string;
  municipalityId?: string;
  cityName?: string;
  isFinanciallyBlocked?: boolean;
  financialBlockReason?: string;
}

export interface ResolvedCourierIdentity {
  courierId?: string;
  name: string;
  operationalId?: string;
  plate?: string;
  phone?: string;
  isAssigned: boolean;
  identitySource: 
    | 'CANONICAL_NAME'
    | 'DRIVER_NAME'
    | 'LEGACY_NAME'
    | 'PROFILE_CACHE'
    | 'FALLBACK_ASSIGNED'
    | 'FALLBACK_UNASSIGNED';
}

/**
 * Detects if a string is a raw technical identifier, UID, hash or corrupted placeholder
 * that must NEVER be exposed as a human name.
 */
export const isRawTechnicalIdentifier = (value: unknown): boolean => {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();

  // Common placeholders / corrupted tokens
  if (
    lower === 'undefined' ||
    lower === 'null' ||
    lower === '[object object]' ||
    lower === '—' ||
    lower === '-' ||
    lower === 'sin asignar' ||
    lower === 'sin motorizado' ||
    lower === 'motorizado asignado' ||
    lower === 'motorizado' ||
    lower === 'repartidor'
  ) {
    return true;
  }

  // Matches pattern 'Motorizado (XYZ123)' or 'Repartidor (XYZ123)' or 'Courier (XYZ123)'
  if (/^(motorizado|repartidor|courier)\s*\([a-zA-Z0-9_\-]{1,32}\)$/i.test(trimmed)) {
    return true;
  }

  // Matches raw Firebase Auth UIDs (28 alphanumeric characters with no spaces)
  if (/^[a-zA-Z0-9_-]{20,36}$/.test(trimmed) && !trimmed.includes(' ')) {
    return true;
  }

  // Matches short technical hashes like 9QHYGK, ABC123, DRV-XXXX when isolated as a name
  if (/^[A-Z0-9]{5,8}$/.test(trimmed) && !trimmed.includes(' ')) {
    return true;
  }

  return false;
};

/**
 * Extracts canonical courier ID from an order document or object.
 */
export const getOrderAssignedCourierId = (order: any): string | undefined => {
  if (!order || typeof order !== 'object') return undefined;
  const rawId = order.assignedCourierId || order.courierId || order.motorizadoId || order.driverId;
  if (typeof rawId === 'string' && rawId.trim().length > 0) {
    return rawId.trim();
  }
  return undefined;
};

/**
 * Determines if an order has a courier assigned.
 */
export const isOrderAssigned = (order: any): boolean => {
  if (!order || typeof order !== 'object') return false;
  if (getOrderAssignedCourierId(order)) return true;

  const hasValidName = 
    (typeof order.assignedCourierName === 'string' && !isRawTechnicalIdentifier(order.assignedCourierName)) ||
    (typeof order.driverName === 'string' && !isRawTechnicalIdentifier(order.driverName)) ||
    (typeof order.motorizadoNombre === 'string' && !isRawTechnicalIdentifier(order.motorizadoNombre));

  return hasValidName;
};

/**
 * Centralized in-memory cache for resolved courier profiles
 */
const globalCourierCache = new Map<string, CourierOption>();

/**
 * Registers or updates courier profiles in the in-memory cache.
 */
export const registerCouriersInCache = (couriers: CourierOption[] | Map<string, CourierOption> | Record<string, CourierOption>) => {
  if (Array.isArray(couriers)) {
    couriers.forEach(c => {
      if (c && c.id) globalCourierCache.set(c.id, c);
    });
  } else if (couriers instanceof Map) {
    couriers.forEach((val, key) => {
      if (key) globalCourierCache.set(key, val);
    });
  } else if (typeof couriers === 'object' && couriers !== null) {
    Object.entries(couriers).forEach(([key, val]) => {
      if (key && val) globalCourierCache.set(key, val);
    });
  }
};

/**
 * Centralized Courier Identity Resolver (AC-21 to AC-27)
 */
export const resolveCourierIdentity = (
  order: any,
  couriersSource?: CourierOption[] | Map<string, CourierOption> | Record<string, CourierOption>
): ResolvedCourierIdentity => {
  if (!order || typeof order !== 'object') {
    return {
      name: 'Sin asignar',
      isAssigned: false,
      identitySource: 'FALLBACK_UNASSIGNED'
    };
  }

  // Update local cache if a source was provided
  if (couriersSource) {
    registerCouriersInCache(couriersSource);
  }

  const courierId = getOrderAssignedCourierId(order);
  const rawAssignedName = order.assignedCourierName;
  const rawDriverName = order.driverName;
  const rawMotorizadoNombre = order.motorizadoNombre;

  const plate = order.assignedCourierPlate || order.motorizadoPlaca || order.licensePlate || undefined;
  const phone = order.assignedCourierPhone || order.motorizadoTelefono || order.driverPhone || order.customerCourierPhone || undefined;
  const operationalId = order.assignedCourierCode || order.driverCode || (courierId ? `MOT-${courierId.substring(0, 4).toUpperCase()}` : undefined);

  // ─── AC-21: Prioridad 1 — assignedCourierName Canónico ───────────────────────
  if (typeof rawAssignedName === 'string' && rawAssignedName.trim().length > 0 && !isRawTechnicalIdentifier(rawAssignedName)) {
    return {
      courierId,
      name: rawAssignedName.trim(),
      operationalId,
      plate,
      phone,
      isAssigned: true,
      identitySource: 'CANONICAL_NAME'
    };
  }

  // ─── AC-22: Prioridad 2 — driverName Fallback ────────────────────────────────
  if (typeof rawDriverName === 'string' && rawDriverName.trim().length > 0 && !isRawTechnicalIdentifier(rawDriverName)) {
    return {
      courierId,
      name: rawDriverName.trim(),
      operationalId,
      plate,
      phone,
      isAssigned: true,
      identitySource: 'DRIVER_NAME'
    };
  }

  // ─── AC-23: Prioridad 3 — motorizadoNombre Legacy ────────────────────────────
  if (typeof rawMotorizadoNombre === 'string' && rawMotorizadoNombre.trim().length > 0 && !isRawTechnicalIdentifier(rawMotorizadoNombre)) {
    return {
      courierId,
      name: rawMotorizadoNombre.trim(),
      operationalId,
      plate,
      phone,
      isAssigned: true,
      identitySource: 'LEGACY_NAME'
    };
  }

  // ─── AC-24: Prioridad 4 — Resolución por ID desde el Repositorio Canónico ─────
  if (courierId) {
    // Check in cache
    const cachedProfile = globalCourierCache.get(courierId);
    if (cachedProfile) {
      const profileName = cachedProfile.name;
      if (typeof profileName === 'string' && profileName.trim().length > 0 && !isRawTechnicalIdentifier(profileName)) {
        return {
          courierId,
          name: profileName.trim(),
          operationalId: cachedProfile.driverId || operationalId,
          plate: cachedProfile.plate || plate,
          phone: cachedProfile.phone || phone,
          isAssigned: true,
          identitySource: 'PROFILE_CACHE'
        };
      }
    }

    // ─── AC-25: Fallback Seguro Asignado (CERO exposición de UIDs o Hashes) ─────
    return {
      courierId,
      name: 'Motorizado asignado',
      operationalId,
      plate,
      phone,
      isAssigned: true,
      identitySource: 'FALLBACK_ASSIGNED'
    };
  }

  // ─── AC-26: Pedido Sin Asignar ───────────────────────────────────────────────
  return {
    name: 'Sin asignar',
    isAssigned: false,
    identitySource: 'FALLBACK_UNASSIGNED'
  };
};

/**
 * Returns formatted display name for Courier across all Merchant UI components.
 */
export const getOrderCourierDisplayName = (
  order: any,
  couriersSource?: CourierOption[] | Map<string, CourierOption> | Record<string, CourierOption>
): string => {
  return resolveCourierIdentity(order, couriersSource).name;
};

export interface CanonicalCourierEligibilityResult {
  isEligible: boolean;
  reason: string;
}

/**
 * Canonical EIAM Role Resolver
 */
export const resolveEiamRole = (dataOrString: any): string | null => {
  if (!dataOrString) return null;
  let raw = '';
  if (typeof dataOrString === 'string') {
    raw = dataOrString;
  } else if (typeof dataOrString === 'object') {
    raw = dataOrString.role || dataOrString.eiamRole || dataOrString.rol || dataOrString.userType || '';
  }
  const str = String(raw).toLowerCase().trim();
  if (!str) return null;

  const mapping: Record<string, string> = {
    'super_admin': 'SUPER_ADMIN', 'superadmin': 'SUPER_ADMIN', 'gerente_general': 'SUPER_ADMIN',
    'admin': 'ADMIN', 'administrator': 'ADMIN', 'auditor': 'AUDITOR', 'support': 'SUPPORT',
    'owner': 'OWNER', 'business': 'OWNER', 'comercio': 'OWNER', 'merchant': 'OWNER',
    'manager': 'MANAGER', 'supervisor': 'SUPERVISOR', 'cashier': 'CASHIER', 'seller': 'CASHIER', 'cook': 'COOK',
    'driver': 'DRIVER', 'motorizado': 'DRIVER', 'courier': 'DRIVER', 'repartidor': 'DRIVER', 'deliverer': 'DRIVER',
    'client': 'CLIENT', 'customer': 'CLIENT', 'cliente': 'CLIENT', 'user': 'CLIENT', 'guest': 'GUEST'
  };
  return mapping[str] || 'CLIENT';
};

/**
 * Hardened Canonical Courier Eligibility Resolver (BSD-COURIER-ELIGIBILITY-SOURCE-OF-TRUTH-FORENSIC-001)
 * Combines EIAM canonical role, operational /couriers profile, onboarding approval, and active status.
 */
export const isCanonicalCourier = (
  courierData: any,
  userData?: any
): CanonicalCourierEligibilityResult => {
  const c = courierData || {};
  const u = userData || {};

  const userRole = resolveEiamRole(u);

  // 1. REGLA CRÍTICA DE ROL INCOMPATIBLE:
  // Si existe perfil de usuario con rol explícito de Comercio, Admin, Staff o Cliente,
  // se RECHAZA INMEDIATAMENTE. Cero tolerancia.
  if (u && Object.keys(u).length > 0) {
    const rawRole = u.role || u.eiamRole || u.rol || u.userType || '';
    if (rawRole && userRole !== 'DRIVER') {
      return { isEligible: false, reason: `INCOMPATIBLE_ROLE_${userRole}` };
    }
  }

  // 2. EXCLUSIÓN DE IDENTIDADES CLIENTE / POS LEGACY
  const uid = String(c.id || c.uid || c.courierId || u.uid || u.id || '');
  if (uid.startsWith('user_cli_') || uid.startsWith('user_cliente') || uid.startsWith('USR-CL-') || uid.startsWith('USR-')) {
    return { isEligible: false, reason: 'LEGACY_CLIENT_PREFIX' };
  }

  // 3. CALIFICACIÓN POSITIVA DE DOMINIO COURIER:
  // Camino A: Identidad DRIVER en EIAM
  const isEiamDriver = (userRole === 'DRIVER');

  // Camino B: Ficha de aprovisionamiento formal de Onboarding completa
  const isApprovedOnboarding = Boolean(
    (c.approvalStatus === 'APPROVED' || c.onboardingStatus === 'approved') &&
    (c.plate || c.vehicle?.plate || c.licensePlate) &&
    c.applicationId
  );

  if (!isEiamDriver && !isApprovedOnboarding) {
    return { isEligible: false, reason: 'NOT_PROVISIONED_STUB' };
  }

  // 4. VERIFICACIÓN DE ESTADO ACTIVO (Sin suspensiones ni bloqueos)
  const isSuspended =
    c.status === 'SUSPENDED' || c.status === 'BLOCKED' || c.isActive === false || c.active === false ||
    u.status === 'SUSPENDED' || u.status === 'BLOCKED' || u.isActive === false || u.active === false;

  if (isSuspended) {
    return { isEligible: false, reason: 'SUSPENDED_OR_INACTIVE' };
  }

  // 5. Nombre identificable
  const name = String(c.name || c.nombre || u.name || u.nombre || '').trim();
  if (!name || name === 'Sin nombre') {
    return { isEligible: false, reason: 'MISSING_NAME' };
  }

  return { isEligible: true, reason: isApprovedOnboarding ? 'CERTIFIED_ONBOARDING' : 'CERTIFIED_EIAM_DRIVER' };
};

