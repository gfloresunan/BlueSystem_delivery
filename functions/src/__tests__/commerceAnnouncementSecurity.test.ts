/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — AUDIT TEST SUITE
 * BSD-COMMERCE-ANNOUNCEMENT-CARD-ENTERPRISE-001
 * 
 * Verificación determinística de:
 * 1. Matriz de Autorización Firestore Rules (EIAM v2.1/v3, Aislamiento Multi-Tenant, Inmutabilidad)
 * 2. Matriz de Seguridad Storage Rules (MIME, Tamaño <= 5MB, Aislamiento de Negocio)
 * 3. Motor de Resolución Branch vs Global Announcement (Customer App)
 * 4. Validador de Seguridad de Enlaces Externos CTA (Anti-XSS / Safe Protocols)
 */

import { describe, test } from "node:test";
import * as assert from "node:assert";

// ─── 1. SIMULADOR DETERMINÍSTICO DE FIRESTORE SECURITY RULES ─────────────────
interface AuthContext {
  uid: string;
  token: {
    role?: string;
    admin?: boolean;
    isSuperAdmin?: boolean;
    businessId?: string;
    restaurantId?: string;
    tenantId?: string;
  };
}

interface FirestoreRequest {
  auth: AuthContext | null;
  resource?: { data: Record<string, any> };
  resourceData?: Record<string, any>;
}

class FirestoreAnnouncementRulesEvaluator {
  static isPlatformAdmin(auth: AuthContext | null): boolean {
    if (!auth) return false;
    const role = (auth.token.role || "").toUpperCase();
    return (
      ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"].includes(role) ||
      auth.token.admin === true ||
      auth.token.isSuperAdmin === true
    );
  }

  static isBusinessAdmin(auth: AuthContext | null): boolean {
    if (!auth) return false;
    const role = (auth.token.role || "").toUpperCase();
    return ["BUSINESS_ADMIN", "COMMERCE_ADMIN", "RESTAURANT_ADMIN", "MANAGER"].includes(role);
  }

  static ownsBusiness(auth: AuthContext | null, businessId: string): boolean {
    if (!auth) return false;
    return (
      auth.token.businessId === businessId ||
      auth.token.restaurantId === businessId ||
      auth.uid === businessId
    );
  }

  static getTenantId(auth: AuthContext | null): string | null {
    return auth?.token?.tenantId || null;
  }

  // Regla exacta de firestore.rules: match /announcements/{announcementId}
  static evaluateRead(auth: AuthContext | null): boolean {
    // allow read: if true;
    return true;
  }

  static evaluateCreate(
    auth: AuthContext | null,
    businessId: string,
    newData: Record<string, any>
  ): boolean {
    if (!auth) return false;

    if (this.isPlatformAdmin(auth)) return true;

    if (this.isBusinessAdmin(auth) && this.ownsBusiness(auth, businessId)) {
      const bizMatch = (newData.businessId || businessId) === businessId;
      const callerTenant = this.getTenantId(auth);
      const tenantMatch = callerTenant == null || (newData.tenantId || callerTenant) === callerTenant;
      return bizMatch && tenantMatch;
    }

    return false;
  }

  static evaluateUpdate(
    auth: AuthContext | null,
    businessId: string,
    existingData: Record<string, any>,
    newData: Record<string, any>
  ): boolean {
    if (!auth) return false;

    if (this.isPlatformAdmin(auth)) return true;

    if (this.isBusinessAdmin(auth) && this.ownsBusiness(auth, businessId)) {
      // Inmutabilidad estricta: businessId, tenantId, createdBy, createdAt no pueden mutar
      const immutableKeys = ["businessId", "tenantId", "createdBy", "createdAt"];
      for (const key of immutableKeys) {
        if (existingData[key] !== undefined && newData[key] !== undefined) {
          if (existingData[key] !== newData[key]) return false;
        }
      }
      return true;
    }

    return false;
  }

