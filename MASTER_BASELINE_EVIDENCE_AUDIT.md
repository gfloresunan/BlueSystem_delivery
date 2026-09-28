# BLUE SYSTEM DELIVERY ENTERPRISE
## MASTER BASELINE EVIDENCE AUDIT
### Phase 2F.0 — Forensic Convergence Verification

**Status:** 🟢 **BASELINE VERIFIED WITH FINDINGS**  
**Mode:** 🔒 **READ-ONLY / ZERO MUTATION / PROTECTED BASELINE**  
**Firebase Project:** `bluesystem-7c9af`  
**Execution Timestamp:** 2026-08-27T09:05:00-06:00  

---

## 1. Executive Summary

La presente auditoría forense de evidencia (**Phase 2F.0**) ha inspeccionado exhaustivamente el repositorio `BlueSystem_delivery` para contrastar cada una de las afirmaciones documentales y certificaciones previas contra el código fuente, configuración y contratos realmente presentes en el entorno.

### Principales Conclusiones Forenses:
1. **Single Source of Truth (SSOT) Verificado:** Existe una única base de datos Firestore (`bluesystem-7c9af`), un único modelo de seguridad (`firestore.rules` con 1,029 líneas de reglas declarativas basadas en EIAM v2.1/v3), y cero colecciones segregadas por sistema operativo (e.g. no existen `ordersAndroid`, `ordersIOS`).
2. **Phase 2E Domain & White-Label Architecture:** Totalmente implementada y verificada en código en Backend (`functions/src/domain/whitelabel/tenantDomainResolver.ts`, `tenantFeatureEngine.ts`, `domainManagement.ts`), Merchant Web (`ClientDomainResolver.ts`, `TenantDomainGate.tsx`) y Panel Admin (`domains.js`).
3. **Control Tower v2.2 (ADR-013):** Totalmente verificada e inmutable bajo Leaflet + CartoDB Voyager (`0 Maps Cost`), suscripciones dinámicas por courier activo (`activeGpsListenersRef`), diffing GPS y resolución canónica de identidad.
4. **X→Y Location Experience (ADR-015):** Verificada en `SolicitarEnvioScreen.kt` implementando el motor nativo de geocodificación (`android.location.Geocoder`), Safe Area insets, pin central con debounce y tarifa paramétrica ($35 base + $15/km), sin dependencias de Google Places SDK.
5. **Fleet Core & Asignación Atómica (ADR-016):** Verificada en `FirebaseManager.kt` mediante transacciones atómicas `claimOrderAtomically` y `claimTripAtomically`.
6. **Customer App Modularization & Theme:** La modularización de `CustomerHomeScreen.kt` se completó en la Fase 5 (`home/`, `search/`, `favorites/`, `cart/`, `profile/`, `loyalty/`) y la estandarización del tema a tokens semánticos `MaterialTheme.colorScheme` se completó en la Fase 4, resolviendo el hallazgo histórico FIND-01.

---

## 2. Repository State & Baseline Snapshot

| Atributo | Valor Auditado | Estatus |
| :--- | :--- | :---: |
| **Workspace Root** | `c:\Users\geral\OneDrive\Escritorio\TECNOCOMP 2026\Sistemas\BlueSystem_delivery` | 🟢 VERIFIED |
| **Firebase Project ID** | `bluesystem-7c9af` (declarado en `.firebaserc` y `firebase.json`) | 🟢 VERIFIED |
| **Hosting Targets** | `admin` (`panel-admin/public`), `merchant` (`merchant-web/dist`), `onboarding` (`merchant-onboarding-portal/dist`) | 🟢 VERIFIED |
| **Node.js Functions Engine** | Node 18 / TypeScript 5.3.3 (`functions/package.json`) | 🟢 VERIFIED |
| **Merchant Web Engine** | React 18.2.0 + Vite 5.1.0 + TailwindCSS 3.4.1 (`merchant-web/package.json`) | 🟢 VERIFIED |
| **Android Toolchain** | Kotlin 1.9.22 + Jetpack Compose (BOM 2024.02.00) + Gradle 8.2 (`build.gradle.kts`) | 🟢 VERIFIED |
| **Firestore Security Rules** | `firestore.rules` (1,029 líneas, 55,426 bytes) | 🟢 VERIFIED |
| **Firebase Storage Rules** | `storage.rules` (139 líneas, 6,524 bytes) | 🟢 VERIFIED |

