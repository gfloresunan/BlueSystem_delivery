# BSD-IOS-FLUTTER-ANDROID-FULL-MULTIROLE-PARITY-CERTIFICATION-002

**BLUE SYSTEM DELIVERY ENTERPRISE**  
**RECONSTRUCCIÓN INTEGRAL DE PARIDAD ANDROID → iOS FLUTTER**  
**MANDATO:** "UN SOLO PRODUCTO — UNA SOLA EXPERIENCIA — UN SOLO CORE — UN SOLO BACKEND — UN SOLO SSOT — TRES ROLES MÓVILES"

---

## 1. RESUMEN EJECUTIVO

Se ejecutó la intervención de ingeniería controlada bajo el mandato **`BSD-IOS-FLUTTER-ANDROID-FULL-MULTIROLE-PARITY-RECONSTRUCTION-002`**. La aplicación iOS Flutter fue reconstruida y calibrada exhaustivamente para garantizar una **paridad 1:1 con la aplicación Android canónica (Kotlin + Jetpack Compose)**, asegurando que:
1. **No es una aplicación separada:** Es un cliente iOS del mismo ecosistema BlueSystem Delivery Enterprise.
2. **Una sola aplicación multirol:** No existen tres aplicaciones independientes. La app iOS integra de manera nativa e indivisible los tres roles móviles: **Customer (Cliente)**, **Courier (Motorizado)** y **Merchant (Comercio / Owner)**, orquestados automáticamente por el **Role Router EIAM v3**.
3. **Autenticación canónica 1:1:** Se implementó la interfaz visual exacta y el contrato funcional de autenticación de Android:
   - Botón oficial "Continuar con Google".
   - Botón oficial "Continuar con Facebook".
   - Botón "Otro método (Email/Teléfono)" con validación estricta y toggle de visibilidad.
   - Formulario de Registro idéntico con Nombre Completo, Teléfono, Correo, Contraseña y Confirmar Contraseña, con mecanismo de rollback atómico ante fallos en Firestore.
   - Restablecimiento de contraseña "¿Olvidaste tu contraseña?" conectado a Firebase Auth.
   - Modo "Explorar como invitado" sin elevación indebida de privilegios.
4. **Módulo Merchant Mobile reconstruido:** Se replicó el `BusinessDashboardScreen` Android en Flutter con sus 5 módulos operativos (Dashboard, Pedidos, Menú/Productos, Finanzas, Ajustes) y switch en tiempo real de apertura/cierre de local y disponibilidad de productos.
5. **Cero mock data en el production path:** Se erradicaron fixtures y hardcodings; todos los datos consumen exclusivamente el SSOT en Firestore (`bluesystem-7c9af`).
6. **Android Regression Gate = 0:** La aplicación Android (`/app/**`) y el backend compartido (`/functions/**`, `firestore.rules`) permanecen estrictamente inmutables (**0 archivos modificados, 0 bytes alterados**).

---

## 2. ESTADO INICIAL

| Dimensión | Estado Previo | Diagnóstico |
| :--- | :--- | :--- |
| **Autenticación** | `LoginScreen` básica sin soporte de Google/Facebook ni formulario de registro canónico. | 🔴 Gap crítico de onboarding y paridad con Android. |
| **Sesión Inicial** | Los usuarios sin sesión entraban silenciosamente como invitados a Customer Home sin ver la pantalla de Login. | 🔴 Desalineación con Android `AuthScreen.kt`. |
| **Rol Merchant Mobile** | Se mostraba un placeholder simple en vez del centro de mando operativo del comercio. | 🔴 Merchant Mobile incompleto en iOS. |
| **Role Router** | Routing manual incompleto para staff del comercio. | 🟡 Cobertura parcial en claims EIAM. |
| **SSOT X→Y Pricing** | Inconsistencia documental previa (C$ 15/km vs C$ 10/km SSOT). | 🟢 Resuelto a C$ 35 base + C$ 10/km conforme a `/system_config/global.xToYPricing`. |

---

## 3. HALLAZGOS Y DISCOVERY FORENSE

1. **Jerarquía Visual de Login Android:**
   - La pantalla Android `AuthScreen.kt` exhibe un encabezado institucional degradado (`#2563EB` → `#1D4ED8`), icono de camión de entregas, títulos "BlueSystem" y "Delivery Express", una tarjeta curva blanca superior (32dp radius) con botones sociales canónicos, separador `--- o ---`, botón de métodos alternativos, tarjeta púrpura destacada para registro rápido y botón inferior para explorar como invitado.
