# BLUE SYSTEM DELIVERY ENTERPRISE
## AUDITORÍA ARQUITECTÓNICA DE SEGURIDAD Y FIRESTORE RULES (FASE 9, FASE 10 & FASE 20)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO AUDITORÍA:** READ-ONLY / ZERO MODIFICATION / ZERO DEPLOY  

---

### 1. AUDITORÍA DE FIRESTORE SECURITY RULES (FASE 9)

- **Archivo Auditado:** [firestore.rules](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules) (SHA-256: `4d87331cf57f18f2dad857f6ad4c363a013318cff727c39ee33b50227f54e90a`)

#### Funciones Helper EIAM Identificadas
```javascript
function getRole() { return request.auth.token.get("role", null); }
function getBusinessId() { return request.auth.token.get("businessId", null); }
function getBranchId() { return request.auth.token.get("branchId", null); }
function getOrgId() { return request.auth.token.get("orgId", null); }

function isPlatformAdmin() {
  return isAuthenticated() && (getRole() in ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"]);
}

function ownsBusiness(resourceBusinessId) {
  return isPlatformAdmin() || (getBusinessId() != null && getBusinessId() == resourceBusinessId);
}

function isWritingOwnBusinessId() {
  return isPlatformAdmin() || (request.resource.data.businessId == getBusinessId());
}
```

#### Evaluación por Regla y Colección

| Colección / Match | Regla Implementada | Seguridad de Aislamiento | Dictamen |
| :--- | :--- | :--- | :--- |
| `/organizations/{orgId}` | `isPlatformAdmin() \|\| getOrgId() == orgId \|\| resource.data.ownerUid == currentUid()` | Aislamiento estricto por `orgId` del token | ✅ **PASS** |
| `/businesses/{businessId}` | `isPlatformAdmin() \|\| ownsBusiness(businessId)` | Aislamiento por `businessId`. **NO** valida `orgId` | 🟡 **PARTIAL** |
| `/branches/{branchId}` | `isPlatformAdmin() \|\| ownsBusiness(resource.data.businessId)` | Aislamiento por `businessId`. **NO** valida `branchId` claim | 🟡 **PARTIAL** |
| `/orders/{orderId}` | `isValidBranchForBusiness(...) && (isWritingOwnBusinessId() ...)` | Valida `order.businessId == branch.businessId`. **NO** valida `orgId` | 🟡 **PARTIAL** |
| `/products/{productId}` | `resource.data.businessId == request.resource.data.businessId` | Inmutabilidad de `businessId`. **NO** valida `orgId` ni `branchId` | 🟡 **PARTIAL** |

---

### 2. MATRIZ DE CUSTOM CLAIMS JWT Y ACTORES (FASE 10)

| Actor / Rol EIAM | Claim `role` | Claim `orgId` | Claim `businessId` | Claim `branchId` | Scope Firestore Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin` | Global (`null`) | Global (`null`) | Global (`null`) | Acceso total desprotegido por `isPlatformAdmin()` |
| **Merchant Owner** | `MERCHANT_OWNER` | Asignado | Asignado | Asignado | Acceso a `/businesses/{businessId}` y subcolecciones |
| **Merchant Manager**| `MANAGER` | Asignado | Asignado | Asignado | Acceso operativo a órdenes y menú del negocio |
| **Branch Staff** | `CASHIER`/`COOK` | Asignado | Asignado | Asignado | Acceso limitado por `isBusinessStaff()` |
| **Courier** | `courier` | N/A | N/A | N/A | Acceso a pedidos asignados via `courierId` |
| **Customer** | `client` | N/A | N/A | N/A | Acceso a sus propios pedidos via `customerId` |

---

### 3. VULNERABILIDADES Y EVALUACIÓN ESTÁTICA DE ATAQUES (FASE 20)

| ID Escenario | Descripción del Ataque Estático | Resultado Esperado | Resultado Real Auditado | Dictamen |
| :--- | :--- | :--- | :--- | :--- |
| **TEST ORG-01** | Org A intenta acceder a Org B | Denegado | Bloqueado por `getOrgId() == orgId` | ✅ **PASS** |
| **TEST ORG-02** | Business A intenta acceder a Business B | Denegado | Bloqueado por `ownsBusiness(businessId)` | ✅ **PASS** |
| **TEST ORG-03** | Business A intenta acceder a Branch de Business B | Denegado | Bloqueado por `ownsBusiness(branch.businessId)` | ✅ **PASS** |
| **TEST ORG-04** | Branch A intenta acceder a Branch B (Mismo Business) | Denegado | Permitido (Security Rules no aíslan por `branchId`) | 🔴 **FAIL** |
| **TEST ORG-05** | Staff A intenta leer órdenes de Business B | Denegado | Bloqueado por `getBusinessId() == resourceBusinessId` | ✅ **PASS** |
| **TEST ORG-06** | Staff A intenta crear orden con `businessId` de B | Denegado | Bloqueado por `isWritingOwnBusinessId()` | ✅ **PASS** |
| **TEST ORG-07** | Staff A intenta crear orden con `branchId` de B | Denegado | Bloqueado por `isValidBranchForBusiness` | ✅ **PASS** |
| **TEST ORG-08** | Courier A intenta modificar delivery de Business B | Denegado | Bloqueado salvo asignación explícita | ✅ **PASS** |
| **TEST ORG-09** | Android recibe datos de Business B autenticado en A | Denegado | Bloqueado en servidor por Firestore Rules | ✅ **PASS** |
| **TEST ORG-10** | Frontend intenta manipular `orgId` en `/businesses` | Denegado | Permitido (`orgId` no es inmutable en Rules) | 🔴 **FAIL** |
| **TEST ORG-11** | Frontend intenta manipular `businessId` | Denegado | Bloqueado (`businessId` inmutable en update) | ✅ **PASS** |
| **TEST ORG-12** | Frontend intenta manipular `branchId` | Denegado | Permitido parcialmente si pertenece al negocio | 🟡 **PARTIAL** |
| **TEST ORG-13** | Evento offline de Business A se sincroniza en B | Denegado | Bloqueado por validación JWT en servidor | ✅ **PASS** |
| **TEST ORG-14** | Audit event de Business A declara `businessId` de B | Denegado | Audit events permite add si está autenticado | 🔴 **FAIL** |
| **TEST ORG-15** | Branch A intenta declararse de Business B | Denegado | Permitido para Admin de negocio sin bloqueo inmutable | 🔴 **FAIL** |