---

## 3. ADR Baseline Verification Matrix

| ADR ID | Título | Contrato Esperado | Evidencia en Código | Archivos Involucrados | Estatus |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **ADR-003** | Performance, Cost & Scalability | 0 Consultas N+1, Agregados CQRS, Listeners efímeros, presupuesto lecturas | `dashboardAggregator.ts`, `dashboard_summary`, listeners individuales en Control Tower | `functions/src/schedulers/dashboardAggregator.ts`, `merchant-web/.../DeliveryControlTowerModule.tsx` | 🟢 VERIFIED |
| **ADR-004** | Architecture Freeze EIAM v2.2 | Freeze de modelos organizacionales, SDK, Claims, colecciones `organizations`, `businesses`, `branches` | Claims jerárquicos en `firestore.rules`, helpers `isTenantMember`, `ownsBusiness` | `firestore.rules`, `functions/src/triggers/auth.ts` | 🟢 VERIFIED |
| **ADR-013** | Freeze Merchant Control Tower v2.2 | Leaflet + CartoDB Voyager, 0 Mock Coordinates, Diffing GPS por courier, `assignedCourierId` prioritario | Instanciación Leaflet, capa CartoDB Voyager, `activeGpsListenersRef`, `resolveCourierId` | `merchant-web/src/modules/DeliveryControlTowerModule.tsx` | 🟢 VERIFIED |
| **ADR-014** | No Auto-Rollout Policy | Prohibición de mutación automática de flags, claims, reglas o despliegues productivos | Gobernanza de despliegue, scripts protegidos y gating de llamadas | `functions/src/callables/domainManagement.ts`, `.agents/AGENTS.md` | 🟢 VERIFIED |
| **ADR-015** | X→Y Location Architecture Freeze | Native Geocoder, Map Picker, Safe Drawing insets, Pin central, $35 base + $15/km, 0 Places SDK | `android.location.Geocoder`, `WindowInsets.safeDrawing`, `GeoUtils.calculateDistance`, fórmula de tarifa | `app/src/main/java/com/example/SolicitarEnvioScreen.kt`, `Models.kt` | 🟢 VERIFIED |
| **ADR-016** | Courier Core & Control Tower Freeze | Asignación atómica `runTransaction`, separación `/orders` vs `/deliveryTrips`, aislamiento de flotas | `claimOrderAtomically`, `claimTripAtomically`, listeners dirigidos | `app/src/main/java/com/example/FirebaseManager.kt`, `Models.kt` | 🟢 VERIFIED |

---

## 4. Phase 2E: Multi-Tenant Domain & White-Label Architecture

### A. Componentes Verificados en Backend (`functions/src`)
1. **`DomainNormalizer` & `TenantDomainResolver`:** [tenantDomainResolver.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/domain/whitelabel/tenantDomainResolver.ts)
   - Normalización determinística: eliminación de protocolo, puertos, trailing slashes, query strings, casing en minúsculas.
   - Lista blanca de subdominios reservados: `RESERVED_SUBDOMAINS` (`admin`, `api`, `app`, `login`, `governance`, `control-tower`, etc.).
   - Detección de plataforma raíz: `bluesystem.com`, `localhost`, `.web.app`, `.firebaseapp.com`.
   - Resolución de estados: `FOUND`, `UNKNOWN_DOMAIN`, `INACTIVE_DOMAIN`, `SUSPENDED_TENANT`, `CONFIGURATION_ERROR`.
2. **`TenantFeatureEngine`:** [tenantFeatureEngine.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/domain/whitelabel/tenantFeatureEngine.ts)
   - `STARTER`: 0 dominios propios, 0 subdominios propios, branding estándar BlueSystem.
   - `PROFESSIONAL`: 0 dominios propios, 1 subdominio (`tenant.bluesystem.com`), custom branding permitido.
   - `ENTERPRISE` / `CUSTOM`: Hasta 5 dominios propios, subdominios ilimitados, white-label integral, soporte de correo personalizado.