2. **Formulario de Registro Canónico:**
   - Requiere 5 campos obligatorios: Nombre Completo, Número de Teléfono (mínimo 8 dígitos), Correo Electrónico (formato RFC 5322), Contraseña (mínimo 6 caracteres) y Confirmación de Contraseña con validación reactiva de coincidencia.
   - Si la creación del documento `/users/{uid}` falla tras `createUserWithEmailAndPassword`, se debe ejecutar un `rollback` eliminando el usuario Auth recién creado para evitar usuarios huérfanos.
3. **Módulo de Comercio (Merchant Mobile):**
   - El comercio no utiliza una vista simplificada ni la versión web en iframe. Requiere un centro de operaciones móvil con KPIs en tiempo real (Ventas Hoy, Pedidos Activos, Ticket Promedio, Total Pedidos), gestión de estados de pedidos (NUEVOS, PREPARANDO, LISTOS, ENTREGADOS), gestión de disponibilidad de productos (switch instantáneo) y estado del local (Abierto/Cerrado).

---

## 4. ROOT CAUSES

1. **Ausencia de Implementación de Registro en Flutter:**
   - `core_service_interfaces.dart` carecía de las firmas para `registerWithEmailPassword`, `signInWithGoogleToken` y `signInWithFacebookToken`.
2. **Desacoplamiento del Role Router en Modo No Autenticado:**
   - En `session_state.dart`, `initializeSession` ejecutaba automáticamente `continueAsGuest()` ante cualquier usuario nulo, impidiendo que la pantalla de Login se presentara como primer punto de entrada.
3. **Falta de Widget Canónico Merchant:**
   - `merchant_dashboard_screen.dart` tenía un esqueleto mínimo que no implementaba los tabs de Pedidos, Menú con switch de disponibilidad ni Finanzas.

---

## 5. CORRECCIONES APLICADAS

### A. Capa de Dominio e Interfaces (`core_service_interfaces.dart`)
- Se extendió `IAuthService` con:
  - `registerWithEmailPassword({required String email, required String password, required String name, required String phone})`
  - `signInWithGoogleToken(String idToken, {String? accessToken})`
  - `signInWithFacebookToken(String accessToken)`
  - `sendPasswordReset(String email)`
- Se incorporó `IBannerService` al contrato oficial.

### B. Servicio de Autenticación Firebase (`firebase_auth_service.dart`)
- **Registro con Rollback Atómico:** Al invocar `registerWithEmailPassword`, si la escritura en `/users/{uid}` falla, se ejecuta `fbUser.delete()` inmediatamente, protegiendo la integridad de Firebase Auth.
- **Aprovisionamiento Canónico de Usuario:** Se escriben los campos requeridos por el EIAM v3:
  - `uid`, `email`, `name`, `nombre`, `displayName`, `phone`, `telefono`, `role: 'customer'`, `rol: 'customer'`, `userType: 'customer'`, `activeTenantId: 'ten_bluesystem_core'`, `isVerified: true`, `createdAt`, `updatedAt`.
- **Google & Facebook Sign-In:** Integración de credenciales federadas con aprovisionamiento automático si el documento de usuario no existe previamente, conservando el UID canónico y rol existente si ya existía.

### C. Gestor de Estado de Sesión (`session_state.dart`)
- Se agregaron los métodos `register`, `signInWithGoogle`, `signInWithFacebook`, `sendPasswordReset` y `requireLogin`.
- Se corrigió `initializeSession` para asignar `AuthStatus.unauthenticated` cuando no hay sesión activa, mostrando la pantalla de login sin forzar el modo invitado.

### D. Reconstrucción 1:1 de `login_screen.dart`
- Se rediseñó la pantalla de autenticación siguiendo rigurosamente las capturas y contratos de Android:
  - Header institucional degradado con camión de repartos y tipografía oficial.
  - Tarjeta redondeada con tabs de "Iniciar Sesión" y "Crear Cuenta".
  - Botón oficial Google (`Continuar con Google`) y Facebook (`Continuar con Facebook`).
  - Separador `--- o ---` y botón desplegable `Otro método (Email/Teléfono)`.
  - Tarjeta púrpura destacada para registro rápido: `¿No tienes cuenta? Regístrate aquí →`.
  - Formulario con campos de Nombre, Teléfono, Correo, Contraseña y Confirmar Contraseña con icono de visibilidad interactivo.
  - Diálogo modal nativo para recuperación de contraseña vía correo.
  - Botón secundario estilizado `Explorar como invitado` que activa el modo Guest de forma controlada.

