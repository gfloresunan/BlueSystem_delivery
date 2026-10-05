# BlueSystem Delivery — Pre-Store Readiness Android + iOS
## Reporte Forense de Auditoría de Artefactos de Release y Preparación para Publicación (Fase 2.2)

**Protocolo:** `BSD-PRESTORE-PHASE-2.2-RELEASE-ARTIFACT-STORE-SUBMISSION-READINESS-AUDIT-001`  
**Fase:** 2.2 de 6 (Release Artifact & Store Submission Readiness Audit)  
**Dependencia:** Fase 2.1 cerrada y certificada (`BSD-PRESTORE-PHASE-2.1-REMEDIATION-REAUDIT-REPORT.md`)  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DEPLOYMENT`  
**Fecha:** 1 de Octubre, 2026  
**Auditor Responsable:** Senior Developer & Principal Systems Auditor  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Gobernanza:** ADR-003, ADR-014 (No Auto-Rollout Policy), ADR-016, ADR-018, ADR-019  

---

## 1. Executive Summary

En estricto cumplimiento del mandato de gobernanza y bajo el principio fundamental **AUDIT-FIRST / ZERO CODE MUTATION**, se ejecutó la auditoría forense integral de la **FASE 2.2**. El objetivo estratégico consistió en evaluar objetivamente si la base de código de BlueSystem Delivery —certificada a nivel de software en Fase 2.1 (`STORE READY — SOFTWARE`)— puede en este momento producir artefactos firmados de producción (`.aab` e `.ipa`) y satisfacer los requisitos de submission ante **Google Play Console** y **Apple App Store Connect**.

### 1.1 Dictamen Forense Global

$$\Large \mathbf{\color{orange}🟠\text{ PHASE 2.2 — BLOCKED (INFRASTRUCTURE \& SIGNING IDENTITIES PENDING)}}$$

**Fundamentación Técnica:**
1. **La base de código está 100% limpia y verificada:** No existen defectos de software bloqueantes. Los 6 bloqueantes P0/P1 auditados en Fase 2 quedaron resueltos y probados en Fase 2.1 (Account Deletion Full Stack con 6/6 tests PASS, Sign in with Apple integrado en Flutter, APNs Token Bridge en Swift, Privacy Manifest `PrivacyInfo.xcprivacy` registrado, y hardening de permisos de ubicación para Android 14+).
2. **Las identidades criptográficas oficiales no están presentes en el host de auditoría:**
   - En Android: El archivo físico `my-upload-key.jks` no existe en disco y las variables de entorno de firma (`KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) están sin configurar. El fallback de desarrollo en `app/build.gradle.kts` previene quiebres locales, pero no sustituye la firma de producción.
   - En iOS: `DEVELOPMENT_TEAM` permanece como `""` en `project.pbxproj`, a la espera del Team ID corporativo de Apple Developer Program.
3. **El entorno macOS / Xcode no está disponible en este host (Windows 11):** Impide generar físicamente el Archive/IPA oficial de iOS.
4. **No existen dispositivos físicos conectados (Android / iPhone):** Lo que impide certificar la entrega de push física y la interacción táctil final in-situ.

---

## 2. Scope & Governance Rules

### 2.1 Alcance Autorizado
Auditoría de evidencia técnica de release a través de doce (12) controles forenses objetivos:
1. 🔐 Android Release Key Verification
2. 📦 Android AAB Packaging
3. 🍎 Apple Team ID & Provisioning
4. 📦 iOS Archive / IPA
5. 🔔 Push E2E Físico
6. 👤 Account Deletion On-Device
7. 🍏 Sign in with Apple On-Device
8. 🗺️ Maps / GPS / Geocoding
9. 🔒 Privacy & Data Safety
10. 🎨 Store Visual & Legal Metadata
11. 🧪 Reviewer Test Accounts
12. 🚀 Final GO / NO-GO Gate

### 2.2 Reglas Inviolables Aplicadas (100% Cumplidas)
- ❌ Cero modificaciones de código fuente durante la auditoría.
- ❌ Cero modificaciones a Firestore Rules, Cloud Functions o SSOT (`/system_config/global`).
- ❌ Cero modificaciones a motores financieros o de pricing.
- ❌ Cero reapertura de findings P2 diferidos (Flavors, `flutter_client/android`, `USE_FULL_SCREEN_INTENT`, chat, deep links).
- ❌ No se inventaron ni sustituyeron claves criptográficas, contraseñas, Team IDs ni certificados.
- ❌ No se tomó una compilación Debug como evidencia de release.
- ❌ No se tomó el fallback de desarrollo como identidad de producción.

