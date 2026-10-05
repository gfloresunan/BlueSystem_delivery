# BSD-ADMIN-MOBILE-ENTERPRISE-CERTIFICATION

## Protocolo de Implementación Quirúrgica: BSD-ADMIN-MOBILE-ENTERPRISE-CONSOLIDATION-001
**Plataforma:** Android Native — Kotlin + Jetpack Compose + Material 3  
**Backend:** Firebase Firestore (Canonical Core) / Cloud Functions / EIAM v2.2 / FCM  
**Principio:** ONE CORE / ONE CODEBASE / ZERO FORKS  
**Fecha de Certificación:** 28 de Septiembre de 2026  
**Estatus Global:** 🟢 **CERTIFIED (10/10 Módulos Operacionales)**

---

## 1. RESUMEN EJECUTIVO DE ARQUITECTURA

La implementación de la consola móvil administrativa (**Admin Mobile Enterprise**) se ha consolidado exitosamente como un cliente oficial y simétrico del Core Canónico de BlueSystem. 

- **Cero Duplicación de Lógica:** No se crearon colecciones paralelas, ledgers móviles locales ni estados bifurcados.
- **Home Canónico:** `AdminDashboardScreen` opera como la consola central de mando (Live Operations) con 5 dominios de KPIs reactivos en tiempo real.
- **Enterprise Navigation Drawer:** Menú lateral de 9 submodulos operativos categorizados sin redundancias.
- **Seguridad y EIAM:** Integración con `EiamRole`, `TenantContext`, `RoleEngine`, y protección por `AdminSurfaceGuard`.
- **Inmutabilidad y Auditoría:** Toda mutación administrativa genera un evento atómico en `/audit_events` preservando los ADRs congelados (ADR-003, ADR-013, ADR-015, ADR-016, ADR-018, ADR-019, ADR-026).

---

## 2. MATRIZ DE CERTIFICACIÓN POR MÓDULO

| # | Módulo | Componente Android | Backend / Fuente Canónica | Realtime / Snapshot | Security / Guard | Audit Trail | Web Parity | Estatus |
|---|---|---|---|---|---|---|---|---|
| **0** | **Dashboard Live Operations (Home)** | `AdminDashboardScreen.kt` | `/orders`, `/deliveryTrips`, `/ubicaciones_repartidores` | `onSnapshot` / Flow | `AdminSurfaceGuard` | Lectura autorizada | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **1** | **Solicitudes de Comercio** | `AdminMerchantRequestsScreen.kt` | `/merchant_applications`, `/businesses` | `onSnapshot` / Flow | EIAM Admin | `/audit_events` | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **2** | **Solicitudes de Motorizado** | `AdminCourierRequestsScreen.kt` | `/courier_applications`, `/couriers` | `onSnapshot` / Flow | EIAM Admin | `/audit_events` | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **3** | **Modificaciones Perfil Motorizados** | `AdminCourierProfileManagementScreen.kt` | `/courier_profile_requests`, `/couriers` | `onSnapshot` / Flow | EIAM Admin | `/audit_events` | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **4** | **Identidades & EIAM** | `AdminIdentityCenterScreen.kt` | `/users`, `EiamRole`, Custom Claims | `onSnapshot` / Flow | RoleGuard / EIAM | `/audit_events` | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **5** | **Centro de Soporte & Ayuda** | `AdminSupportCenterScreen.kt` | `/support_tickets`, `/messages` | `onSnapshot` / Flow | EIAM Admin / Support | `/audit_events` | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **6** | **Caja & Cierres Diarios** | `AdminCourierCashCenterScreen.kt` | `/courier_daily_closures`, `/courier_balances` | `onSnapshot` / Flow | ADR-018 Authoritative | `/audit_events` | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **7** | **Live Courier Monitor** | `AdminLiveCourierMonitorScreen.kt` | `/ubicaciones_repartidores`, `FirebaseManager` | `onSnapshot` / 5s GPS | EIAM Fleet Admin | Telemetría activa | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **8** | **Comercios & Sucursales** | `AdminEnterpriseCommerceScreen.kt` | `/businesses`, Multi-tenant Branches | `onSnapshot` / Flow | EIAM Admin / Commerce | `/audit_events` | 🟢 Paridad total | 🟢 **CERTIFIED** |
| **9** | **Configuración & Comisiones** | `AdminGlobalConfigurationScreen.kt` | `/system_config/global`, Frozen ADRs | `onSnapshot` / Flow | SuperAdmin / Config | `/audit_events` (Snapshot) | 🟢 Paridad total | 🟢 **CERTIFIED** |

---

## 3. ARQUITECTURA DE ENVOLVENTE Y NAVEGACIÓN

### 3.1. Rutas Canónicas (`AdminRoutes.kt`)
- `admin/dashboard` (Home)
- `admin/merchant-requests`
- `admin/courier-requests`
- `admin/courier-profile-management`
- `admin/identity-center`
- `admin/support-center`
- `admin/courier-cash-center`
- `admin/live-courier-monitor`
- `admin/enterprise-commerce`
- `admin/global-configuration`
- `admin/notifications`

### 3.2. Enrutador y Deep Linking (`NotificationRouter.kt`)
- Soporte para esquemas `bluesystem://admin/{modulo}` con fallback seguro si la sesión no posee el rol autorizado (`ADMIN` / `SUPERADMIN`).
- Gestión de 12 eventos de notificación administrativa con despacho `In-App` y navegación directa al recurso específico (`targetId`).

### 3.3. Navigation Shell (`AdminDrawer.kt` & `MainActivity.kt`)
- Drawer corporativo con estado de conexión Firestore, credenciales del administrador activo y estructura en 5 secciones limpias (Solicitudes, Flota, Identidad & Soporte, Finanzas, Comercios y Configuración).

---

## 4. VALIDACIÓN DE COMPILACIÓN

- **Compilación Kotlin/Compose:** `BUILD SUCCESSFUL` (0 errores de compilación con target `compileCoreDebugKotlin`).
- **Empaquetado de Artefacto:** `assembleCoreDebug` verificado.
- **Ubicación del APK:** `app/build/outputs/apk/core/debug/app-core-debug.apk`.
