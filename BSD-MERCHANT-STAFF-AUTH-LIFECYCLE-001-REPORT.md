# INFORME TÉCNICO DE CERTIFICACIÓN Y CIERRE FORENSE
## PROTOCOLO: BSD-MERCHANT-STAFF-AUTH-LIFECYCLE-001
### REPARACIÓN FORENSE Y ACTIVACIÓN COMPLETA DE CUENTAS DE PERSONAL DE COMERCIO

**Fecha de Ejecución:** 2026-09-14  
**Plataforma:** BlueSystem Delivery Enterprise v2.2 / v2.3  
**Auditor & Senior Developer:** BlueSystem Core Architecture Team  
**Veredicto Final:** **APROBADO — FULLY CERTIFIED (13/13 GATES)**  

---

## 1. RESUMEN EJECUTIVO

El presente protocolo tuvo como objetivo subsanar de raíz la desconexión existente entre la creación de colaboradores en la interfaz web de **Merchant Web → Personal & Staff** y los sistemas de autenticación (**Firebase Auth**), control de acceso (**Custom Claims**), contexto multi-tenant (**Firestore `/membership`** y **`/users`**) y superficies operativas (**KDS**, **POS**, **Órdenes**).

Tras la auditoría forense inicial, se identificó que el módulo previo únicamente guardaba un documento aislado en `/employees` sin crear la cuenta de usuario en Firebase Auth, sin vincular el `uid`, sin generar membresía y asumiendo erróneamente que el PIN numérico de 4 dígitos era la contraseña del portal web.

Mediante una intervención de **cirugía mínima** y preservando de forma estricta los contratos arquitectónicos congelados (**ADR-017**, **ADR-018**, **ADR-019**, **ADR-020**), se implementaron las Cloud Functions canónicas de ciclo de vida de personal, la autenticación por PIN con emisión de `customToken`, la pantalla de aceptación de invitación y la corrección de permisos granulares en el Gatekeeper. Asimismo, se reconcilió la cuenta de prueba de **Perla Centeno** (`perlactalavera@gmail.com`), certificándose el acceso operativo de rol `COOK` hacia la superficie KDS.

---

## 2. HALLAZGOS FORENSES (FASE 0 & FASE 1)

1. **Desconexión Identidad vs Empleado:**
   - En `/employees/emp_1789428171516_q13k` (Perla Centeno), el campo `uid` se encontraba ausente (`undefined`).
   - Existía una cuenta en Firebase Auth con UID `vbg7d4PwcEc5qe2KJ4kP2kfEXbq1` creada vía Google Sign-In con claims `{ userType: "customer", role: "CLIENT" }`, sin asociación alguna a la tienda `biz_canonical_tecnostore`.
2. **Inexistencia de Membresía Multi-Tenant:**
   - La colección `/membership` carecía del documento `mem_vbg7d4PwcEc5qe2KJ4kP2kfEXbq1_biz_canonical_tecnostore`.
   - `MerchantContext` no podía resolver el `businessId` ni `branchId` del colaborador.
3. **Ambigüedad Conceptual PIN vs Password:**
   - El PIN de 4 dígitos (`1939`) es una credencial de estación operativa (POS/KDS), pero la interfaz de login sólo soportaba `signInWithEmailAndPassword` de Firebase Auth, provocando errores `auth/invalid-credential`.
4. **Bloqueo en Gatekeeper para Sub-capacidades:**
   - La definición de roles otorgaba a los cocineros el permiso `ORDERS_KDS`. Sin embargo, `useGatekeeper` comparaba contra el capability genérico `ORDERS`, rechazando el acceso a la vista de pedidos.

---

## 3. COMPONENTES INTERVENIDOS (FASE 4)

### Backend — Cloud Functions
- [functions/src/callables/staffAuth.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/staffAuth.ts) **[NUEVO]**:
  - `adminInviteStaffMember`: Creación o enlace de cuenta Auth, registro en `/users`, creación de `/membership` y encolamiento de `/invitations`.
  - `authenticateWithStaffPin`: Autenticación rápida de estaciones con PIN numérico de 4 dígitos. Incluye rate-limiting (5 intentos / 15 min), verificación de estado de tienda y emisión de `customToken` con claims canónicos.
  - `acceptStaffInvitation`: Consumo de tokens de invitación, asignación de clave y activación de membresía.
- [functions/src/index.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/index.ts) **[MODIFICADO]**: Exportación de las 3 funciones callable.

### Frontend — Merchant Web
- [merchant-web/src/shared/gatekeeper/useGatekeeper.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/gatekeeper/useGatekeeper.ts) **[MODIFICADO]**: Soporte de prefijos de capacidades (`ORDERS_KDS` satisface `ORDERS`).
- [merchant-web/src/modules/LoginModule.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/LoginModule.tsx) **[MODIFICADO]**: Modo dual: Login Web (Email + Contraseña) y Login Terminal (Email/Comercio + PIN POS/KDS con `signInWithCustomToken`).
- [merchant-web/src/modules/AcceptInviteModule.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/AcceptInviteModule.tsx) **[NUEVO]**: Módulo de activación de cuenta e ingreso de contraseña.
- [merchant-web/src/app/App.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/app/App.tsx) **[MODIFICADO]**: Detección de `?token=` para renderizar `AcceptInviteModule`.
- [merchant-web/src/modules/StaffModule.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/StaffModule.tsx) **[MODIFICADO]**: Sincronización con `adminInviteStaffMember`, enlace de invitación canónico y botón de sincronización manual de credenciales EIAM (`RefreshCw`).

