# C2D25 — FIREBASE BUILD STRATEGY
## Validación y Mapeo de Clientes Firebase en Tiempo de Compilación
**Protocol ID:** `C2D.25`  

---

### 1. Validación Pre-Build de `google-services.json`
Antes de invocar a Gradle, el Build Engine validará:
1. Que el `applicationId` solicitado en `BuildRequest` exista registrado en el array `client[].client_info.android_client_info.package_name` de `google-services.json`.
2. Que el `firebaseAppId` coincida exactamente con el `mobilesdk_app_id` del cliente.
3. Si no existe coincidencia, el Build Engine aborta la operación con código `FIREBASE_CLIENT_NOT_PROVISIONED` para evitar generar binarios con errores de autenticación o Play Integrity.
