# C2D25E.1 — FIREBASE CLOSURE AUDIT
## Protocol ID: `BSD-C2D25E1-EXTERNAL-PROVISIONING-HARDENING-CLOSURE-001`

---

### 1. Auditoría Forense de `app/google-services.json`

Se realizó una inspección detallada del archivo `app/google-services.json`:

```json
{
  "project_info": {
    "project_number": "514416631826",
    "project_id": "bluesystem-7c9af",
    "storage_bucket": "bluesystem-7c9af.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:514416631826:android:788b99430f87324e88b8cb",
        "android_client_info": {
          "package_name": "com.aistudio.delivery.djweq"
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

---

### 2. Puntos de Verificación Canónicos

1. **Estado actual:** Archivo presente y válido para el cliente core.
2. **Cantidad de clientes Android:** Exactamente `1`.
3. **Package names registrados:** Únicamente `com.aistudio.delivery.djweq`.
4. **Presencia del cliente del segundo producto:** ❌ **AUSENTE**.
5. **Correspondencia con applicationId:** Solo hace match con `core`.
6. **Consistencia de `mobilesdk_app_id`:** Válido para cliente 1.
7. **Consistencia del `project_id`:** `bluesystem-7c9af`.
8. **Ausencia de configuración ambigua:** No hay conflicto, pero carece de multi-app.
9. **Ausencia de modificación destructiva del cliente core:** Cliente core 100% intacto.
10. **Resultado GAP-FB-01:** 🔴 **OPEN / BLOCKED** (`EXTERNAL HUMAN ACTION REQUIRED`).

---

### 3. Instrucción de Cierre para el Operador Humano

El operador humano debe:
1. Ir a [Firebase Console](https://console.firebase.google.com/) -> Proyecto `bluesystem-7c9af`.
2. Agregar la Android App con el `package_name` objetivo (ej. `com.fitoni.delivery` o package acordado).
3. Ingresar la huella SHA-1 de debug: `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`.
4. Descargar el archivo `google-services.json` consolidado (que contendrá ambos clientes en el array `client`).
5. Reemplazar `app/google-services.json`.
