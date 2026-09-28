# MERCHANT_WEB_AUTH_EIAM_CERTIFICATION.md
## Módulo de Autenticación EIAM y Firebase Auth — Certificación de Producción

**Estado:** 🟢 CERTIFIED  
**Proyecto:** BlueSystem Delivery Enterprise v2.1/v2.2  
**Fecha:** 9 de Agosto de 2026  

---

## 1. Detalles Técnicos de la Implementación

| Aspecto | Detalles de Implementación | Estado |
|---|---|---|
| **Firebase Auth Init** | Se inicializa y exporta `auth` en `merchant-web/src/shared/services/firebase.ts` utilizando la función `getAuth(app)`. | 🟢 PASS |
| **Auth Provider** | El contexto `AuthProvider` en `AuthContext.tsx` escucha activamente `onAuthStateChanged` para determinar la sesión del usuario. | 🟢 PASS |
| **Claims Resolution** | Se ejecuta `getIdTokenResult(currentUser, true)` al loguearse para forzar y recuperar los claims JWT actualizados (`role`, `businessId`, `orgId`, `branchId`). | 🟢 PASS |
| **Membership Validation** | Se busca el registro de membresía en Firestore (`/membership`) por el UID del usuario. Se exige que `status == 'ACTIVE'` y que `businessId` coincida con el claim. | 🟢 PASS |
| **Fail-Closed Engine** | Si no existen claims, la membresía está inactiva o hay discrepancias de tenant, la aplicación bloquea el acceso y muestra la pantalla "Error de Autorización". | 🟢 PASS |
| **Visual Loader** | Mientras se valida la identidad, se presenta una pantalla de carga oscura premium con animación de carga (`animate-spin`). | 🟢 PASS |

---

## 2. Archivos e Interfaces Modificadas

* **[firebase.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/services/firebase.ts):** Inicialización y exportación de la instancia `auth`.
* **[AuthContext.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/context/AuthContext.tsx):** Creación del contexto global, listener `onSnapshot` sobre la colección `businesses` y validaciones EIAM.
* **[App.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/app/App.tsx):** Integración de `AuthProvider` e interceptor de carga, errores y redirección.
* **[LoginModule.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/LoginModule.tsx):** Pantalla de acceso en modo oscuro con soporte a errores comunes de Firebase Auth mapeados a español.

---

## 3. Evidencia del Proceso E2E

1. **Intento de Acceso sin Autenticación:**
   * **Entrada:** Cargar `https://bluesystem-7c9af-merchant.web.app/`
   * **Resultado:** Interceptado por `App.tsx` en estado `unauthenticated` -> Redirección inmediata a la pantalla de Login de BlueSystem.
2. **Acceso con Credenciales Válidas:**
   * **Acción:** Loguearse con correo `gerente@roma.com` y contraseña.
   * **Resultado:** Firebase Auth autentica correctamente, `getIdTokenResult` devuelve claim `businessId: "biz_roma_01"`, se verifica la colección `/membership/` confirmando estado `ACTIVE`. La UI redirige al Dashboard mostrando la información correcta del comercio.
3. **Bloqueo por Cuenta Deshabilitada:**
   * **Acción:** Intento de login de un usuario deshabilitado en Auth o con membresía `INACTIVE`.
   * **Resultado:** La interfaz muestra "Esta cuenta de comerciante ha sido suspendida" o "Error de Autorización" (Fail-Closed).

---

**CERTIFICACIÓN EMITIDA Y FIRMADA DE ACUERDO CON LAS POLÍTICAS EIAM DE BLUESYSTEM.**
