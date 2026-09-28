# 01 — EIAM ACCOUNT STATUS FORENSIC REPORT

**Proyecto:** BlueSystem Delivery Android  
**Paquete:** `com.aistudio.delivery.djweq` / `com.example`  
**Dispositivo:** Samsung Galaxy Z Fold 5 (`RFCW71DR2WY`)  
**Error Analizado:** `Fatal Exception: java.lang.RuntimeException: Could not deserialize object. Could not find enum value of com.example.eiam.domain.model.AccountStatus for value "OPERATIONAL" (found in field 'status')`

---

## 1. Ubiación y Definición de `AccountStatus`
- **Archivo:** `app/src/main/java/com/example/eiam/domain/model/AccountStatus.kt`
- **Valores Existentes:**
  - `ACTIVE`: Cuenta / Entidad activa y operativa.
  - `OPERATIONAL`: Sucursal / Entidad operativa.
  - `PENDING`: Pendiente de verificación o invitación.
  - `BLOCKED`: Bloqueada temporalmente por seguridad.
  - `SUSPENDED`: Suspendida manualmente.
  - `TERMINATED`: Dada de baja permanente.
  - `UNKNOWN`: Fallback seguro para estados desconocidos o evolutivos.

---

## 2. Matriz de Usos de `AccountStatus`
| Uso | Archivo | Estado Esperado |
|---|---|---|
| Sucursal Model | `com.example.eiam.domain.model.Branch.kt` | `AccountStatus` (`ACTIVE` / `OPERATIONAL`) |
| Negocio Model | `com.example.eiam.domain.model.Business.kt` | `AccountStatus` (`ACTIVE` / `PENDING`) |
| Empleado Model | `com.example.eiam.domain.model.Employee.kt` | `AccountStatus` (`ACTIVE` / `PENDING`) |
| Membresía Model | `com.example.eiam.domain.model.Membership.kt` | `AccountStatus` (`ACTIVE` / `SUSPENDED` / `TERMINATED`) |
| Identidad Model | `com.example.eiam.domain.model.Identity.kt` | `AccountStatus` |
| UI Comercio Detalle | `com.example.ComercioDetalleViewModel.kt` | Deserialización segura de `Branch` |
| Repositorio Sucursal | `com.example.eiam.data.repository.BranchRepository.kt` | Deserialización de colección `/branches` |
| Enrutador Sucursales | `com.example.domain.engine.SmartBranchRouter.kt` | `isOperational` (`ACTIVE` / `OPERATIONAL`) |
| Elegibilidad Flota | `com.example.domain.engine.FleetEligibilityEngine.kt` | `isOperational` (`ACTIVE` / `OPERATIONAL`) |

---

## 3. Inspección en Firestore (`bluesystem-7c9af`)

Inspección directa realizada sobre la colección `/branches`:

| Document ID | Comercio (`businessId`) | Sucursal (`name`) | Firestore `status` | `isActive` | `isPrimary` |
|---|---|---|---|---|---|
| `br_1786988052589` | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` (FRITONI) | Fritoni Boer | `"OPERATIONAL"` | `true` | `true` |
| `br_1786993038705` | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` (FRITONI) | Fritoni Carrtera Masaya | `"OPERATIONAL"` | `true` | `undefined` |
| `30945c9c-3aee-4e45-b35d-a998b57cf2fa` | `bbb760d5-a8f3-4700-9a96-f58f11f345ac` (El Chanchito) | Sucursal Principal | `undefined` | `true` | `true` |
| `794f7c02-8077-40a8-b260-2fdd27a6f35d` | `e7dc911e-e587-4be9-a741-7d9d9828011f` (Variedades TECNOHOME) | Sucursal Principal Las Delicias | `undefined` | `true` | `true` |

---

## 4. Matriz Real de Estados Encontrados
| Firestore status | Cantidad | Comercios Afectados | Calificación |
|---|---|---|---|
| `"OPERATIONAL"` | 2 | FRITONI | Estado canónico válido de sucursal |
| `undefined` / `null` | 2 | El Chanchito, Variedades TECNOHOME | Estado por defecto implícito |

---

## 5. Autoridad del Estado y Diagnóstico
- **Clasificación:** **Caso A y Caso E**.
- `"OPERATIONAL"` es el estado canónico de `CanonicalBranch` (según `ORGANIZATION_BUSINESS_BRANCH_PHASE1_CANONICAL_ARCHITECTURE.md`).
- El modelo Android `Branch.kt` utiliza `val status: AccountStatus`.
- La des-serialización directa de Firebase SDK mediante reflexión de enums falla fatalmente cuando el enum en código Android carecía de la variante o de una capa de protección contra valores desconocidos.
- **Conclusión:** NO se debe alterar Firestore ni realizar migraciones de datos. Se reconcilia el contrato Android para soportar `OPERATIONAL`, `null`, `undefined` y valores desconocidos mediante deserialización resiliente.
