/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — RBAC & ROLES/PERMISSIONS CONTROL CENTER CALLABLES
 * Protocol: BSD-GLOBAL-RBAC-EIAM-IMPLEMENTATION-002
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { validateCallableContext } from "../shared/middleware/validator";
import { Logger } from "../shared/logger/logger";
import {
  AuthorizationService,
  CanonicalRole,
  ROLE_HIERARCHY_LEVELS,
  ATOMIC_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  normalizeRoleToCanonical,
  PermissionScopeLevel
} from "../shared/authorization/AuthorizationService";

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

/**
 * 1. CALLABLE: adminGetRolesAndPermissions
 * Retorna el catálogo canónico de roles, niveles L10-L0, registro de permisos atómicos,
 * matriz por defecto, resumen de usuarios por rol, overrides activos y métricas de seguridad.
 */
export const adminGetRolesAndPermissions = functions.https.onCall(async (data, context) => {
  validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN", "auditor", "AUDITOR"],
    },
    "adminGetRolesAndPermissions"
  );

  try {
    // 1. Conteo de usuarios por rol
    const usersSnap = await getDb().collection("users").get();
    const roleCounts: Record<string, number> = {};
    Object.values(CanonicalRole).forEach((r) => (roleCounts[r] = 0));

    let totalUsers = 0;
    usersSnap.forEach((doc) => {
      totalUsers++;
      const data = doc.data();
      const canonical = normalizeRoleToCanonical(data.role || data.rol || data.eiamRole);
      roleCounts[canonical] = (roleCounts[canonical] || 0) + 1;
    });

    // 2. Recuento de usuarios con Overrides
    const overridesSnap = await getDb().collectionGroup("overrides").get().catch(() => null);
    const usersWithOverridesCount = overridesSnap ? new Set(overridesSnap.docs.map(d => d.ref.parent.parent?.id).filter(Boolean)).size : 0;

    // 3. Obtener últimos eventos de auditoría RBAC
    const auditSnap = await getDb()
      .collection("audit_events")
      .where("domain", "==", "GOVERNANCE")
      .limit(10)
      .get()
      .catch(() => null);

    const recentAudit = auditSnap
      ? auditSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
      : [];

    return {
      success: true,
      data: {
        totalUsers,
        roleCounts,
        usersWithOverridesCount,
        canonicalRoles: Object.values(CanonicalRole).map((role) => ({
          role,
          level: ROLE_HIERARCHY_LEVELS[role],
          userCount: roleCounts[role] || 0,
          defaultPermissions: ROLE_DEFAULT_PERMISSIONS[role] || [],
        })),
        atomicPermissions: ATOMIC_PERMISSIONS,
        roleMatrix: ROLE_DEFAULT_PERMISSIONS,
        recentAudit,
        securityAlerts: [
          {
            id: "ALT-001",
            severity: "INFO",
            title: "P1 Hardening Activo",
            description: "adminUpdateUser protege autoelevación y último SuperAdmin.",
          },
        ],
      },
    };
  } catch (err: any) {
    Logger.error("[adminGetRolesAndPermissions] Error:", err);
    throw new functions.https.HttpsError("internal", err.message || "Error al obtener catálogo RBAC.");
  }
});

/**
 * 2. CALLABLE: adminGetUserEffectiveAccess
 * Retorna los permisos efectivos, rol base, grants, denies y explicación detallada
 * de acceso ("Why does this user have access?") para un usuario.
 */
