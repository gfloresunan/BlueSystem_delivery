# C2D25A — SIGNING AUDIT REPORT
## Auditoría de Esquema de Firma de Binarios
**Protocol ID:** `C2D.25A`  

---

### 1. Estado de Configuración de Firma
- **Firma Debug (`debugConfig`):** Utiliza `debug.keystore` con credenciales estándar de Android (`android/androiddebugkey`), seguro para pruebas internas y desarrollo.
- **Firma Release (`release`):** Consume variables de entorno (`KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`). Si no están presentes en tiempo de compilación release, la compilación se suspende de forma segura.
- **Aislamiento:** La configuración de firma no está expuesta a código de aplicación Kotlin ni accesible en runtime.