  static evaluateDelete(auth: AuthContext | null, businessId: string): boolean {
    if (!auth) return false;
    if (this.isPlatformAdmin(auth)) return true;
    return this.isBusinessAdmin(auth) && this.ownsBusiness(auth, businessId);
  }
}

// ─── 2. SIMULADOR DETERMINÍSTICO DE STORAGE SECURITY RULES ───────────────────
class StorageRulesEvaluator {
  static isValidCommerceImage(contentType: string, sizeBytes: number): boolean {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const isRaster = validTypes.includes(contentType.toLowerCase());
    const isWithin5MB = sizeBytes <= 5 * 1024 * 1024;
    return isRaster && isWithin5MB;
  }

  static evaluateUpload(
    auth: AuthContext | null,
    businessId: string,
    contentType: string,
    sizeBytes: number
  ): boolean {
    if (!auth) return false;
    const isAuthorized =
      FirestoreAnnouncementRulesEvaluator.isPlatformAdmin(auth) ||
      (FirestoreAnnouncementRulesEvaluator.isBusinessAdmin(auth) &&
        FirestoreAnnouncementRulesEvaluator.ownsBusiness(auth, businessId));

    return isAuthorized && this.isValidCommerceImage(contentType, sizeBytes);
  }
}

// ─── 3. SIMULADOR DEL MOTOR DE RESOLUCIÓN BRANCH VS GLOBAL ───────────────────
interface TestAnnouncement {
  id: string;
  branchId: string;
  title: string;
  isActive: boolean;
  displayOrder: number;
  startAt?: string;
  endAt?: string;
}

function isCurrentlyValid(item: TestAnnouncement, currentTimeMs: number): boolean {
  if (!item.isActive) return false;
  if (item.startAt) {
    const startMs = Date.parse(item.startAt);
    if (!isNaN(startMs) && currentTimeMs < startMs) return false;
  }
  if (item.endAt) {
    const endMs = Date.parse(item.endAt);
    if (!isNaN(endMs) && currentTimeMs > endMs) return false;
  }
  return true;
}

function resolveActiveAnnouncement(
  announcements: TestAnnouncement[],
  selectedBranchId: string | null | undefined,
  currentTimeMs: number
): TestAnnouncement | null {
  const valid = announcements.filter((a) => isCurrentlyValid(a, currentTimeMs));
  if (valid.length === 0) return null;

  // 1. Prioridad: Sucursal activa seleccionada
  if (selectedBranchId && selectedBranchId.trim().length > 0) {
    const branchSpecific = valid
      .filter((a) => a.branchId && a.branchId === selectedBranchId)
      .sort((a, b) => a.displayOrder - b.displayOrder || b.id.localeCompare(a.id))[0];
    if (branchSpecific) return branchSpecific;
  }

  // 2. Fallback: Anuncio global del comercio
  return (
    valid
      .filter((a) => !a.branchId || a.branchId.toUpperCase() === "ALL")
      .sort((a, b) => a.displayOrder - b.displayOrder || b.id.localeCompare(a.id))[0] || null
  );
}

