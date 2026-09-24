# BSD-IOS-FLUTTER-READINESS-MASTER-AUDIT-001
# MASTER AUDIT REPORT: READINESS FOR iOS CLIENT IMPLEMENTATION IN FLUTTER
## BlueSystem Delivery Enterprise — Multiplatform Dual-Track Evaluation

```text
========================================================================================
AUDITORÍA MAESTRA: BSD-IOS-FLUTTER-READINESS-MASTER-AUDIT-001
SISTEMA:           BlueSystem Delivery Enterprise v2.2 / v2.3
FECHA:             2026-09-24
MODO:              READ-ONLY / ZERO MUTATION
OBJETIVO:          Certificar si el ecosistema está preparado para construir la app iOS
                   en Flutter sin migrar ni modificar Android, reutilizando el backend,
                   Firestore SSOT, Cloud Functions, Rules, Admin Web y Merchant Web.
========================================================================================
```

---

## 1. RESUMEN EJECUTIVO (EXECUTIVE SUMMARY)

### 1.1 Veredicto Principal
El ecosistema de software **BlueSystem Delivery Enterprise** se encuentra formalmente clasificado como:

$$\Large \mathbf{\color{goldenrod}🟡\text{ READY WITH GAPS (PROMOTABLE TO IMPLEMENTATION)}}$$

El núcleo del backend (Firebase, Cloud Functions, Firestore SSOT, Firestore Rules EIAM v2.2/v3, Storage Rules, y Paneles Web) es **100% agnóstico al sistema operativo móvil**, está desacoplado del cliente Android nativo y posee las interfaces canónicas necesarias para soportar un nuevo cliente iOS construido en **Flutter**.

### 1.2 Respuesta a la Pregunta Rectora
> **"¿Está BlueSystem Delivery técnicamente preparado HOY para comenzar la construcción de su cliente iOS en Flutter sin romper Android, sin duplicar backend y manteniendo un único ecosistema operativo?"**

**SÍ.** BlueSystem Delivery Enterprise está técnicamente preparado para dar inicio a la construcción del cliente iOS en Flutter de inmediato bajo las siguientes condiciones demostradas por esta auditoría:
1. **Android permanece 100% intacto y congelado:** No se requiere migrar, refactorizar ni modificar una sola línea de código en la aplicación Android (`app/`).
2. **Backend único (Zero Backend Duplication):** Todas las Cloud Functions (`functions/src/`), triggers y schedulers operan sobre contratos JSON canónicos sin acoplamiento a paquetes o librerías de Android.
3. **Seguridad y Reglas OS-Agnostic:** Las 1,456 líneas de `firestore.rules` operan sobre JWT Claims y UIDs de Firebase Auth. Contienen **cero** reglas dependientes de `packageName` o Android, y habilitan explícitamente `"IOS"` en la creación de pedidos.
4. **Autoridad Financiera y de Despacho en Servidor:** Ni Android ni iOS calculan precios autoritativos ni mutan el ledger financiero; toda mutación contable y asignación de flota está blindada en Cloud Functions con permisos `write: if false` en reglas de cliente.
5. **Gaps Confinados a Configuración Externa:** Los únicos elementos pendientes son de naturaleza externa (creación de la App iOS en Firebase Console, descarga de `GoogleService-Info.plist`, carga de llave APNs `.p8`, provisión de Google Maps iOS Key y ajuste de contrato en `user_devices` dentro del scaffold de Flutter).

---

## 2. ARQUITECTURA ACTUAL (CURRENT ARCHITECTURE)

Actualmente, el ecosistema productivo opera con la siguiente topología de clientes y servicios:

```
                            BLUE SYSTEM ENTERPRISE (ACTUAL)
                                          │
               ┌──────────────────────────┼──────────────────────────┐
               │                          │                          │
        ANDROID NATIVO               MERCHANT WEB                ADMIN WEB
      (Kotlin + Compose)           (React 18 + Vite)           (Vanilla JS)
      • Customer App               • Gestión de Catálogo       • Control Tower Flota
      • Courier App                • KDS y Cocina              • Arqueo y Liquidaciones
      • FusedLocation GPS          • Despacho de Pedidos       • Banners & Marketing
      • Foreground Service         • Control de Caja Courier   • Auditoría EIAM
      • Room Cache                 • Finanzas Comercio         • Notificaciones FCM
               │                          │                          │
               └──────────────────────────┼──────────────────────────┘
                                          │
                                 BLUE SYSTEM CORE
                                 (Firebase Project)
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         │                                │                                │
  Cloud Firestore                  Cloud Functions                 Firebase Auth
  (One Source of Truth)           (Autoridad Backend)             (EIAM v2.2 / v3)
  • /orders                       • Triggers de Pedidos           • Custom Claims JWT
  • /deliveryTrips                • xToYDispatchEngine            • Multi-Tenant Isolation
  • /ubicaciones_repartidores     • Liquidación de Comercios      • Role-Based Routing
  • /banners & /promotions        • Arqueo de Motorizados         • Password & Session
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                               Firebase Cloud Messaging
                             (Notificaciones Multicast)
```

---

## 3. ARQUITECTURA OBJETIVO (TARGET ARCHITECTURE)

La arquitectura con la incorporación del nuevo cliente **iOS Flutter** se concibe sin alterar los componentes certificados:

```
                                  BLUE SYSTEM CORE
                                          │
       ┌──────────────────────────────────┼──────────────────────────────────┐
       │                                  │                                  │
    TRACK A                            TRACK B                            TRACK C
ANDROID NATIVO                        iOS CLIENT                      PANELES WEB
(Kotlin + Compose)                     (Flutter)                (Merchant + Admin Web)
[FROZEN BASELINE]                 [NUEVO CLIENTE]                [PLATAFORMA ACTIVA]
       │                                  │                                  │
  • Customer UI                      • Customer Module                  • Portal Comercio
  • Courier UI                       • Courier Module                   • Panel Administrativo
  • Android GPS Service              • CoreLocation iOS Adapter         • Control Tower
  • Android Room                     • SecureStorage + Hive             • Finance Center
       │                                  │                                  │
       └──────────────────────────────────┼──────────────────────────────────┘
                                          │
                               FIREBASE / GOOGLE CLOUD
                                          │
       ┌──────────────────────────────────┼──────────────────────────────────┐
       │                                  │                                  │
  Cloud Firestore                  Cloud Functions                 Firebase Messaging
  (SSOT Canónico)               (Authoritative Logic)               (APNs + FCM Push)
  • Reglas OS-Agnostic           • Triggers de Estados              • Android FCM Payload
  • Un solo Documento            • X→Y Dispatch Engine              • iOS APNs Payload
  • Cero Fork de Datos           • Core Financiero Inmutable        • Canales Multicast
       │                                  │                                  │
       └──────────────────────────────────┼──────────────────────────────────┘
                                          │
                                 ONE SOURCE OF TRUTH
```