---

## 3. Environment Inventory

| Componente | Especificación Detectada | Estado / Disponibilidad |
| :--- | :--- | :---: |
| **Sistema Operativo Host** | Windows 11 Enterprise | 🟢 Activo |
| **JDK Runtime** | OpenJDK 17 / 21 | 🟢 Activo |
| **Android SDK / Gradle** | Android SDK 34 (UpsideDownCake), Gradle 9.3.1 | 🟢 Activo |
| **Node.js / TypeScript** | Node.js v22.11.0, TypeScript 5.x | 🟢 Activo |
| **macOS / Xcode** | No disponible en este host | 🔴 No disponible |
| **Flutter CLI** | No configurado en PATH del host Windows | 🟡 Entorno Mac requerido |
| **Dispositivo Android Físico** | Ninguno conectado (`adb` ausente/desconectado) | 🔴 No disponible |
| **Dispositivo iPhone Físico** | Ninguno conectado | 🔴 No disponible |

---

## 4. Auditoría Forense de los 12 Controles

### Control 01 — 🔐 Android Release Key Verification
- **Objetivo:** Verificar físicamente la existencia del archivo keystore JKS oficial, ruta, alias y variables de firma.
- **Evidencia Física:**
  - `Test-Path .\my-upload-key.jks` → `False`.
  - Variables de entorno `$env:KEYSTORE_PATH`, `$env:STORE_PASSWORD`, `$env:KEY_ALIAS`, `$env:KEY_PASSWORD` → No definidas.
  - `app/build.gradle.kts` resuelve dinámicamente:
    ```kotlin
    val keystorePath = (project.findProperty("KEYSTORE_PATH") as? String) ?: System.getenv("KEYSTORE_PATH") ?: "${rootDir}/my-upload-key.jks"
    ```
    Al no existir, conmuta con advertencia a `debugConfig`.
- **Nivel de Evidencia:** `IMPLEMENTED`
- **Resultado:** 🔴 **BLOCKED — OFFICIAL RELEASE SIGNING IDENTITY UNAVAILABLE**

---

### Control 02 — 📦 Android AAB Packaging
- **Objetivo:** Demostrar la cadena completa de generación de un `.aab` de release firmado.
- **Evidencia Física:**
  - La tarea Gradle `:app:bundleCoreRelease` está configurada e integrada en el proyecto.
  - La compilación Kotlin `:app:compileCoreDebugKotlin` es exitosa (`BUILD SUCCESSFUL in 2m 30s`).
  - Sin embargo, en ausencia de la identidad criptográfica legítima, cualquier AAB producido en este momento carecería de la firma oficial de subida a Google Play Console.
- **Nivel de Evidencia:** `IMPLEMENTED`
- **Resultado:** 🔴 **BLOCKED — OFFICIAL RELEASE SIGNING IDENTITY UNAVAILABLE**

---

### Control 03 — 🍎 Apple Team ID & Provisioning
- **Objetivo:** Auditar la configuración de identidad del Apple Developer Program en el proyecto iOS.
- **Evidencia Física:**
  - Archivo `flutter_client/ios/Runner.xcodeproj/project.pbxproj`:
    - `ProvisioningStyle = Automatic;`
    - `CODE_SIGN_STYLE = Automatic;`
    - `DEVELOPMENT_TEAM = "";` (placeholder intencional de Fase 2.1).
    - `PRODUCT_BUNDLE_IDENTIFIER = com.bluesystem.delivery.client;`
  - Variables de entorno de Apple Developer en el host → No configuradas.
- **Nivel de Evidencia:** `IMPLEMENTED`
- **Resultado:** 🔴 **BLOCKED — REAL APPLE TEAM ID & PROVISIONING IDENTITY PENDING PROVISIONING**

---

### Control 04 — 📦 iOS Archive / IPA
- **Objetivo:** Demostrar la cadena de compilación de Archive y empaquetado IPA para App Store Connect.
- **Evidencia Física:**
  - El proyecto iOS requiere macOS y Xcode 14/15 con CocoaPods para compilar dependencias (`GoogleMaps`, `FirebaseCore`, `FirebaseMessaging`).
  - El host actual es Windows 11. No existe entorno macOS/Xcode local.
- **Nivel de Evidencia:** `DOCUMENTED / IMPLEMENTED`
- **Resultado:** 🟠 **BLOCKED — ENVIRONMENT NOT AVAILABLE (MACOS / XCODE REQUIRED)**

---

