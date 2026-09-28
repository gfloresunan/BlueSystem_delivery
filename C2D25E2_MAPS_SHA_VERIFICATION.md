# C2D25E.2 — GOOGLE MAPS & SHA-1 VERIFICATION
## Protocol ID: `BSD-C2D25E2-MULTI-BRAND-PROVISIONING-HARDENING-CLOSURE-001`

---

### 1. Estado de Autorización de Maps SDK for Android

- **API Key Configuration:** `${GOOGLE_MAPS_API_KEY}` resuelto vía `defaultConfig` en `app/build.gradle.kts`.
- **Package Actual Autorizado:** `com.aistudio.delivery.djweq`.
- **Huella SHA-1 de Debug:** `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`.
- **Target Package:** Requiere autorización explícita en GCP Console para habilitar renderizado de mapas y geocodificación nativa (ADR-015).

---

### 2. Checklist para el Operador Humano

1. Acceder a [Google Cloud Console](https://console.cloud.google.com/) -> APIs & Services -> Credentials.
2. Seleccionar la API Key de Maps Android SDK.
3. En **Application restrictions** (Android apps), añadir el nuevo `package_name` y la huella SHA-1: `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`.
4. Guardar los cambios.

---

### 3. Veredicto GAP-FB-02
🔴 **OPEN / BLOCKED (EXTERNAL ACTION REQUIRED).**