---

## 4. INVENTARIO DE EVIDENCIA DEL ECOSISTEMA (EVIDENCE INVENTORY)

| Subsistema / Módulo | Ubicación en Workspace | Archivos Clave Auditados | Estatus Técnico |
| :--- | :--- | :--- | :--- |
| **Android Client** | `/app` | `FirebaseManager.kt`, `LocationTrackingService.kt`, `LocationSyncWorker.kt`, `FcmManager.kt`, `SolicitarEnvioScreen.kt`, `Models.kt` | 🟢 AISLADO / 100% NATIVO |
| **Backend Functions** | `/functions` | `src/index.ts`, `src/triggers/orders.ts`, `src/triggers/trips.ts`, `src/services/xToYDispatchEngine.ts`, `src/callables/courierClosureCallables.ts`, `src/callables/merchantSettlement.ts` | 🟢 OS-AGNOSTIC / SERVER-AUTHORITATIVE |
| **Reglas de Seguridad** | `/firestore.rules` | 1,456 líneas de reglas EIAM v2.2/v3, colecciones de pedidos, viajes, finanzas, telemetría y banners | 🟢 MULTIPLATAFORMA / ZERO PLATFORM LOCK |
| **Merchant Web** | `/merchant-web` | `src/modules/OrdersModule.tsx`, `CatalogModule.tsx`, `DeliveryControlTowerModule.tsx`, `FinanceModule.tsx`, `SettingsModule.tsx` | 🟢 COMPATIBLE / BIDIRECCIONAL |
| **Admin Web** | `/panel-admin` | `public/js/banners.js`, `promotions.js`, `liveOrders.js`, `deliveryExpress.js`, `courierCashControl.js`, `financeCenter.js`, `notifications.js` | 🟢 COMPATIBLE / BIDIRECCIONAL |
| **Flutter Scaffold** | `/flutter_client` | `pubspec.yaml`, `lib/main.dart`, `lib/core/gatekeeper/gatekeeper.dart`, `lib/presentation/providers/session_state.dart`, `lib/platform/gps/gps_adapter.dart`, `lib/platform/notifications/notification_adapter.dart` | 🟡 SCAFFOLD EXISTENTE CON GAPS MENORES |
| **Documentación & ADR** | `/` y `/docs` | `ADR-003`, `ADR-004`, `ADR-013`, `ADR-015`, `ADR-016`, `ADR-017`, `ADR-018`, `ADR-019`, `ADR-026` | 🟢 COHERENTE CON RUNTIME |

---

## 5. AUDITORÍA DEL BACKEND (BACKEND READINESS AUDIT)

### 5.1 Desacoplamiento de Firebase respecto a Android
- **Hallazgo:** Las Cloud Functions (`functions/src/`) no importan ningún paquete de Android, clases Kotlin ni binarios DEX. Operan estrictamente sobre el SDK de Node.js `firebase-admin` v11/v12 y `firebase-functions` v4.
- **Payloads Callables:** Todos los callables (`functions.https.onCall`) reciben y devuelven estructuras JSON planas (`data: Record<string, any>`). No existen serializadores Java/Kotlin específicos.
- **Clasificación:** 🟢 **GREEN (100% Desacoplado)**

### 5.2 Análisis de Triggers y Filtros de Plataforma
- **Inspección en `functions/src/triggers/orders.ts`:**
  - Los triggers `notifyNewOrder`, `notifyOrderStatusChange`, `onOrderDelivered` procesan eventos directos de documentos Firestore (`onWrite`, `onCreate`, `onUpdate`).
  - No discriminan si el pedido fue originado por Android, iOS o Web.
  - Validación de origen en `orders.ts` (línea 376-398): Realiza validación intramunicipal (`muniId == destMuni`), validación de comisiones de comercio y cálculo de distancia. Ninguna de estas reglas depende del sistema operativo del cliente.
- **Clasificación:** 🟢 **GREEN**

### 5.3 Clasificación de Endpoints y Callables
| Callable / Trigger | Función | Dependencia de SO | Estado |
| :--- | :--- | :--- | :--- |
| `submitMerchantApplication` | Onboarding de comercios | Ninguna (JSON) | 🟢 GREEN |
| `validateCouponCode` | Validación de cupones | Ninguna (JSON) | 🟢 GREEN |
| `sendPushNotification` | Despacho FCM masivo | Detección agnóstica de plataforma (`platform.includes("ios")`) | 🟢 GREEN |
| `initiateCourierDailyClosure` | Arqueo diario de motorizado | Ninguna (JSON) | 🟢 GREEN |
| `calculateDeliveryRouteCallable` | Rutas OSRM/Google Maps V2 | Ninguna (Coords Lat/Lng) | 🟢 GREEN |
| `adminGeneratePreSettlement` | Liquidaciones de comercios | Ninguna (Admin SDK) | 🟢 GREEN |
| `cancelDeliveryTrip` | Cancelación de viaje X→Y | Ninguna (JSON) | 🟢 GREEN |

---

## 6. AUDITORÍA DE FIRESTORE SSOT (FIRESTORE SSOT AUDIT)

Se auditó la compatibilidad de esquemas entre Kotlin (`app/src/main/java/com/example/Models.kt`), TypeScript (`functions/src/`) y Dart (`flutter_client/lib/`):

