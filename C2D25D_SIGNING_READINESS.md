# C2D25D — SIGNING READINESS REPORT
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

---

### 1. Evaluación del Esquema de Firma de la Fábrica

| Ambiente | Esquema de Firma | Ubicación de Llave | Estado de Seguridad |
|---|---|---|---|
| **Development / Staging** | `debugConfig` | `~/.android/debug.keystore` | 🟢 Listo y Seguro |
| **Controlled Multi-Brand Debug** | `debugConfig` | `~/.android/debug.keystore` | 🟢 Listo y Seguro |
| **Production / Release** | `release` | Keystore externo parametrizado | 🔒 **BLOQUEADO (Requiere Nivel 7 / Secret Manager)** |

---

### 2. Principios de Seguridad de Firma
1. **Zero Secret Exposure:** Ningún keystore privado de producción ni contraseña está almacenado en el repositorio git ni en `build.gradle.kts`.
2. **Parametrización por Entorno:** Las variables de release (`KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_PASSWORD`) se resuelven exclusivamente mediante variables de entorno en servidores CI/CD dedicados o Google Cloud Secret Manager.
3. **Firma Debug Predeterminada:** Para todas las pruebas de validación de fábrica física (hasta Nivel 6), se utiliza exclusivamente la firma debug estándar, eliminando cualquier riesgo de compromiso de credenciales comerciales.

---

### 3. Veredicto
🟢 **SIGNING FACTORY READINESS: GREEN (Apropiado para Entornos de Validación Controlada).**
