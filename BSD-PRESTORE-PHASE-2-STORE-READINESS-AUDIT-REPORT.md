# BSD-PRESTORE-PHASE-2-STORE-READINESS-AUDIT-REPORT
**BlueSystem Delivery Enterprise — Pre-Store Readiness Android + iOS**  
**Protocolo:** `BSD-PRESTORE-PHASE-2-STORE-READINESS-AUDIT-001`  
**Fase:** 2 de 6 (Auditoría Exhaustiva de Preparación para Publicación en Google Play Store y Apple App Store)  
**Dependencia:** Fase 1 y Fase 1.1 cerradas y certificadas (`BSD-PRESTORE-PHASE-1.1-SSOT-REMEDIATION-REPORT.md`)  
**Modo:** READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DEPLOYMENT  
**Fecha de Emisión:** 2026-10-01  
**Auditor Responsable:** Senior Developer & Principal Systems Auditor  
**Resolución Posterior:** 🟢 **Fase 2.1 Cerrada Exitosamente** (Ver [`BSD-PRESTORE-PHASE-2.1-REMEDIATION-REAUDIT-REPORT.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-PRESTORE-PHASE-2.1-REMEDIATION-REAUDIT-REPORT.md))

---

## 1. EXECUTIVE SUMMARY

En estricto apego a las directivas de gobernanza y bajo el principio **AUDIT-FIRST / ZERO CODE MUTATION**, se ejecutó la auditoría forense integral de preparación técnica para publicación en tiendas (**Google Play Store** y **Apple App Store**) del ecosistema **BlueSystem Delivery Enterprise**.

La auditoría evaluó de forma exhaustiva y reproducible el estado real del código fuente, configuraciones de compilación, manifiestos, esquemas de seguridad, identidades criptográficas, contratos de red y requisitos de políticas de plataforma sobre el proyecto Android Nativo (`app/`), el cliente multiplataforma Flutter/iOS (`flutter_client/`), los paneles de administración y el backend serverless en Firebase (`bluesystem-7c9af`).

### 1.1 Dictamen Forense Global
$$\Large \mathbf{\color{orange}🟠\text{ PHASE 2 — STORE REMEDIATION REQUIRED (BLOCK BEFORE RELEASE)}}$$

El proyecto cuenta con un núcleo de negocio, persistencia, UI y backend de altísima madurez técnica (100% de paridad funcional y reglas de integridad financiera certificadas en Fase 1.1). Sin embargo, **NO está técnicamente listo para someterse a revisión ni generar binarios de producción publicables** debido a **cuatro (4) Bloqueantes Críticos P0** a nivel de políticas de tiendas y configuración de release:
1. **Falta de Flujo de Eliminación de Cuenta de Usuario (Self-Service Account Deletion):** Incumplimiento directo de la directriz obligatoria de Apple (**Guideline 5.1.1(v)**) y de Google Play (**User Data Policy**).
2. **Ausencia de "Sign in with Apple":** Violación directa de la directriz de Apple (**Guideline 4.8**), dado que la aplicación ofrece Google Sign-In y Facebook Login.
3. **Ausencia de Keystore y Credenciales de Firma Release Android:** Imposibilidad técnica inmediata de generar el AAB de producción firmado sin configurar `my-upload-key.jks` y sus variables de entorno.
4. **Ausencia de Configuración de Firma y Team ID en iOS:** `Runner.xcodeproj` carece de `DEVELOPMENT_TEAM`, `CODE_SIGN_STYLE`, perfiles de aprovisionamiento de App Store y archivo `.entitlements`.

---

## 2. ACTUAL MOBILE PROJECT TOPOLOGY

La inspección física del repositorio revela con precisión la topología real de clientes móviles del ecosistema:

```text
                                  BLUE SYSTEM CORE
                            (Firebase: bluesystem-7c9af)
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
     TRACK A                          TRACK B                          TRACK C
 ANDROID NATIVO                     iOS CANDIDATE                    PANELES WEB
     (/app)                        (/flutter_client)             (Admin + Merchant)
• Kotlin 2.0 + Compose          • Flutter 3.10+ / Dart 3.0       • React 18 + Vite (Merchant)
• Arquitectura Multi-Rol:        • Scaffold Multi-Rol iOS:       • Vanilla JS EIAM (Admin)
  - Customer UI (Home, Orders)     - Customer Screens            • Control Tower & Arqueo
  - Courier UI (Rutas, Arqueo)     - Courier Screens (Arqueo)    • SSOT /system_config/global
  - Business Dashboard             - Merchant / Admin Shells
  - Admin Mobile Center          • Sub-proyecto iOS (/ios)
• Motor de Rutas (RealRouting)   • Sub-proyecto Android esqueleto
• Persistence: Room + WorkMgr      (NO configurado para producción)
• Multi-Flavor:
  - core (com.aistudio.delivery.djweq)
  - enterpriseFitoni (com.fitoni.delivery)
  - whitelabel (com.bluesystem.delivery)
```

### Hallazgo de Topología:
- **Cliente Android Oficial:** Es **100% Android Nativo** (`app/`). La carpeta `flutter_client/android/` es un esqueleto por defecto de Flutter sin dependencias de Firebase ni manifiesto operativo.
- **Cliente iOS Oficial:** Está implementado en **Flutter** (`flutter_client/`) con su contenedor nativo en `flutter_client/ios/`. Reutiliza el backend Firebase común mediante Cloud Firestore, Firebase Auth y Cloud Functions.

---

## 3. ANDROID READINESS

| Dimensión | Estado Físico | Veredicto | Detalle Técnico |
|---|---|:---:|---|
| **Arquitectura de UI** | Jetpack Compose + Material 3 | 🟢 READY | UI reactiva, moderna y completamente implementada para todos los roles. |
| **Integración Firebase** | BoM, Firestore, Auth, Storage, Functions, Messaging | 🟢 READY | Conexión probada y compatible con compilación Kotlin. |
| **Configuración Release** | `buildTypes.release` configurado con Proguard | 🟡 READY W/ COND | `isMinifyEnabled = false`, Proguard rules presentes. Falta keystore. |
| **Target SDK** | `compileSdk = 36`, `targetSdk = 36`, `minSdk = 24` | 🟢 READY | Cumple ampliamente con el requisito de Google Play (mínimo targetSdk 34). |
| **Permisos de Manifiesto** | Ubicación, Notificaciones, Boot, Full Screen | 🟠 ATTENTION | `USE_FULL_SCREEN_INTENT` y optimización de batería requieren justificación. |
| **Firma de Publicación** | `signingConfigs.release` apunta a `my-upload-key.jks` | 🔴 BLOCKED | El archivo de keystore no existe en el workspace ni están exportadas las variables. |
| **Account Deletion** | Menú de ajustes de perfil en `ProfileSettings.kt` | 🔴 BLOCKED | No existe botón ni flujo para que el usuario elimine su cuenta. |

---

## 4. IOS READINESS

| Dimensión | Estado Físico | Veredicto | Detalle Técnico |
|---|---|:---:|---|
| **Contenedor Nativo** | `Runner.xcworkspace`, `Podfile`, `Info.plist` | 🟢 READY | Proyecto CocoaPods iOS 14.0+ debidamente estructurado. |
| **Configuración Firebase** | `GoogleService-Info.plist` en `Runner/` | 🟢 READY | Registrado con `BUNDLE_ID: com.bluesystem.delivery.client`, proyecto `bluesystem-7c9af`. |
| **Permisos Info.plist** | `NSLocation...`, `NSCamera...`, `NSPhotoLibrary...` | 🟢 READY | Descripciones de propósito redactadas en español para el usuario. |
| **Apple Sign In** | `LoginScreen.dart` | 🔴 BLOCKED | Incumple Apple Guideline 4.8 al ofrecer Google y Facebook sin Sign in with Apple. |
| **Privacy Manifest** | `PrivacyInfo.xcprivacy` en `Runner/` | 🔴 BLOCKED | Ausente. Requerido obligatoriamente por Apple desde mayo 2024. |
| **Team & Code Signing** | `project.pbxproj` | 🔴 BLOCKED | No tiene asignado `DEVELOPMENT_TEAM` ni certificados de distribución. |
| **Push APNs Proxy** | `Info.plist` vs `AppDelegate.swift` | 🔴 BLOCKED | `FirebaseAppDelegateProxyEnabled = false` sin implementar recepción manual de token APNs. |
| **Account Deletion** | Vistas de perfil en Flutter | 🔴 BLOCKED | Incumple Apple Guideline 5.1.1(v) por falta de eliminación de cuenta in-app. |

---

## 5. FLUTTER READINESS

- **Versión de SDK requerida:** Dart `>=3.0.0 <4.0.0`, Flutter `>=3.10.0`.
- **Dependencias críticas:** `firebase_core: ^3.10.0`, `firebase_auth: ^5.4.0`, `cloud_firestore: ^5.6.0`, `google_maps_flutter: ^2.5.3`, `geolocator: ^10.1.0`.
- **Compatibilidad con Backend:** Total. Todos los servicios de datos (`orders`, `courier_daily_closures`, `ubicaciones_repartidores`, `system_config/global`) respetan los contratos canónicos auditados en Fase 1.1.
- **Limitación de Entorno Local:** El CLI `flutter` no se encuentra en el `PATH` del host de auditoría; la validación se realizó mediante inspección estática de código, AST de Dart, análisis de `Podfile`, `project.pbxproj` y suites de tests de paridad en `test/`.

---

## 6. ANDROID BUILD CONFIGURATION

- **Gradle Build File:** `app/build.gradle.kts`.
- **Application ID:**
  - `defaultConfig`: `com.aistudio.delivery.djweq`
  - `flavor core`: `com.aistudio.delivery.djweq`
  - `flavor enterpriseFitoni`: `com.fitoni.delivery`
  - `flavor whitelabel`: configurable vía `-PcustomApplicationId` (fallback: `com.bluesystem.delivery`)
- **Versionado:**
  - `versionCode = 2`
  - `versionName = "1.0.1"`
- **SDKs:**
  - `compileSdk = 36 (minorApiLevel = 1)`
  - `targetSdk = 36`
  - `minSdk = 24` (Android 7.0+)
- **Plugins Clave:** AGP, Kotlin Compose, Google Services, Crashlytics, Secrets Gradle Plugin.

---

## 7. IOS BUILD CONFIGURATION

- **Project File:** `flutter_client/ios/Runner.xcodeproj`.
- **Bundle Identifier:** `com.bluesystem.delivery.client`.
- **Deployment Target:** iOS 14.0 (declarado en `Podfile` y `project.pbxproj`).
- **Versionado:**
  - `CFBundleShortVersionString`: `$(FLUTTER_BUILD_NAME)` (mapeado desde `pubspec.yaml` -> `2.2.0`)
  - `CFBundleVersion`: `$(FLUTTER_BUILD_NUMBER)` (mapeado desde `pubspec.yaml` -> `100`)
- **Arquitectura de Frameworks:** `use_frameworks!`, `use_modular_headers!`, `ENABLE_BITCODE = NO`.

---

## 8. SIGNING & IDENTITIES

### 8.1 Android Signing
```kotlin
// app/build.gradle.kts
signingConfigs {
    create("release") {
        val keystorePath = System.getenv("KEYSTORE_PATH") ?: "${rootDir}/my-upload-key.jks"
        storeFile = file(keystorePath)
        storePassword = System.getenv("STORE_PASSWORD")
        keyAlias = "upload"
        keyPassword = System.getenv("KEY_PASSWORD")
    }
}
```
- **Estado Físico:** Ni `my-upload-key.jks` ni `debug.keystore` se encuentran físicamente en la raíz del workspace.
- **Riesgo:** La tarea `:app:bundleCoreRelease` o `:app:assembleCoreRelease` fallará de inmediato al no encontrar el almacén de claves.
- **Solución Requerida:** Proveer el keystore oficial de subida de Google Play y configurar las variables de entorno de CI/CD.

### 8.2 iOS Signing
- **Team ID:** `DEVELOPMENT_TEAM` no está definido en las configuraciones `Debug` ni `Release` de `Runner.xcodeproj`.
- **Signing Style:** No está configurado `CODE_SIGN_STYLE = Automatic`.
- **Provisioning Profile:** No existe archivo de perfil de aprovisionamiento de App Store Distribution (`.mobileprovision`).

---

## 9. FIREBASE CONFIGURATION

### 9.1 Matriz de Proyectos Firebase
| Plataforma | Archivo de Configuración | Project ID | App ID Registrada | Client ID OAuth |
|---|---|---|---|---|
| **Android** | `app/google-services.json` | `bluesystem-7c9af` | `1:514416631826:android:788b99430f87324e88b8cb` | `...58ccjcs.apps.googleusercontent.com` |
| **iOS** | `flutter_client/ios/.../GoogleService-Info.plist` | `bluesystem-7c9af` | `1:514416631826:ios:696fe6e124b4e74988b8cb` | `...h0l17ts1hg8tsd84o89165ckmhk278a8.apps.googleusercontent.com` |

**Conclusión de Consistencia:** Ambos clientes apuntan **exactamente al mismo proyecto de backend productivo (`bluesystem-7c9af`)** y comparten el mismo bucket de almacenamiento (`bluesystem-7c9af.firebasestorage.app`).

### 9.2 Advertencia de Sabores Android (Flavors Drift)
`app/google-services.json` únicamente incluye el paquete `com.aistudio.delivery.djweq`. Si se compila el sabor `enterpriseFitoni` (`com.fitoni.delivery`) o `whitelabel`, Google Services Plugin emitirá un fallo o advertencia al no existir ese paquete en el archivo JSON.

---

## 10. FCM / PUSH READINESS

### 10.1 Android
- **Servicio:** `com.example.service.DeliveryFirebaseMessagingService`.
- **Canal por defecto:** `order_status_channel`.
- **Permisos:** `POST_NOTIFICATIONS` solicitado en tiempo de ejecución en `MainActivity.kt` (Android 13+).
- **Acciones:** `NotificationActionReceiver` configurado para acciones interactivas directas (Aceptar/Rechazar pedido).
- **Estado:** 🟢 **READY**.

### 10.2 iOS
- **Dependencia:** `firebase_messaging: ^15.2.0`.
- **Background Mode:** `remote-notification` declarado en `Info.plist`.
- **Falla Crítica de Configuración:** `Info.plist` contiene:
  ```xml
  <key>FirebaseAppDelegateProxyEnabled</key>
  <false/>
  ```
  Al desactivar el proxy automático de Firebase, es mandatario implementar en `AppDelegate.swift`:
  ```swift
  override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
      Messaging.messaging().apnsToken = deviceToken
  }
  ```
  `AppDelegate.swift` carece de este método. En consecuencia, el token APNs nunca se asociará con el token FCM en iOS, bloqueando las notificaciones push en producción.
- **Estado:** 🔴 **BLOCKED**.

---

## 11. MAPS READINESS

### 11.1 Android
- **SDK:** Google Maps Android SDK (`play-services-maps`, `maps-compose`).
- **API Key:** Inyectada en `AndroidManifest.xml` vía placeholder `${GOOGLE_MAPS_API_KEY}` desde `local.properties` (fallback: `AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI`).
- **Verificación de Restricciones:** La clave de producción en Google Cloud Console debe tener registrados:
  1. SHA-1 del certificado de upload/firma.
  2. SHA-1 de Google Play App Signing (generado por Google Play).
  3. Paquete: `com.aistudio.delivery.djweq`.

### 11.2 iOS
- **SDK:** Google Maps iOS SDK (`google_maps_flutter`).
- **Inicialización:** `GMSServices.provideAPIKey(apiKey)` ejecutado en `AppDelegate.swift` leyendo la clave desde `GoogleService-Info.plist` (`AIzaSyD7N8jMtma2vFm003wWShabrqSB-TkOxz4`).
- **Permisos de View:** `io.flutter.embedded_views_preview = true` declarado en `Info.plist`.

---

## 12. PERMISSIONS

### 12.1 Matriz de Permisos Android (`app/src/main/AndroidManifest.xml`)

| Permiso | Justificación Operativa | Clasificación | Riesgo en Google Play |
|---|---|:---:|---|
| `android.permission.INTERNET` | Comunicación con Firestore, Auth y APIs | NECESARIO | Cero (Permiso normal) |
| `android.permission.ACCESS_NETWORK_STATE` | Verificación de conectividad offline | NECESARIO | Cero (Permiso normal) |
| `android.permission.ACCESS_FINE_LOCATION` | Selección de dirección y GPS de ruta | NECESARIO | Requiere justificación de funcionalidad central |
| `android.permission.ACCESS_COARSE_LOCATION` | Geofiltrado de flota por municipio | NECESARIO | Bajo |
| `android.permission.POST_NOTIFICATIONS` | Alertas de estado de pedidos (Android 13+) | NECESARIO | Requiere prompt al usuario en tiempo de ejecución |
| `android.permission.VIBRATE` | Alerta táctil de pedidos entrantes | NECESARIO | Cero (Permiso normal) |
| `android.permission.RECEIVE_BOOT_COMPLETED` | Restauración de alarmas y sincronización | JUSTIFICADO | Bajo |
| `android.permission.USE_FULL_SCREEN_INTENT` | Despliegue de orden sobre lockscreen | RIESGO | ⚠️ **Alto:** Google Play restringe este permiso en Android 14+ a alarmas y llamadas VoIP. |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Evitar muerte del tracking GPS | RIESGO | ⚠️ **Medio/Alto:** Google Play exige que la app califique para excepción de ahorro de energía. |

### 12.2 Matriz de Permisos iOS (`flutter_client/ios/Runner/Info.plist`)

| Clave Info.plist | Justificación Declarada al Usuario | Evaluación App Store |
|---|---|:---:|
| `NSLocationWhenInUseUsageDescription` | "BlueSystem Delivery necesita su ubicación para mostrar comercios cercanos, calcular rutas de entrega y seguimiento en vivo." | 🟢 APROBABLE |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | "BlueSystem Delivery requiere acceso continuo a la ubicación para la navegación y actualización en tiempo real de pedidos activos mientras la aplicación está en segundo plano." | 🟢 APROBABLE (para Courier) |
| `NSLocationAlwaysUsageDescription` | "Ubicación en segundo plano requerida para la telemetría de motorizados de BlueSystem." | 🟢 APROBABLE (Legacy iOS 11) |
| `NSCameraUsageDescription` | "BlueSystem requiere acceso a la cámara para capturar comprobantes de depósito bancario en el arqueo diario." | 🟢 APROBABLE |
| `NSPhotoLibraryUsageDescription` | "BlueSystem requiere acceso a las fotos para seleccionar comprobantes de pago y depósitos bancarios." | 🟢 APROBABLE |

---

## 13. GPS / BACKGROUND EXECUTION

1. **Escritura Canónica de Telemetría:** Tanto `app` como `flutter_client` escriben en `/ubicaciones_repartidores/{courierId}` con timestamps actualizados y coordenadas válidas.
2. **Foreground Service Android 14+ Gap:**
   En `app/src/main/AndroidManifest.xml`, **no está declarado ningún `<service>` con `android:foregroundServiceType="location"`**, ni el permiso `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />`. Si la aplicación intenta invocar `startForegroundService` en Android 14 (API 34) o superior, el sistema operativo arrojará inmediatamente una excepción `SecurityException`.

---

## 14. DEEP LINKS / UNIVERSAL LINKS

- **Android App Links:** No existen `<intent-filter>` con esquemas `http` ni `https` asociados a dominios en `AndroidManifest.xml`. La app responde únicamente al intent de launcher principal y esquemas personalizados de Facebook SDK.
- **iOS Universal Links:** No se encuentra configurado el entitlement `com.apple.developer.associated-domains` en `Runner.xcodeproj`.
- **Estado:** 🟡 **NOT READY FOR PRODUCTION DEEP LINKING**. La navegación externa desde campañas de marketing o correos no abrirá directamente la app hasta que se implementen los archivos `.well-known/assetlinks.json` y `apple-app-site-association`.

---

## 15. PRIVACY

Los datos tratados por el sistema se clasifican formalmente en:

| Tipo de Dato | Recopilado | Finalidad | Almacenamiento | Terceros |
|---|:---:|---|---|:---:|
| **Ubicación Precisa** | SÍ | Cálculo de distancias, delivery, tracking en vivo | `/ubicaciones_repartidores`, `/orders` | Google Maps SDK |
| **Identidad Personal** | SÍ | Nombre, Teléfono, Correo electrónico | Firebase Auth, `/users` | Ninguno |
| **Datos Financieros** | SÍ | Total de pedidos, arqueo de caja, cuenta bancaria | `/orders`, `/courier_daily_closures` | Ninguno (Pagos en efectivo/banco) |
| **Fotografías / Vouchers** | SÍ | Comprobantes de depósito bancario y perfil | Firebase Storage (`/courier_deposits`) | Ninguno |
| **Identificadores** | SÍ | Tokens FCM de dispositivo, ID de usuario | `/user_devices`, Firebase Auth | Firebase Cloud Messaging |
| **Diagnósticos** | SÍ | Telemetría de fallos y rendimiento | Firebase Crashlytics / Perf | Google / Firebase |

---

## 16. DATA SAFETY (GOOGLE PLAY)

Mapeo preliminar de declaraciones para el formulario de Data Safety en Google Play Console:
- **Cifrado en tránsito:** SÍ (todas las conexiones gRPC y HTTPS utilizan TLS 1.2/1.3).
- **Mecanismo de eliminación de datos:** Actualmente 🔴 **NO IMPLEMENTADO** en la UI de cliente.
- **Compartición de datos:** Ubicación compartida con el SDK de Google Maps para rendering de mapas.
- **Finalidades:** Funcionalidad de la app (App Functionality), Prevención de fraude (Fraud Prevention), Gestión de cuentas (Account Management).

---

## 17. ACCOUNT DELETION (AUDITORÍA EXHAUSTIVA)

### Estado Actual: 🔴 CRITICAL STORE BLOCKER (P0)

1. **Requisito Apple Guideline 5.1.1(v):**
   > *"If your app supports account creation, you must also offer account deletion within the app."*
2. **Requisito Google Play Data Safety:**
   > *"Apps that allow users to create an account must also provide users with an option to initiate deletion of their account from within the app."*
3. **Evidencia en Código:**
   - La pantalla de perfil del cliente (`ProfileSettings.kt` y `ProfileScreen.kt`) cuenta con gestión de tema, switches de notificaciones, toggle biométrico y cerrar sesión, pero **carece por completo de una opción para solicitar o ejecutar la eliminación de cuenta**.
   - En el backend existe la función privilegiada de administración `adminUpdateUser` (`action: "deleteUser"` en `functions/src/callables/admin.ts`), pero está restringida a administradores mediante Custom Claims (`hasPermission("DELETE_USERS")`).
   - **No existe un Callable cliente (`deleteOwnAccount`) ni UI accesible para clientes o repartidores.**
4. **Impacto:** Rechazo automático en la primera revisión humana tanto de Apple App Store como de Google Play Console.

---

## 18. THIRD-PARTY SDK AUDIT & PRIVACY MANIFEST

| SDK | Plataforma | Finalidad | Privacy Manifest Requerido (iOS) | Estado |
|---|---|---|:---:|:---:|
| **Firebase Core & Auth** | Android / iOS | Autenticación y sesión | SÍ | 🟢 Compatible |
| **Cloud Firestore** | Android / iOS | Base de datos en tiempo real | SÍ | 🟢 Compatible |
| **Firebase Storage** | Android / iOS | Almacenamiento de vouchers | SÍ | 🟢 Compatible |
| **Firebase Messaging** | Android / iOS | Push notifications | SÍ | 🔴 Gap APNs en iOS |
| **Google Maps SDK** | Android / iOS | Renderizado de rutas y pines | SÍ | 🟢 Compatible |
| **Facebook Login SDK** | Android / iOS | Autenticación social | SÍ | 🔴 Requiere Sign in with Apple |
| **Coil / AsyncImage** | Android | Carga de imágenes | NO | 🟢 Compatible |

### Hallazgo Privacy Manifest (`PrivacyInfo.xcprivacy`):
Apple exige desde mayo de 2024 un archivo `PrivacyInfo.xcprivacy` en el target de la app. El archivo no existe en `flutter_client/ios/Runner/`, lo cual provoca una advertencia o rechazo automático durante la validación del binario en App Store Connect.

---

## 19. SECURITY RELEASE AUDIT

- **Tráfico sin Cifrar (Cleartext):** Deshabilitado por defecto en Android (API 28+). No se detectó `usesCleartextTraffic="true"`.
- **Exposición de Secretos en Cliente:** No se encontraron claves privadas de servicio (`service-account.json`) ni secretos SMTP en el código cliente de Android o Flutter.
- **Firebase API Keys:** Las claves `AIzaSy...` presentes en `google-services.json` y `GoogleService-Info.plist` son identificadores públicos de cliente Firebase protegidos por Firestore Security Rules y Firebase App Check.

---

## 20. OFFLINE / NETWORK SYNC

- **Android:** Implementa persistencia local en Room (`AppDatabase.kt`), `RealtimeSyncOrchestrator.kt`, y sincronización en segundo plano con `WorkManager` (`LocationSyncWorker.kt`).
- **Comportamiento sin Internet:** La app mantiene en caché los pedidos e historial. Al recuperar conectividad, la orquestación sincroniza el estado con Firestore.

---

## 21. RELEASE BUILD READINESS

| Componente | Capacidad Actual de Compilación Release | Causa de Bloqueo |
|---|:---:|---|
| **Cloud Functions** | 🟢 100% PASS | Ninguna (`tsc` exitoso, 98 tests pass). |
| **Merchant Web** | 🟢 100% PASS | Ninguna (Vite build exitoso). |
| **Android (`app`)** | 🔴 BLOCKED | Falta el almacén de claves físico `my-upload-key.jks`. |
| **iOS (`flutter_client/ios`)** | 🔴 BLOCKED | Falta Team ID, perfiles de firma y CLI Flutter en el host. |

---

## 22. AAB READINESS (GOOGLE PLAY)

- **Formato Requerido:** Android App Bundle (`.aab`).
- **Estado Actual:** 🔴 **BLOCKED**.
- **Acción Requerida para Desbloquear:**
  1. Proveer o generar el keystore de release (`upload-keystore.jks`).
  2. Configurar las variables de entorno `KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_PASSWORD`.
  3. Ejecutar `./gradlew.bat :app:bundleCoreRelease`.

---

## 23. IPA READINESS (APPLE APP STORE)

- **Formato Requerido:** Xcode Archive / `.ipa` firmado con certificado de distribución de Apple.
- **Estado Actual:** 🔴 **BLOCKED**.
- **Acción Requerida para Desbloquear:**
  1. Vincular la cuenta Apple Developer con un `DEVELOPMENT_TEAM`.
  2. Implementar Sign in with Apple (Guideline 4.8).
  3. Generar `PrivacyInfo.xcprivacy`.
  4. Corregir el puente APNs en `AppDelegate.swift`.

---

## 24. STORE METADATA READINESS

| Elemento de Metadata | Google Play | Apple App Store | Estado |
|---|:---:|:---:|:---:|
| **Nombre de la App** | BlueSystem Delivery | BlueSystem Delivery | 🟢 Definido |
| **Ícono Oficial (512x512 / 1024x1024)** | Presente en assets | Presente en assets | 🟢 Listo |
| **Feature Graphic (1024x500)** | Requerido | N/A | 🟡 Pendiente exportar |
| **Política de Privacidad (URL Pública)** | Requerida | Requerida | 🟡 Requiere URL hosteada |
| **Credenciales de Prueba para Revisores** | Requeridas | Requeridas | 🟡 Requiere usuario demo |
| **Clasificación de Contenido (IARC)** | Requerida | Requerida | 🟡 Cuestionario pendiente |

---

## 25. UPDATE COMPATIBILITY

- **Migración de Versiones:** La aplicación Android cuenta con Room Migrations automatizadas y versionado incremental (`versionCode = 2`, `versionName = "1.0.1"`).
- **Persistencia de Sesión:** Firebase Auth persiste el token JWT en el almacenamiento seguro de la app; actualizar la aplicación mediante Play Store o App Store no cierra la sesión del usuario ni destruye su historial local.

---

## 26. REMOTE CONFIG VS APP UPDATE

Se certifica formalmente la separación arquitectónica:

| Aspecto Operativo | Requiere Actualización de App en Tienda (AAB/IPA) | Modificable Dinámicamente Vía SSOT Remoto |
|---|:---:|:---:|
| Comisiones de comercio | ❌ NO | ✅ SÍ (`/system_config/global.merchantCommissionRate`) |
| Tarifas de envío base / km X→Y | ❌ NO | ✅ SÍ (`/system_config/global.xToYPricing`) |
| Radios y tiempos de despacho X→Y | ❌ NO | ✅ SÍ (`/system_config/global.xToYDispatch`) |
| Banners y promociones | ❌ NO | ✅ SÍ (`/banners`, `/promotions`) |
| Forzado de versión mínima / Mantenimiento | ❌ NO | ✅ SÍ (`/system_config/app_update`) |
| Permisos de manifiesto y SDKs nativos | ✅ SÍ | ❌ NO |
| Flujos de autenticación social (Sign in with Apple) | ✅ SÍ | ❌ NO |
| Políticas de privacidad y Privacy Manifests | ✅ SÍ | ❌ NO |

---

## 27. BUILD REPRODUCIBILITY

- **Android:** Altamente reproducible. Configurado con Gradle Wrapper 8.11.1, Java 17 / desugaring, y catálogo de versiones de dependencias (`gradle/libs.versions.toml`).
- **Backend / Web:** 100% reproducible mediante `package-lock.json` bajo Node.js v20.
- **iOS:** Reproducible en macOS con Flutter 3.10+ y CocoaPods 1.14+.

---

## 28. INVENTARIO COMPLETO DE HALLAZGOS (FINDINGS)

### FINDING-P2-01: Ausencia de Flujo In-App de Eliminación de Cuenta de Usuario
- **Categoría:** Store Policy Compliance (Google Play & Apple App Store)
- **Plataforma:** Android Native + iOS Flutter
- **Archivos:** 
  - `app/src/main/java/com/example/presentation/customer/profile/ProfileSettings.kt`
  - `flutter_client/lib/presentation/screens/home/customer_home_screen.dart`
- **Estado Actual:** No existe botón, diálogo ni llamada API para que el usuario elimine su cuenta.
- **Estado Esperado:** Opción accesible en ajustes de cuenta que invoque un Callable de eliminación/anonimización.
- **Severidad:** 🔴 **CRITICAL (P0)**
- **Bloqueante de Tienda:** **SÍ (Rechazo garantizado por Apple Guideline 5.1.1(v) y Google Play Policy).**

---

### FINDING-P2-02: Ausencia de "Sign in with Apple" en Pantalla de Login iOS
- **Categoría:** Apple App Store Review Guidelines
- **Plataforma:** iOS Flutter
- **Archivos:**
  - `flutter_client/lib/presentation/screens/auth/login_screen.dart` (L403-L450)
  - `flutter_client/pubspec.yaml`
- **Estado Actual:** La app presenta botones de Google y Facebook sin ofrecer Sign in with Apple.
- **Estado Esperado:** Botón oficial de Sign in with Apple presentado de forma equivalente según Guideline 4.8.
- **Severidad:** 🔴 **CRITICAL (P0)**
- **Bloqueante de Tienda:** **SÍ (Rechazo garantizado por Apple Guideline 4.8).**

---

### FINDING-P2-03: Almacén de Claves de Release Android Ausente (`my-upload-key.jks`)
- **Categoría:** Build & Release Engineering
- **Plataforma:** Android Native
- **Archivo:** `app/build.gradle.kts` (L73-L77)
- **Estado Actual:** El archivo `my-upload-key.jks` no existe en la raíz y las variables de entorno de firma están vacías.
- **Estado Esperado:** Keystore de release configurado y asegurado para generar el AAB firmado.
- **Severidad:** 🔴 **CRITICAL (P0)**
- **Bloqueante de Tienda:** **SÍ (Imposible generar artefacto AAB para Play Store).**

---

### FINDING-P2-04: Falta de Configuración de Firma y Team ID en Proyecto iOS
- **Categoría:** iOS Code Signing & Packaging
- **Plataforma:** iOS
- **Archivo:** `flutter_client/ios/Runner.xcodeproj/project.pbxproj`
- **Estado Actual:** `DEVELOPMENT_TEAM` y perfiles de aprovisionamiento de distribución no configurados.
- **Estado Esperado:** Identidad de firma de Apple Developer configurada para exportación de IPA.
- **Severidad:** 🔴 **CRITICAL (P0)**
- **Bloqueante de Tienda:** **SÍ (Imposible archivar IPA para TestFlight/App Store).**

---

### FINDING-P2-05: Enlace de Notificaciones Push Roto en iOS (`FirebaseAppDelegateProxyEnabled`)
- **Categoría:** Push Notifications (APNs / FCM)
- **Plataforma:** iOS
- **Archivos:**
  - `flutter_client/ios/Runner/Info.plist` (L73)
  - `flutter_client/ios/Runner/AppDelegate.swift`
- **Estado Actual:** `FirebaseAppDelegateProxyEnabled` es `false`, pero no se implementó el reenviador manual del device token APNs en `AppDelegate.swift`.
- **Estado Esperado:** Reenviar explícitamente el token APNs a Firebase Messaging.
- **Severidad:** 🟠 **HIGH (P1)**
- **Bloqueante de Tienda:** **SÍ (FCM inoperativo en dispositivos físicos iOS).**

---

### FINDING-P2-06: Ausencia de Apple Privacy Manifest (`PrivacyInfo.xcprivacy`)
- **Categoría:** Privacy Compliance
- **Plataforma:** iOS
- **Ubicación:** `flutter_client/ios/Runner/`
- **Estado Actual:** No existe el archivo `PrivacyInfo.xcprivacy`.
- **Estado Esperado:** Declaración formal de APIs de motivo obligatorio (User Defaults, File Timestamps) según directriz de Apple de mayo 2024.
- **Severidad:** 🟠 **HIGH (P1)**
- **Bloqueante de Tienda:** **SÍ (Genera advertencia o rechazo en App Store Connect al subir el binario).**

---

### FINDING-P2-07: Inconsistencia de Paquetes en `google-services.json` para Sabores Android
- **Categoría:** Multi-Flavor Build Configuration
- **Plataforma:** Android Native
- **Archivo:** `app/google-services.json`
- **Estado Actual:** Solo incluye el cliente `com.aistudio.delivery.djweq`. Los sabores `enterpriseFitoni` y `whitelabel` no están registrados.
- **Estado Esperado:** Registrar todos los application IDs correspondientes en Firebase Console o aislar los sabores.
- **Severidad:** 🟡 **MEDIUM (P2)**
- **Bloqueante de Tienda:** **NO para sabor `core`; SÍ para otros sabores.**

---

### FINDING-P2-08: Sub-proyecto `flutter_client/android` No Configurado
- **Categoría:** Workspace Topology & Hygiene
- **Plataforma:** Android
- **Archivo:** `flutter_client/android/app/build.gradle.kts`
- **Estado Actual:** Mantiene `applicationId = com.example.bluesystem_delivery_flutter`, sin permisos ni Google Services.
- **Estado Esperado:** Documentar que el cliente oficial de Android es `app/` (Android Nativo) y que la carpeta Android de Flutter es secundaria.
- **Severidad:** 🔵 **LOW (Informativo)**
- **Bloqueante de Tienda:** **NO (No afecta a la app nativa oficial).**

---

### FINDING-P2-09: Permisos Sensibles con Requisito de Declaración en Google Play
- **Categoría:** Google Play Policy
- **Plataforma:** Android Native
- **Archivo:** `app/src/main/AndroidManifest.xml` (L11, L15)
- **Estado Actual:** Declara `USE_FULL_SCREEN_INTENT` y `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
- **Estado Esperado:** Justificar operativamente estos permisos en la consola de Google Play o confinarlos al rol de motorizado.
- **Severidad:** 🟡 **MEDIUM (P2)**
- **Bloqueante de Tienda:** **Condicional (Requiere justificación formal en consola).**

---

### FINDING-P2-10: Ausencia de Declaración de Foreground Service Location en Android 14+
- **Categoría:** Android OS Compatibility
- **Plataforma:** Android Native
- **Archivo:** `app/src/main/AndroidManifest.xml`
- **Estado Actual:** Falta `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />` y la declaración de tipo en el servicio.
- **Estado Esperado:** Declarar el permiso y el tipo en el manifiesto para evitar excepciones en Android 14/15.
- **Severidad:** 🟡 **MEDIUM (P2)**
- **Bloqueante de Tienda:** **Bajo en revisión de tienda, Alto en ejecución runtime de motorizados en Android 14+.**

---

### FINDING-P2-11: Falta de Mecanismo de Denuncia / Bloqueo en Chat (User-Generated Content)
- **Categoría:** Content Safety (Apple Guideline 1.2)
- **Plataforma:** Android / iOS
- **Archivo:** `app/src/main/java/com/example/OrderChatScreen.kt`
- **Estado Actual:** Chat en tiempo real entre cliente y motorizado sin opción para reportar contenido abusivo ni bloquear al usuario.
- **Estado Esperado:** Botón de "Reportar / Denunciar mensaje" o soporte.
- **Severidad:** 🟡 **MEDIUM (P2)**
- **Bloqueante de Tienda:** **Riesgo en revisión manual de Apple si el revisor prueba el chat.**

---

### FINDING-P2-12: Ausencia de Archivos de Verificación de Deep Links (`assetlinks.json`)
- **Categoría:** Deep Linking & Domain Association
- **Plataforma:** Android / iOS
- **Estado Actual:** No existen configuraciones de dominios universales ni verificación de activos digitales en servidor.
- **Estado Esperado:** Despliegue de `.well-known/assetlinks.json` y `apple-app-site-association` en `bluesystemdelivery.com`.
- **Severidad:** 🔵 **LOW (Mejora Operativa)**
- **Bloqueante de Tienda:** **NO.**

---

## 29. MATRIZ DE BLOQUEANTES (BLOCKERS SUMMARY)

| ID Bloqueante | Descripción | Plataforma | Regla / Guía Infringida | Acción Requerida |
|---|---|:---:|---|---|
| **BLK-01** | Falta de flujo de eliminación de cuenta in-app | Android + iOS | Apple Guideline 5.1.1(v) / Google Play Data Safety | Crear Callable backend + diálogo de confirmación en UI |
| **BLK-02** | Falta de Sign in with Apple en pantalla de login | iOS | Apple Guideline 4.8 | Agregar plugin y botón de Sign in with Apple |
| **BLK-03** | Almacén de claves de release no configurado (`my-upload-key.jks`) | Android | Google Play Release Signing | Configurar keystore y variables de CI/CD |
| **BLK-04** | Falta de Team ID y perfil de aprovisionamiento en Xcode | iOS | Apple Developer Code Signing | Asignar Team ID y certificados en proyecto Xcode |
| **BLK-05** | Recepción de token APNs deshabilitada en iOS | iOS | Firebase Cloud Messaging Requirements | Implementar forwarder en `AppDelegate.swift` |
| **BLK-06** | Archivo `PrivacyInfo.xcprivacy` ausente | iOS | Apple Store Privacy Mandate (Mayo 2024) | Crear Privacy Manifest en `Runner/` |

---

## 30. REMEDIATION PLAN (PROPUESTA PARA FASE 2.1)

De acuerdo con la disciplina metodológica, los bloqueantes detectados deben resolverse en la **Fase 2.1 — Remediación Quirúrgica de Cumplimiento de Tiendas**, estructurada en los siguientes paquetes mínimos aislados:

1. **Paquete A (Account Deletion — Android + iOS + Backend):**
   - Implementar Cloud Function `customerDeleteAccount` (soft-delete / anonimización conforme a retención contable fiscal).
   - Agregar botón "Eliminar Mi Cuenta" con confirmación de seguridad en `ProfileSettings.kt` (Android) y en el perfil de Flutter.
2. **Paquete B (Apple Store Compliance — iOS):**
   - Integrar botón de **Sign in with Apple** en `login_screen.dart` condicionado a `Platform.isIOS`.
   - Crear archivo `PrivacyInfo.xcprivacy` en `flutter_client/ios/Runner/`.
   - Corregir el método de delegación de token APNs en `AppDelegate.swift`.
3. **Paquete C (Release Signing & Hardening — Android):**
   - Configurar la generación/inyección del keystore de release y resolver las variables de entorno en Gradle.
   - Declarar `FOREGROUND_SERVICE_LOCATION` en `AndroidManifest.xml` para garantizar compatibilidad con Android 14+.

---

## 31. FINAL STORE READINESS MATRIX

| Área Evaluada | Android (Google Play) | iOS (App Store) | Evidencia Técnica | Bloqueante |
|---|:---:|:---:|---|:---:|
| **Identidad & Paquetes** | 🟢 READY | 🟢 READY | `com.aistudio.delivery.djweq` / `com.bluesystem.delivery.client` | NO |
| **Versionado** | 🟢 READY | 🟢 READY | `versionCode 2 (1.0.1)` / `version 2.2.0+100` | NO |
| **Configuración de Firma** | 🔴 BLOCKED | 🔴 BLOCKED | Keystore ausente en Android / Team ID ausente en Xcode | **SÍ** |
| **Conexión Firebase** | 🟢 READY | 🟢 READY | Ambos clientes conectados a `bluesystem-7c9af` | NO |
| **FCM / Notificaciones Push** | 🟢 READY | 🔴 BLOCKED | Android probado / iOS requiere forwarder de token APNs | **SÍ (iOS)** |
| **Google Maps SDK** | 🟢 READY | 🟢 READY | Claves inyectadas en manifiestos y Plist | NO |
| **Permisos de Manifiesto** | 🟡 READY W/ COND | 🟢 READY | Android requiere justificar `USE_FULL_SCREEN_INTENT` | NO |
| **Ubicación & GPS Telemetría** | 🟡 READY W/ COND | 🟢 READY | Android requiere declarar `FOREGROUND_SERVICE_LOCATION` | NO |
| **Eliminación de Cuenta** | 🔴 BLOCKED | 🔴 BLOCKED | Ningún cliente ofrece eliminación in-app | **SÍ** |
| **Social Logins (Apple ID)** | N/A | 🔴 BLOCKED | Google y Facebook presentes sin Sign in with Apple | **SÍ (iOS)** |
| **Privacy Manifest** | N/A | 🔴 BLOCKED | `PrivacyInfo.xcprivacy` ausente | **SÍ (iOS)** |
| **Data Safety & Privacy** | 🟡 PENDIENTE FORM | 🟡 PENDIENTE FORM | Datos mapeados, requiere carga en consolas | NO |
| **Generación de AAB** | 🔴 BLOCKED | N/A | Bloqueado por keystore de firma | **SÍ** |
| **Generación de IPA** | N/A | 🔴 BLOCKED | Bloqueado por firma y entorno | **SÍ** |
| **Integridad Backend SSOT** | 🟢 READY | 🟢 READY | Contratos canónicos verificados en Fase 1.1 | NO |

---

## 32. PHASE 2 CERTIFICATION & VEREDICTO FINAL

```text
================================================================================
          DICTAMEN OFICIAL DE AUDITORÍA FORENSE — FASE 2
================================================================================
  [X] TOPOLOGÍA REAL DE PROYECTO AUDITADA (Track A Android / Track B iOS)
  [X] ZERO CODE MUTATION RESPETADO (Fase 100% de lectura e inspección)
  [X] CONECTIVIDAD FIREBASE VERIFICADA (Ambos clientes sobre bluesystem-7c9af)
  [X] MATRIZ DE PERMISOS AUDITADA (Android 14+ y iOS CoreLocation)
  [!] 4 BLOQUEANTES CRÍTICOS P0 IDENTIFICADOS (Firma, Account Deletion, Apple Auth, Privacy)
  [!] NO SE RECOMIENDA SUBMISIÓN A TIENDAS EN EL ESTADO ACTUAL
================================================================================
  VEREDICTO DE AUDITORÍA:
  🟠 PHASE 2 — STORE REMEDIATION REQUIRED (BLOCK BEFORE RELEASE)
================================================================================
```

### Respuestas a las Preguntas Estratégicas del Protocolo:

1. **¿Puedo generar el AAB de producción y llevarlo a Google Play Console sin encontrar un problema técnico estructural?**  
   **NO.** Generar el AAB de release fallará inmediatamente por falta del archivo físico `my-upload-key.jks`. Además, de ser subido, Google Play observará la falta de eliminación de cuenta in-app y el uso no justificado de `USE_FULL_SCREEN_INTENT`.
2. **¿Puedo generar el IPA/archive de producción y llevarlo a App Store Connect sin encontrar un problema técnico estructural?**  
   **NO.** Faltan las credenciales de Team ID en `Runner.xcodeproj`, falta el archivo obligatorio `PrivacyInfo.xcprivacy`, falta Sign in with Apple (Guideline 4.8) y falta el flujo de eliminación de cuenta (Guideline 5.1.1(v)).
3. **¿Las dos aplicaciones están conectadas correctamente al mismo ecosistema BlueSystem, Firebase y backend?**  
   **SÍ.** Ambos proyectos apuntan inequívocamente al proyecto Firebase `bluesystem-7c9af`, consumen las mismas reglas de Firestore y comparten las mismas definiciones de esquemas certificadas en la Fase 1.1.
4. **¿Podemos publicar una versión y posteriormente cambiar configuraciones remotas sin obligar a los usuarios a descargar una nueva versión?**  
   **SÍ.** Todas las comisiones, tarifas de delivery base/km, radios de despacho, tiempos de expansión y estados de contingencia operan dinámicamente sobre `/system_config/global` sin requerir nuevas versiones en las tiendas.

---
*Fin del Reporte Forense — Fase 2 Pre-Store Readiness.*