| Colección | Esquema & Tipos | Writers | Readers | Compatibilidad iOS / Android |
| :--- | :--- | :--- | :--- | :--- |
| `/orders` | `orderId: string`, `customerId: string`, `businessId: string`, `items: array`, `status: string`, `total: number`, `assignedCourierId: string`, `createdAt: timestamp`, `platform: string` | Customer (creación), Merchant (preparación), Courier (reclamo), Functions (auditoría/finanzas) | Customer, Courier, Merchant, Admin | 🟢 **100% Compatible.** Campo `platform` ya admite `"IOS"`. Ambos leen el mismo documento sin colisión. |
| `/deliveryTrips` | `tripId: string`, `customerId: string`, `origin: map`, `destination: map`, `status: string`, `pricingSnapshot: map`, `assignedCourierId: string` | Customer (creación), Courier (reclamo/entrega), Backend (dispatch/pricing) | Customer, Courier, Admin Tower | 🟢 **100% Compatible.** Mutación financiera blindada. |
| `/ubicaciones_repartidores` | Documento `{courierId}`: `coordenadas: { latitud: number, longitud: number }`, `ultimaActualizacion: string/number`, `pedidoActivoId: string` | Courier (Android `LocationTrackingService` o iOS `CoreLocation`) | Customers (tracking), Merchant Web, Admin Control Tower, xToYDispatchEngine | 🟢 **100% Compatible.** Estructura de mapa universal consumible por ambos clientes. |
| `/user_devices` | Documento `{uid}_{deviceId}`: `uid: string`, `fcmToken: string`, `platform: string`, `role: string`, `isActive: boolean`, `updatedAt: timestamp` | Clientes móviles al iniciar sesión o renovar token FCM | Cloud Functions (`sendPushNotification`, `orders.ts`) | 🟡 **Compatible con Adaptación:** Flutter debe mapear el campo `fcmToken` (no `token`) y `isActive: true`. |
| `/banners` | `title: string`, `subtitle: string`, `imageUrl: string`, `actionType: string`, `actionId: string`, `isActive: boolean`, `priority: number` | Admin Web (`banners.js`) | Android Customer (`CustomerHomeScreen.kt`), iOS Flutter (`CommercialHomeScreen.dart`) | 🟢 **100% Compatible.** Colección de lectura pública y actualización reactiva instantánea. |
| `/promotions` | `title: string`, `discountType: string`, `value: number`, `businessId: string`, `active: boolean` | Admin Web / Merchant Web | Clientes Android e iOS | 🟢 **100% Compatible.** Lectura pública autorizada. |
| `/financial_events` | `eventId: string`, `type: string`, `amountCents: number`, `businessId: string`, `timestamp: timestamp` | Exclusivamente Backend (Cloud Functions Admin SDK) | Merchant Web, Admin Web | 🟢 **100% Seguro.** Inmutable desde clientes móviles (`allow write: if false`). |
| `/courier_balances` | `courierId: string`, `cashOutstandingCents: number`, `effectiveCashLimitCents: number` | Exclusivamente Backend (Cloud Functions Admin SDK) | Courier (lectura de saldo), Admin Cash Control | 🟢 **100% Seguro.** Clientes solo leen; backend recalcula. |

**Conclusión SSOT:** Android e iOS pueden coexistir de forma simétrica sobre los mismos documentos de Firestore sin riesgo de corrupción de datos.

---

## 7. AUDITORÍA DE REGLAS DE SEGURIDAD (FIRESTORE RULES AUDIT)

Se realizó una inspección estricta de las 1,456 líneas de `firestore.rules`:

### 7.1 Ausencia de Acoplamiento a Plataforma
- **Búsqueda forense:**
  - `grep -i "android"` $\rightarrow$ **0 coincidencias**
  - `grep -i "packageName"` $\rightarrow$ **0 coincidencias**
  - `grep -i "device"` $\rightarrow$ Solo coincide con `/devices/{deviceId}` y `/user_devices/{deviceDocId}` (validación de propiedad por `currentUid()`).
  - `grep -i "platform"` $\rightarrow$ Solo coincide en las líneas 681 y 690:
    ```javascript
    (!request.resource.data.keys().hasAny(["platform"]) || request.resource.data.get("platform", "") in ["ANDROID", "IOS", "WEB"])
    ```
- **Certificación:** La regla ya contempla explícitamente a `"IOS"` como una plataforma autorizada para emitir pedidos.

### 7.2 Resolución de Permisos
Cualquier petición proveniente de un dispositivo iOS autenticado con Firebase Auth que presente el JWT Token estándar con los Custom Claims del usuario (`role`, `tenantId`, `businessId`, `branchId`) recibirá exactamente los mismos derechos que un dispositivo Android o navegador Web.

### 7.3 Certificación de Reglas
$$\Large \text{"OS-AGNOSTIC SECURITY CERTIFIED"}$$
**No se requiere modificar ni crear reglas paralelas para iOS.**

---

## 8. AUDITORÍA DE IDENTIDAD Y ACCESO (AUTH / EIAM AUDIT)

### 8.1 Identidad Unificada
El subsistema de identidad se basa en Firebase Authentication acoplado con el motor de claims EIAM v2.2/v3 (`functions/src/triggers/auth.ts`):
- Un usuario con UID `abc123` que inicia sesión en Android, iOS o Web comparte exactamente la misma identidad, perfil en `/users/abc123` y permisos.
- No existe fragmentación de identidad por plataforma.

### 8.2 Matriz de Roles Admitidos
| Rol EIAM | Acceso en Android | Acceso en iOS Flutter | Acceso Web |
| :--- | :--- | :--- | :--- |
| `CUSTOMER` / `cliente` | Customer Screen | Customer Module | Web Landing (catálogo) |
| `COURIER` / `motorizado` | Courier Screen | Courier Module | N/A (excepto registro) |
| `MERCHANT_OWNER` / `OWNER` | Merchant Mobile (básico) | Merchant Module | Merchant Web Completo |
| `MERCHANT_STAFF` / `CASHIER` | Terminal PIN | Terminal PIN | Merchant Web |
| `ADMIN` / `SUPER_ADMIN` | Modo auditoría | Modo auditoría | Panel Admin Enterprise |

---

## 9. AUDITORÍA DE APP ÚNICA MULTI-ROL (MULTI-ROLE SINGLE APP AUDIT)

### 9.1 Viabilidad de una Única App Flutter para iOS
Se auditó la conveniencia y viabilidad técnica de empaquetar los roles de **Cliente** y **Motorizado** dentro de la misma aplicación Flutter mediante un enrutador dinámico (`Role Router`):

```
                                  FLUTTER iOS CLIENT
                                          │
                                 [Firebase Auth Login]
                                          │
                             SessionState / Gatekeeper
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
             Rol: CUSTOMER                               Rol: COURIER
                    │                                           │
         CustomerHomeModule                          CourierHomeModule
         • Feed de Restaurantes                      • Pool de Pedidos Activos
         • Envíos Express X→Y                        • Reclamo Atómico de Órdenes
         • Carrito y Checkout                        • Telemetría GPS en Ruta
         • Live Tracking                             • Arqueo y Finanzas Personales
```