export const adminGetUserEffectiveAccess = functions.https.onCall(async (data, context) => {
  validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN", "auditor", "AUDITOR", "support", "SUPPORT"],
      requiredFields: ["targetUid"],
    },
    "adminGetUserEffectiveAccess"
  );

  const { targetUid, scopeContext } = data;

  try {
    const userDoc = await getDb().collection("users").doc(targetUid).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", `Usuario ${targetUid} no encontrado.`);
    }

    const userData = userDoc.data() || {};
    const rawRole = userData.role || userData.rol || userData.eiamRole;
    const baseRole = normalizeRoleToCanonical(rawRole);
    const roleLevel = ROLE_HIERARCHY_LEVELS[baseRole];

    const overrides = await AuthorizationService.getUserOverrides(targetUid);
    const effectivePermissions = await AuthorizationService.calculateEffectivePermissions(targetUid, baseRole);

    // Generar explicaciones para todos los permisos atómicos
    const explanations = await Promise.all(
      ATOMIC_PERMISSIONS.map((perm) =>
        AuthorizationService.explainAccess(targetUid, perm, scopeContext || {})
      )
    );

    return {
      success: true,
      data: {
        uid: targetUid,
        email: userData.email || "N/A",
        nombre: userData.nombre || userData.name || "N/A",
        rawRole,
        baseRole,
        roleLevel,
        tenantId: userData.tenantId || null,
        businessId: userData.businessId || userData.eiamBusinessId || null,
        branchId: userData.branchId || null,
        userGrants: overrides?.grants || [],
        userDenies: overrides?.denies || [],
        effectivePermissions,
        explanations,
      },
    };
  } catch (err: any) {
    Logger.error("[adminGetUserEffectiveAccess] Error:", err);
    throw new functions.https.HttpsError("internal", err.message || "Error al calcular accesos efectivos.");
  }
});

/**
 * 3. CALLABLE: adminSetUserPermissionOverride
 * Concede (GRANT) o revoca (DENY) un permiso específico a nivel de usuario con vinculación de scope.
 */
export const adminSetUserPermissionOverride = functions.https.onCall(async (data, context) => {
  const { uid: callerUid } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
      requiredFields: ["targetUid", "permission", "type"],
    },
    "adminSetUserPermissionOverride"
  );

  const { targetUid, permission, type, scopeLevel, scopeValue, reason } = data;

  if (!["GRANT", "DENY", "REMOVE"].includes(type)) {
    throw new functions.https.HttpsError("invalid-argument", "Tipo de override debe ser 'GRANT', 'DENY' o 'REMOVE'.");
  }

  if (!ATOMIC_PERMISSIONS.includes(permission)) {
    throw new functions.https.HttpsError("invalid-argument", `El permiso '${permission}' no está registrado en el catálogo atómico.`);
  }

  const callerRoleRaw = context.auth?.token?.role || "admin";
  const callerRole = normalizeRoleToCanonical(callerRoleRaw);

  try {
    const targetDoc = await getDb().collection("users").doc(targetUid).get();
    if (!targetDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Usuario destino no existe.");
    }
    const targetData = targetDoc.data() || {};
    const targetRole = normalizeRoleToCanonical(targetData.role || targetData.eiamRole);

    // Safeguard jerárquico
    AuthorizationService.validateRoleMutationHierarchy(callerRoleRaw, callerUid, targetUid, targetRole, targetRole);

    const overridesRef = getDb().collection("users").doc(targetUid).collection("security").doc("overrides");
    const docSnap = await overridesRef.get();
    const existing = docSnap.exists ? docSnap.data() : { grants: [], denies: [] };

    let grants: string[] = existing?.grants || [];
    let denies: string[] = existing?.denies || [];

    // Limpiar previas instancias
    grants = grants.filter((p) => p !== permission && !p.startsWith(`${permission}@`));
    denies = denies.filter((p) => p !== permission && !p.startsWith(`${permission}@`));

    const scopeStr = scopeLevel && scopeValue ? `@${scopeLevel}:${scopeValue}` : "";
    const fullPermKey = `${permission}${scopeStr}`;

    if (type === "GRANT") {
      grants.push(fullPermKey);
    } else if (type === "DENY") {
      denies.push(fullPermKey);
    }

    await overridesRef.set(
      {
        grants,
        denies,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: callerUid,
        lastReason: reason || "Modificación manual de override",
      },
      { merge: true }
    );

    // Registro de auditoría atómica
    await getDb().collection("audit_events").add({
      event: "RBAC_OVERRIDE_MUTATION",
      action: `OVERRIDE_${type}`,
      domain: "GOVERNANCE",
      targetUid,
      actorUid: callerUid,
      actorRole: callerRole,
      permission,
      type,
      scopeLevel: scopeLevel || "GLOBAL",
      scopeValue: scopeValue || null,
      reason: reason || "N/A",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    Logger.audit("RBAC_OVERRIDE_MUTATION", callerUid, { targetUid, permission, type, scopeLevel, scopeValue });

    return {
      success: true,
      message: `Override '${type}' aplicado con éxito para '${permission}'.`,
    };
  } catch (err: any) {
    Logger.error("[adminSetUserPermissionOverride] Error:", err);
    throw new functions.https.HttpsError("internal", err.message || "Error al actualizar override.");
  }
});

