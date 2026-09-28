# CURRENT_LIMITATIONS.md
# Limitaciones Actuales del Sistema — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Solo documenta. No propone soluciones.
> **Extraído del código fuente mediante auditoría directa del proyecto.**

---

## 1. Sistema de Roles — Limitaciones

| # | Limitación | Evidencia |
|---|---|---|
| R-01 | `DRIVER` no existe en el enum `UserRole` del dominio | `OrderLifecycleEngine.kt:7-14` |
| R-02 | Triple redundancia: `userType`, `role`, `rol` sin sincronización garantizada | `Models.kt:242-244`, `AuthManager.kt:51-53` |
| R-03 | `COOK`, `CASHIER`, `SUPERVISOR`, `OWNER` existen en dominio pero **no son asignables desde la UI** de Admin | `AdminUsersScreen.kt:306` — solo lista `CLIENT, BUSINESS, DRIVER, ADMIN` |
| R-04 | Mezcla de idiomas: `"comercio"`, `"motorizado"` conviven con `"business"`, `"driver"` sin normalización | `SplashViewModel.kt:69-71` |
| R-05 | No existe rol `MANAGER` a pesar de mencionarse en `RESTAURANT_SETTINGS_CENTER.md` | Ausente en todo el código fuente |
| R-06 | No existe `KITCHEN_DISPLAY` como rol diferenciado | Ausente |

---

## 2. Sistema de Usuarios — Limitaciones

| # | Limitación | Evidencia |
|---|---|---|
| U-01 | `AppUser` no tiene `businessId` ni `branchId` | `Models.kt:235-251` |
| U-02 | No existe campo `permissions[]` en el modelo de usuario | `Models.kt:235-251` |
| U-03 | No existe campo `featureFlags` por usuario | `Models.kt:235-251` |
| U-04 | `fechaRegistro` almacenado como `String` de milisegundos en lugar de `Timestamp` Firestore | `AuthManager.kt:56` |
| U-05 | Foto de perfil: campo `photoUrl` vacío en registro | `AuthManager.kt:44-57` — no se carga foto inicial |
| U-06 | Sin campo `lastLoginAt` | Ausente en `AppUser` |
| U-07 | Sin campo `deviceTokens[]` en usuario | Ausente en `AppUser` |

---

## 3. Empleados / Multi-Comercio — Limitaciones

| # | Limitación | Evidencia |
|---|---|---|
| E-01 | No existe colección `employees` | 0 referencias en código |
| E-02 | No existe colección `businesses` separada de `users` | 0 referencias en código |
| E-03 | No existe colección `branches` como entidad independiente | `branchId` existe solo como campo en documentos |
| E-04 | Un usuario no puede pertenecer a múltiples restaurantes | Diseño 1:1 usuario-comercio |
| E-05 | No existe tabla puente `business_users` o `branch_users` | 0 referencias en código |
| E-06 | No existe jerarquía de empleados por sucursal | Ausente |

---

## 4. Sistema de Invitaciones — Limitaciones

| # | Limitación | Evidencia |
|---|---|---|
| I-01 | No existe sistema de invitaciones | 0 referencias en código |
| I-02 | No existe link/token/QR de invitación | 0 referencias en código |
| I-03 | No existe email de bienvenida/invitación | 0 referencias en código |
| I-04 | El único mecanismo de incorporación es: registro libre + solicitud de rol + aprobación admin | `FirebaseManager.kt:669-687` |
| I-05 | No existe flujo de `aceptar invitación` | 0 referencias |

---

## 5. Seguridad — Limitaciones

| # | Limitación | Evidencia |
|---|---|---|
| S-01 | Aislamiento multi-tenant solo a nivel de query cliente | `BusinessDashboardScreen.kt:109`, `MerchantOrdersRepository.kt:35` |
| S-02 | `firestore.rules` no verificable desde el código Android | Archivo externo en Firebase Console |
| S-03 | No existen Firebase Auth Custom Claims | 0 referencias en código |
| S-04 | `businessId` pasa como parámetro de función sin validación cruzada con UID del usuario autenticado | `MerchantDashboardViewModel.kt:128` |
| S-05 | No existe detección de sesiones concurrentes | Ausente |
| S-06 | No existe mecanismo de desactivación/suspensión de cuenta desde la UI | Campo `active` existe pero no hay UI para cambiarlo |
| S-07 | No existe MFA (Multi-Factor Authentication) | `BiometricPreferences` es solo App Lock local, no MFA |
| S-08 | No existe validación de dispositivos autorizados | Campo en `RESTAURANT_SETTINGS_CENTER.md` pero no implementado |

---

## 6. PolicyEngine — Limitaciones

| # | Limitación | Evidencia |
|---|---|---|
| P-01 | Solo 6 acciones cubiertas de potencialmente decenas | `PolicyEngineImpl.kt:5-12` |
| P-02 | El PolicyEngine no se consume en los módulos Sprint 15.x | Ningún ViewModel de Sprint 15 llama a `PolicyEngineImpl` |
| P-03 | No existe mapper automático de `role: String` → `UserRole: enum` | Conversión manual en cada punto de uso |
| P-04 | `OWNER` no puede cambiar estados operativos de cocina | `OrderLifecycleEngine.kt:79-84` — diseño cuestionable |
| P-05 | No existe soporte para `feature flags` en PolicyEngine | Ausente |

---

## 7. Autenticación — Limitaciones

| # | Limitación | Evidencia |
|---|---|---|
| A-01 | Registro de admin bloqueado en app pero no verificado en Firestore Security Rules | `AuthManager.kt:37-42` — protección solo client-side |
| A-02 | Login social por Facebook/Twitter es simulado en modo demo | `AuthViewModel.kt:119-135` — `loginWithSocialProvider` no es real |
| A-03 | No existe Anonymous Auth real | Se usa `SessionManager.isGuest()` como sustituto |
| A-04 | Timeout de resolución de sesión es 3000ms fijo | `SplashViewModel.kt:54,67` — sin configuración |
| A-05 | No existe `refreshToken` manual | Delegado a SDK de Firebase |