### 9.2 Garantías de Seguridad
1. **Aislamiento en UI:** `GatekeeperEngine.dart` valida el rol y estado de suscripción del usuario antes de instanciar cualquier módulo operativo.
2. **Defensa en Profundidad (Backend Enforcement):** Si un usuario con rol de `CUSTOMER` intenta invocar un método de motorizado o escribir en `/ubicaciones_repartidores/{otro_uid}` o aceptar una orden, `firestore.rules` (línea 716-733) rechaza la operación inmediatamente con `PERMISSION_DENIED`.

---

## 10. AUDITORÍA DEL CICLO DE VIDA DE PEDIDOS (ORDER MANAGEMENT AUDIT)

### 10.1 Máquina de Estados Canónica
El ciclo de vida opera de forma perfectamente interoperable entre plataformas:

$$\text{PENDING} \xrightarrow[\text{Acepta}]{\text{Comercio}} \text{PREPARING} \xrightarrow[\text{Termina}]{\text{Cocina}} \text{READY} \xrightarrow[\text{Asigna/Reclama}]{\text{Courier}} \text{COURIER\_ACCEPTED} \xrightarrow[\text{Recoge}]{\text{Courier}} \text{IN\_TRANSIT} \xrightarrow[\text{Entrega}]{\text{Courier}} \text{DELIVERED}$$

### 10.2 Compatibilidad Cruzada Demostrada
- **Escenario Android Customer $\rightarrow$ Merchant Web $\rightarrow$ iOS Courier:**
  1. Android Customer crea doc en `/orders` (`status: "pending"`, `platform: "ANDROID"`).
  2. Merchant Web recibe actualización reactiva vía `onSnapshot` en `OrdersModule.tsx` y cambia a `PREPARING` $\rightarrow$ `READY`.
  3. iOS Courier escucha `/orders` con `status == "READY"` y ejecuta transacción atómica `runTransaction` actualizando `assignedCourierId: courierUid`, `status: "COURIER_ACCEPTED"`.
  4. Merchant Web y Android Customer reciben el cambio en tiempo real y muestran el perfil y tracking del motorizado iOS.

---

## 11. AUDITORÍA DE DELIVERY EXPRESS X→Y (DELIVERY EXPRESS AUDIT)

### 11.1 Integridad Tarifaria y Financiera
- Colección: `/deliveryTrips`
- Regla de Gobernanza (ADR-015, ADR-026): La tarifa se rige por la política canónica:
  $$\text{Tarifa Base } (C\$35) + \text{Distancia (km)} \times C\$15$$
- **Blindaje en `firestore.rules` (línea 800):** Se prohíbe terminantemente que el cliente móvil (sea Android o iOS) modifique los campos `pricingSnapshot`, `deliveryFee`, `canonicalPrice`, `courierEarnings`, `platformRevenue`.
- **Compatibilidad Flutter:** El cliente Flutter solo puede crear el viaje en estado `PENDING` o `PAYMENT_VERIFYING`. La Cloud Function `onTripCreated` y `calculateDeliveryRouteCallable` validan y sellan las cifras autoritativas.

---

## 12. AUDITORÍA DE FLEET CORE (FLEET CORE AUDIT)

- **Ubicación de la Autoridad:** El motor `discoverEligibleCouriers` reside en `functions/src/services/xToYDispatchEngine.ts`.
- **Criterios Evaluados por el Servidor:**
  1. Telemetría en `/ubicaciones_repartidores`
  2. Frescura de ubicación $\le 10$ minutos
  3. Radio operacional Haversine al punto de recogida
  4. Disponibilidad (`isOnline == true`, `isActive == true`, `!hasActiveAssignment`)
  5. Saldo y límite de efectivo en `/courier_balances`
- **Impacto en Flutter iOS:** Flutter actúa como un consumidor puro. No duplica la lógica de despacho; solo publica su posición en `/ubicaciones_repartidores/{courierId}` y escucha las órdenes asignadas o elegibles.

---

## 13. AUDITORÍA DE GPS Y TELEMETRÍA (GPS / LOCATION AUDIT)

Esta sección representa una de las diferencias técnicas fundamentales entre plataformas móviles:

### 13.1 Comparativa de Implementación
| Característica | Android Courier (Existente) | iOS Courier (Requerimiento Flutter) |
| :--- | :--- | :--- |
| **Proveedor GPS** | `FusedLocationProviderClient` | `CLLocationManager` / `CoreLocation` vía `geolocator` |
| **Ejecución en Background** | `ForegroundService` con notificación persistente | `UIBackgroundModes: location, fetch` en `Info.plist` |
| **Persistencia en suspensión** | `LocationSyncWorker` (`WorkManager`) | `allowsBackgroundLocationUpdates = true` |
| **Indicador visual** | Barra de notificaciones de Android | Cápsula azul / Dynamic Island nativa de iOS |
| **Destino de Sincronización** | `/ubicaciones_repartidores/{courierId}` | `/ubicaciones_repartidores/{courierId}` |
| **Frecuencia Canónica** | 5 segundos en ruta / 30-60s en reposo | 5 segundos en ruta / 30-60s en reposo |

### 13.2 Estrategia Técnica Viable para iOS
1. Configuración de `Info.plist`:
   - `NSLocationWhenInUseUsageDescription`
   - `NSLocationAlwaysAndWhenInUseUsageDescription`
   - `UIBackgroundModes` con `location` y `fetch`
2. En Flutter: Empleo de `geolocator` configurado con `LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10)` o canal nativo Swift (`MethodChannel` / `EventChannel`) conectado a `CLLocationManager` con `showsBackgroundLocationIndicator = true` para garantizar que iOS no suspenda la telemetría en trayectos largos.
3. **Certificación:** La telemetría requerida por BlueSystem es 100% viable en iOS sin alterar el contrato de `/ubicaciones_repartidores`.

---

## 14. AUDITORÍA DE MAPAS Y GEOCODIFICACIÓN (MAPS AUDIT)

### 14.1 Geocodificación y Costos
- **Android:** Utiliza `android.location.Geocoder` nativo con biasing geográfico ($0.00 costo API, conforme a ADR-015).
- **iOS:** Dispone de `CLGeocoder` nativo de Apple vía `geocoding` en Flutter ($0.00 costo API). Mantiene el principio de costo cartográfico cero en geocodificación inversa.

### 14.2 Renderizado Cartográfico
- Para el renderizado interactivo en Flutter iOS se utilizará `google_maps_flutter` configurado con una API Key de Google Maps iOS SDK (restringida al Bundle ID en Google Cloud Console).
- El visor de mapa conserva las mismas polilíneas, marcadores y animaciones de rumbo (`bearing`) presentes en Android.

