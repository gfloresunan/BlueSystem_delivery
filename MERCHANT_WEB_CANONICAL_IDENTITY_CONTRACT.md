# Merchant Web Canonical Identity & Tenant Contract
## EIAM v2.2 & SSOT-01 Compliance Specification

**Estado:** VIGENTE & CANÓNICO (Aprobado en Phase 0)  
**Proyecto:** BlueSystem Delivery Enterprise v2.1/v2.2  
**Estrategia:** Multi-Tenant Identity & Access Management (EIAM)  

---

## 1. Canonical Identity Model (Contrato de Identidad)

Toda sesión de usuario autenticada dentro de Merchant Web se mapeará a un contexto único de identidad (`MerchantIdentityContext`). Este contexto es inmutable durante la sesión y se deriva de la combinación de:
1. **Autenticación Primaria:** Firebase Auth (JWT ID Token).
2. **Claims Contextuales (EIAM):** Custom Claims inyectados de forma segura en el token por el servidor.
3. **Membresía Activa:** Registro de control `/membership/{membershipId}`.

### Interfaz TypeScript Canónica

```typescript
export interface MerchantIdentityContext {
  uid: string;                 // UID canónico de Firebase Auth
  email: string;               // Correo electrónico del usuario
  orgId: string;               // Identificador del Holding / Tenant principal
  businessId: string;          // Identificador del comercio asignado
  restaurantId: string;        // Identificador del restaurante (idéntico a businessId)
  branchId: string;            // Sucursal activa actual (Sucursal Principal por defecto)
  membershipId: string;        // ID del documento de membresía en Firestore
  role: CanonicalRole;         // Rol canónico EIAM asignado
  permissions: string[];       // Permisos operativos del usuario
  lifecycleStatus: string;     // Estado de activación del comercio (ACTIVE, ONBOARDING)
  wizardCompleted: boolean;    // Bandera de completación de primer inicio
}

export type CanonicalRole =
  | 'MERCHANT_OWNER'           // Propietario con privilegios financieros totales
  | 'OWNER'                    // Propietario/Socio operativo
  | 'MANAGER'                  // Administrador general del comercio
  | 'SUPERVISOR'               // Supervisor de sucursal
  | 'CASHIER'                  // Cajero de Punto de Venta / Ruta
  | 'COOK'                     // Personal de preparación / cocina (KDS)
  | 'GUEST';                   // Rol de invitado sin privilegios
```

---

## 2. Reconciliación de Identificadores (SSOT-01 Compliance)

Para resolver la ambigüedad histórica del proyecto, se establece la siguiente regla matemática de paridad de IDs:

$$\text{Canonical Business ID} \equiv \text{Canonical Restaurant ID} \equiv \text{Document ID in both collections}$$

### Reglas de Mapeo
* **ID Único de Documento:** La clave primaria de documento en Firestore para `/businesses` y `/restaurant_settings` utiliza el **mismo** valor de cadena `businessId`.
* **Ruta de Comercio:** `/businesses/{businessId}`
* **Ruta de Configuración:** `/restaurant_settings/{businessId}` (donde `restaurantId = businessId`).
* **Source of Truth (SSOT) & Replicación (SSOT-01):**

| Campo | Colección SSOT | Read Owner | Write Owner | Replicación / Dual Write |
|---|---|---|---|---|
| `name` / `comercioNombre` | `businesses` | Pública / Cliente / Admin | Merchant / Admin | **Dual Write desde APK / Web**. Al editar en APK, escribe en ambas colecciones. Al editar en Web, actualiza `/businesses` y la APK sincroniza reactivamente. |
| `isOpen` | `businesses` | Pública / Cliente / Admin | Merchant / Admin | **Dual Write desde APK / Web**. Toggle instantáneo de disponibilidad del marketplace. |
| `deliveryFee` | `restaurant_settings` | Merchant / Cliente (vía `businesses`) | Merchant / Admin | **Dual Write / Proyección**. Se origina en `/restaurant_settings` y se proyecta en `/businesses` para que el App Cliente lo consuma sin acceder a settings privados. |
| `deliveryRadiusKm` | `restaurant_settings` | Merchant / Backend Geo | Merchant / Admin | **Dual Write / Proyección**. Se origina en `/restaurant_settings` y se proyecta a `/businesses`. |
| `legalName` | `restaurant_settings` | Merchant / Admin | Merchant | **Operativo Privado**. Únicamente en `/restaurant_settings`. |
| `kitchenPrepTimeMinutes` | `restaurant_settings` | KDS / Merchant | Merchant | **Operativo Privado**. Únicamente en `/restaurant_settings`. |
| `lifecycleStatus` | `businesses` | Platform / EIAM | EIAM / Admin | **Sólo Lectura en Merchant**. Controlado por el motor de provisión y el Panel Admin. |

