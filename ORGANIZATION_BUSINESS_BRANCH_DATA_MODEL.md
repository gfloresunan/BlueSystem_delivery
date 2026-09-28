# BLUE SYSTEM DELIVERY ENTERPRISE
## DEFINICIÓN DE ENTIDADES REALES Y MODELO DE DATOS FIRESTORE (FASE 2 & FASE 3)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO AUDITORÍA:** READ-ONLY / ZERO MODIFICATION / ZERO DEPLOY  

---

### 1. DEFINICIÓN DE ENTIDADES REALES (EVIDENCIA DE CÓDIGO)

#### A. ¿Existe realmente Organization?
- **STATUS:** `REAL / IMPLEMENTED`
- **Colección Firestore:** `/organizations/{orgId}`
- **Evidencia Técnica:**
  - [firestore.rules:L109](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L109): `match /organizations/{orgId}`
  - [merchantApplications.ts:L219](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L219): `tx.set(db.collection("organizations").doc(orgId), ...)`
  - [governanceService.js:L13](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L13): `db.collection('organizations').get()`
  - [Organization.kt:L8](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/eiam/domain/model/Organization.kt#L8): `data class Organization(val organizationId: String, ...)`

#### B. ¿Existe realmente Holding?
- **STATUS:** `COSMETIC / UI ONLY`
- **Colección Firestore:** `NINGUNA` (0 ocurrencias de `/holdings`)
- **Evidencia Técnica:**
  - [governanceService.js:L23](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L23): `nombre: 'BlueSystem Holding Principal'` (Inyección estática virtual en memoria si Firestore retorna vacío).

#### C. ¿Organization y Holding son la misma entidad?
- **STATUS:** `EQUIVALENTE CONCEPTO UI`
- **Evidencia Técnica:** "Holding" es el nombre comercial de UI para referirse a la entidad técnica `Organization`. No existe un modelo ni colección separada para Holding.

#### D. ¿Existe Business?
- **STATUS:** `REAL / FULLY IMPLEMENTED`
- **Colección Firestore:** `/businesses/{businessId}`
- **Evidencia Técnica:**
  - [firestore.rules:L175](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L175): `match /businesses/{businessId}`
  - [merchantApplications.ts:L232](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L232): `tx.set(db.collection("businesses").doc(businessId), ...)`
  - [BusinessRepository.kt:L55](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/data/repository/BusinessRepository.kt#L55)

#### E. ¿Existe Merchant?
- **STATUS:** `ALIAS CONCEPTUAL`
- **Evidencia Técnica:** `Merchant` es el alias asignado al flujo de onboarding y al portal Web. Técnicamente mapea 1:1 con la colección `/businesses`.

#### F. ¿Business y Merchant son la misma entidad?
- **STATUS:** `SÍ (MISMA ENTIDAD)`
- **Evidencia Técnica:** En `merchantApplications.ts` se aprueba una `merchant_application` y se crea la entidad `/businesses/{businessId}`.

#### G. ¿Existe Branch?
- **STATUS:** `REAL / IMPLEMENTED`
- **Colección Firestore:** `/branches/{branchId}`
- **Evidencia Técnica:**
  - [firestore.rules:L187](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L187): `match /branches/{branchId}`
  - [merchantApplications.ts:L261](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L261)

#### H. ¿Branch pertenece realmente a Business?
- **STATUS:** `VERIFIED`
- **Campo de Enlace:** `branch.businessId == business.businessId`
- **Evidencia Técnica:**
  - [firestore.rules:L105](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L105): `get(/.../branches/$(branchId)).data.businessId == targetBusinessId`
  - [merchantApplications.ts:L263](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L263)

#### I. ¿Business pertenece realmente a Organization?
- **STATUS:** `PARTIAL / INCONSISTENTE`
- **Campo de Enlace:** `business.orgId == organization.orgId`
- **Hallazgo Crítico:** En Cloud Functions ([merchantApplications.ts:L171](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L171)), se genera un `orgId = generateUUID()` nuevo por cada solicitud, creando una relación 1:1 (Organización desechable por comercio). En Admin Web (`governanceService.js:L98`), si `orgId` es nulo, se le asigna el fallback hardcodeado `'org_default_bluesystem'`.

#### J. ¿Organization puede tener múltiples Business?
- **STATUS:** `SÍ (SOPORTADO EN SCHEMAS, RARO EN PRÁCTICA)`
- **Evidencia Técnica:** `/organizations/{orgId}` posee el campo `businessIds: string[]`.

#### K. ¿Business puede tener múltiples Branch?
- **STATUS:** `VERIFIED`
- **Evidencia Técnica:** `/businesses/{businessId}` posee el campo `branchIds: string[]` y `/branches` posee `where("businessId", "==", businessId)`.

---

### 2. MATRIZ FIRESTORE REAL (COLECCIONES Y VÍNCULOS)

| COLLECTION | DOCUMENT ID | ORG LINK (`orgId`) | BUSINESS LINK (`businessId`) | BRANCH LINK (`branchId`) | OWNER LINK (`ownerUid`/`uid`) | RELATIONSHIP | VERIFIED? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/organizations` | `generateUUID()` | `orgId` (self) | `businessIds: []` | N/A | `ownerUid` | Root Holding / Organization | ✅ VERIFIED |
| `/businesses` | `generateUUID()` | `orgId` | `businessId` (self) | `branchIds: []` | `ownerUid` | Belongs to Org, Has Branches | 🟡 PARTIAL (Org fallback hardcodeado) |
| `/branches` | `generateUUID()` | `orgId` | `businessId` | `branchId` (self) | N/A | Belongs to Business & Org | ✅ VERIFIED |
| `/users` | `{uid}` | `orgId` | `businessId` | `branchId` | `uid` (self) | User scope profile | ✅ VERIFIED |
| `/membership` | `generateUUID()` | `orgId` | `businessId` | `branchId` | `uid` | User-to-Tenant RBAC link | ✅ VERIFIED |
| `/orders` | `generateUUID()` | ❌ MISSING | `businessId` | `branchId` (Opcional) | `customerId` | Transactional order | 🔴 FAIL (Falta `orgId`) |
| `/products` | `generateUUID()` | ❌ MISSING | `businessId` | ❌ MISSING | N/A | Product catalog item | 🔴 FAIL (Falta `orgId` y `branchId`) |
| `/restaurant_settings` | `{businessId}` | ❌ MISSING | `restaurantId` | ❌ MISSING | N/A | Business Private Config | 🟡 PARTIAL |
| `/audit_events` | Auto ID | `orgId` | `businessId` | `branchId` | `uid` | Audit logs | ✅ VERIFIED |
