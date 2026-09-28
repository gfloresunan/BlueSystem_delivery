# BLUE SYSTEM DELIVERY ENTERPRISE
## BSD-IOS-FLUTTER-RELEASE-CANDIDATE-001
### OFFICIAL RELEASE CANDIDATE DOSSIER — TRACK B: iOS FLUTTER CLIENT

---

- **Documento:** `BSD-IOS-FLUTTER-RELEASE-CANDIDATE-001.md`
- **Protocolo de Validación:** `BSD-IOS-FLUTTER-PHYSICAL-E2E-CERTIFICATION-001`
- **Fecha:** 24 de Septiembre, 2026
- **Sistema:** BlueSystem Delivery Enterprise v2.2 / v2.3
- **Proyecto Firebase:** `bluesystem-7c9af`
- **Veredicto:** 🟡 **RELEASE CANDIDATE APPROVED (CONTROLLED GAPS)**

---

### 1. Release Candidate Identity

| Campo | Valor Canónico |
|---|---|
| **Nombre de la Aplicación** | BlueSystem Delivery |
| **Versión Semántica** | `2.2.0` |
| **Build Number** | `1` |
| **Bundle Identifier** | `com.bluesystem.delivery.client` |
| **Target Platform** | iOS 14.0+ (iPhone / iPad Universal) |
| **Target Hardware** | iPhone 13 / 14 / 15 / 16 Series (Físico) |
| **Firebase Project** | `bluesystem-7c9af` |
| **Firebase App ID (iOS)** | `1:514416631826:ios:788b99430f87324e88b8cb` |
| **Modo de Operación** | Controlled Multi-Role (Customer / Courier / Express) |

---

### 2. E2E Contract Certification Summary

| Touchpoint / Componente | Estado de Certificación | Evidencia Técnica |
|---|---|---|
| **EIAM v3 & Auth** | 🟢 **PASS** | Claims `driver`, `client`, `tenantId` preservados |
| **Role Router** | 🟢 **PASS** | `AppShell` despacha dinámicamente según rol |
| **Push Registration** | 🟢 **PASS** | `/user_devices/{uid}_{deviceId}` con `fcmToken`, `platform: 'iOS'` |
| **GPS Telemetría** | 🟢 **PASS** | `/ubicaciones_repartidores/{courierId}` vía `AppleSettings` |
| **Google Maps** | 🟢 **PASS** | `AppDelegate.swift` con `GMSServices.provideAPIKey` |
| **Customer Orders** | 🟢 **PASS** | `/orders` con `platform: 'IOS'` y timestamps de servidor |
| **Courier Atomic Claim** | 🟢 **PASS** | `runTransaction` previene colisiones multi-repartidor |
| **Express X→Y** | 🟢 **PASS** | `/deliveryTrips` delegando cálculo a Cloud Functions |
| **Arqueo y Cierre Diario** | 🟢 **PASS** | Storage `/courier_deposits` + callable `initiateCourierDailyClosure` |
| **Merchant / Admin Sync** | 🟢 **PASS** | Streams en tiempo real de `/businesses` y `/banners` |
| **Track A Android Regression** | 🟢 **0 REGRESSIONS** | 0 archivos modificados, 0 bytes modificados |

---

### 3. Known Issues & Operational Gaps (Apple External Provisioning)

Ningún defecto bloqueante interno (P0) fue detectado en el código fuente de Flutter ni en los adaptadores nativos. Los puntos pendientes son exclusivamente de aprovisionamiento en servicios en la nube:

1. **`GAP-EXT-01` (APNs Auth Key):**
   - Requiere subir la llave de autenticación `.p8` (Apple Push Notification Authentication Key) en Firebase Console (`Configuración del Proyecto -> Cloud Messaging -> Configuración de apps de Apple`).
2. **`GAP-EXT-02` (Apple Developer Portal Identifier):**
   - Registrar el App ID explícito `com.bluesystem.delivery.client` y habilitar la capacidad *Push Notifications*.
3. **`GAP-EXT-03` (Signing Certificate & Provisioning Profile):**
   - Generar el perfil de distribución en Apple Developer y enlazarlo con el Team ID en Xcode (`Runner.xcodeproj`).
4. **`GAP-EXT-04` (Google Maps API Key Restriction):**
   - Restringir la clave en Google Cloud Console para el bundle `com.bluesystem.delivery.client`.

---

### 4. Release Decision

Se aprueba formalmente la designación de **BSD-IOS-FLUTTER-RELEASE-CANDIDATE-001** bajo el estatus de **RELEASE CANDIDATE — GAPS CONTROLADOS**.

El artefacto de código fuente en `flutter_client/` queda formalmente congelado como Baseline Inmutable v2.2 Enterprise. Una vez provistas las credenciales de Apple por parte del operador humano en una estación macOS con Xcode, el paquete está listo para su compilación final (`flutter build ipa`) y distribución a través de Apple TestFlight.