3. **HTTPS Callables Seguras:** [domainManagement.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/domainManagement.ts)
   - `registerTenantDomain`: Validación de plan, unicidad de hostname, generación de token TXT y registro CNAME.
   - `verifyTenantDomainDns`: Simulación/Resolución de challenge TXT y CNAME, transición de estado a `VERIFIED` / `ACTIVE`.
   - `setPrimaryTenantDomain`: Transacción atómica para alternar `isPrimary` entre dominios del tenant.
   - `deleteTenantDomain`: Eliminación lógica/física con restricción sobre dominios primarios.

### B. Componentes Verificados en Frontend (`merchant-web/src`)
1. **`ClientDomainResolver`:** [domainResolver.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/domains/domainResolver.ts)
   - Normalización client-side con in-memory cache `DOMAIN_CACHE` para cero overhead en render cycles.
   - Consulta resiliente contra `/tenantDomains` con fallback para prefijos `www.`.
2. **`TenantDomainGate`:** [TenantDomainGate.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/domains/TenantDomainGate.tsx)
   - **Fail-Closed Guard:** Renderizado de pantallas de bloqueo para `UNKNOWN_DOMAIN`, `SUSPENDED_TENANT` e `INACTIVE_DOMAIN`.
   - **Security Interlock (`Domain ≠ Authorization`):** Compara el `tenantId` del token autenticado contra el `tenantId` resuelto por el dominio. Mismatch dispara pantalla de aislamiento con acción de logout obligatorio.
   - **Hydration Dinámica:** Inyección de tokens de diseño (`primaryColor`, `secondaryColor`, `logoUrl`, `faviconUrl`, `displayName`) en tiempo de ejecución.
3. **`LoginModule`:** [LoginModule.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/LoginModule.tsx)
   - Renderizado reactivo del branding contextual resuelto sin mezclar credenciales de otros tenants.

### C. Componentes Verificados en Panel Admin (`panel-admin/public`)
1. **`domains.js`:** [domains.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/domains.js)
   - Tab oficial dentro de `🏛 GOBERNANZA EMPRESARIAL`.
   - KPIs de dominios totales, activos, pendientes DNS y custom domains.
   - Modales para registro, visualización de instrucciones DNS y verificación forzada.

---

## 5. Tenant Domain Model Schema (`/tenantDomains/{domainId}`)