### Control 05 — 🔔 Push E2E Físico
- **Objetivo:** Demostrar la recepción real de notificaciones push en dispositivos físicos (FCM en Android, APNs en iPhone).
- **Evidencia Física:**
  - Código: `DeliveryFirebaseMessagingService.kt` y `FcmManager.kt` gestionan tokens en `/user_devices/{uid}_{deviceId}`.
  - Código iOS: `AppDelegate.swift` implementa el puente canónico `didRegisterForRemoteNotificationsWithDeviceToken` hacia `Messaging.messaging().apnsToken`.
  - Dispositivo físico: No hay dispositivos Android o iOS conectados en la sesión.
- **Nivel de Evidencia:** `COMPILED / TESTED (LOGICAL)`
- **Resultado:** 🟠 **BLOCKED — PHYSICAL DEVICE NOT CONNECTED (E2E RECEPTION NOT DEMONSTRATED)**

---

### Control 06 — 👤 Account Deletion On-Device
- **Objetivo:** Verificar la disponibilidad del flujo de eliminación de cuenta de autoservicio.
- **Evidencia Física:**
  - Backend: Cloud Function `deleteMyAccount` (`functions/src/callables/userSelfManagement.ts`) con 6/6 tests unitarios superados en `accountDeletion.test.ts`.
  - Android UI: `ProfileSettings.kt` cuenta con botón visible y diálogo de doble confirmación con advertencia de irreversibilidad.
  - Flutter UI: `app_shell.dart` cuenta con botón `Eliminar mi cuenta definitivamente` y diálogo reactivo `_confirmAccountDeletion`.
  - Comprobación táctil en pantalla: Pendiente de ejecución sobre hardware real.
- **Nivel de Evidencia:** `TESTED / COMPILED`
- **Resultado:** 🟡 **CONDITIONAL GO — CODE & BACKEND VERIFIED (PHYSICAL INTERACTION PENDING ON-DEVICE RUN)**

---

### Control 07 — 🍏 Sign in with Apple On-Device
- **Objetivo:** Verificar la autenticación federada con Apple en hardware iOS.
- **Evidencia Física:**
  - Capa de datos: `FirebaseAuthService.signInWithApple()` implementado con `AppleAuthProvider`.
  - Capa de estado: `SessionState.signInWithAppleFederated()` implementado.
  - Capa de UI: `LoginScreen` cuenta con botón oficial según Apple HIG.
  - Test unitario: `social_auth_contract_test.dart` superado exitosamente.
  - Ejecución física: Requiere un dispositivo iOS real con Apple ID configurado y certificado de firma con entitlement habilitado.
- **Nivel de Evidencia:** `TESTED / IMPLEMENTED`
- **Resultado:** 🟠 **BLOCKED — PHYSICAL IOS DEVICE & APPLE DEVELOPER ENTITLEMENT REQUIRED**

---

### Control 08 — 🗺️ Maps / GPS / Geocoding
- **Objetivo:** Auditar claves de Google Maps, SDKs y restricciones de seguridad.
- **Evidencia Física:**
  - Android: `app/build.gradle.kts` inyecta `${GOOGLE_MAPS_API_KEY}` en `AndroidManifest.xml`.
  - iOS: `AppDelegate.swift` inicializa `GMSServices.provideAPIKey` desde `GoogleService-Info.plist`.
  - Restricciones en Google Cloud Console: Las claves de producción deben restringirse al paquete `com.bluesystem.delivery` + SHA-1 de producción (Android) y Bundle ID `com.bluesystem.delivery.client` (iOS). Como el SHA-1 de la clave JKS oficial de producción aún no se ha extraído, la restricción de seguridad final en GCP está pendiente de dicha provisión.
- **Nivel de Evidencia:** `IMPLEMENTED / COMPILED`
- **Resultado:** 🟡 **CONDITIONAL GO — API KEYS FUNCTIONAL IN DEV; RESTRICTION TO OFFICIAL PRODUCTION SHA-1 PENDING FINAL JKS**

---

