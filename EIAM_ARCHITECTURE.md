# EIAM_ARCHITECTURE.md
# Enterprise Identity & Access Management (EIAM) — Architecture v1.0
# BlueSystem Delivery Enterprise v2.1

> **Estado**: DISEÑO APROBADO — Implementación en curso
> **Fecha**: 2026-08-05
> **Prioridad**: P0 — Transversal a toda la plataforma

---

## 1. Declaración Oficial de Arquitectura

> **EIAM será el único sistema oficial de identidad, autenticación, autorización y gestión de acceso de BlueSystem Delivery Enterprise. Ningún módulo de la plataforma (Android, Merchant Web, Admin Web o futuros clientes) implementará lógica propia de usuarios, roles o permisos. Toda esa responsabilidad recaerá exclusivamente sobre EIAM, garantizando una única fuente de verdad para identidad y seguridad en toda la plataforma.**

---

## 2. Principios de Diseño

| Principio | Descripción |
|---|---|
| **Single Source of Truth** | Una única definición de identidad, rol y permiso para toda la plataforma |
| **Frozen Core** | Ningún módulo Sprint 15.x se modifica; se integran vía adaptadores |
| **ADR-003** | Máx. 2 listeners activos. Agregaciones en memoria |
| **Clean Architecture** | Domain → Data → Presentation. Motores independientes |
| **Offline First** | Identidad y permisos cacheados localmente |
| **Event Driven** | Cambios de identidad propagados vía EventBus existente |
| **SDK Ready** | Motores empaquetables para Android, Web y futuros clientes |
| **Backward Compatible** | Legacy (`userType`, `role`, `rol`) resuelto por `LegacyRoleAdapter` sin modificar código existente |

---

## 3. Arquitectura Cross-Platform

```
┌─────────────────────────────────────────────────────────────────┐
│              EIAM — Single Source of Truth                      │
│                                                                 │
│  IdentityService  │  RoleService    │  PermissionService       │
│  InvitationService│  SessionService │  BusinessService         │
│  BranchService    │  EmployeeService│  DeviceService           │
│                                                                 │
│              (Identity API Contract — Interfaces)               │
└──────────┬─────────────────────────────────────────────────────┘
           │
    ┌──────┼──────────────────────┐
    │      │                      │
    ▼      ▼                      ▼
Android  Merchant Web          Admin Web
(operación diaria)  (administración del negocio)  (plataforma global)
```

### Android — Responsabilidades
- Autenticación (login, logout, biometría)
- Visualización de identidad y perfil
- Merchant Staff Center (en RSC → Personal)
- Driver Access Center
- Customer Access Center
- Enterprise Identity Center (Admin)

### Merchant Web — Responsabilidades (Sprint 16+)
- Gestión completa de empleados, sucursales, invitaciones
- Configuración de permisos
- Auditoría
- Dispositivos

### Admin Web — Responsabilidades (Sprint 16+)
- Todos los comercios, clientes, motorizados
- Custom Claims
- Tenants
- Logs de plataforma

---

## 4. Modelo de Dominio

```
Identity
  ├── uid: String (Firebase Auth UID)
  ├── email: String
  ├── providers: List<AuthProvider>
  ├── accountStatus: AccountStatus
  └── createdAt: Timestamp

Identity ──[1]──→ Profile (CustomerProfile | DriverProfile | AdminProfile)

Identity ──[*]──→ Membership
                      ├── businessId: String (UUID propio)
                      ├── branchId: String?
                      ├── role: EiamRole
                      ├── status: AccountStatus
                      └── permissions: List<EiamAction>

Membership ──[N:1]──→ Business
                          ├── businessId: String (UUID, NO UID)
                          ├── ownerUid: String
                          └── Branch[]

Business ──[1:N]──→ Branch
                        ├── branchId: String
                        ├── businessId: String
                        └── Employee[]
```

---

## 5. Capas de la Arquitectura

