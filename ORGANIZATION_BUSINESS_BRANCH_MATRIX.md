# BLUE SYSTEM DELIVERY ENTERPRISE
## MATRICES DE RELACIÓN HIERÁRQUICA Y COBERTURA END-TO-END (FASE 4, FASE 5 & FASE 19)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO AUDITORÍA:** READ-ONLY / ZERO MODIFICATION / ZERO DEPLOY  

---

### 1. MATRIZ FASE 4: RELACIÓN ORGANIZATION → BUSINESS

| Pregunta Forense | Respuesta Auditada | Evidencia de Código | Estatus |
| :--- | :--- | :--- | :--- |
| **1. ¿Cada Business tiene orgId?** | En provisión automática (ADR-011) sí. En registros legacy o manuales puede faltar y la UI aplica fallback `'org_default_bluesystem'`. | [merchantApplications.ts:L234](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L234)<br>[governanceService.js:L98](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L98) | 🟡 PARTIAL |
| **2. ¿orgId es obligatorio?** | NO a nivel de base de datos. Firestore permite guardar documentos en `/businesses` sin el campo `orgId`. | [firestore.rules:L175](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L175) | 🔴 FAIL |
| **3. ¿Puede existir Business sin orgId?** | SÍ. En Firestore no hay restricción de presencia obligatoria de `orgId` en `create` de `/businesses`. | [firestore.rules:L180](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L180) | 🔴 FAIL |
| **4. ¿El sistema valida que business.orgId exista?** | Solamente en el trigger de aprobación ADR-011. El Admin Web no valida existencia en backend. | [merchantApplications.ts:L171](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L171) | 🟡 PARTIAL |
| **5. ¿Existe aislamiento entre organizaciones?** | NO para comercios. La regla `ownsBusiness(businessId)` evalúa únicamente `businessId` sin verificar `orgId`. | [firestore.rules:L75](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L75) | 🔴 FAIL |
| **6. ¿Un Business puede cambiar de Organization?** | SÍ. Si un usuario con permisos de escritura modifica `orgId` en el documento del comercio. | [firestore.rules:L180](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L180) | 🔴 FAIL |
| **7. ¿Quién puede cambiarlo?** | Platform Admin y el mismo Business Admin si realiza un update directo sin validación de inmutabilidad. | [firestore.rules:L180](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L180) | 🔴 FAIL |
| **8. ¿El cambio está protegido por Firestore Rules?** | NO. `orgId` NO está incluido en la lista de claves inmutables en `/businesses`. | [firestore.rules:L180](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L180) | 🔴 FAIL |
| **9. ¿Cloud Functions lo validan?** | No existen Cloud Functions que intercepten y bloqueen la edición del campo `orgId` en `/businesses`. | [index.ts:L1](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/index.ts#L1) | 🔴 FAIL |
| **10. ¿Android utiliza esa relación?** | NO. Android no conoce `orgId`, no tiene modelos de dominio para `Organization` en operativas y no filtra por `orgId`. | [Models.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt)<br>[FirebaseManager.kt:L653](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L653) | 🔴 FAIL |

---

### 2. MATRIZ FASE 5: RELACIÓN BUSINESS → BRANCH

| Pregunta Forense | Respuesta Auditada | Evidencia de Código | Estatus |
| :--- | :--- | :--- | :--- |
| **1. ¿Cada Branch pertenece a un Business?** | SÍ. Posee el campo `businessId` obligatorio para ser consultada operacionalmente. | [merchantApplications.ts:L263](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L263)<br>[governanceService.js:L404](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L404) | ✅ VERIFIED |
| **2. ¿Cada Branch tiene orgId?** | SÍ en provisión backend y Admin Web. | [merchantApplications.ts:L264](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L264) | ✅ VERIFIED |
| **3. ¿orgId se deriva o se almacena directamente?** | Se almacena de forma redundante/directa en el documento `/branches/{branchId}`. | [merchantApplications.ts:L264](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L264) | ✅ VERIFIED |
| **4. ¿Se verifica coherencia branch.businessId == orgId?** | NO existe validación cruzada en Firestore Rules que garantice que `branch.orgId == business.orgId`. | [firestore.rules:L187](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L187) | 🔴 FAIL |
| **5. ¿Puede un Branch pertenecer a otro Business?** | Firestore Rules en `/orders` valida que `branch.businessId == order.businessId` mediante `isValidBranchForBusiness`. | [firestore.rules:L101](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L101) | ✅ VERIFIED |
| **6. ¿Un usuario puede modificar branch.businessId?** | Si posee permisos de escritura en la sucursal, Rules no previene la modificación de `businessId` en `/branches`. | [firestore.rules:L187](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L187) | 🔴 FAIL |
| **7. ¿Un usuario puede modificar branch.orgId?** | No está bloqueado como inmutable en Firestore Rules. | [firestore.rules:L187](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L187) | 🔴 FAIL |
| **8. ¿Firestore Rules protegen estos campos?** | Parcialmente. Protegen lectura/escritura por `businessId` del token, pero no bloquean la mutabilidad de la jerarquía. | [firestore.rules:L187](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L187) | 🟡 PARTIAL |
| **9. ¿Cloud Functions validan esta relación?** | `triggers/businessProjection.ts` replica datos de sucursal pero no valida mutaciones no autorizadas. | [businessProjection.ts:L1](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/businessProjection.ts#L1) | 🟡 PARTIAL |

---

### 3. MATRIZ FASE 19: COBERTURA END-TO-END DE LA JERARQUÍA

┌───────────────────────┬────────────┬────────────┬────────────┬────────────┐
│ COMPONENTE            │ ORG        │ BUSINESS   │ BRANCH     │ VERIFICADO  │
├───────────────────────┼────────────┼────────────┼────────────┼────────────┤
│ **Firestore Data**    │ ✅ SI      │ ✅ SI      │ ✅ SI      │ ✅ VERIFIED│
│ **Security Rules**    │ 🟡 PARCIAL │ ✅ SI      │ 🟡 PARCIAL │ 🟡 PARTIAL │
│ **Cloud Functions**   │ ✅ SI      │ ✅ SI      │ ✅ SI      │ ✅ VERIFIED│
│ **Admin Web**         │ ✅ SI      │ ✅ SI      │ ✅ SI      │ ✅ VERIFIED│
│ **Merchant Web**      │ 🟡 CLAIM   │ ✅ SI      │ 🟡 PARCIAL │ 🟡 PARTIAL │
│ **Android App**       │ ❌ NO      │ ✅ SI      │ ❌ NO      │ 🔴 FAIL    │
│ **Auth Custom Claims**│ ✅ SI      │ ✅ SI      │ ✅ SI      │ ✅ VERIFIED│
│ **Orders**            │ ❌ NO      │ ✅ SI      │ 🟡 OPCION  │ 🔴 FAIL    │
│ **Products**          │ ❌ NO      │ ✅ SI      │ ❌ NO      │ 🔴 FAIL    │
│ **Users Profile**     │ ✅ SI      │ ✅ SI      │ ✅ SI      │ ✅ VERIFIED│
│ **Staff / Membership**│ ✅ SI      │ ✅ SI      │ ✅ SI      │ ✅ VERIFIED│
│ **Couriers**          │ ❌ NO      │ 🟡 PARCIAL │ ❌ NO      │ 🔴 FAIL    │
│ **Audit Events**      │ ✅ SI      │ ✅ SI      │ ✅ SI      │ ✅ VERIFIED│
│ **Offline Sync (Android)**│ ❌ NO  │ ✅ SI      │ ❌ NO      │ 🔴 FAIL    │
│ **Deprovisioning**    │ ❌ NO      │ ✅ SI      │ 🟡 PARCIAL │ 🟡 PARTIAL │
└───────────────────────┴────────────┴────────────┴────────────┴────────────┘
