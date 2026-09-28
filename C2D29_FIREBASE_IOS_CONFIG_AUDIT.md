# C2D.29 — FIREBASE iOS CONFIGURATION AUDIT
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target:** `GoogleService-Info.plist` Specifications  
**Date:** 2026-09-14  

---

## 1. Reglas de Validación de Autenticidad del Plist
Para garantizar que la futura integración en C2D.29.1 sea 100% auténtica y evitar configuraciones erróneas o proyectos cruzados, el archivo `GoogleService-Info.plist` descargado de Firebase Console deberá satisfacer estrictamente la siguiente matriz de correspondencia:

| Clave XML en Plist | Valor Esperado | Validación de Integridad |
| :--- | :--- | :--- |
| `PROJECT_ID` | `bluesystem-7c9af` | Coincidencia estricta con Core Project |
| `BUNDLE_ID` | `com.bluesystem.delivery.client` | Coincidencia estricta con Target C2D.29 |
| `GCM_SENDER_ID` | `514416631826` | Coincidencia con Project Number oficial |
| `GOOGLE_APP_ID` | `1:514416631826:ios:<hash>` | Formato canónico de Firebase App ID iOS |
| `STORAGE_BUCKET` | `bluesystem-7c9af.appspot.com` | Coincidencia con Storage Core |
| `DATABASE_URL` | Coincidente con proyecto | URL de Firestore/RTDB oficial |
| `IS_GCM_ENABLED` | `true` | Notificaciones FCM habilitadas |

---

## 2. Protección y Manejo de Secretos
- **Ubicación Definitiva (C2D.29.1):** `flutter_client/ios/Runner/GoogleService-Info.plist`.
- **Prohibición C2D.29:** En esta fase queda terminantemente prohibido generar plists ficticios con `CLIENT_ID` o `API_KEY` inventadas.
- **Regla de No Exposición:** En reportes de auditoría y commits públicos, los campos sensibles (`API_KEY`, `CLIENT_ID`, `REVERSED_CLIENT_ID`) deben ser ofuscados como `[REDACTED_FOR_SECURITY]` o comparados por hash SHA-256.

---

## 3. Estado de Existencia en Workspace
- `flutter_client/GoogleService-Info.plist`: ❌ NO EXISTE
- `flutter_client/ios/Runner/GoogleService-Info.plist`: ❌ NO EXISTE (Directorio no creado)
- `app/google-services.json`: 🟢 PRESENTE (Track A Android de referencia, no modificado)

---

## 4. Veredicto de Configuración Firebase iOS
```
PLIST_SPECIFICATION_CONTRACT = FULLY_DEFINED
PLIST_AUTHENTICITY_VERIFIED  = BLOCKED_EXTERNAL (Awaiting real file from Firebase Console)
STATUS                       = READY_FOR_PHYSICAL_IMPORT_IN_C2D29_1
```
