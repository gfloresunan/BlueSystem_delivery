# BLUE SYSTEM DELIVERY ENTERPRISE
## AUDITORÍA FORENSE DE CLOUD FUNCTIONS Y SERVICIOS BACKEND (FASE 7, FASE 8 & FASE 18)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO AUDITORÍA:** READ-ONLY / ZERO MODIFICATION / ZERO DEPLOY  

---

### 1. AUDITORÍA DEL FLUJO DE SOLICITUD Y PROVISIÓN DE COMERCIO (ADR-011)

```text
Merchant Application (PENDING)
       │
       ▼
Admin Web Approval (APPROVAL)
       │
       ▼
Cloud Function: onMerchantApplicationApproved
       │
       ├─► 1. Firebase Auth: admin.auth().createUser() → {uid}
       ├─► 2. Firestore Document: /users/{uid} (eiamRole: MERCHANT_OWNER)
       ├─► 3. Firestore Document: /organizations/{orgId} (New UUID)
       ├─► 4. Firestore Document: /businesses/{businessId} (New UUID, orgId)
       ├─► 5. Firestore Document: /branches/{branchId} (Primary Branch, orgId, businessId)
       ├─► 6. Firestore Document: /restaurant_settings/{businessId} (Operational Config)
       ├─► 7. Firestore Document: /membership/{membershipId} (Role & Permissions)
       ├─► 8. JWT Custom Claims: setCustomUserClaims(uid, { role, businessId, orgId, branchId })
       ├─► 9. Audit Event: /audit_events/{id} (BUSINESS_CREATED)
       └─► 10. Email Service: Enviar contraseña temporal e invitación
```

- **Evidencia Técnica Principal:** [merchantApplications.ts:L150-L398](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L150-L398)

#### Hallazgo de Aislamiento en Provisión
El trigger backend `onMerchantApplicationApproved` genera un `orgId` nuevo mediante `generateUUID()` para **CADA** aprobación de comercio. Esto significa que en el aprovisionamiento automatizado, **cada Business nace en su propia Organization independiente 1:1**, sin agruparse automáticamente en una organización holding preexistente.

---

### 2. INVENTARIO Y AUDITORÍA DE CLOUD FUNCTIONS (FASE 8)

| Cloud Function Name | Trigger / Type | Scope Validated | Organization Support | Business Support | Branch Support | Firestore Writes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `onMerchantApplicationApproved` | Firestore Trigger (`onUpdate`) | Admin Approval | ✅ SÍ (`orgId`) | ✅ SÍ (`businessId`) | ✅ SÍ (`branchId`) | `/users`, `/organizations`, `/businesses`, `/branches`, `/membership` |
| `onMerchantApplicationStatusChanged` | Firestore Trigger (`onUpdate`) | Status Notification | ❌ NO | ✅ SÍ | ❌ NO | `/invitations` |
| `submitMerchantApplication` | Callable (`onCall`) | Public Onboarding | ❌ NO | ✅ SÍ | ❌ NO | `/merchant_applications` |
| `deprovisionTenant` | Callable (`onCall`) | Platform Admin | 🟡 READ ONLY (`orgId`) | ✅ SÍ (`businessId`) | 🟡 PROYECCIÓN | `/businesses`, `/users`, `/audit_events` |
| `adminUpdateUser` | Callable (`onCall`) | Platform Admin | ❌ NO | 🟡 CLAIMS | ❌ NO | `/users`, Auth Custom Claims |
| `syncExistingBusinesses` | Callable (`onCall`) | Platform Admin | ❌ NO | ✅ SÍ | ✅ SÍ | `/branches` |

---

### 3. AUDITORÍA DE DESAPROVISIONAMIENTO Y CICLO DE VIDA (FASE 18)

- **Función Auditada:** `deprovisionTenant` ([callables/admin.ts:L666](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts#L666))
- **Acciones Disponibles:** `DEACTIVATE`, `DELETE`, `HARD_DELETE`.
- **Efecto de Desactivación (`DEACTIVATE`):**
  - Cambia `/businesses/{businessId}.lifecycleStatus` a `"SUSPENDED"`.
  - Cambia `/businesses/{businessId}.status` a `"DISABLED"`.
  - Revoca el acceso operativo del comercio.
- **Impacto en Jerarquía:**
  - ¿Se conserva `/organizations/{orgId}`? **SÍ**. La función NO desactiva ni elimina el documento de la Organización.
  - ¿Se conservan las `/branches/{branchId}`? **SÍ**. Quedan huérfanas en estado activo si no se inactivan explícitamente en proyecciones.
  - ¿Se conservan los pedidos históricos? **SÍ**. Los documentos en `/orders` y `/audit_events` no se eliminan para garantizar la integridad contable.
  - **Riesgo de Entidades Huérfanas:** Si se ejecuta `HARD_DELETE` sobre un `Business`, el documento `/organizations/{orgId}` asociado permanece en Firestore sin comercios vinculados.