---

## 3. EIAM Resolution Flow (Estrategia Fail-Closed)

El frontend nunca resolverá de forma autónoma el `businessId` basándose en almacenamiento modificable del lado del cliente (`localStorage`, `sessionStorage`, cookies o query parameters). El flujo de resolución es el siguiente:

```
                  onAuthStateChanged (Firebase Auth)
                                 │
                                 ▼
                     getIdTokenResult() (JWT claims)
                                 │
                                 ▼
                  ¿Tiene claim businessId válido?
                       ├─── NO ───► FAIL CLOSED (Acceso Denegado)
                       │
                       └─── SÍ ───► Buscar /membership/{uid} en Firestore
                                         │
                                         ▼
                             ¿Membresía activa y coherente?
                                 ├─── NO ───► FAIL CLOSED (Acceso Denegado)
                                 │
                                 └─── SÍ ───► Resolver MerchantIdentityContext
```

### Regla Definitiva de Seguridad
Si existe cualquier discrepancia o ausencia de datos en los Custom Claims o en la colección `/membership`, el sistema entrará en estado **FAIL-CLOSED**:
* No se cargará ningún dato de prueba o mock (`fresh_merchant_2026`).
* Se suspenderá el acceso a las vistas operativas de inmediato.
* Se mostrará una pantalla de error de autorización ("Authentication / Authorization Error").

---

## 4. Firestore Collections & Ownership Matrix

| Colección | Owner | Read Authorization | Write Authorization | Scope ID |
|---|---|---|---|---|
| `/users` | EIAM | `currentUid() == uid` OR Platform Admin | `currentUid() == uid` (Campos no EIAM) | `uid` |
| `/membership` | EIAM | `uid` OR `ownsBusiness(businessId)` OR Platform Admin | Platform Admin OR Business Admin | `membershipId` |
| `/businesses` | EIAM / Admin | Público (Read-Only) | `ownsBusiness(businessId)` OR Platform Admin | `businessId` |
| `/restaurant_settings` | Merchant | `ownsBusiness(restaurantId)` OR Business Staff | `ownsBusiness(restaurantId)` OR Platform Admin | `restaurantId` (≡ `businessId`) |
| `/products` | Merchant | Público (Read-Only) | `ownsBusiness(businessId)` OR Platform Admin | `businessId` |
| `/orders` | Platform / Client | Client OR Courier OR `ownsBusiness(businessId)` | Client (Create) OR Merchant (Update status) | `businessId` |
| `/audit_events` | Platform | Platform Admin OR EIAM | Platform Admin | Auto-ID |

---

## 5. Lifecycle Transition State Machine

El ciclo de vida del comercio se almacena en `/businesses/{businessId}.lifecycleStatus` y se gobierna mediante la siguiente máquina de estados:

```
[ PENDING ] ──(Admin Review)──► [ UNDER_REVIEW ]
                                       │
                         ┌─────────────┴─────────────┐
                    (Docs Required)            (Rejection)
                         │                           │
                         ▼                           ▼
                 [ DOCS_REQUESTED ]             [ REJECTED ]
                         │
                    (Resubmission)
                         │
                         ▼
                    [ APPROVED ]
                         │
               (EIAM Auto-Provisioning)
                         │
                         ▼
                   [ ONBOARDING ]
                         │
             (Wizard Form Completed)
                         │
                         ▼
                     [ ACTIVE ]
```

### Acciones del Wizard de Activación:
Al completar los 5 pasos del Onboarding Wizard en Merchant Web, se ejecutan de forma atómica:
1. Escritura de configuraciones operativas reales (horarios, finanzas, menú base) en `/restaurant_settings/{businessId}`.
2. Actualización de `/businesses/{businessId}`:
   * `wizardCompleted = true`
   * `lifecycleStatus = 'ACTIVE'`

---

**ESTADO DEL CONTRATO: VIGENTE, INTEGRADO Y CERTIFICADO PARA EL INICIO DE LA PHASE 1.**