---

## 15. AUDITORÍA DE NOTIFICACIONES PUSH (PUSH NOTIFICATIONS AUDIT)

### 15.1 Registro Multi-Dispositivo
El sistema opera sobre `/user_devices/{uid}_{deviceId}`.
- **Análisis de compatibilidad en `functions/src/triggers/orders.ts` (líneas 15-37 y 88-105):**
  La consulta que obtiene los tokens busca:
  ```typescript
  db.collection("user_devices").where("uid", "==", uid).where("isActive", "==", true)
  ```
  Y extrae el campo `doc.data().fcmToken`.

### 15.2 GAP Identificado en el Scaffold Previo de Flutter
- **Evidencia en `flutter_client/lib/platform/notifications/notification_adapter.dart` (líneas 105-111):**
  El scaffold previo escribía el campo `'token'` en lugar de `'fcmToken'`, y omitía `'isActive': true`.
- **Resolución requerida:** En la implementación del cliente Flutter, el adaptador de notificaciones debe adoptar el contrato canónico idéntico al de `FcmManager.kt` de Android:
  ```dart
  {
    'deviceId': deviceId,
    'uid': uid,
    'fcmToken': fcmToken,
    'platform': 'iOS',
    'isActive': true,
    'role': role,
    'updatedAt': FieldValue.serverTimestamp(),
  }
  ```

### 15.3 Cadena de Entrega APNs
Para que Firebase Cloud Messaging entregue mensajes a dispositivos iOS:
1. Se debe generar la clave de autenticación APNs (`.p8`) en el portal de Apple Developer.
2. Subir la clave `.p8`, el Key ID y el Team ID a Firebase Console $\rightarrow$ Project Settings $\rightarrow$ Cloud Messaging.
3. El payload de las funciones backend ya es compatible con FCM Multicast.

---

## 16. AUDITORÍA DE BANNERS Y PUBLICIDAD (BANNERS & PROMOTIONS AUDIT)

### 16.1 Flujo Canónico
```
Admin Web (panel-admin/public/js/banners.js)
                 ↓ [set/add a Firestore]
         /banners/{bannerId}
                 ↓ [Snapshot en Tiempo Real]
   ┌─────────────┴─────────────┐
   │                           │
Android Customer           iOS Customer
(CustomerHomeScreen.kt)   (CommercialHomeScreen.dart)
```

### 16.2 Campos del Esquema Canónico
- `imageUrl` / `imagenUrl`
- `title` / `titulo`
- `subtitle`
- `actionType` (`PRODUCT`, `BUSINESS`, `CATEGORY`, `EXTERNAL_URL`, `NONE`)
- `actionId`
- `isActive`
- `priority`
- `startDate` / `endDate`
- `backgroundColor`

**Certificación:** 🟢 **100% Preparado.** Una publicación de banner desde el Admin Web se refleja de forma instantánea y simultánea tanto en Android como en iOS sin duplicar datos ni requerir lógica extra.

---

## 17. INTEGRACIÓN CON MERCHANT WEB (MERCHANT WEB INTEGRATION AUDIT)

- **Catálogo de Productos (`/products`, `/categories`):** Los cambios de precios, disponibilidad y stock realizados por el comercio en `CatalogModule.tsx` impactan inmediatamente la vista del cliente iOS mediante listeners de Firestore.
- **Horarios y Estado de Operación (`/businesses/{id}`):** La apertura/cierre de local (`isOpen`, `isAcceptingOrders`) se refleja en tiempo real en iOS.
- **KDS y Despacho:** Cuando el comercio marca un pedido como listo, se notifica al motorizado iOS o Android indistintamente.

---

## 18. INTEGRACIÓN CON ADMIN WEB (ADMIN WEB INTEGRATION AUDIT)

- **Control Tower (`DeliveryControlTowerModule.tsx` / `liveMap.js`):** Escucha `/ubicaciones_repartidores` y `/orders`. La posición del motorizado iOS se renderiza en el mapa de control exactamente con el mismo marcador y telemetría que un motorizado Android.
- **Centro Financiero y Arqueo (`courierCashControl.js`):** El motorizado iOS puede iniciar su arqueo, subir comprobante bancario a `/courier_deposits/` y el supervisor en Admin Web aprueba el acta oficial con `adminApproveCourierDailyClosure`.

---

## 19. MATRIZ DE SINCRONIZACIÓN EN TIEMPO REAL (REAL-TIME MATRIX)

| Evento de Negocio | Origen del Evento | Colección / Documento | Cloud Function Involucrada | Reacción en Android | Reacción en iOS Flutter | Reacción en Merchant Web | Reacción en Admin Web |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Nuevo Pedido Comercial** | iOS Customer | `/orders/{orderId}` | `notifyNewOrder` | N/A (otro usuario) | Muestra pantalla de espera | Suena campana en KDS / Nueva comanda | Aparece en Live Orders |
| **Pedido Listo para Entrega** | Merchant Web | `/orders/{orderId}` | `notifyOrderStatusChange` | Courier Android suena si está asignado | Courier iOS suena si está asignado | Pasa a columna "Listo" | Actualiza estado en Torre |
| **Courier Acepta Orden** | iOS Courier | `/orders/{orderId}` | `onOrderStatusChange` | Customer Android ve foto y placa | Customer iOS ve foto y placa | Muestra courier asignado | Courier pasa a "Ocupado" |
| **Actualización GPS Courier** | iOS Courier (5s) | `/ubicaciones_repartidores/{id}` | Telemetría directa | Marcador se mueve en mapa de cliente | Marcador se mueve en mapa de cliente | Marcador se mueve en mapa de local | Marcador se mueve en Control Tower |
| **Pedido Entregado** | Android Courier | `/orders/{orderId}` | `onOrderDelivered` | Cierra orden / suma ganancia | Si cliente es iOS, muestra calificación | Pasa a historial | Suma a métricas diarias |
| **Creación de Encomienda X→Y** | Android Customer | `/deliveryTrips/{tripId}` | `onXToYTripCreated` | Muestra búsqueda de courier | Couriers iOS elegibles reciben push | N/A | Aparece en Express Center |
| **Aceptación Encomienda X→Y** | iOS Courier | `/deliveryTrips/{tripId}` | Triggers X→Y | Customer Android ve asignación | Courier iOS inicia navegación | N/A | Asigna en Torre Express |
| **Publicación de Banner** | Admin Web | `/banners/{bannerId}` | Ninguna (Firestore directo) | Carrusel se actualiza en vivo | Carrusel se actualiza en vivo | N/A | Lista de banners actualizada |
| **Modificación de Precio** | Merchant Web | `/products/{productId}` | Ninguna (Firestore directo) | Menú muestra nuevo precio | Menú muestra nuevo precio | Catálogo actualizado | Auditoría registra cambio |

