# BLUE SYSTEM DELIVERY ENTERPRISE
## PROTOCOLO FORENSE DE LIMPIEZA CONTROLADA DE IDENTIDADES
### PRODUCCIÓN — ZERO DATA LOSS (FASE 0 & FASE 1: AUDITORÍA Y SNAPSHOT)

- **ID del Protocolo**: `BSD-PRODUCTION-IDENTITY-DATA-CLEANUP-FORENSIC-001`
- **Nombre**: Production Identity Data Cleanup & Canonical User Registry
- **Baseline**: BlueSystem Delivery Enterprise v2.2
- **Estado del Sistema**: PRODUCCIÓN REAL
- **Modo**: `AUDIT-FIRST` / `PRODUCTION-SAFE` / `ZERO-DATA-LOSS` / `READ-ONLY`
- **Fecha de Auditoría**: 10 de Septiembre, 2026

---

## 1. Production Snapshot & Inventory (Fase 0)

Se ha ejecutado un volcado completo de solo lectura de todas las identidades y colecciones con referencias en producción.

### Resumen Cuantitativo de Colecciones:
| Recurso / Colección | Cantidad de Documentos | Rol / Naturaleza en Producción |
|---|:---:|---|
| **Firebase Auth Users** | **33** | Cuentas activas en Identity Toolkit |
| **`/users`** | **63** | Perfiles canónicos y clientes de sincronización |
| **`/couriers`** | **59** | 5 couriers reales + 54 stubs históricos |
| **`/courier_balances`** | **59** | Registros de balance (solo 2 tienen saldo $>0$) |
| **`/businesses`** | **8** | Comercios registrados en plataforma |
| **`/branches`** | **8** | Sucursales de comercios |
| **`/merchants`** | **0** | (Colección legacy migrada a `/businesses`) |
| **`/employees`** | **0** | (Vinculación actual vía `/membership`) |
| **`/membership`** | **11** | Vínculos de membresía de comercio / staff |
| **`/organizations`** | **9** | Organizaciones multi-tenant |
| **`/invitations`** | **8** | Invitaciones de staff |
| **`/user_devices`** | **25** | Tokens FCM multidevice |
| **`/orders`** | **59** | Historial inmutable de pedidos de comercio |
| **`/deliveryTrips`** | **6** | Historial inmutable de viajes X→Y |
| **`/reviews`** | **6** | Reseñas y calificaciones históricas |
| **`/financial_events`** | **62** | Eventos de liquidación y pagos auditados |
| **`/merchant_summaries`** | **6** | Resúmenes diarios/mensuales de comercios |
| **`/audit_events`** | **4,026** | Registro inmutable de auditoría forense |
| **`/courier_applications`** | **3** | Solicitudes de onboarding de motorizados |
| **`/ubicaciones_repartidores`**| **5** | Telemetría GPS activa (coincidencia exacta: 5 couriers) |
| **`/notification_campaigns`** | **23** | Campañas de notificación enviadas |
| **`/system_config`** | **2** | Parámetros globales de plataforma |

**Universo Total de Identidades Únicas Identificadas:** **72 UIDs**

---

## 2. Clasificación Canónica de Identidades (Fase 1)

Del universo de **72 UIDs** evaluados cruzando Firebase Auth, `/users`, `/couriers`, `/membership`, `/businesses`, `/orders` y `/audit_events`:

```
                           UNIVERSO DE IDENTIDADES (72 UIDs)
                                         │
        ┌───────────────┬────────────────┼────────────────┬───────────────┐
        ▼               ▼                ▼                ▼               ▼
   SUPER_ADMIN        ADMIN         COURIER_REAL    MERCHANT_OWNER  MERCHANT_STAFF
     (1 UID)         (1 UID)          (5 UIDs)         (8 UIDs)        (2 UIDs)
     [KEEP]          [KEEP]            [KEEP]           [KEEP]          [KEEP]
        │               │                │                │               │
        └───────────────┴────────────────┼────────────────┴───────────────┘
                                         ▼
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
           CUSTOMER_REAL                                       STUB
             (41 UIDs)                                       (8 UIDs)
    [KEEP / DELETE_COURIER_STUB]                     [DELETE_COURIER_STUB]
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                                      UNKNOWN
                                      (6 UIDs)
                                 [REVIEW_REQUIRED]
                               (Auth sin doc /users)
```

