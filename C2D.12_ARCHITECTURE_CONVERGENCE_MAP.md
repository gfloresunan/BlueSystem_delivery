# BLUE SYSTEM DELIVERY ENTERPRISE
## PHASE 2D.12 — ARCHITECTURE CONVERGENCE MAP
### PROTOCOL IDENTIFIER: C2D.12

---

## 1. CONVERGENCE TOPOLOGY

```
                    AUTH / EIAM (Custom Claims)
                                 │
                                 ▼
                          TENANT CONTEXT
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
               BRAND        SUBSCRIPTION    MEMBERSHIP
                  │              │              │
                  └──────────────┼──────────────┘
                                 ▼
                            ENTITLEMENTS
                                 │
                                 ▼
                             GATEKEEPER
                   (EFFECTIVE_ACCESS = ROLE ∩ SUB ∩ ENT)
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
                CLIENT EXPERIENCE       DOMAIN SERVICES
                     │                       │
               ┌─────┼─────┐          ┌──────┼──────┐
               ▼     ▼     ▼          ▼      ▼      ▼
              WEB ANDROID iOS       ORDERS CATALOG FINANCE
                                              │
                                              ▼
                                     FIRESTORE ADAPTER
                                              │
                                              ▼
                                      FIRESTORE SSOT
```

---

## 2. SUBSYSTEM CONVERGENCE MATRIX

| Subsystem | Legacy Pattern | Certified Core Convergence | Parity Status |
|---|---|---|---|
| **Identity & Claims** | Raw role strings in localStorage | `MerchantIdentityContext` + Custom Claims V3 + `normalizeCanonicalRole` | 🟢 100% CONVERGED |
| **Tenant Isolation** | Single-tenant assumptions | Dynamic `TenantContext` + `TenantDomainGate` + Fail-Closed | 🟢 100% CONVERGED |
| **Branding & Theme** | Hardcoded CSS / hex colors | Dynamic `ClientExperienceProvider` + `resolveWebDesignTokens` + `BrandHydrationResolver.kt` | 🟢 100% CONVERGED |
| **Module Protection** | Sidebar item hiding only | `GatekeeperShield` (Route level) + `canAccessModule` (Backend level) | 🟢 100% CONVERGED |
| **Navigation** | Static array in MainLayout | `EntitlementDrivenNavigationResolver` + Plan gating | 🟢 100% CONVERGED |
| **Provisioning** | Manual Firestore doc creation | `ProvisioningEngine` with 7-stage pipeline & transactional compensation stack | 🟢 100% CONVERGED |
| **Storage & Media** | Direct unstructured upload | Scoped `/tenants/{tenantId}/brands/{brandId}/...` + metadata tracking | 🟢 100% CONVERGED |

---

## 3. MULTI-PLATFORM DATA CONTRACT EQUIVALENCE

```
┌─────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Model           │ Backend TypeScript   │ Android Kotlin       │ Web TypeScript       │
├─────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│ Order           │ OrderEntity          │ Order                │ OrderData            │
│ Order Status    │ OrderStatusEnum      │ OrderStatus (sealed) │ CanonicalStatus      │
│ Trip (X→Y)      │ DeliveryTripEntity   │ DeliveryTrip         │ TripModel            │
│ Tenant          │ TenantEntity         │ TenantSettings       │ WebActiveTenant      │
│ Brand Visual    │ BrandVisualConfig    │ BrandVisualConfig    │ BrandVisualConfig    │
│ Design Tokens   │ DesignTokens         │ BrandDesignTokens    │ DesignTokens         │
│ Role            │ EiamRole             │ EiamRole             │ CanonicalRole        │
│ Access Decision │ AccessDecision       │ ModuleAccessResult   │ AccessDecision       │
└─────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```