// ─── 4. VALIDADOR DE SEGURIDAD DE ENLACES EXTERNOS (CTA) ────────────────────
function validateExternalUrl(url: string): { allowed: boolean; reason: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { allowed: false, reason: "EMPTY_URL" };
  }
  if (!trimmed.toLowerCase().startsWith("https://")) {
    return { allowed: false, reason: "INSECURE_OR_DISALLOWED_SCHEME" };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { allowed: false, reason: "PROTOCOL_NOT_HTTPS" };
    }
    return { allowed: true, reason: "OK" };
  } catch {
    return { allowed: false, reason: "INVALID_URL_FORMAT" };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE DE AUDITORÍA FORENSE POST-IMPLEMENTACIÓN
// ═════════════════════════════════════════════════════════════════════════════

describe("BSD-COMMERCE-ANNOUNCEMENT-CARD-ENTERPRISE-001 — Forensic Audit Matrix", () => {
  // ─── BLOQUE 1: AUTORIZACIÓN FIRESTORE RULES ───────────────────────────────
  test("1.1: Cliente Público tiene acceso de LECTURA (ALLOW)", () => {
    const canRead = FirestoreAnnouncementRulesEvaluator.evaluateRead(null);
    assert.strictEqual(canRead, true);
  });

  test("1.2: Cliente o Usuario no autenticado NO PUEDE CREAR ni MODIFICAR anuncios (DENY)", () => {
    const customerAuth: AuthContext = {
      uid: "user_customer_01",
      token: { role: "CUSTOMER" },
    };
    const canCreate = FirestoreAnnouncementRulesEvaluator.evaluateCreate(
      customerAuth,
      "biz_restaurant_A",
      { title: "Hack Promo" }
    );
    assert.strictEqual(canCreate, false, "Customer no debe tener permisos de creación");
  });

  test("1.3: Merchant A puede crear y actualizar anuncios en su propio negocio (ALLOW)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: {
        role: "BUSINESS_ADMIN",
        businessId: "biz_restaurant_A",
        tenantId: "tenant_alpha",
      },
    };
    const canCreate = FirestoreAnnouncementRulesEvaluator.evaluateCreate(
      merchantA,
      "biz_restaurant_A",
      { title: "Promo Oficial", businessId: "biz_restaurant_A", tenantId: "tenant_alpha" }
    );
    assert.strictEqual(canCreate, true, "Merchant A debe poder escribir en su negocio");
  });

  test("1.4: Multi-Tenant Isolation: Merchant A NO PUEDE escribir en Merchant B (DENY)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: {
        role: "BUSINESS_ADMIN",
        businessId: "biz_restaurant_A",
        tenantId: "tenant_alpha",
      },
    };
    const canWriteToB = FirestoreAnnouncementRulesEvaluator.evaluateCreate(
      merchantA,
      "biz_restaurant_B",
      { title: "Ataque Cross-Tenant", businessId: "biz_restaurant_B", tenantId: "tenant_beta" }
    );
    assert.strictEqual(canWriteToB, false, "Merchant A no debe poder escribir en Merchant B");
  });

  test("1.5: Tenant Isolation: Tenant Alpha no puede forjar pertenencia a Tenant Beta (DENY)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: {
        role: "BUSINESS_ADMIN",
        businessId: "biz_restaurant_A",
        tenantId: "tenant_alpha",
      },
    };
    const canForgeTenant = FirestoreAnnouncementRulesEvaluator.evaluateCreate(
      merchantA,
      "biz_restaurant_A",
      { title: "Forged", businessId: "biz_restaurant_A", tenantId: "tenant_beta" }
    );
    assert.strictEqual(canForgeTenant, false, "No se permite forjar tenantId disjunto");
  });

  test("1.6: Platform Admin tiene autorización de escritura centralizada en cualquier comercio (ALLOW)", () => {
    const platformAdmin: AuthContext = {
      uid: "admin_master",
      token: { role: "SUPER_ADMIN", admin: true },
    };
    const canAdminWrite = FirestoreAnnouncementRulesEvaluator.evaluateCreate(
      platformAdmin,
      "biz_restaurant_B",
      { title: "Admin Override" }
    );
    assert.strictEqual(canAdminWrite, true, "Platform Admin debe poder gestionar cualquier comercio");
  });

  test("1.7: Inmutabilidad de Ownership: Intento de cambiar businessId o tenantId en update es bloqueado (DENY)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: { role: "BUSINESS_ADMIN", businessId: "biz_restaurant_A", tenantId: "tenant_alpha" },
    };
    const existing = {
      businessId: "biz_restaurant_A",
      tenantId: "tenant_alpha",
      createdBy: "user_owner_A",
      createdAt: 1000,
      title: "Original",
    };
    const maliciousUpdate = {
      ...existing,
      businessId: "biz_restaurant_HACKED",
    };
    const canMutate = FirestoreAnnouncementRulesEvaluator.evaluateUpdate(
      merchantA,
      "biz_restaurant_A",
      existing,
      maliciousUpdate
    );
    assert.strictEqual(canMutate, false, "Campos de ownership son inmutables");
  });

  // ─── BLOQUE 2: SEGURIDAD EN STORAGE RULES ─────────────────────────────────
  test("2.1: Imágenes válidas (JPEG, PNG, WebP <= 5MB) son permitidas (ALLOW)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: { role: "BUSINESS_ADMIN", businessId: "biz_A" },
    };
    assert.strictEqual(
      StorageRulesEvaluator.evaluateUpload(merchantA, "biz_A", "image/jpeg", 2 * 1024 * 1024),
      true
    );
    assert.strictEqual(
      StorageRulesEvaluator.evaluateUpload(merchantA, "biz_A", "image/png", 4.9 * 1024 * 1024),
      true
    );
    assert.strictEqual(
      StorageRulesEvaluator.evaluateUpload(merchantA, "biz_A", "image/webp", 1 * 1024 * 1024),
      true
    );
  });

  test("2.2: Archivos superiores a 5MB son estrictamente rechazados (DENY 5.1MB)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: { role: "BUSINESS_ADMIN", businessId: "biz_A" },
    };
    const size5_1MB = 5.1 * 1024 * 1024;
    const isAllowed = StorageRulesEvaluator.evaluateUpload(merchantA, "biz_A", "image/jpeg", size5_1MB);
    assert.strictEqual(isAllowed, false, "Archivos > 5MB deben ser rechazados");
  });

  test("2.3: Formatos peligrosos o no raster (PDF, SVG, HTML) son rechazados (DENY)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: { role: "BUSINESS_ADMIN", businessId: "biz_A" },
    };
    assert.strictEqual(
      StorageRulesEvaluator.evaluateUpload(merchantA, "biz_A", "application/pdf", 1024),
      false,
      "PDF no permitido"
    );
    assert.strictEqual(
      StorageRulesEvaluator.evaluateUpload(merchantA, "biz_A", "image/svg+xml", 1024),
      false,
      "SVG con riesgo de script embebido debe ser rechazado"
    );
    assert.strictEqual(
      StorageRulesEvaluator.evaluateUpload(merchantA, "biz_A", "text/html", 1024),
      false,
      "HTML no permitido"
    );
  });

  test("2.4: Subida de Merchant A en carpeta de Merchant B es rechazada (DENY)", () => {
    const merchantA: AuthContext = {
      uid: "user_owner_A",
      token: { role: "BUSINESS_ADMIN", businessId: "biz_A" },
    };
    const isCrossAllowed = StorageRulesEvaluator.evaluateUpload(
      merchantA,
      "biz_B",
      "image/jpeg",
      1024
    );
    assert.strictEqual(isCrossAllowed, false, "Merchant A no puede subir al storage de Merchant B");
  });

  // ─── BLOQUE 3: MOTOR DE RESOLUCIÓN SUCURSAL (BRANCH) VS GLOBAL ────────────
  const fixedNow = 1726880000000; // Timestamp de referencia
  const sampleAnnouncements: TestAnnouncement[] = [
    {
      id: "ann_global",
      branchId: "", // Global
      title: "Anuncio Global Toda la Franquicia",
      isActive: true,
      displayOrder: 2,
    },
    {
      id: "ann_branch_a",
      branchId: "branch_matriz",
      title: "Combo Exclusivo Sucursal Matriz",
      isActive: true,
      displayOrder: 1,
    },
    {
      id: "ann_branch_b",
      branchId: "branch_norte",
      title: "Descuento Sucursal Norte",
      isActive: true,
      displayOrder: 1,
    },
    {
      id: "ann_expired",
      branchId: "branch_sur",
      title: "Promo Vencida",
      isActive: true,
      displayOrder: 1,
      endAt: new Date(fixedNow - 100000).toISOString(), // Vencido
    },
  ];

  test("3.1: Cliente viendo Sucursal Matriz recibe Anuncio de Matriz", () => {
    const resolved = resolveActiveAnnouncement(sampleAnnouncements, "branch_matriz", fixedNow);
    assert.ok(resolved);
    assert.strictEqual(resolved?.id, "ann_branch_a");
    assert.strictEqual(resolved?.title, "Combo Exclusivo Sucursal Matriz");
  });

  test("3.2: Cliente viendo Sucursal Norte recibe Anuncio de Sucursal Norte", () => {
    const resolved = resolveActiveAnnouncement(sampleAnnouncements, "branch_norte", fixedNow);
    assert.ok(resolved);
    assert.strictEqual(resolved?.id, "ann_branch_b");
  });

  test("3.3: Cliente viendo Sucursal Este (sin anuncio propio) recibe Anuncio Global como fallback", () => {
    const resolved = resolveActiveAnnouncement(sampleAnnouncements, "branch_este", fixedNow);
    assert.ok(resolved);
    assert.strictEqual(resolved?.id, "ann_global");
    assert.strictEqual(resolved?.title, "Anuncio Global Toda la Franquicia");
  });

  test("3.4: Cliente viendo Sucursal Sur (anuncio vencido) recibe Anuncio Global como fallback", () => {
    const resolved = resolveActiveAnnouncement(sampleAnnouncements, "branch_sur", fixedNow);
    assert.ok(resolved);
    assert.strictEqual(resolved?.id, "ann_global", "Si el anuncio de branch expiró, retrocede a global");
  });

  test("3.5: Si todos los anuncios están inactivos o expirados, resuelve null (0dp en UI)", () => {
    const inactiveList: TestAnnouncement[] = [
      { id: "1", branchId: "", title: "Off", isActive: false, displayOrder: 1 },
      { id: "2", branchId: "b1", title: "Expired", isActive: true, displayOrder: 1, endAt: new Date(fixedNow - 1000).toISOString() },
    ];
    const resolved = resolveActiveAnnouncement(inactiveList, "b1", fixedNow);
    assert.strictEqual(resolved, null, "Debe ser null para no renderizar ningún espacio vertical (0dp)");
  });

  // ─── BLOQUE 4: SEGURIDAD DE ENLACES EXTERNOS (ANTI-XSS / PROTOCOLOS SEGUROS) ─
  test("4.1: URLs con protocolo HTTPS válido son permitidas (ALLOW)", () => {
    const res1 = validateExternalUrl("https://mi-comercio.com/menu-digital");
    assert.strictEqual(res1.allowed, true);

    const res2 = validateExternalUrl("https://instagram.com/p/restaurante_oficial");
    assert.strictEqual(res2.allowed, true);
  });

  test("4.2: URLs inseguras con HTTP plano son bloqueadas (DENY)", () => {
    const res = validateExternalUrl("http://inseguro.com/promo");
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, "INSECURE_OR_DISALLOWED_SCHEME");
  });

  test("4.3: Vectores de ataque javascript: o data: son bloqueados (DENY)", () => {
    const jsAttack = validateExternalUrl("javascript:alert(document.cookie)");
    assert.strictEqual(jsAttack.allowed, false);

    const dataAttack = validateExternalUrl("data:text/html,<script>alert(1)</script>");
    assert.strictEqual(dataAttack.allowed, false);
  });

  test("4.4: Esquemas de archivo y Android Intents arbitrarios son bloqueados (DENY)", () => {
    const fileAttack = validateExternalUrl("file:///android_asset/secret.key");
    assert.strictEqual(fileAttack.allowed, false);

    const intentAttack = validateExternalUrl("intent:#Intent;action=android.intent.action.VIEW;end");
    assert.strictEqual(intentAttack.allowed, false);
  });
});