El esquema verificado en [models.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/domain/platform/models.ts#L445-L467) y `firestore.rules` comprende exactamente:

```typescript
export interface TenantDomainEntity {
  domainId: string;                    // Inmutable. ID único
  tenantId: string;                    // Inmutable. Tenant propietario
  brandId?: string | null;             // Marca asociada opcional
  domain: string;                      // Hostname normalizado en minúsculas (ej: "delivery.volados.com")
  domainType: 'PLATFORM' | 'TENANT_SUBDOMAIN' | 'CUSTOM_DOMAIN';
  status: 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'ACTIVE' | 'DISABLED' | 'ERROR';
  isPrimary: boolean;                  // Indicador de dominio primario
  isCustom: boolean;                   // true si es CUSTOM_DOMAIN
  isSubdomain: boolean;                // true si es TENANT_SUBDOMAIN
  dnsStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  sslStatus: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'ERROR' | 'EXPIRED';
  verificationToken?: string;          // Token TXT (ej. "bs-verify-...")
  dnsInstructions: DnsInstruction[];   // Instrucciones CNAME y TXT
  metadata?: Record<string, any>;
  schemaVersion: '1.0';
  createdAt: number;                   // Timestamp ms
  updatedAt: number;                   // Timestamp ms
  verifiedAt?: number | null;
  activatedAt?: number | null;
  createdBy: string;                   // UID
  updatedBy: string;                   // UID
}
```

---

## 6. Tenant Resolution Flow

```text
INCOMING HOSTNAME (e.g., "delivery.volados.com")
       │
       ▼
DomainNormalizer / ClientDomainNormalizer
(strip http://, :port, path, trailing dots, lowercase)
       │
       ▼
Is Platform Domain? (localhost, bluesystem.com, *.web.app)
 ├── YES ──► Default Tenant Context ('default_tenant' + Default BlueSystem Branding)
 └── NO  ──► Firestore Query `/tenantDomains` WHERE domain == normalized
              │
              ├── NOT FOUND ───────────────► FAIL-CLOSED: Render 'UNKNOWN_DOMAIN' Screen
              └── FOUND (TenantDomainEntity)
                   │
                   ├── Status != 'ACTIVE' ──► FAIL-CLOSED: Render 'INACTIVE_DOMAIN' Screen
                   └── Status == 'ACTIVE'
                        │
                        ▼
                   Lookup `/tenants/{tenantId}`
                        │
                        ├── Status == 'SUSPENDED' ──► FAIL-CLOSED: Render 'SUSPENDED_TENANT' Screen
                        └── Status == 'ACTIVE'
                             │
                             ▼
                        Hydrate Brand Visual Tokens (`/brands/{brandId}`)
                        (Logo, Favicon, Title, Primary Colors, Theme)
                             │
                             ▼
                        Apply Subscription Plan Limits (`TenantFeatureEngine`)
                        (Custom Domains, Control Tower, Advanced Reports)
                             │
                             ▼
                        SECURITY INTERLOCK: Compare Auth Claims
                        (JWT Token tenantId == Domain tenantId OR isPlatformAdmin)
                             │
                             ├── MISMATCH ──► FAIL-CLOSED: Render 'TENANT_MISMATCH' Screen + Force Logout
                             └── MATCH    ──► ALLOW ACCESS: Render Portal / Workspace
```

---

## 7. Security Architecture & Invariant Enforcement

### A. Principio Fundamental: `Domain ≠ Authorization`
El dominio resuelve exclusivamente el **contexto visual y organizacional**. La **autorización de acceso y mutación de recursos** se realiza de forma estricta en el servidor mediante:
- Firebase Authentication JWT Tokens.
- Custom Claims emitidos criptográficamente (`tenantId`, `role`, `eiamRole`, `businessId`, `branchId`, `platformAdmin`).
- `firestore.rules` y `storage.rules`.

### B. Matriz de Roles y Reglas de Seguridad EIAM

| Regla / Helper | Función en `firestore.rules` | Alcance de Autorización |
| :--- | :--- | :--- |
| `isPlatformAdmin()` | [firestore.rules:L81-L91](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L81-L91) | Acceso global de auditoría, soporte y configuración para roles `SUPER_ADMIN`, `ADMIN`, `AUDITOR`. |
| `isTenantMember(tId)` | [firestore.rules:L64-L66](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L64-L66) | Exige que `request.auth.token.tenantId == tId` (Aislamiento Multi-Tenant estricto). |
| `ownsBusiness(bId)` | [firestore.rules:L138-L140](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L138-L140) | Exige que `request.auth.token.businessId == bId` (Aislamiento de Comercio/Restaurante). |
| `isCourierOrDriver()` | [firestore.rules:L119-L131](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L119-L131) | Valida claim `role`/`userType` o existencia de documento verificado en `/users/{uid}` con `isActive == true`. |

---

## 8. Firestore SSOT Real Collections Map

A continuación se detalla el mapa real de las colecciones activas en `firestore.rules` y en el código del repositorio:

| Colección Firestore | Propósito / Dominio | Escritores Autorizados | Lectores Autorizados | Límite Tenant | Estatus |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `/tenants/{tenantId}` | Metadata de organizaciones SaaS | Platform Admins (Cloud Functions) | Público si `ACTIVE`, Tenant Admin, Platform Admin | Sí (`tenantId`) | 🟢 CANONICAL |
| `/tenantDomains/{domainId}` | Mapeo de Dominios & DNS | Platform Admin, Tenant Admin (propio tenant) | Público si `ACTIVE`, Tenant Members | Sí (`tenantId`) | 🟢 CANONICAL |
| `/brands/{brandId}` | Identidad visual y temas White-Label | Platform Admin, Tenant Admin | Público (Marketplace / White-label) | Sí (`tenantId`) | 🟢 CANONICAL |
| `/organizations/{orgId}` | Estructura de Holding EIAM | Platform Admin, Owner | Tenant Members, Org Owner | Sí (`tenantId` / `orgId`) | 🟢 CANONICAL |
| `/businesses/{businessId}` | Catálogo de Comercios / Restaurantes | Platform Admin, Business Admin | Público (Marketplace E-commerce) | Sí (`businessId`) | 🟢 CANONICAL |
| `/branches/{branchId}` | Sucursales físicas | Platform Admin, Business Admin | Público (Marketplace) | Sí (`businessId`) | 🟢 CANONICAL |
| `/products/{productId}` | Catálogo de productos y menú | Platform Admin, Business Admin, Staff | Público (Marketplace) | Sí (`businessId`) | 🟢 CANONICAL |
| `/orders/{orderId}` | Pedidos Commerce Delivery | Cliente (crear), Merchant Staff, Courier Asignado | Cliente dueño, Merchant Staff, Courier Asignado, Admin | Sí (`businessId` / `tenantId`) | 🟢 CANONICAL |
| `/deliveryTrips/{tripId}` | Encomiendas X→Y Delivery | Cliente (crear), Courier Asignado | Cliente dueño, Courier Asignado, Admin | No (Agnóstico de Tenant) | 🟢 CANONICAL |
| `/ubicaciones_repartidores/{uid}` | Telemetría GPS en tiempo real | Motorizado autenticado (`currentUid == uid`) | Usuarios autenticados (Suscripción dirigida) | Sí (Diffing por Courier) | 🟢 CANONICAL |
| `/user_devices/{docId}` | Registro push tokens multidevice FCM | Dueño del dispositivo (`uid`), Admin | Dueño del dispositivo (`uid`), Admin | Por `uid` | 🟢 CANONICAL |
| `/users/{uid}` | Perfiles de usuario e identidades | Dueño (`uid`), Platform Admin | Dueño, Merchant Staff, Platform Admin | Por `uid` | 🟢 CANONICAL |
| `/couriers/{courierId}` | Metadata y perfil de repartidores | Motorizado (`currentUid`), Platform/Business Admin | Usuarios autenticados | Por `courierId` | 🟢 CANONICAL |
| `/merchant_applications/{appId}` | Solicitudes de Onboarding Comercio | Admin SDK (Cloud Function exclusiva) | Solicitante (email), Platform Admin, Tenant Admin | Sí (`tenantId`) | 🟢 CANONICAL |
| `/courier_applications/{appId}` | Solicitudes de Onboarding Courier | Admin SDK (Cloud Function exclusiva) | Solicitante (email), Platform Admin, Tenant Admin | Sí (`tenantId`) | 🟢 CANONICAL |
| `/courier_cash_ledger/{id}` | Subledger financiero de custodia | Exclusivo Cloud Functions (`allow write: if false`) | Courier, Business Admin, Supervisor, Platform Admin | Sí (`courierId`) | 🟢 CANONICAL |
| `/financial_events/{eventId}` | Libro contable inmutable | Exclusivo Cloud Functions (`allow write: if false`) | Business Admin, Platform Admin | Sí (`businessId`) | 🟢 CANONICAL |
| `/system_config/{docId}` | Configuración global y mantenimiento | Platform Admin | Público | Global | 🟢 CANONICAL |

### Verificación de Prohibición de Colecciones Duplicadas:
- `/ordersIOS`, `/ordersAndroid`: ❌ **NOT FOUND** (Cero colecciones por SO).
- `/couriersIOS`, `/couriersAndroid`: ❌ **NOT FOUND** (Cero colecciones por SO).
- `/bannersIOS`, `/bannersAndroid`: ❌ **NOT FOUND** (Cero colecciones por SO).

---

## 9. Commerce Delivery vs X→Y Delivery Separation

| Dimensión | Commerce Delivery (`/orders`) | Encomiendas X→Y (`/deliveryTrips`) |
| :--- | :--- | :--- |
| **Entidad Primaria** | Pedido de restaurante/comercio con carrito | Envío punto a punto entre cliente emisor y receptor |
| **Flujo Operacional** | `Cliente → Comercio → Cocina → Ready → Fleet Pool → Courier → Cliente` | `Cliente A → Solicitud → Courier Asignado → Pickup A → Dropoff B` |
| **Colección Canónica** | `/orders/{orderId}` | `/deliveryTrips/{tripId}` |
| **Campos Canónicos** | `businessId`, `branchId`, `items`, `subtotal`, `deliveryFee` | `senderName`, `recipientName`, `pickup`, `dropoff`, `distanceKm` |
| **Aislamiento Multi-Tenant** | Estricto: el pedido pertenece a un `businessId` y `tenantId` | Agnóstico: no requiere comercio intermedio |
| **UI Android** | `ComercioDetalleScreen.kt`, `CartModal`, `OrderDetailScreen` | `SolicitarEnvioScreen.kt`, `ClienteTrackingMap` |
| **Courier View** | `PedidosEntrantesScreen.kt` (Commerce Card) | `PedidosEntrantesScreen.kt` (X→Y Extended Card) |

---

## 10. Fleet Core & State Machine Verification

### A. Máquinas de Estados Verificadas
- **Commerce Delivery:** `PENDING` → `PREPARING` → `READY` → `ASSIGNED` / `COURIER_ACCEPTED` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED` → `COMPLETED` (con soporte de `CANCELLED`).
- **X→Y Delivery:** `PENDING` → `ASSIGNED` → `IN_TRANSIT` (Pickup) → `DELIVERING` (Dropoff) → `DELIVERED` → `COMPLETED`.

### B. Reglas de Asignación Atómica
1. **Fleet Pool:** Representa exclusivamente pedidos con `status == "ready"` y `assignedCourierId == ""` (o no asignados). La consulta en Android `listenToFleetPoolOrders()` y Web filtra únicamente pedidos no tomados.
2. **Lock Atómico:** Tanto `claimOrderAtomically` como `claimTripAtomically` en [FirebaseManager.kt:L106-L157](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L106-L157) ejecutan un `db.runTransaction`. Si otro motorizado ya tomó la orden, la transacción retorna `false` inmediatamente y previene la colisión.
3. **Mis Pedidos Asignados:** Consultas dirigidas mediante `assignedCourierId == currentUid` o compatibilidad `motorizadoId == currentUid`. Prohibidas las lecturas globales sin filtro.

---

## 11. GPS & Telemetry Pipeline

1. **Publicación Nativa:** [LocationSyncWorker.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/LocationSyncWorker.kt) y `LocationProcessor.kt` capturan coordenadas GPS del hardware y publican a:
   `/ubicaciones_repartidores/{courierId}` con payload `{ coordenadas: { latitud, longitud }, bearing, speed, ultimaActualizacion, estadoDisponibilidad }`.
2. **Consumo Web:** [DeliveryControlTowerModule.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/DeliveryControlTowerModule.tsx) administra listeners individuales efímeros mediante `activeGpsListenersRef.current`. Solo se suscribe a los couriers que tienen un pedido activo con el comercio actual (`relevantCourierIds`), desuscribiendo automáticamente los couriers completados.

---

## 12. FCM & Push Notification Lifecycle

1. **Colección Canónica de Dispositivos:** `/user_devices/{uid}_{deviceId}`
   - Campos: `uid`, `platform` (`ANDROID`, `IOS`, `WEB`), `deviceId`, `fcmToken`, `isActive`, `updatedAt`.
   - Limpieza de tokens obsoletos e inactivos mediante `notificationCleanupScheduler` y trigger `sendPushNotification`.
2. **Triggers Operacionales Cloud Functions:**
   - `notifyNewOrder` ([triggers/orders.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/orders.ts)): Notifica al comercio de nuevo pedido entrante.
   - `notifyOrderStatusChange` ([triggers/orders.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/orders.ts)): Notifica al cliente cuando el pedido pasa a `PREPARING`, `READY`, `IN_TRANSIT`, `DELIVERED`.
   - `onCourierApplicationApproved`, `onMerchantApplicationApproved`: Notificación transaccional de activación de cuenta.

---

## 13. Customer App State & Theme Consistency

1. **Navegación Canónica:**
   `HOME` ↔ `SEARCH` (integrado) ↔ `FAVORITES` ↔ `CART` ↔ `ORDERS` ↔ `PROFILE`.
2. **Modularización (Fase 5 Completada):**
   El código ya no reside de forma monolítica en `CustomerHomeScreen.kt`. Los subcomponentes se encuentran extraídos en paquetes independientes bajo [presentation/customer/](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/):
   - `home/`: `HomeHeader.kt`, `HomeCategoriesSection.kt`, `FlashDealsSection.kt`, `DiscountedProductsSection.kt`, `FeaturedBusinessesSection.kt`, `StarProductsSection.kt`, `ExpressDeliveryBanner.kt`.
   - `search/`: `SearchScreen.kt`, `GlobalSearchResults.kt`.
   - `favorites/`: `FavoritesScreen.kt`.
   - `cart/`: `CartModal.kt`, `CheckoutStep1.kt`, `CheckoutStep2.kt`.
   - `profile/`: `ProfileScreen.kt` y sus 12 sub-vistas certificadas.
   - `loyalty/`: `LoyaltyDashboard.kt`, `RewardsCatalog.kt`.
3. **Consistencia de Tema (Fase 4 Completada):**
   Toda la Customer App consume `MaterialTheme.colorScheme` (`background`, `surface`, `surfaceContainer`, `onSurface`, `primary`, etc.) a través de `MyApplicationTheme` en `Theme.kt`, respondiendo coherentemente a los modos `LIGHT`, `DARK` y `SYSTEM` sin fondos blancos accidentales.

---

## 14. iOS Readiness State

Conforme al reporte de auditoría [ios_readiness_audit_report.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/ios_readiness_audit_report.md):
- **Readiness Score:** 93.35% (Ready with Gaps).
- **Backend Reutilizable:** 100% (Cero modificaciones requeridas en Cloud Functions o Firestore).
- **Security & Rules:** 100% agnósticas de sistema operativo.
- **Estatus:** El backend y los contratos están 100% preparados. La capa nativa de presentación en Swift/SwiftUI para iOS Courier constituye una fase futura independiente.

---

## 15. Certification Cross-Check Matrix

| Contrato / Módulo | Estado Documentado | Implementación en Código | Tests / Runtime | Clasificación |
| :--- | :--- | :--- | :--- | :---: |
| **EIAM v2.1/v3 Claims** | Documentado en ADR-004 & Phase 2C | Implementado en `firestore.rules` y `auth.ts` | Unit Tests PASS | 🟢 VERIFIED |
| **ADR-003 Performance** | Documentado en ADR-003 | Agregados en Functions y diffing en Control Tower | Code Verified | 🟢 VERIFIED |
| **ADR-013 Control Tower** | Documentado en ADR-013 | Implementado en `DeliveryControlTowerModule.tsx` | Build & Code PASS | 🟢 VERIFIED |
| **ADR-014 No Auto-Rollout** | Documentado en ADR-014 | Reglas de gobernanza en `.agents/AGENTS.md` | Governance PASS | 🟢 VERIFIED |
| **ADR-015 X→Y Freeze** | Documentado en ADR-015 | Implementado en `SolicitarEnvioScreen.kt` | Device Validated | 🟢 VERIFIED |
| **ADR-016 Courier Core** | Documentado en ADR-016 | Implementado en `FirebaseManager.kt` | Unit Tests PASS | 🟢 VERIFIED |
| **Phase 2E Multi-Domain** | Documentado en Phase 2E Report | Implementado en Functions, Web y Admin | Jest Suite PASS | 🟢 VERIFIED |
| **Customer Modularization** | Documentado en Phase 5 | Extracción completa en `presentation/customer/` | Code Verified | 🟢 VERIFIED |
| **Customer Theme M3** | Documentado en Phase 4 | Tokens `MaterialTheme.colorScheme` en vistas | Code Verified | 🟢 VERIFIED |
| **Cash Settlement Engine** | Documentado en Sprint 16 | Implementado en `courierSettlement.ts`, `courierClosureCallables.ts` | Code Verified | 🟢 VERIFIED |
| **iOS Presentation Layer** | Documentado en iOS Audit | No implementada aún (SwiftUI pendiente) | Gap Documentado | 🟡 DOCUMENTED ONLY |

---

## 16. Critical Discrepancy & Drift Register

| ID | Descripción | Esperado | Actual en Repositorio | Severidad | Recomendación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **DISC-01** | Estado Documental de Customer App | Documentación histórica de Phase 3 mencionaba Home monolítico y theme hardcoded | La Fase 4 (Theme M3) y Fase 5 (Modularización) ya fueron ejecutadas y están en el código actual | ⚪ INFO / RESUELTO | Actualizar las referencias cruzadas para reconocer que la Fase 4 y 5 ya están en el baseline inmutable. |
| **DISC-02** | Configuración de Subdominio en Localhost | Detección de subdominios locales para pruebas multi-tenant | Requiere mapeo en `/etc/hosts` o configuración de proxy local para pruebas de subdominios | ⚪ LOW | Mantener `ClientDomainNormalizer.isPlatformDomain` con soporte para `localhost` y Firebase Staging. |

---

## 17. Protected Component Map

| Componente | ADR / Fase Origen | Archivo Actual | Estatus | ¿Protegido? | Riesgo de Regresión |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Merchant Control Tower** | ADR-013 | `merchant-web/src/modules/DeliveryControlTowerModule.tsx` | 🟢 VERIFIED | **SÍ (INMUTABLE)** | ALTO ante refactors |
| **X→Y Location Subsystem** | ADR-015 | `app/src/main/java/com/example/SolicitarEnvioScreen.kt` | 🟢 VERIFIED | **SÍ (INMUTABLE)** | CRÍTICO si se agregan SDKs externos |
| **Courier State Machine & Atomic Assignment** | ADR-016 | `app/src/main/java/com/example/FirebaseManager.kt` | 🟢 VERIFIED | **SÍ (INMUTABLE)** | CRÍTICO ante cambios de esquema |
| **Firestore Security Rules** | EIAM v2.1/v3 | `firestore.rules` | 🟢 VERIFIED | **SÍ (INMUTABLE)** | CRÍTICO si se relajan reglas |
| **Tenant Domain Resolver & Feature Engine** | Phase 2E | `functions/src/domain/whitelabel/tenantDomainResolver.ts` | 🟢 VERIFIED | **SÍ (INMUTABLE)** | ALTO si se rompe fail-closed |
| **Tenant Domain Gate (Web)** | Phase 2E | `merchant-web/src/shared/domains/TenantDomainGate.tsx` | 🟢 VERIFIED | **SÍ (INMUTABLE)** | ALTO ante bypass de mismatch |
| **Customer Modular Components** | Phase 4 & 5 | `app/src/main/java/com/example/presentation/customer/` | 🟢 VERIFIED | **SÍ (INMUTABLE)** | MEDIO |

---

## 18. Risk Register & Rollback Guarantees

1. **Riesgo de Regresión en Control Tower:** Cualquier intento de migrar a Google Maps JS API reintroduciría costos innecesarios y violaría ADR-013.
2. **Riesgo de Inconsistencia de Datos en Asignación:** La asignación de pedidos debe ejecutarse exclusivamente mediante transacciones atómicas (`runTransaction`).
3. **Riesgo de Mismatch en Multi-Tenant:** Cualquier modificación a `TenantDomainGate` o `firestore.rules` debe mantener la política de **Fail-Closed** y la regla `Domain ≠ Authorization`.

---

## 19. Final Decision & Verdict

╔══════════════════════════════════════════════════════════════════════╗
║                          FINAL VERDICT                               ║
║                                                                      ║
║             🟢 BASELINE VERIFIED WITH FINDINGS                       ║
╚══════════════════════════════════════════════════════════════════════╝

### Justificación Técnica:
1. **Evidencia Completa:** Todos los componentes declarados como certificados (ADR-003, ADR-004, ADR-013, ADR-014, ADR-015, ADR-016, Phase 2E, Phase 4, Phase 5) existen físicamente en el repositorio y cuentan con implementación verificada en código fuente.
2. **Invariantes Arquitectónicos Respetados:** 100% de cumplimiento con los 16 Invariantes Maestros (One Core, One Codebase, One Firebase Project, One SSOT, Tenant Isolation, Fail-Closed, Zero OS-Specific Collections, Zero Auto-Rollout).
3. **Hallazgos Conciliados:** Se constató que las limitaciones documentadas en fases tempranas (Theme hardcoded y Home monolítico) ya fueron resueltas y modularizadas en las Fases 4 y 5 existentes.
4. **Cero Mutaciones:** Se cumplió con la directiva estricta de **ZERO CODE MUTATION / READ-ONLY AUDIT**.

---

## 20. Recommended Next Phase

Se recomienda proceder a la **FASE SIGUIENTE (Phase 2F.1 / Siguiente Fase Operativa Autorizada)** bajo las directivas del **Master Prompt**:
1. Mantener todos los componentes auditados en estado **PROTECTED BASELINE**.
2. Cualquier intervención futura debe ser quirúrgica, aditiva y precedida por su respectivo `PRE-IMPLEMENTATION AUDIT`.