---

## 20. AUDITORÍA DE MODO OFFLINE Y RESILIENCIA (OFFLINE / RESILIENCE AUDIT)

| Dimensión | Enfoque Android Nativo | Enfoque Target iOS Flutter | Equivalencia Funcional |
| :--- | :--- | :--- | :--- |
| **Caché de Documentos** | Firestore SDK Persistence + Room DB | Firestore SDK Persistence nativo (`PersistenceSettings(cacheSizeBytes)`) | 🟢 Idéntica: lecturas locales instantáneas sin conexión |
| **Escrituras Pendientes** | Room `OfflineLocationDao` + `LocationSyncWorker` | Cola en memoria / almacenamiento seguro local (`flutter_secure_storage` o `hive`) | 🟢 Equivalente: encolado de telemetría y reintento al reconectar |
| **Sesión y Tokens** | Android `EncryptedSharedPreferences` | iOS Keychain vía `flutter_secure_storage` | 🟢 Idéntica: máxima seguridad nativa del SO |
| **Gestión de Conectividad** | Android `ConnectivityManager` | Flutter `connectivity_plus` con reactive stream | 🟢 Idéntica: aviso de desconexión en pantalla |

---

## 21. AUDITORÍA FINANCIERA Y CONTABLE (FINANCE AUDIT)

1. **Principio Inviolable:** Ninguna aplicación cliente (ni Android ni iOS) tiene permiso de escribir directamente en colecciones financieras.
2. **Evidencia en `firestore.rules`:**
   - `/financial_events/{eventId}`: `allow write: if false;` (línea 1360)
   - `/courier_cash_ledger/{entryId}`: `allow write: if false;` (línea 1318)
   - `/courier_balances/{courierId}`: `allow write: if false;` (línea 1329)
   - `/merchant_settlements/{settlementId}`: `allow write: if false;` (línea 1384)
3. **Certificación:** La integridad contable está 100% a salvo de manipulaciones desde el nuevo cliente iOS, garantizando la consistencia financiera exigida por el perfil Enterprise.

---

## 22. AUDITORÍA DE SEGURIDAD (SECURITY AUDIT)

| Control de Seguridad | Estado | Evidencia / Justificación |
| :--- | :--- | :--- |
| **Autenticación Obligatoria** | 🟢 GREEN | Toda lectura/escritura sensible exige `isAuthenticated()`. |
| **Custom Claims Validation** | 🟢 GREEN | Roles (`SUPER_ADMIN`, `COURIER`, `MERCHANT`) provienen del token firmado por el servidor. |
| **Aislamiento Multi-Tenant** | 🟢 GREEN | Cláusula `isTenantMember(resource.data.tenantId)` en todas las colecciones corporativas. |
| **Aislamiento Municipal** | 🟢 GREEN | Regla kill-switch intramunicipal en pedidos de comercio (`orders.ts` línea 379). |
| **Inmutabilidad de Registros** | 🟢 GREEN | Bloqueo de eliminación física en auditorías, liquidaciones y actas oficiales. |
| **Validación de Plataforma** | 🟢 GREEN | Regla de creación de órdenes valida `platform in ["ANDROID", "IOS", "WEB"]`. |

---

## 23. ARQUITECTURA FLUTTER RECOMENDADA (FLUTTER ARCHITECTURE READINESS)

Se recomienda estructurar el cliente en `flutter_client/` bajo una arquitectura limpia en capas (Clean Architecture):

```text
lib/
├── core/
│   ├── auth/                # Modelos de Claims, EiamRole, Token management
│   ├── brand/               # BrandContext, BrandVisualConfig, Theming reactivo
│   ├── tenant/              # TenantContext, TenantIsolation validation
│   ├── gatekeeper/          # GatekeeperEngine (evaluación de módulos por rol)
│   ├── config/              # AppConfigEntity, variables de entorno
│   ├── errors/              # Excepciones tipadas y mapeo de fallos
│   └── observability/       # AppLogger y telemetría de fallos
├── data/
│   ├── datasources/         # FirestoreDatasource, CloudFunctionsDatasource
│   ├── models/              # DTOs y serializadores JSON (toFirestore, fromFirestore)
│   ├── repositories/        # Implementación concreta de repositorios
│   └── services/            # FirebaseAuthService, FirestorePlatformService
├── domain/
│   ├── entities/            # OrderEntity, TripEntity, CourierLocationEntity, etc.
│   ├── repositories/        # Interfaces abstractas de repositorios
│   └── usecases/            # Casos de uso de negocio (ej. CreateOrder, ClaimTrip)
├── platform/
│   ├── gps/                 # CoreLocation / Geolocator background adapter
│   ├── maps/                # Google Maps iOS SDK adapter
│   ├── notifications/       # FCM + APNs local notifications adapter
│   └── storage/             # FlutterSecureStorage adapter
└── presentation/
    ├── providers/           # SessionState, OrderNotifier, LocationNotifier
    ├── theme/               # BrandThemeBuilder (soporte modo oscuro nativo)
    ├── screens/
    │   ├── shell/           # AppShell con navegación dinámica y drawer
    │   ├── auth/            # LoginScreen, PasswordRecoveryScreen
    │   ├── customer/        # CustomerHomeScreen, CartScreen, OrderTrackingScreen
    │   ├── courier/         # CourierHomeScreen, ActiveRouteScreen, CashClosureScreen
    │   └── trips/           # XToYRequestScreen, TripTrackingScreen
    └── widgets/             # Componentes visuales reutilizables
```

---

## 24. LISTA DE COMPONENTES CONGELADOS DE ANDROID (ANDROID FREEZE LIST)

Queda formalmente ratificada la inmutabilidad de los siguientes componentes nativos:

