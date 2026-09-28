# C2D25E — GAP ANALYSIS REPORT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Registro y Clasificación Formal de Brechas (GAPs)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLASIFICACIÓN DE GAPS                              │
├─────────────┬──────────┬────────────────────────────────────────────────────┤
│ GAP ID      │ SEVERITY │ DESCRIPCIÓN Y ÁREA AFECTADA                        │
├─────────────┼──────────┼────────────────────────────────────────────────────┤
│ GAP-FB-01   │ P0       │ Firebase Multi-App Provisioning Faltante           │
│ GAP-BA-01   │ P1       │ Inyección de Launcher Icons & Splash no automatizada│
│ GAP-FB-02   │ P2       │ Restricciones de Google Maps API Key por Package   │
│ GAP-SG-01   │ P3       │ Automatización de Secretos de Firma de Release     │
└─────────────┴──────────┴────────────────────────────────────────────────────┘
```

---

### 2. Análisis Detallado por Brecha

#### GAP-FB-01: Firebase Multi-App Provisioning (P0 — BLOCKER)
- **Evidencia:** `app/google-services.json` contiene únicamente un objeto dentro del arreglo `client`, correspondiente a `com.aistudio.delivery.djweq`.
- **Riesgo:** La compilación de un segundo `applicationId` (ej. `com.fitoni.delivery` o package personalizado) generará fallos críticos de inicialización en `FirebaseAuth`, `FirebaseMessaging` y `AppCheck` en tiempo de ejecución.
- **Acción Requerida:** Intervención humana externa en Firebase Console para registrar la nueva Android App y proveer el JSON consolidado.

#### GAP-BA-01: Launcher & Splash Asset Injection Pipeline (P1 — HIGH)
- **Evidencia:** `app/src/main/res/values/themes.xml` referencia `@drawable/bluesystem_logo` para `Theme.App.Starting` y `ic_launcher` en mipmaps es estático.
- **Riesgo:** Los APKs de marcas blancas generados mostrarían el ícono y splash de BlueSystem en lugar de su propia identidad visual.
- **Acción Requerida:** Diseñar pipeline pre-build en el repositorio que superponga temporalmente los mipmaps e ícono de splash del `brandId` correspondiente.

#### GAP-FB-02: Google Maps Package & SHA-1 Whitelist (P2 — MEDIUM)
- **Evidencia:** La clave de API de Maps configurada en `AndroidManifest.xml` requiere autorización por package y huella SHA-1.
- **Riesgo:** El mapa interactivo y geocodificador no cargarán tiles ni resolverán direcciones en el nuevo APK si el package name no está autorizado en Google Cloud Console.
- **Acción Requerida:** Añadir el nuevo `package_name` y SHA-1 en la consola de Google Cloud.

#### GAP-SG-01: Automated Release Secret Management (P3 — LOW)
- **Evidencia:** El bloque `signingConfigs.release` en `app/build.gradle.kts` utiliza variables de entorno manuales (`KEYSTORE_PATH`, `STORE_PASSWORD`, etc.).
- **Riesgo:** Ineficiencia operativa en futuros pipelines CI/CD de producción.
- **Acción Requerida:** Integración con Google Cloud Secret Manager en fase C2D.26.
