# C2D25D — IMPLEMENTATION PLAN (PROPOSED HARDENING)
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

> [!IMPORTANT]
> Este documento es una **PROPUESTA TÉCNICA DE HARDENING**. Ningún cambio será ejecutado automáticamente durante C2D.25D.

---

### 1. Objetivos del Plan de Hardening
Cerrar las brechas identificadas (**GAP-FB-01** y **GAP-BA-01**) para preparar la infraestructura antes de emitir una autorización para un segundo build físico.

---

### 2. Acciones Propuestas

#### Fase 1: Sincronización de Firebase Multi-App (GAP-FB-01)
- **Acción Externa (Humana):** Registrar el segundo `applicationId` (ej. `com.fitoni.delivery` o package personalizado) en el proyecto Firebase `bluesystem-7c9af`.
- **Acción en Repositorio:** Actualizar `app/google-services.json` con el archivo consolidado que contenga ambos clientes Android.
- **Impacto en Seguridad:** 0 riesgo; mantiene un único proyecto con autenticación segura por package.

#### Fase 2: Automatización de Assets de Launcher (GAP-BA-01)
- **Acción en Repositorio:** Diseñar un task o script de Gradle pre-build que, a partir del `brandId`, descargue o posicione el set de mipmaps del ícono adaptativo en el directorio de build temporal antes de invocar `assembleWhitelabelDebug`.
- **Impacto en Seguridad:** Cero contaminación entre marcas; los assets temporales se eliminan tras el build.

---

### 3. Criterios de Certificación para el Futuro Segundo Build
- `google-services.json` verificado con `client.length >= 2`.
- Token Level 6 de autorización humana específico para el segundo producto.
- Consumo single-use de token y cálculo de clave de idempotencia.
- Un único APK generado y verificado mediante SHA-256.