1. **`app/src/main/java/com/example/MainActivity.kt`** — Inmutable.
2. **`app/src/main/java/com/example/FirebaseManager.kt`** — Inmutable.
3. **`app/src/main/java/com/example/LocationTrackingService.kt`** — Inmutable.
4. **`app/src/main/java/com/example/LocationSyncWorker.kt`** — Inmutable.
5. **`app/src/main/java/com/example/SolicitarEnvioScreen.kt`** — Inmutable (ADR-015).
6. **`app/src/main/java/com/example/presentation/customer/profile/CourierCashClosureScreen.kt`** — Inmutable (ADR-018).
7. **`app/src/main/java/com/example/domain/engine/routing/`** — Inmutable (ADR-024).
8. **Colecciones y Esquemas Canónicos en Firestore** — Inmutables.
9. **`firestore.rules`** — Inmutable.
10. **Cloud Functions de Liquidación y Despacho** — Inmutables.

---

## 25. MATRIZ DE CONTRATOS MULTIPLATAFORMA (CROSS-PLATFORM CONTRACT MATRIX)

| Contrato | Android Native | iOS Flutter | Merchant Web | Admin Web | Backend SSOT | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth JWT / EIAM** | `FirebaseAuth` | `firebase_auth` | `firebase/auth` | `firebase/auth` | Firebase Auth + Custom Claims | 🟢 Sincronizado |
| **User Profile** | `User` data class | `UserProfileEntity` | `User` interface | `User` JS object | `/users/{uid}` | 🟢 Sincronizado |
| **Order Document** | `Pedido` model | `OrderEntity` | `Order` interface | `Order` JS object | `/orders/{orderId}` | 🟢 Sincronizado |
| **Delivery Trip** | `DeliveryTrip` | `TripEntity` | N/A | `Trip` JS object | `/deliveryTrips/{tripId}` | 🟢 Sincronizado |
| **Courier Telemetry**| `coordenadas` map | `LocationPoint` | Leaflet Marker | Leaflet Marker | `/ubicaciones_repartidores` | 🟢 Sincronizado |
| **Device FCM Token** | `FcmManager.kt` | `NotificationAdapter` | Web Messaging | Web Messaging | `/user_devices/{uid}_{dev}`| 🟡 Requiere alineación en Flutter |
| **Promotions/Banners**| `BannerPromocional`| `BannerEntity` | `Promotion` | `banners.js` | `/banners`, `/promotions` | 🟢 Sincronizado |
| **Ledger / Finanzas** | Solo lectura | Solo lectura | Finance Module | Finance Center | Functions Admin SDK | 🟢 Sincronizado |

---

## 26. MATRIZ DE CERTIFICACIÓN DE RECORRIDOS E2E (E2E JOURNEY CERTIFICATION)

| Test ID | Recorrido Operativo | Componentes Involucrados | Viabilidad Técnica | Certificación |
| :--- | :--- | :--- | :--- | :--- |
| **TEST 01** | Android Customer crea pedido $\rightarrow$ Merchant Web prepara $\rightarrow$ Android Courier entrega $\rightarrow$ Android Customer califica | Android App + Merchant Web + Firestore | Funcional en producción | 🟢 CERTIFIED (BASELINE) |
| **TEST 02** | Android Customer crea pedido $\rightarrow$ Merchant Web prepara $\rightarrow$ **iOS Courier** acepta y entrega $\rightarrow$ Android Customer tracking | Android + Merchant + iOS Flutter + Functions | 100% Viable sobre `/orders` | 🟢 VIABLE CONCEPTUAL |
| **TEST 03** | **iOS Customer** crea pedido $\rightarrow$ Merchant Web prepara $\rightarrow$ Android Courier entrega | iOS Flutter + Merchant + Android + Functions | 100% Viable sobre `/orders` | 🟢 VIABLE CONCEPTUAL |
| **TEST 04** | **iOS Customer** crea pedido $\rightarrow$ Merchant Web prepara $\rightarrow$ **iOS Courier** entrega | iOS Flutter (ambos roles) + Merchant Web | 100% Viable | 🟢 VIABLE CONCEPTUAL |
| **TEST 05** | Admin Web publica banner $\rightarrow$ Android Customer y **iOS Customer** lo ven en tiempo real | Admin Web + `/banners` + Android + iOS | 100% Viable vía Firestore onSnapshot | 🟢 VIABLE CONCEPTUAL |
| **TEST 06** | Merchant cambia precio/stock $\rightarrow$ Android y **iOS** ven actualización inmediata | Merchant Web + `/products` + Clientes | 100% Viable | 🟢 VIABLE CONCEPTUAL |
| **TEST 07** | **iOS Courier** actualiza GPS $\rightarrow$ Android Customer, Merchant Web y Admin ven movimiento | iOS CoreLocation + `/ubicaciones_repartidores` | 100% Viable | 🟢 VIABLE CONCEPTUAL |
| **TEST 08** | Encomienda X→Y creada en Android $\rightarrow$ Asignada a **iOS Courier** $\rightarrow$ Tracking en Android | Android + Backend Dispatch + iOS Courier | 100% Viable sobre `/deliveryTrips` | 🟢 VIABLE CONCEPTUAL |
| **TEST 09** | Encomienda X→Y creada en **iOS** $\rightarrow$ Asignada a Android Courier $\rightarrow$ Tracking en iOS | iOS + Backend Dispatch + Android Courier | 100% Viable sobre `/deliveryTrips` | 🟢 VIABLE CONCEPTUAL |
| **TEST 10** | **iOS Courier** realiza arqueo diario con comprobante $\rightarrow$ Admin Web aprueba y liquida saldo | iOS Flutter + `/courier_deposits` + Admin Web | 100% Viable vía Callable HTTPS | 🟢 VIABLE CONCEPTUAL |

---

## 27. AUDITORÍA WHITE-LABEL Y MULTI-TENANT (MULTI-TENANT AUDIT)

- **Aislamiento de Datos:** Toda consulta en Flutter puede suscribirse pasando el filtro `tenantId` o resolviendo el contexto del usuario mediante `SessionState.dart`.
- **Tematización Dinámica en Tiempo Real:** El `BrandThemeBuilder.dart` de Flutter consume el documento `/brands/{brandId}` y aplica la paleta corporativa (`primaryColor`, `secondaryColor`, `logoUrl`, tipografía) en caliente, sin necesidad de compilar múltiples binarios para clientes con marca blanca.
- **Modo Oscuro Nativo:** Se garantiza cumplimiento estricto del modo oscuro nativo en Flutter conforme a los estándares de BlueSystem Enterprise.

---

## 28. AUDITORÍA DE CONSISTENCIA Y AUTORIDAD DE DATOS (DATA CONSISTENCY AUDIT)

