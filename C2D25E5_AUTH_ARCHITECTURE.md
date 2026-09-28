# C2D.25E.5 — AUTH ARCHITECTURE & EIAM v3 SPECIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Arquitectura de Identidad EIAM v3 en Flutter

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EIAM v3 MULTI-TENANT IDENTITY CONTEXT                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                  FIREBASE AUTH (User UID: user_12345)                       │
│                                   │                                         │
│                      CANONICAL CUSTOM CLAIMS (JWT)                          │
│        { role: 'OWNER', tenantId: 'tenant_001', brandId: 'brand_001' }      │
│                                   │                                         │
│                                   ▼                                         │
│                           GATEKEEPER CONTEXT                                │
│       Effective Access = Role Permissions ∩ Subscription ∩ Tenant Context   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Estructura Canónica de Custom Claims

```typescript
export interface CanonicalCustomClaimsV3 {
  role: EiamRole;                 // Rol activo normalizado
  tenantId: string | null;        // UUID del Tenant activo
  brandId: string | null;         // UUID de Brand activa
  orgId: string | null;           // UUID de Organización matriz
  businessId: string | null;      // UUID del Negocio activo
  branchId: string | null;        // UUID de la Sucursal activa
  status: 'ACTIVE';               // Estado del contexto activo
  eiamVer: 3;                     // Versión fija del contrato (3)
}
```

En Flutter (`flutter_client/lib/core/auth/auth_context.dart`), la clase `CanonicalCustomClaimsV3` deserializa el payload del token JWT de manera tipada e inmutable, permitiendo que la UI y los servicios tomen decisiones de navegación y permisos de forma instantánea.