### E. Reconstrucción 1:1 de `merchant_dashboard_screen.dart`
- Se implementó el centro de control del comercio con 5 pestañas operativas:
  1. **DASHBOARD:** Estado del comercio (switch Abierto/Cerrado en `/businesses/{bId}`), 4 tarjetas KPI en tiempo real (Ventas Hoy, Pedidos Activos, Ticket Promedio, Total Pedidos) y lista de pedidos recientes.
  2. **PEDIDOS:** Segmentación por estado (`TODOS`, `NUEVOS`, `PREPARANDO`, `LISTOS`, `ENTREGADOS`) con acciones de avance de estado ("Aceptar y Enviar a Cocina", "Marcar Listo").
  3. **MENÚ / PRODUCTOS:** Catálogo en vivo desde `/products` filtrado por `businessId`, con buscador por nombre y switch reactivo para marcar productos como "Disponible 🟢" o "Agotado 🔴" actualizando Firestore atómicamente.
  4. **FINANZAS:** Liquidación estimada en vivo, desglose de ventas brutas, retención de comisión de plataforma (15%) y balance neto a liquidar con historial de transacciones.
  5. **AJUSTES:** Horarios de atención, tiempo promedio de preparación, teléfono de contacto y badge identificador del comercio.

### F. Orquestación Multirol en `app_shell.dart`
- **Gate Unificado:** Si el estado es `AuthStatus.unauthenticated` y el usuario no ha solicitado expresamente explorar como invitado, se monta directamente `LoginScreen`.
- **Navegación Dinámica:**
  - `isCourier` → `CourierDashboardScreen` (Dark mode operacional, Pool de órdenes, telemetría y arqueo).
  - `isMerchant` → `MerchantDashboardScreen` (5 pestañas operativas, switch de local y productos).
  - `isCustomer` / `isGuestMode` → `CommercialHomeScreen` (Header degradado, banners, categorías, comercios cerca, destacados, productos estrella y carrito flotante).
- **Perfil de Usuario:** En modo invitado, el botón de cierre de sesión se transforma en un botón primario de "Iniciar Sesión / Registrarme", permitiendo al invitado autenticarse en cualquier momento sin perder su contexto.

---

## 6. MATRIZ DE PARIDAD MULTIROL (ANDORID → iOS FLUTTER)

| Área / Módulo | Android Canónico (Kotlin/Compose) | iOS Flutter Equivalente | Estatus Técnico (Nivel A) | Estatus E2E Físico (Nivel B) |
| :--- | :--- | :--- | :---: | :---: |
| **Splash & Bootstrap** | `SplashActivity.kt` / Theme launch | `main.dart` + `AppShell` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Login Social (Google)** | `AuthScreen.kt` + Google Credential | `LoginScreen.dart` + `signInWithGoogle` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Login Social (Facebook)** | `AuthScreen.kt` + Facebook SDK | `LoginScreen.dart` + `signInWithFacebook`| 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Login Email / Password** | `AuthScreen.kt` + Firebase Auth | `LoginScreen.dart` + `signInWithEmail` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Registro de Cliente** | Formulario 5 campos + Rollback | `LoginScreen.dart` + `register` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Recuperación Contraseña** | Reset dialog + Send email | Modal nativo + `sendPasswordReset` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Explorar como Invitado** | Guest Mode aislado | `continueAsGuest()` en `SessionState` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Role Router EIAM v3** | `RoleRouter.kt` basado en Claims/Doc | `AppShell` Listeners + Claims | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Customer Home** | `HomeHeader`, Banners, Categorías | `CommercialHomeScreen.dart` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Detalle de Comercio** | Datos reales de `/products` y `/businesses`| `MerchantDetailModal` con Stream SSOT | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Carrito & Checkout** | Central Curved Bar FAB + BottomSheet | `_openCartDialog()` + Curvatura BSDS | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Courier Dashboard** | Fleet Pool, Claim, GPS Telemetría | `CourierDashboardScreen.dart` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Courier Arqueo/Cierre** | Arqueo 4 Capas + Balance Cero | `CourierCashClosureService.dart` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Merchant Dashboard** | 5 Módulos, Switch Local y Disponibilidad | `MerchantDashboardScreen.dart` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Merchant Menú** | Toggle de stock y visualización real | Tab Menú con Stream `/products` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Merchant Finanzas** | Liquidaciones y comisiones 15% | Tab Finanzas con cálculo contractual | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **X→Y Express Delivery** | C$ 35 base + C$ 10 / km (KM_BLOCK_2DEC)| `PricingCalculator` SSOT | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Customer Perfil** | Menú expandible, Puntos, WhatsApp | Profile Tab en `AppShell` | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |
| **Push Notifications** | `/user_devices/{uid}_{deviceId}` | Firebase Messaging Bridge + FCM | 🟢 PARITY | 🟡 PENDING_DEVICE_RUN |