/**
 * 4. CALLABLE: adminParsePermissionIntent (AI Permission Assistant)
 * Interpreta una solicitud en lenguaje natural y genera una tarjeta de propuesta (PROPOSAL ONLY).
 * NO realiza mutaciones autónomas. Requiere confirmación humana explícita del SuperAdmin.
 */
export const adminParsePermissionIntent = functions.https.onCall(async (data, context) => {
  validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
      requiredFields: ["naturalPrompt"],
    },
    "adminParsePermissionIntent"
  );

  const { naturalPrompt, targetUidFilter } = data;
  const promptLower = naturalPrompt.toLowerCase();

  try {
    // 1. Identificar usuario objetivo
    let targetUid = targetUidFilter || null;
    let targetUserData: any = null;

    if (!targetUid) {
      // Buscar en Firestore por coincidencia de nombre o email
      const usersSnap = await getDb().collection("users").limit(50).get();
      for (const doc of usersSnap.docs) {
        const u = doc.data();
        const nameMatch = u.nombre && promptLower.includes(u.nombre.toLowerCase());
        const emailMatch = u.email && promptLower.includes(u.email.toLowerCase());
        if (nameMatch || emailMatch) {
          targetUid = doc.id;
          targetUserData = u;
          break;
        }
      }
    } else {
      const uSnap = await getDb().collection("users").doc(targetUid).get();
      if (uSnap.exists) targetUserData = uSnap.data();
    }

    if (!targetUid || !targetUserData) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "No se pudo identificar con certeza al usuario objetivo en el prompt. Por favor selecciona el usuario explícitamente."
      );
    }

    // 2. Extraer Grants y Denies basados en palabras clave atómicas
    const proposedGrants: string[] = [];
    const proposedDenies: string[] = [];

    // Mapeo heurístico de intenciones a permisos atómicos
    if (promptLower.includes("finanzas") || promptLower.includes("ledger") || promptLower.includes("contabilidad")) {
      proposedGrants.push("finance:read_ledger");
    }
    if (promptLower.includes("liquidaciones") || promptLower.includes("settle") || promptLower.includes("pagos a comercios")) {
      if (promptLower.includes("no") || promptLower.includes("sin") || promptLower.includes("bloquear")) {
        proposedDenies.push("finance:settle_merchant");
      } else {
        proposedGrants.push("finance:settle_merchant");
      }
    }
    if (promptLower.includes("menú") || promptLower.includes("catálogo")) {
      proposedGrants.push("menu:manage");
    }
    if (promptLower.includes("ordenes") || promptLower.includes("pedidos")) {
      proposedGrants.push("orders:read");
    }

    // Default Fallback si no identificó específico
    if (proposedGrants.length === 0 && proposedDenies.length === 0) {
      proposedGrants.push("orders:read");
    }

    // 3. Extraer Scope si se menciona un comercio
    let scopeLevel: PermissionScopeLevel = PermissionScopeLevel.GLOBAL;
    let scopeValue: string | null = null;

    if (promptLower.includes("tecnostore")) {
      scopeLevel = PermissionScopeLevel.BUSINESS;
      scopeValue = "biz_tecnostore_official";
    }

    const proposalId = `PROP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const baseRole = normalizeRoleToCanonical(targetUserData.role || targetUserData.eiamRole);

    return {
      success: true,
      proposal: {
        proposalId,
        targetUid,
        targetEmail: targetUserData.email || "N/A",
        targetNombre: targetUserData.nombre || targetUserData.name || "Usuario",
        targetBaseRole: baseRole,
        proposedGrants,
        proposedDenies,
        scopeLevel,
        scopeValue,
        naturalPrompt,
        requiresHumanConfirmation: true, // REGLA INVIOLABLE: La IA genera propuesta, humano confirma
      },
    };
  } catch (err: any) {
    Logger.error("[adminParsePermissionIntent] Error:", err);
    throw new functions.https.HttpsError("internal", err.message || "Error al interpretar intención RBAC.");
  }
});

/**
 * 5. CALLABLE: adminApplyPermissionProposal
 * Aplica de forma confirmada y explícita por un SUPER_ADMIN una propuesta generada previamente.
 */
export const adminApplyPermissionProposal = functions.https.onCall(async (data, context) => {
  const { uid: callerUid } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["super_admin", "SUPER_ADMIN"], // Solo SUPER_ADMIN puede autorizar propuestas de la IA
      requiredFields: ["proposalId", "targetUid", "proposedGrants", "proposedDenies"],
    },
    "adminApplyPermissionProposal"
  );

  const { proposalId, targetUid, proposedGrants, proposedDenies, scopeLevel, scopeValue, reason } = data;

  try {
    const overridesRef = getDb().collection("users").doc(targetUid).collection("security").doc("overrides");
    const docSnap = await overridesRef.get();
    const existing = docSnap.exists ? docSnap.data() : { grants: [], denies: [] };

    let grants: string[] = existing?.grants || [];
    let denies: string[] = existing?.denies || [];

    const scopeStr = scopeLevel && scopeValue ? `@${scopeLevel}:${scopeValue}` : "";

    // Aplicar Grants
    proposedGrants.forEach((p: string) => {
      const key = `${p}${scopeStr}`;
      grants = grants.filter((x) => x !== p && !x.startsWith(`${p}@`));
      grants.push(key);
    });

    // Aplicar Denies
    proposedDenies.forEach((p: string) => {
      const key = `${p}${scopeStr}`;
      denies = denies.filter((x) => x !== p && !x.startsWith(`${p}@`));
      denies.push(key);
    });

    await overridesRef.set(
      {
        grants,
        denies,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: callerUid,
        proposalId,
        lastReason: reason || `Propuesta IA '${proposalId}' aprobada por SuperAdmin`,
      },
      { merge: true }
    );

    // Audit trace obligatoria
    await getDb().collection("audit_events").add({
      event: "AI_PROPOSAL_APPLIED",
      action: "APPLY_AI_RBAC_PROPOSAL",
      domain: "GOVERNANCE",
      proposalId,
      targetUid,
      actorUid: callerUid,
      actorRole: "SUPER_ADMIN",
      appliedGrants: proposedGrants,
      appliedDenies: proposedDenies,
      scopeLevel: scopeLevel || "GLOBAL",
      scopeValue: scopeValue || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    Logger.audit("AI_PROPOSAL_APPLIED", callerUid, { proposalId, targetUid, proposedGrants, proposedDenies });

    return {
      success: true,
      message: `Propuesta '${proposalId}' aplicada con éxito por SuperAdmin.`,
    };
  } catch (err: any) {
    Logger.error("[adminApplyPermissionProposal] Error:", err);
    throw new functions.https.HttpsError("internal", err.message || "Error al aplicar propuesta RBAC.");
  }
});