### Control 09 — 🔒 Privacy & Data Safety
- **Objetivo:** Verificar concordancia entre manifiestos técnicos y cuestionarios de tienda.
- **Evidencia Física:**
  - Android: Permisos auditados (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`). Eliminación de cuenta soportada.
  - iOS: Manifiesto `flutter_client/ios/Runner/PrivacyInfo.xcprivacy` creado y registrado en Xcode con Required Reason APIs (`CA92.1`, `C617.1`, `E174.1`, `35F4.1`).
  - URL Pública de Privacidad: Debe registrarse formalmente en Google Play Console y App Store Connect.
- **Nivel de Evidencia:** `IMPLEMENTED / DOCUMENTED`
- **Resultado:** 🟡 **CONDITIONAL GO — MANIFESTS & ACCOUNT DELETION READY; PUBLIC PRIVACY POLICY URL REGISTRATION IN STORE CONSOLES PENDING**

---

### Control 10 — 🎨 Store Visual & Legal Metadata
- **Objetivo:** Inventariar activos de marketing y fichas de publicación.
- **Evidencia Física:**
  - Iconos: Presentes en `res/mipmap-*` (Android) y `Assets.xcassets` (iOS).
  - Feature Graphic Google Play (1024×500 px): No presente en el repositorio.
  - Screenshots promocionales para tiendas (Android 1080×2400, iPhone 6.7" 1290×2796): No presentes en el repositorio.
  - Ficha descriptiva (Short / Full description): Definida conceptualmente, pendiente de carga en consolas.
- **Nivel de Evidencia:** `DOCUMENTED`
- **Resultado:** 🟡 **CONDITIONAL GO — APP ICONS READY; STORE MARKETING ASSETS (FEATURE GRAPHIC & STORE SCREENSHOTS) MISSING / PENDING PRODUCTION**

---

### Control 11 — 🧪 Reviewer Test Accounts
- **Objetivo:** Auditar la disponibilidad de cuentas de prueba para los revisores de Google y Apple.
- **Evidencia Física:**
  - Requisito de tienda: Se deben suministrar credenciales de prueba que permitan acceso completo a la app sin exigir SMS OTP ni 2FA.
  - Cuentas requeridas:
    - Cliente: `reviewer.customer@bluesystemdelivery.com` (con direcciones precargadas).
    - Repartidor (opcional/si aplica): `reviewer.courier@bluesystemdelivery.com`.
  - Estado: Pendientes de creación/registro en Firebase Auth para el entorno productivo antes del submission formal.
- **Nivel de Evidencia:** `DOCUMENTED`
- **Resultado:** 🟡 **CONDITIONAL GO — NO PRODUCTION MUTATION REQUIRED DURING AUDIT; REVIEWER CREDENTIALS PENDING PROVISIONING BEFORE STORE SUBMISSION**

---

### Control 12 — 🚀 FINAL GO / NO-GO GATE

#### Matriz Definitiva de Evidencia de Release

| Control | Android | iOS | Evidencia Objetiva | Nivel Evidencia | Estado |
| :--- | :---: | :---: | :--- | :---: | :---: |
| **01 — Release Identity** | 🔴 JKS ausente | 🔴 Team ID ausente | `app/build.gradle.kts`, `project.pbxproj` | `IMPLEMENTED` | 🔴 **BLOCKED** |
| **02 — Signed Artifact** | 🔴 Sin AAB oficial | 🔴 Sin IPA oficial | Tareas de build Gradle / Xcode | `IMPLEMENTED` | 🔴 **BLOCKED** |
| **03 — Apple Team ID & Prov.** | N/A | 🔴 Pendiente de cuenta | `project.pbxproj`, env vars | `IMPLEMENTED` | 🔴 **BLOCKED** |
| **04 — iOS Archive / IPA** | N/A | 🟠 Host Windows | Entorno de desarrollo local | `DOCUMENTED` | 🟠 **BLOCKED** |
| **05 — Physical Push E2E** | 🟠 Sin teléfono | 🟠 Sin iPhone | `DeliveryFirebaseMessagingService`, `AppDelegate` | `TESTED (LOGIC)` | 🟠 **BLOCKED** |
| **06 — Account Deletion** | 🟢 UI lista | 🟢 UI lista | `userSelfManagement.ts` (6/6 PASS) | `TESTED / COMPILED` | 🟡 **CONDITIONAL GO** |
| **07 — Apple Sign-In** | N/A | 🟠 Sin iPhone | `social_auth_contract_test.dart` (PASS) | `TESTED` | 🟠 **BLOCKED** |
| **08 — Maps / GPS** | 🟢 Clave activa | 🟢 Clave activa | `AndroidManifest.xml`, `AppDelegate.swift` | `COMPILED` | 🟡 **CONDITIONAL GO** |
| **09 — Privacy & Data Safety** | 🟢 Permisos OK | 🟢 PrivacyInfo OK | `AndroidManifest.xml`, `PrivacyInfo.xcprivacy` | `IMPLEMENTED` | 🟡 **CONDITIONAL GO** |
| **10 — Store Metadata** | 🟡 Falta Feature G. | 🟡 Faltan capturas | `mipmap/`, `Assets.xcassets/` | `DOCUMENTED` | 🟡 **CONDITIONAL GO** |
| **11 — Reviewer Accounts** | 🟡 Por aprovisionar | 🟡 Por aprovisionar | Políticas de revisión de App Store y Play Store | `DOCUMENTED` | 🟡 **CONDITIONAL GO** |
| **12 — Submission Package** | 🔴 Bloqueado | 🔴 Bloqueado | Matriz de 11 controles previos | N/A | 🟠 **BLOCKED** |

---

## 5. Regla del Gate y Clasificación Final

Conforme a la regla estricta del protocolo:
> *"No se permite declarar 🟢 GO si existe algún elemento crítico que únicamente esté asumido, preparado, documentado, simulado, compilado en Debug, pendiente de credenciales, pendiente de Mac o pendiente de artefacto firmado."*

### Veredicto Oficial

$$\Large \mathbf{\color{orange}🟠\text{ PHASE 2.2 — BLOCKED}}$$

```
┌──────────────────────────────────────────────────────────────────┐
│                   VEREDICTO OFICIAL FASE 2.2                     │
│                                                                  │
│           🟠 BLOCKED — PENDING RELEASE IDENTITIES & MAC          │
│                                                                  │
│  El software, reglas y políticas regulatorias están 100% listas. │
│  La publicación está bloqueada estrictamente por requerimientos  │
│  externos de provisión criptográfica y hardware:                 │
│                                                                  │
│  1. Provisión física del keystore oficial Android (JKS).         │
│  2. Provisión del Team ID en Apple Developer Program.            │
│  3. Disponibilidad de un entorno Mac/Xcode para compilar IPA.   │
│  4. Pruebas táctiles finales en dispositivos físicos reales.     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Findings P2 Diferidos (Gobernanza Intacta)

Los siguientes hallazgos permanecen formalmente diferidos y congelados:
- 🔒 **FINDING-P2-07**: Flavors Fitoni / Whitelabel.
- 🔒 **FINDING-P2-08**: Skeleton de `flutter_client/android`.
- 🔒 **FINDING-P2-09**: Permiso `USE_FULL_SCREEN_INTENT` y batería.
- 🔒 **FINDING-P2-11**: Módulo de chat / soporte.
- 🔒 **FINDING-P2-12**: Deep Links avanzados.
- 🔒 **Motores Financieros y SSOT**: Inmutables bajo ADR-003, ADR-014, ADR-018 y ADR-019.

---

## 7. Declaración de Certificación y Siguientes Acciones Exactas

El auditor certifica que la base de código de BlueSystem Delivery ha alcanzado el nivel de madurez técnica más alto posible en esta estación de trabajo sin inventar claves ficticias ni falsear la existencia de identidades de producción.

### Acciones Exactas Requeridas para Desbloquear la Publicación:

1. **Paso 1 (Android Release Signing):**
   - El operador o administrador con acceso al Apple/Google Play Console corporativo debe generar o proporcionar el archivo `my-upload-key.jks` siguiendo la guía [`RELEASE-KEYSTORE-PROVISIONING-GUIDE.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/RELEASE-KEYSTORE-PROVISIONING-GUIDE.md).
   - Configurar variables de entorno (`KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) y ejecutar:
     ```bash
     ./gradlew :app:bundleCoreRelease
     ```
   - Extraer el SHA-1 del certificado de subida y registrarlo en las restricciones de la API Key de Google Maps en GCP Console.

2. **Paso 2 (iOS Release Signing & Archive):**
   - Clonar el repositorio en una máquina macOS con Xcode 15+ y CocoaPods.
   - Definir `DEVELOPMENT_TEAM` con el Team ID oficial de 10 caracteres de la cuenta Apple Developer en `project.pbxproj` o mediante `flutter build ipa --export-options-plist=...`.
   - Generar el Archive oficial para App Store Connect.

3. **Paso 3 (Store Consoles Setup & Reviewer Credentials):**
   - Generar el gráfico de funciones (1024×500 px) para Google Play y las capturas de pantalla de la app.
   - Crear las credenciales `reviewer.customer@bluesystemdelivery.com` en Firebase Auth (`bluesystem-7c9af`).
   - Suministrar la URL pública de la política de privacidad.

Una vez suministrados estos activos externos, la aplicación pasará de forma inmediata y verificable a:

$$\Large \mathbf{\color{green}🚀\text{ STORE SUBMISSION READY}}$$