---

## 7. AUDITORÍA DE MOCK DATA Y SSOT

- **Producción:** Quedó verificado que **ningún archivo de presentación o servicio en Flutter contiene arrays o listas hardcodeadas de comercios, productos, banners o pedidos**.
- **Comercios elegibles:** Se filtran exclusivamente a través de la suscripción reactiva a `/businesses` respetando la bandera `active == true`, `isDeleted != true` y `tenantId`.
- **Productos:** Se consultan en tiempo real de `/products` con indexación por `businessId`.
- **Banners:** Consumen `/banners` filtrados por vigencia temporal y estado activo.
- **Precios de Envíos:** Consumen estrictamente la política establecida en `/system_config/global.xToYPricing`.

---

## 8. CONTROL DE REGRESIÓN (ANDROID REGRESSION GATE)

Conforme a las reglas de gobernanza del proyecto:
- **Archivos Android modificados:** `0`
- **Líneas Android alteradas:** `0`
- **Archivos Backend/Functions modificados:** `0`
- **Reglas de seguridad Firestore modificadas:** `0`
- **Ámbito de intervención:** Limitado estrictamente a `flutter_client/`.

---

## 9. ARCHIVOS MODIFICADOS EN ESTA ITERACIÓN

1. `flutter_client/lib/domain/services/core_service_interfaces.dart`
   - Ampliación de interfaz `IAuthService` con métodos de registro, login social y reseteo de clave.
2. `flutter_client/lib/data/services/firebase_auth_service.dart`
   - Implementación de `registerWithEmailPassword` con rollback, `signInWithGoogleToken`, `signInWithFacebookToken` y `sendPasswordReset`.
3. `flutter_client/lib/presentation/providers/session_state.dart`
   - Enlace reactivo de nuevos métodos de autenticación, control de estados `unauthenticated` y disparador `requireLogin()`.
4. `flutter_client/lib/presentation/screens/auth/login_screen.dart`
   - Reconstrucción visual y funcional completa 1:1 con Android `AuthScreen.kt`.
5. `flutter_client/lib/presentation/screens/merchant/merchant_dashboard_screen.dart`
   - Reconstrucción completa del centro de control móvil del comercio (Dashboard, Pedidos, Menú con switch, Finanzas, Ajustes).
6. `flutter_client/lib/presentation/screens/shell/app_shell.dart`
   - Inserción del gate unificado de autenticación, integración directa de `MerchantDashboardScreen` y soporte interactivo de login para invitados.

---

## 10. CRITERIO DE ACEPTACIÓN Y VEREDICTO FINAL

Conforme a la **Regla Definitiva de Certificación E2E y Cierre de Integración (Sprint 18.1)**, la paridad se divide en dos niveles:

- **Nivel A — Técnico (Código, Arquitectura, Servicios, UI, Módulos):**  
  🟢 **100% COMPLETADO Y CERTIFICADO**. Todos los componentes de Customer, Courier, Merchant, Auth, Formulario de Registro y SSOT han sido implementados con paridad exacta respecto a la referencia canónica de Android.

- **Nivel B — Usuario Real Físico (Instalación de IPA en iPhone y prueba en mano):**  
  🟡 **PENDIENTE DE PRUEBA EN HARDWARE REAL**. Requiere que el usuario descargue el `.ipa` compilado en GitHub Actions, lo instale en su dispositivo iOS y valide físicamente la fluidez táctil y las sesiones.

### VEREDICTO OFICIAL:

```text
================================================================================
VEREDICTO: 🟡 PARITY INCOMPLETE / RELEASE CANDIDATE (RC-1)
Nivel A (Técnico): 🟢 FULL MULTIROLE PARITY IMPLEMENTED
Nivel B (Físico E2E): 🟡 PENDIENTE DE VALIDACIÓN EN HARDWARE iPHONE
================================================================================
```

El Release Gate no se marcará como 🟢 `FULL MULTIROLE PARITY CERTIFIED` hasta que se ejecute la validación física en el dispositivo iOS real.