### Tabla de Desglose de Clasificación:
| Clasificación Canónica | Cantidad | Acción Propuesta | Justificación Técnica |
|---|:---:|:---:|---|
| **`SUPER_ADMIN`** | 1 | `KEEP` | **Gerald José Flores Gutiérrez** (`XWsjzZe8lsfthRQ5PgbDzlqA2nX2` / `geraldflores07@gmail.com`). Acceso y claims inmutables. |
| **`ADMIN`** | 1 | `KEEP` | Administrador de operaciones plataforma (`admin_initial`). |
| **`COURIER_REAL`** | 5 | `KEEP` | Flota certificada: Juan Delivery, Henry Paz, Pedro Flores, Mario Flores, Managua Flores. |
| **`MERCHANT_OWNER_REAL`** | 8 | `KEEP` | Propietarios reales de comercios (`FRITONI`, `TECNOHOME`, `TEZ`, `TECNOSTORE`, `Burger King demo`, etc.). |
| **`MERCHANT_STAFF_REAL`** | 2 | `KEEP` | Personal operativo vinculado por `/membership` con roles como Cashier/Manager. |
| **`CUSTOMER_REAL`** | 41 | `KEEP` / `DELETE_COURIER_PROFILE_ONLY` | Clientes reales con pedidos, dispositivos o sincronización POS. (Si tenían stub en `/couriers`, se propone borrar solo el stub). |
| **`STUB`** | 8 | `DELETE_COURIER_PROFILE_ONLY` | Stubs huérfanos generados en `/couriers` (e.g. `Chepita`, `Test Both`, sincronizaciones de prueba). |
| **`UNKNOWN`** | 6 | `REVIEW_REQUIRED` | Cuentas en Firebase Auth que no poseen documento en `/users` ni actividad operacional. |
| **TOTAL** | **72** | — | — |

---

## 3. Matriz de Acciones Propuestas (Dry Run Summary)

| Acción Propuesta | Cantidad | Impacto Operativo |
|---|:---:|---|
| **`KEEP`** | **20** | Identidades operacionales reales que **NO se tocan bajo ninguna circunstancia** (Super Admin, Admins, Couriers reales, Comercios, Staff, Clientes con actividad). |
| **`DELETE_COURIER_PROFILE_ONLY`** | **46** | Se propone eliminar **exclusivamente el documento `/couriers/{uid}`** erróneo/residual. **NO se toca `/users` ni Auth**. |
| **`DELETE_COURIER_STUB (STUB)`** | **8** | Stubs huérfanos puros en `/couriers`. Se elimina el doc en `/couriers` sin alterar el resto del sistema. (Total docs de `/couriers` a limpiar: 46 + 8 = **54 docs**). |
| **`REVIEW_REQUIRED` (UNKNOWN)** | **6** | Requiere decisión administrativa previa a cualquier acción sobre Firebase Auth. |
| **`DELETE_USER_PROFILE`** | **0** | **0 eliminaciones de perfiles de usuario** en esta fase. |
| **`DELETE_AUTH`** | **0** | **0 eliminaciones en Firebase Auth**. |
| **`DISABLE_AUTH`** | **0** | **0 deshabilitaciones en Firebase Auth**. |

---

## 4. Auditoría Específica de los 6 UIDs `UNKNOWN` / `REVIEW_REQUIRED`

Estas 6 cuentas existen en **Firebase Auth**, pero **no tienen documento en `/users`** ni en ninguna colección operacional:

1. **`G5HO4FxxW8f4s3JkeEB60wyWfdY2`** — `admin@tecnocomp.com.ni` (Auth creada: 2026-08-01, 0 pedidos, 0 memberships).
2. **`IAjm32V7rXNY1beBc4yKv9zgtIC3`** — `junior@gmail.com` (Auth creada: 2026-07-16, 0 pedidos, 0 memberships).
3. **`O6DSYllEA1fPMkueKWrF4MxkSP93`** — `admin@ecnocomp.com.ni` (Typo evidente de tecnocomp, Auth creada: 2026-07-26).
4. **`PDziWizeJIO83ZUcsrgznmod7vz2`** — `pcenteno@gmail.com` (Auth creada: 2026-07-16, 0 pedidos, 0 memberships).
5. **`QjvtPl3SMfetU7RuYunTzJIM4My1`** — `moises@gmail.com` (Auth creada: 2026-07-17, 0 pedidos, 0 memberships).
6. **`YFpQsfuTS3PLMggjR4wXMcmxvuq1`** — `aldrich@gmail.com` (Auth creada: 2026-07-17, 0 pedidos, 0 memberships).