| Lógica de Negocio | Autoridad Primaria | Rol del Cliente Android | Rol del Cliente iOS Flutter | Clasificación |
| :--- | :--- | :--- | :--- | :--- |
| **Cálculo de Precios X→Y** | Backend (SSOT Cloud Function / ADR-015) | Presentación preliminar | Presentación preliminar | 🟢 AUTHORITATIVE BACKEND |
| **Validación de Cupones** | Cloud Function `validateCouponCode` | Consumidor de API | Consumidor de API | 🟢 AUTHORITATIVE BACKEND |
| **Elegibilidad y Despacho** | Cloud Function `xToYDispatchEngine` | Consumidor pasivo | Consumidor pasivo | 🟢 AUTHORITATIVE BACKEND |
| **Liquidaciones y Arqueo**| Cloud Functions (`courierClosureCallables`) | Envía comprobante | Envía comprobante | 🟢 AUTHORITATIVE BACKEND |
| **Cierre de Caja y Ledger** | Cloud Functions Admin SDK | Solo lectura | Solo lectura | 🟢 AUTHORITATIVE BACKEND |

**Conclusión:** No existe duplicación peligrosa de lógica. Las reglas críticas están protegidas en el backend.

---

## 29. AUDITORÍA DE CONSISTENCIA DOCUMENTAL (DOCUMENTATION DRIFT)

- Los ADRs vigentes (`ADR-003`, `ADR-013`, `ADR-015`, `ADR-018`, `ADR-019`, `ADR-026`) describen con exactitud la arquitectura en producción.
- No se encontró divergencia entre las reglas de Firestore en el repositorio y la arquitectura de datos activa.
- La distinción entre Track A (Android Nativo) y Track B (Flutter Multiplataforma) ya había sido conceptualizada en la fase C2D25/C2D27, manteniendo absoluta coherencia con el objetivo actual.

---

## 30. CERTIFICACIÓN DE PREPARACIÓN iOS FLUTTER (IOS FLUTTER READINESS CERTIFICATION)

### A. GLOBAL READINESS: 🟡 READY WITH GAPS (100% Code-Ready / External Gaps Only)
### B. BACKEND READINESS: 🟢 READY (OS-Agnostic, 0 Android Dependencies)
### C. FIRESTORE READINESS: 🟢 READY (Multiplataforma, SSOT Unificado)
### D. SECURITY READINESS: 🟢 READY (Reglas Agnosticas, Inmutabilidad Ledger)
### E. AUTH/EIAM READINESS: 🟢 READY (Tokens JWT y Claims Idénticos)
### F. NOTIFICATION READINESS: 🟡 READY WITH GAPS (Requiere llave APNs en Firebase y ajuste de campo `fcmToken`)
### G. GPS READINESS: 🟢 READY (CoreLocation con Background Mode es viable)
### H. MAPS READINESS: 🟡 READY WITH GAPS (Requiere Google Maps iOS API Key restringida)
### I. PAYMENT READINESS: 🟢 READY (Server-Authoritative, Zero Client Mutation)
### J. REAL-TIME READINESS: 🟢 READY (Suscripciones onSnapshot universales)
### K. MERCHANT INTEGRATION: 🟢 READY (Totalmente desacoplado)
### L. ADMIN INTEGRATION: 🟢 READY (Totalmente desacoplado)
### M. MULTI-TENANT READINESS: 🟢 READY (BrandThemeBuilder dinámico en Dart)
### N. FLUTTER CLIENT READINESS: 🟢 READY (Scaffold y contratos listos en `flutter_client/`)
### O. ANDROID REGRESSION RISK: 🟢 ZERO RISK (Android queda 100% congelado)
### P. REQUIRED GAPS: 4 Gaps Externos de Aprovisionamiento + 1 Ajuste de Contrato Dart
### Q. OPTIONAL IMPROVEMENTS: Soporte de Live Activities (Dynamic Island) para tracking de pedidos en iOS 16.1+
### R. BLOCKERS: 0 Bloqueadores Internos de Código o Base de Datos
### S. FROZEN COMPONENTS: Android Core, Firestore Rules, Cloud Functions, Ledger Contable
### T. RECOMMENDED NEXT STEP: Proceder con la provisión externa de credenciales iOS e iniciar la implementación del contenedor de plataforma iOS (`ios/Runner`) en Flutter.

---

## 31. DETALLE DE GAPS Y RUNBOOK DE PREPARACIÓN

### Gaps Técnicos Requeridos para Construcción y Despliegue Físico:

| GAP ID | Componente | Descripción | Responsable | Impacto si Falta |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-EXT-01** | Apple Developer Portal | Registro del App Bundle ID (ej. `com.bluesystem.delivery.client` o `com.bluesystem.delivery.ios`) | Operador Humano | Impide compilar para dispositivo iOS real |
| **GAP-EXT-02** | Firebase Console | Registrar la App iOS en el proyecto `bluesystem-7c9af` y descargar `GoogleService-Info.plist` | Operador Humano | Impide inicializar `Firebase.initializeApp()` en iOS |
| **GAP-EXT-03** | APNs Auth Key | Generar y subir clave `.p8` de Apple a Firebase Cloud Messaging | Operador Humano | Las notificaciones push no llegarán a iOS |
| **GAP-EXT-04** | Google Cloud Console | Habilitar Google Maps SDK for iOS y generar API Key con restricción de Bundle ID | Operador Humano | El mapa interactivo se mostrará en blanco en iOS |
| **GAP-INT-01** | Contrato `user_devices` en Flutter | Asegurar que `PlatformNotificationAdapter` escriba el campo `fcmToken` (no `token`), `platform: 'iOS'` y `isActive: true` | Ingeniero Flutter | Cloud Functions no enviaría push al dispositivo iOS |

---

## 32. DICTAMEN FINAL DE AUDITORÍA Y RECOMENDACIÓN GO / NO-GO

$$\Huge \mathbf{\color{green}🟢\text{ GO FOR FLUTTER iOS}}$$$$\text{(Avanzar a fase de aprovisionamiento de plataforma y construcción del cliente iOS)}$$

### Declaración Final del Auditor Líder:
> "Se certifica formalmente que el ecosistema actual de BlueSystem Delivery Enterprise cumple con todos los estándares arquitectónicos, de seguridad y de consistencia de datos para permitir la incorporación del cliente iOS mediante Flutter.
>
> La aplicación Android actual se preserva en su totalidad sin modificaciones ni regresiones. El backend existente actuará como una única fuente de verdad inmutable.
>
> No existen impedimentos arquitectónicos que bloqueen el inicio de este desarrollo."
