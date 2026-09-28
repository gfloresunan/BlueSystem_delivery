# C2D25E — EXTERNAL PROVISIONING CHECKLIST
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

> [!IMPORTANT]
> Esta lista de verificación contiene las **ACCIONES EXTERNAS OBLIGATORIAS** que un operador humano debe ejecutar en las consolas de Google Cloud / Firebase antes de emitir una autorización física para un segundo build.

---

### 1. Checklist de Acciones Externas (Humano)

- [ ] **Acción 1 (Firebase Console):**
  - Acceder al proyecto `bluesystem-7c9af`.
  - Añadir una nueva aplicación Android con el `package_name` del segundo producto (ej. `com.fitoni.delivery` o package de WhiteLabel).
  - Registrar la huella digital SHA-1 de Debug: `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`.
  - Descargar el archivo `google-services.json` consolidado.

- [ ] **Acción 2 (Google Cloud Console):**
  - Acceder a APIs & Services -> Credentials en el proyecto de GCP.
  - Seleccionar la clave de API de Google Maps Android SDK.
  - Añadir el nuevo `package_name` y la huella SHA-1 al whitelist de aplicaciones autorizadas.

- [ ] **Acción 3 (Repositorio):**
  - Colocar el nuevo `google-services.json` en `app/google-services.json`.
  - Verificar que el archivo contenga tanto el cliente canónico `com.aistudio.delivery.djweq` como el nuevo cliente registrado.

- [ ] **Acción 4 (Brand Assets):**
  - Cargar el set de assets de la nueva marca (ícono adaptativo y logo vectorial) en la colección `brands` y bucket de Storage correspondiente.
