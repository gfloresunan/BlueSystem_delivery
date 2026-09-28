# C2D25 — SECRET SECURITY & CREDENTIAL ISOLATION
## Aislamiento Estricto de Secretos y Llaves de Infraestructura
**Protocol ID:** `C2D.25`  

---

### 1. Regla Inviolable de Secretos
- **Cero Secretos en Git / Código Fuente:** Prohibido almacenar keystores, llaves privadas de servicio, contraseñas de release o secrets de Google Cloud en el repositorio.
- **Inyección en Memoria / CI Runner:** Las credenciales de firma (`STORE_PASSWORD`, `KEY_PASSWORD`) solo se consumirán desde Google Cloud Secret Manager o variables de entorno efímeras en el servidor de compilación.
- **Sanitización de Logs:** El Build Engine filtrará cualquier variable sensible en la salida de consola de Gradle.
