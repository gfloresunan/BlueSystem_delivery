# C2D.29 — BASELINE & PROTOCOL INVENTORY
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Execution Mode:** FORENSIC / CONTROLLED / FAIL-CLOSED  
**Target:** `com.bluesystem.delivery.client` (Track B — Commercial Flutter Client)  
**Date:** 2026-09-14  

---

## 1. Contexto de Entrada Certificado (C2D.28 Baseline)
En la fase C2D.28 se estableció la línea base inmutable y la preparación externa multi-plataforma:
- **Track B (Flutter Commercial Client):** Estructura modular Clean Architecture completa en `flutter_client/lib/`.
- **Track A (Android Nativo):** `app/` blindado y 100% operativo con cliente de referencia `com.aistudio.delivery.djweq`.
- **Core Backend:** Cloud Functions (`functions/src/index.ts`), Firestore Rules (`firestore.rules`), EIAM v3 y Gatekeeper intactos.
- **Tenant Isolation:** Tenants 01, 02 y 03 activos; Tenant 04 estrictamente `ABSENT` y `LOCKED`.
- **Build Firewall:** 0 builds de Flutter, 0 builds de Xcode, 0 builds de Gradle, 0 artefactos binarios (.app, .ipa, .apk, .aab).
- **External Gaps Identificados en C2D.28:**
  - `GAP-02`: Firebase iOS app no registrada (`BLOCKED_EXTERNAL`).
  - `GAP-MAPS-02`: Maps SDK for iOS no habilitado / API key iOS no aprovisionada (`BLOCKED_EXTERNAL`).
  - `GAP-APNS-01`: APNs Auth Key `.p8` no configurada en Firebase Cloud Messaging (`BLOCKED_EXTERNAL`).
  - Bundle ID iOS: No registrado en Apple Developer Portal (`NOT_REGISTERED`).
  - `GAP-SG-01`: Release Signing (`DEFERRED`).

---

## 2. Alcance y Fronteras Operativas de C2D.29
El objetivo exclusivo de C2D.29 es verificar, auditar y documentar forensemente los prerrequisitos externos requeridos para que el cliente comercial Flutter iOS pueda proceder posteriormente a la generación física del host iOS (`C2D.29.1`) y ulteriormente a un build controlado (`C2D.30`).

### Prohibiciones Terminantes (Build & Generation Firewall)
- ❌ NO generar host iOS (`flutter create .`, `ios/`, `Runner/`, `.xcodeproj`, `.xcworkspace`, `Podfile`).
- ❌ NO ejecutar builds (`flutter build ios`, `flutter build ipa`, `xcodebuild`).
- ❌ NO generar artefactos (.app, .ipa).
- ❌ NO firmar aplicaciones ni crear certificados de distribución sin fase autorizada.
- ❌ NO distribuir a TestFlight ni App Store Connect.
- ❌ NO simular plists (`GoogleService-Info.plist`), credenciales ni API keys sintéticas.
- ❌ NO modificar Track A (`app/`).
- ❌ NO modificar Core backend ni Firestore rules.
- ❌ NO consumir Level 6 ni conceder Level 7.

---

## 3. Inventario de Estado Físico del Workspace al Inicio de C2D.29
| Componente | Estado Físico | Observación |
| :--- | :--- | :--- |
| `flutter_client/ios/` | ❌ NO EXISTE | Diferido por diseño a C2D.29.1 |
| `flutter_client/build/` | ❌ NO EXISTE | Invariante Zero-Build intacta |
| `flutter_client/GoogleService-Info.plist` | ❌ NO EXISTE | Sin plists simulados |
| `app/` (Track A) | 🟢 INTACTO | Cliente de referencia verificado |
| `functions/` (Core) | 🟢 INTACTO | Cero mutaciones en backend |
| `firestore.rules` (Core) | 🟢 INTACTO | SSOT de seguridad inalterada |
| `Tenant 04` | 🔒 LOCKED / ABSENT | Cero referencias en configuración |
