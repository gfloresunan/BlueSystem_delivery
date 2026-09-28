# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — PLAN DE REFORZAMIENTO DE FIRESTORE RULES Y SECURITY BASELINE V1.1

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. MATRIZ DE COMPATIBILIDAD CON SECURITY BASELINE V1.1

| Colección | Regla Actual | Propuesta de Hardening Canónico | Ataques Mitigados | Compatibilidad Baseline V1.1 |
| :--- | :--- | :--- | :--- | :--- |
| `/organizations/{orgId}` | `getOrgId() == orgId` | Mantener inmutable. Bloquear mutación de `ownerUid` | Manipulación de propiedad del Holding | ✅ 100% Compatible |
| `/businesses/{businessId}` | `ownsBusiness(businessId)` | Exigir `request.resource.data.orgId == resource.data.orgId` en `update` | Transferencia no autorizada de comercio a otra Org | ✅ 100% Compatible |
| `/branches/{branchId}` | `ownsBusiness(...)` | Exigir `request.resource.data.businessId == resource.data.businessId` | Secuestro de sucursales entre comercios | ✅ 100% Compatible |
| `/orders/{orderId}` | `isWritingOwnBusinessId()` | Inyectar validación `request.resource.data.get("orgId", null) == getOrgId()` | Contaminación de pedidos entre organizaciones | ✅ 100% Compatible |
| `/products/{productId}` | `isWritingOwnBusinessId()` | Bloquear edición del campo `orgId` en `update` | Contaminación del catálogo | ✅ 100% Compatible |

---

### 2. PLAN DE REFORZAMIENTO DE FIRESTORE RULES (PROPUESTA FUTURA)

```javascript
// Helper Canónico de Inmutabilidad de Jerarquía
function isHierarchyImmutable() {
  return !request.resource.data.diff(resource.data).affectedKeys().hasAny(["orgId", "businessId"]);
}

// match /businesses/{businessId}
match /businesses/{businessId} {
  allow read: if isAuthenticated() && (isPlatformAdmin() || ownsBusiness(businessId));
  allow update: if isPlatformAdmin() || (isBusinessAdmin() && ownsBusiness(businessId) && isHierarchyImmutable());
}

// match /branches/{branchId}
match /branches/{branchId} {
  allow read: if isAuthenticated() && (isPlatformAdmin() || ownsBusiness(resource.data.businessId));
  allow update: if isPlatformAdmin() || (isBusinessAdmin() && ownsBusiness(resource.data.businessId) && isHierarchyImmutable());
}
```

- **Garantía:** No se modificará el archivo `firestore.rules` durante la FASE 1.
