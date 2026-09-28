# C2D25E — FIREBASE PROVISIONING AUDIT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Auditoría Estructural de `google-services.json`

- **Archivo Analizado:** `app/google-services.json`
- **Project ID:** `bluesystem-7c9af`
- **Project Number:** `514416631826`
- **Total de Clientes Android Registrados:** 1
  - Client 1: `com.aistudio.delivery.djweq` (App ID: `1:514416631826:android:788b99430f87324e88b8cb`)

---

### 2. Mecanismo de Resolución del Plugin `google-services`

El plugin Gradle de Google Services itera sobre el arreglo `client: [...]` y busca una coincidencia exacta con el `applicationId` resuelto para la variante de compilación:

```text
Build Variant 'whitelabelDebug' -> applicationId: 'com.secondbrand.delivery'
                                        │
                                        ▼
                  ¿Existe en google-services.json?
                     ├── SÍ ──► Genera valores R.string correctos ──► 🟢 PASS
                     └── NO ──► Emite Warning/Error; Falla Auth/FCM en Runtime ──► 🔴 FAIL
```

---

### 3. Delimitación de Acciones: Repositorio vs Externa
- **Operación del Repositorio:** Soportar múltiples clientes dentro del mismo `google-services.json` sin modificar el código fuente.
- **Operación Humana Externa (Requerida):** Entrar a Firebase Console (`bluesystem-7c9af`), pulsar "Añadir aplicación", ingresar el `applicationId` y huella SHA-1, y descargar el archivo `google-services.json` actualizado.