```
┌────────────────────────────────────────────────────┐
│  Presentation Layer                                │
│  (Android Screens + Web Stubs)                     │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  Application Layer                                 │
│  (UseCases: AuthenticateUserUseCase,               │
│   InviteEmployeeUseCase, CreateBusinessUseCase...) │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  Domain Layer                                      │
│  (Models + Engines + Repository Interfaces)        │
│  RoleEngine, PermissionEngine, InvitationEngine,   │
│  SessionEngine, BusinessEngine, BranchEngine,      │
│  EmployeeEngine, MembershipEngine, DeviceEngine,   │
│  MigrationEngine, IdentityTimelineEngine           │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  Data Layer                                        │
│  (Repositories Firestore + DTOs + Mappers)         │
│  + Adapters (Legacy → EIAM)                        │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  Security Layer                                    │
│  (CustomClaimsEngine, ClaimsValidator,             │
│   FirestoreRules, SessionManager)                  │
└────────────────────────────────────────────────────┘
```

---

## 6. Integración con Módulos Frozen

| Módulo Frozen | Punto de Integración EIAM |
|---|---|
| `BusinessDashboardScreen` | Lee `businessId` vía `CompatibilityAdapter.currentBusinessId()` |
| `MerchantOperationsCenterScreen` | Permisos validados por `PermissionEngine` vía adaptador |
| `DeliveryControlTowerScreen` | Acceso validado por `ClaimsValidator` |
| `RestaurantSettingsCenterScreen` | Nueva sección "Personal" conecta a `MerchantStaffCenterScreen` |
| `MerchantFinanceCenterScreen` | Permisos `VIEW_FINANCE`, `EXPORT_REPORT` via `PermissionEngine` |
| `AuthManager` | `LegacyRoleAdapter` traduce roles sin modificar `AuthManager` |

---

## 7. Nuevas Colecciones Firestore

| Colección | Propósito |
|---|---|
| `/users/{uid}` | Mantiene campos legacy + nuevo `eiamRole` |
| `/businesses/{businessId}` | Business separado de User |
| `/branches/{branchId}` | Sucursales como entidades independientes |
| `/membership/{membershipId}` | Relación User ↔ Business ↔ Role |
| `/employees/{employeeId}` | Personal del comercio |
| `/invitations/{token}` | Invitaciones multi-canal |
| `/sessions/{sessionId}` | Sesiones activas |
| `/devices/{deviceId}` | Dispositivos autorizados |
| `/drivers/{uid}` | Perfil extendido motorizado |
| `/customers/{uid}` | Perfil extendido cliente |
| `/audit_events/{id}` | Timeline unificado de auditoría |

---

## 8. Identity Timeline

Todos los eventos importantes de un usuario se registran en `/audit_events` con `uid` como clave de búsqueda:

```
ACCOUNT_CREATED → EMAIL_VERIFIED → INVITATION_ACCEPTED
→ ROLE_ASSIGNED → BUSINESS_REGISTERED → BRANCH_ASSIGNED
→ SESSION_STARTED → DEVICE_AUTHORIZED → CLAIM_UPDATED
→ EMPLOYEE_CREATED → ROLE_CHANGED → SESSION_ENDED...
```

---

## 9. Plan de Migración Legacy

```
FASE M1: LegacyRoleAdapter activo
  → Todos los módulos frozen leen roles sin cambios

FASE M2: CompatibilityAdapter propaga businessId
  → businessId = uid (patrón actual) resuelto internamente

FASE M3: MigrationEngine migra documentos Firestore
  → /users/{uid} recibe campo eiamRole + businessId propio
  → Operación atómica, reversible

FASE M4: Campos legacy marcados @Deprecated internamente
  → userType, rol permanecen en Firestore para compatibilidad

FASE M5: Eliminación legacy (Sprint futuro tras verificación)
```

---

## 10. Relación con Sprints Anteriores

| Sprint | Estado | Relación EIAM |
|---|---|---|
| Sprint 15.0 Product Wizard | ❄️ FROZEN | Sin cambios. Acceso validado por `CompatibilityAdapter` |
| Sprint 15.1 Merchant Dashboard | ❄️ FROZEN | Sin cambios. `businessId` resuelto por adapter |
| Sprint 15.2 MOOC + DCT | ❄️ FROZEN | Sin cambios. Permisos `CONFIRM_ORDER`, `ASSIGN_DRIVER` via `PermissionEngine` |
| Sprint 15.5 RSC | ❄️ FROZEN + Extensión | Nueva sección "Personal" conecta a Merchant Staff Center |
| Sprint 15.7 MFC | ❄️ FROZEN | Sin cambios. Permisos `VIEW_FINANCE`, `EXPORT_REPORT` validados por EIAM |
