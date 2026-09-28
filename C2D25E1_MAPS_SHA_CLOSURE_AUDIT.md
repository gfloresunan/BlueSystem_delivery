# C2D25E.1 — GOOGLE MAPS & SHA-1 CLOSURE AUDIT
## Protocol ID: `BSD-C2D25E1-EXTERNAL-PROVISIONING-HARDENING-CLOSURE-001`

---

### 1. Estado de Autorización de Google Maps Android SDK

- **Placeholder en Manifest:** `${GOOGLE_MAPS_API_KEY}` resuelto en `app/build.gradle.kts`.
- **Package Actual Autorizado:** `com.aistudio.delivery.djweq`.
- **Huella SHA-1 de Debug:** `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`.
- **Riesgo Operativo:** Si se compila un nuevo package (ej. `com.fitoni.delivery`) sin registrarlo en Google Cloud Console, el mapa renderizará tiles grises y la API de geocodificación fallará en tiempo de ejecución.

---

### 2. Puntos de Verificación Canónicos

1. **Package objetivo autorizado en GCP Console:** No verificable localmente / No registrado formalmente.
2. **SHA-1 objetivo autorizado:** Requiere asociación en la misma API Key.
3. **Credenciales en el repositorio:** Cero credenciales privadas expuestas; uso seguro de `local.properties` / `.env`.
4. **Resultado GAP-FB-02:** 🔴 **OPEN / BLOCKED** (`EXTERNAL HUMAN ACTION REQUIRED`).

---

### 3. Instrucción de Cierre para el Operador Humano

1. Acceder a [Google Cloud Console](https://console.cloud.google.com/) -> APIs & Services -> Credentials.
2. Localizar la clave de API utilizada para Maps SDK for Android.
3. En la sección **Application restrictions** (Android apps), añadir el nuevo `package_name` y la huella SHA-1 de debug (`E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`).
4. Guardar los cambios.