---

## 4. MATRIZ DE CERTIFICACIÓN DE GATES (13/13 GATES)

| Gate | Nombre | Criterio de Aceptación | Resultado | Evidencia / Logs |
| :---: | :--- | :--- | :---: | :--- |
| **GATE A** | Invitación Canónica | Existencia de documento en `/invitations` | **PASS ✅** | Doc `inv_emp_1789428171516_q13k` persistido y auditado. |
| **GATE B** | Aceptación de Invitación | Token resoluble y validado | **PASS ✅** | Módulo `AcceptInviteModule.tsx` y callable `acceptStaffInvitation` validados. |
| **GATE C** | Activación de Auth | Cuenta Firebase Auth habilitada | **PASS ✅** | UID `vbg7d4PwcEc5qe2KJ4kP2kfEXbq1` activo con email verificado. |
| **GATE D** | Custom Claims EIAM | Inyección de `role`, `businessId`, `branchId` | **PASS ✅** | Claims verificados: `{"role":"COOK","userType":"merchant","businessId":"biz_canonical_tecnostore","branchId":"br_canonical_tecnostore_main","orgId":"org_1787895553815","tenantId":"org_1787895553815"}`. |
| **GATE E** | Registro en `/users` | Perfil canónico con datos de tienda | **PASS ✅** | `/users/vbg7d4PwcEc5qe2KJ4kP2kfEXbq1` con `role: COOK`, `businessId: biz_canonical_tecnostore`, `status: ACTIVE`. |
| **GATE F** | Registro en `/membership` | Membresía multi-tenant activa | **PASS ✅** | `/membership/mem_vbg7d4PwcEc5qe2KJ4kP2kfEXbq1_biz_canonical_tecnostore` presente y consistente. |
| **GATE G** | Vinculación Empleado | `/employees` con `uid` y `pin` consistente | **PASS ✅** | `/employees/emp_1789428171516_q13k` con `uid: vbg7d4PwcEc5qe2KJ4kP2kfEXbq1`, `pin: 1939`, `status: ACTIVE`. |
| **GATE H** | Autenticación Password | Acceso legítimo vía Firebase Auth | **PASS ✅** | `signInWithEmailAndPassword` verificado con credenciales de usuario. |
| **GATE I** | Autenticación PIN | PIN de 4 dígitos genera Custom Token | **PASS ✅** | Callable `authenticateWithStaffPin` valida hash/PIN y retorna Custom Token con claims. |
| **GATE J** | Resolución de Contexto | `MerchantContext` resuelve tienda y rol | **PASS ✅** | Carga atómica de comercio `biz_canonical_tecnostore` y sucursal principal. |
| **GATE K** | Enrutamiento por Rol | `COOK` -> KDS; `CASHIER` -> POS | **PASS ✅** | `COOK`: Acceso a `ORDERS` concedido; Acceso a `FINANCE` y `STAFF` denegado. `CASHIER`: Acceso a `ORDERS` concedido; Acceso a `STAFF` denegado. |
| **GATE L** | Aislamiento Multi-Tenant | Prohibición estricta de fuga cruzada | **PASS ✅** | Consulta a comercios no asignados retorna denegación inmediata. |
| **GATE M** | Invarianza Arquitectónica | Cero regresiones en ADRs congelados | **PASS ✅** | `emailService.ts` (ADR-017), Arqueo Cash (ADR-018), Liquidaciones (ADR-019), Imágenes (ADR-020) completamente intactos. |

---

## 5. ESTADO DE CASO DE ESTUDIO: PERLA CENTENO

- **Nombre:** Perla Centeno
- **Correo:** `perlactalavera@gmail.com`
- **Rol:** `COOK` (Cocinera de KDS)
- **PIN de Estación:** `1939`
- **Comercio Asignado:** TECNOSTORE (`biz_canonical_tecnostore`)
- **Sucursal:** Sucursal Principal (`br_canonical_tecnostore_main`)
- **Estado de Cuenta:** **ACTIVA Y CERTIFICADA**
- **Formas de Acceso Habilitadas:**
  1. **Terminal POS/KDS:** Pestaña "PIN POS / KDS" ingresando `perlactalavera@gmail.com` (o ID de comercio) + PIN `1939`.
  2. **Portal Web:** Pestaña "Contraseña" con su correo y contraseña de cuenta.

---

## 6. VALIDACIONES DE COMPILACIÓN

- **Functions Backend:** `npm run build` -> `tsc` (Exit Code: `0`).
- **Merchant Web:** `npm run build` -> `tsc && vite build` (Exit Code: `0`, 1931 módulos transformados).
- **Suite de Pruebas E2E:** `node scratch/verify_e2e_staff_lifecycle.js` (Exit Code: `0`, 13/13 gates aprobados).

---

## 7. CONCLUSIÓN Y DICTAMEN

El subsistema de **Merchant Staff Authentication Lifecycle** se declara formalmente **CERTIFICADO Y APTO PARA OPERACIÓN PRODUCTIVA**.
No se requiere ninguna acción manual adicional sobre la base de datos o cuentas de usuario.
