/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PROTOCOL: BSD-SCHEDULED-COMMERCE-PHASE-2-DATA-CONTRACT-001
 * SHARED DATA CONTRACT FOUNDATION: SCHEDULED COMMERCE ORDERS (FASE 2)
 *
 * Primary Architectural Invariant:
 * - Commerce Delivery SSOT remains /orders/{orderId}.
 * - Operational status machine is UNCHANGED: pending -> preparing -> ready -> assigned -> in_transit -> delivered -> completed.
 * - Scheduling is orthogonal to operational status (fulfillmentTiming answers WHEN, status answers STATE).
 * - Backward compatibility: missing fulfillmentTiming = IMMEDIATE.
 * - Single authoritative scheduling authority: windowStartAt + windowEndAt (Timestamps) + timezone.
 *
 * ZERO PRODUCTION DATA MUTATION. ZERO UNAPPROVED RUNTIME HOOKS.
 */

export type FulfillmentMode = 'IMMEDIATE' | 'SCHEDULED';

export type SpecialHandlingType = 
  | 'STANDARD'
  | 'FLOWERS'
  | 'CAKE'
  | 'BALLOONS'
  | 'FRAGILE'
  | 'CUSTOM';

export interface FulfillmentTiming {
  mode: FulfillmentMode;
  /**
   * Timestamp de inicio de la ventana autoritativa de entrega programada.
   */
  windowStartAt?: any;
  /**
   * Timestamp de fin de la ventana autoritativa de entrega programada.
   */
  windowEndAt?: any;
  /**
   * Identificador canónico de zona horaria IANA (ej. "America/Managua").
   */
  timezone: string;
  /**
   * Timestamp de registro del contrato de programación.
   */
  createdAt?: any;
  /**
   * Minutos de anticipación de preparación requeridos por el comercio (snapshot orden).
   */
  preparationLeadMinutes?: number;
  /**
   * Minutos de anticipación de despacho requeridos para la flota (snapshot orden).
   */
  dispatchLeadMinutes?: number;
}

export interface OrderRecipient {
  /**
   * true si la entrega es para un tercero diferente al comprador autenticado.
   */
  isThirdParty: boolean;
  name: string;
  phone: string;
  deliveryInstructions?: string;
}

export interface GiftDetails {
  isGift: boolean;
  senderName?: string;
  isAnonymous?: boolean;
  message?: string;
  cardTemplateId?: string;
}

export interface SpecialHandling {
  type: SpecialHandlingType | string;
  fragile: boolean;
  keepUpright: boolean;
  temperatureSensitive?: boolean;
  handlingNote?: string;
}

export interface ScheduledCommerceOrderExtension {
  fulfillmentTiming?: FulfillmentTiming;
  recipient?: OrderRecipient;
  giftDetails?: GiftDetails;
  specialHandling?: SpecialHandling;
}

// ─── VALIDATION RESULT CONTRACT ─────────────────────────────────────────────

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── PURE VALIDATION FUNCTIONS ──────────────────────────────────────────────

/**
 * Normaliza cualquier formato de timestamp (Firestore Timestamp, Date, milisegundos o segundos) a milisegundos.
 */