> [!IMPORTANT]
> **GATE DE SEGURIDAD (Sección 19):**  
> Ninguna de estas 6 cuentas ha sido eliminada ni deshabilitada. De acuerdo con la regla, las cuentas de Firebase Auth permanecen intactas (`REVIEW_REQUIRED`) hasta que usted dictamine explícitamente si son cuentas de prueba descartables o correos de soporte a preservar.

---

## 5. Auditoría de Super Administrador

- **Candidato Único Confirmado:** `XWsjzZe8lsfthRQ5PgbDzlqA2nX2`
  - **Email:** `geraldflores07@gmail.com`
  - **Nombre:** Gerald José Flores Gutiérrez
  - **Estatus:** Operativo, claims canónicos activos, verificado.
  - **Conflicto `MULTIPLE_SUPER_ADMIN_CANDIDATES`:** **NO** (Existe un único Super Admin canónico).
  - **Acción:** **`KEEP` INMUTABLE**.

---

## 6. Auditoría de Couriers Operacionales (Los 5 Certificados)

| UID | Nombre | Placa | Estatus en Snapshot | Dependencias Activas |
|---|---|---|:---:|---|
| `6VkVNQ2yRzS67kEIYfyATkuwBiI3` | Juan Delivery | `M2445U` | Activo | Pedidos, `/couriers`, `/users`, `/courier_balances` |
| `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | Henry Paz | `M 123456` | Activo | Pedidos, Telemetría, Saldo pendiente (C$ 339.61) |
| `C6adh99jAXNqXJpIZaGFJJ5kFh72` | Delivery Pedro Flores | `MT232323` | Activo | Pedidos, Onboarding aprobado, Telemetría |
| `kpENhRwdmocYZsYZonmfWTWvdnC2` | Delivery Mario Flores | `M12456` | Activo | Pedidos, Onboarding aprobado, Telemetría |
| `rCpnpzQVcoPDoUdU4cJE1HpuLGA2` | Delivery Managua Flores | `M12356` | Activo | Pedidos, Saldo pendiente (C$ 992.90), Telemetría |

- **Acción:** **`KEEP` INMUTABLE**. Ningún campo ni documento de estos 5 couriers será tocado.

---

## 7. Grafo de Dependencias e Inmutabilidad Financiera/Histórica

Se auditó el impacto de la eventual eliminación de los 54 documentos no-courier de `/couriers`:
1. **Pedidos (`/orders`):** Ninguna orden histórica tiene a los 54 stubs asignados como courier operacional; cuando aparecen en órdenes es en calidad de `customerId` o `businessId`, relaciones que residen en `/users` y `/businesses` y que **no sufren ninguna alteración**.
2. **Finanzas (`/courier_balances`):** De los 54 balances asociados a no-couriers, **el 100% tiene `cashOutstandingCents = 0`**.
3. **Auditoría (`/audit_events`):** Los 4,026 registros históricos de auditoría permanecen estrictamente inmutables.
4. **Comercios y Sucursales:** Las identidades como `FRITONI` (`dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`) mantienen intacto su perfil de comercio en `/businesses` y su usuario en `/users`.

---

## 8. Artefactos Generados en Producción (Archivos de Auditoría)

1. **[`BSD-PRODUCTION-IDENTITY-CLEANUP-MANIFEST.json`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-PRODUCTION-IDENTITY-CLEANUP-MANIFEST.json)**
   - Contiene la evaluación 1 a 1 de los 72 UIDs, sus clasificaciones, riesgos, dependencias y acciones propuestas.
2. **[`BSD-PRODUCTION-IDENTITY-CLEANUP-AUDIT.json`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-PRODUCTION-IDENTITY-CLEANUP-AUDIT.json)**
   - Snapshot de respaldo de las colecciones críticas antes de cualquier intervención.

---

## 9. Veredicto de Fase 0 & Fase 1

**ESTADO ACTUAL**: 🟠 **CLEANUP PARTIAL — REVIEW REQUIRED (DRY RUN AUDIT COMPLETED)**

- **Mutaciones en Base de Datos**: **0 escrituras, 0 eliminaciones** (100% seguro).
- **Mutaciones en Firebase Auth**: **0 eliminaciones, 0 deshabilitaciones**.
- **Super Admin**: Preservado e inmutable.
- **Couriers Reales**: Preservados e inmutables (5/5).
- **Comercios Reales**: Preservados e inmutables (8/8).
- **Clientes Reales**: Preservados e inmutables (41/41).
- **Gate de Seguridad**: Activado debido a las 6 cuentas `UNKNOWN` en Firebase Auth (`admin@tecnocomp.com.ni`, `junior@gmail.com`, etc.).
