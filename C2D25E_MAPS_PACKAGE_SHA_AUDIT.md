# C2D25E — MAPS PACKAGE & SHA-1 AUDIT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Estado de Autorización de Google Maps Platform

- **Manifest Declaration:** Declarado en `app/src/main/AndroidManifest.xml` (Línea 27-29) mediante el placeholder `${GOOGLE_MAPS_API_KEY}`.
- **Inyección de Clave:** Resuelto en `defaultConfig` desde `local.properties` (con fallback de desarrollo).
- **Restricciones de API Key (GCP Console):**
  - Restricción de Aplicación: **Aplicaciones de Android**.
  - Restricción de Paquete: Actualmente autoriza `com.aistudio.delivery.djweq`.
  - Huella Digital SHA-1 Autorizada: `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F` (Debug Keystore).

---

### 2. Requerimientos para el Segundo Producto
Para garantizar que el mapa interactivo y la geocodificación nativa (ADR-015) funcionen sin fallos en el segundo APK:
1. Añadir el nuevo `applicationId` y la huella SHA-1 de debug en la consola de Google Cloud (Credenciales de Maps SDK for Android).
2. No se requieren cambios en el código Kotlin ni en `AndroidManifest.xml`.