export function toEpochMillis(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  if (typeof ts.toDate === 'function') {
    return ts.toDate().getTime();
  }
  if (ts instanceof Date) {
    return ts.getTime();
  }
  if (typeof ts.seconds === 'number') {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1000000);
  }
  if (typeof ts === 'number') {
    return ts;
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Valida la estructura de fulfillmentTiming de acuerdo con la regla SSOT.
 * Regla: Para SCHEDULED, windowStartAt y windowEndAt son obligatorios y windowEndAt > windowStartAt.
 */
export function validateFulfillmentTiming(timing: any): ContractValidationResult {
  const errors: string[] = [];

  if (!timing) {
    // Missing timing is valid backward-compatible IMMEDIATE order
    return { valid: true, errors: [] };
  }

  const mode = String(timing.mode || '').trim().toUpperCase();

  if (!mode || mode === 'IMMEDIATE') {
    return { valid: true, errors: [] };
  }

  if (mode !== 'SCHEDULED') {
    errors.push(`Modo de cumplimiento desconocido: '${timing.mode}'. Valores permitidos: 'IMMEDIATE', 'SCHEDULED'.`);
    return { valid: false, errors };
  }

  // Validación estricta para SCHEDULED
  const startMillis = toEpochMillis(timing.windowStartAt);
  const endMillis = toEpochMillis(timing.windowEndAt);

  if (startMillis === null) {
    errors.push("windowStartAt es requerido para órdenes SCHEDULED y debe ser un Timestamp válido.");
  }

  if (endMillis === null) {
    errors.push("windowEndAt es requerido para órdenes SCHEDULED y debe ser un Timestamp válido.");
  }

  if (startMillis !== null && endMillis !== null) {
    if (endMillis <= startMillis) {
      errors.push(`Ventana de entrega inválida: windowEndAt (${endMillis}) debe ser estrictamente posterior a windowStartAt (${startMillis}).`);
    }
  }

  const timezone = typeof timing.timezone === 'string' ? timing.timezone.trim() : '';
  if (!timezone) {
    errors.push("timezone es requerido para órdenes SCHEDULED (ej. 'America/Managua').");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida los datos del destinatario cuando están presentes.
 */
export function validateOrderRecipient(recipient: any): ContractValidationResult {
  const errors: string[] = [];

  if (!recipient) {
    return { valid: true, errors: [] };
  }

  if (recipient.isThirdParty === true) {
    const name = typeof recipient.name === 'string' ? recipient.name.trim() : '';
    if (!name) {
      errors.push("recipient.name es obligatorio cuando recipient.isThirdParty es true.");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida el contrato global de una orden en relación con la programación.
 */
export function validateScheduledOrderContract(order: any): ContractValidationResult {
  const errors: string[] = [];

  if (!order) {
    return { valid: true, errors: [] };
  }

  const timingResult = validateFulfillmentTiming(order.fulfillmentTiming);
  if (!timingResult.valid) {
    errors.push(...timingResult.errors);
  }

  const recipientResult = validateOrderRecipient(order.recipient);
  if (!recipientResult.valid) {
    errors.push(...recipientResult.errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ─── SEMANTIC HELPER FUNCTIONS ──────────────────────────────────────────────

/**
 * Determina canónicamente si una orden es programada.
 * Regla: fulfillmentTiming?.mode === 'SCHEDULED' con ventana de entrega válida.
 * Soporta fallback legacy transitorio para prototipos de pre-versión si procede.
 */
export function isScheduledOrder(order: any): boolean {
  if (!order) return false;

  const timing = order.fulfillmentTiming;
  if (timing && String(timing.mode || '').trim().toUpperCase() === 'SCHEDULED') {
    const startMillis = toEpochMillis(timing.windowStartAt);
    const endMillis = toEpochMillis(timing.windowEndAt);
    if (startMillis !== null && endMillis !== null && endMillis > startMillis) {
      return true;
    }
  }

  // Fallback de compatibilidad para prototipo heredado
  if (order.isScheduled === true || order.scheduledFor) {
    return true;
  }

  return false;
}

/**
 * Obtiene el modo de cumplimiento ('IMMEDIATE' | 'SCHEDULED').
 * Missing/null = 'IMMEDIATE'.
 */
export function getFulfillmentMode(order: any): FulfillmentMode {
  return isScheduledOrder(order) ? 'SCHEDULED' : 'IMMEDIATE';
}

/**
 * Obtiene la ventana autoritativa de entrega de una orden programada, o null si es inmediata.
 */
export function getScheduledWindow(order: any): { windowStartAt: any; windowEndAt: any; timezone: string } | null {
  if (!order || !isScheduledOrder(order)) return null;
  const timing = order.fulfillmentTiming;
  return {
    windowStartAt: timing.windowStartAt,
    windowEndAt: timing.windowEndAt,
    timezone: timing.timezone || 'America/Managua'
  };
}

/**
 * Resuelve la identidad de contacto para la entrega física sin alterar la titularidad del comprador.
 */
export function getRecipientContact(order: any): { name: string; phone: string; isThirdParty: boolean } {
  if (!order) {
    return { name: '', phone: '', isThirdParty: false };
  }

  const recipient = order.recipient;
  if (recipient && recipient.isThirdParty === true && recipient.name) {
    return {
      name: String(recipient.name).trim(),
      phone: String(recipient.phone || '').trim(),
      isThirdParty: true
    };
  }

  return {
    name: String(order.customerName || order.nombreCliente || '').trim(),
    phone: String(order.customerPhone || order.telefonoCliente || '').trim(),
    isThirdParty: false
  };
}

/**
 * Evalúa si la orden requiere manipulación especial.
 */
export function requiresSpecialHandling(order: any): boolean {
  const sh = order?.specialHandling;
  if (!sh) return false;
  return Boolean(
    sh.fragile ||
    sh.keepUpright ||
    sh.temperatureSensitive ||
    (sh.type && String(sh.type).trim().toUpperCase() !== 'STANDARD')
  );
}
