# C2D.25E.5 — TENANT / BRAND / APPCONFIG INTEGRATION AUDIT
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Cadena de Resolución Jerárquica

```text
TENANT (TenantEntity)
   ↓
BRAND (BrandEntity / BrandVisualConfig)
   ↓
SUBSCRIPTION (SubscriptionEntity / EnabledFeatures / Quotas)
   ↓
APP CONFIG (AppConfigEntity / Distribution / Providers / Flags)
   ↓
FLUTTER CLIENT (BrandThemeBuilder / GatekeeperGuard / Services)
   ↓
GATEKEEPER (AccessDecision Engine)
   ↓
BLUE SYSTEM CORE (Authorized Operations)
```

---

### 2. Garantías de Aislamiento y No-Crossover

1. **Aislamiento de Tenant (`tenantId`)**:
   - `TenantIsolationException` se dispara si se detecta cualquier intento de consultar o persistir recursos pertenecientes a un tenant distinto al activo en el token JWT.
2. **Aislamiento de Marca (`brandId`)**:
   - `BrandIsolationException` previene el cruce de marcas entre tenants. Si una marca no pertenece al tenant activo, el resolutor de marca revierte atómicamente a `BrandVisualConfig.fallback`.
3. **Cero Secretos en Cliente**:
   - Ninguna credencial privada de backend ni token administrativo reside en `AppConfigEntity` o en el código fuente de Flutter.
