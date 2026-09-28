# C2D.29 — FCM / NOTIFICATIONS iOS READINESS
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Module:** `PlatformNotificationAdapter` (`flutter_client/lib/platform/notifications/notification_adapter.dart`)  
**Date:** 2026-09-14  

---

## 1. Auditoría del Flujo de Notificaciones
Se analizó la implementación de `PlatformNotificationAdapter`:
- **Librerías:** `firebase_messaging: ^14.7.10` y `flutter_local_notifications: ^16.3.2`.
- **Inicialización iOS (Darwin):**
  - Solicita permisos con `DarwinInitializationSettings(requestAlertPermission: true, requestBadgePermission: true, requestSoundPermission: true)`.
  - Configura presentación de alertas locales en primer plano con `DarwinNotificationDetails()`.
- **Registro de Tokens en Core Firestore:**
  - Token obtenido vía `FirebaseMessaging.instance.getToken()`.
  - Almacenado atómicamente en dos colecciones canónicas:
    1. `/users/{uid}`: `fcmToken`, `fcmTokens: FieldValue.arrayUnion([token])`, `lastTokenUpdate: serverTimestamp()`.
    2. `/user_devices/{uid}_flutter`: `uid`, `token`, `platform: 'flutter'`, `updatedAt: serverTimestamp()`.

---

## 2. Protección de Aislamiento y No Creación de Colecciones Paralelas
- ❌ **Cero Colecciones Paralelas:** No se crean `/ios_devices`, `/ios_notifications` ni `/ios_orders`.
- 🟢 **Canal Unificado:** El backend de Cloud Functions que despacha push (`dispatcher`) consume directamente la colección estándar `/user_devices/` y `/users/{uid}`, reconociendo los tokens de dispositivos iOS a través del puente APNs de FCM sin alterar la lógica de despacho.

---

## 3. Estado de la Cadena FCM → APNs → iOS
```
[Cloud Functions Dispatcher] ──> [FCM Backend] ──X──> [APNs] ──> [iOS Device]
                                                  ▲
                                                  │
                                          Auth Key .p8 requerida
```
La cadena está completamente implementada a nivel de código de cliente y backend, pero bloqueada en el salto externo FCM → APNs debido a la ausencia de la clave `.p8` (GAP-APNS-01).

---

## 4. Veredicto de Notificaciones iOS
```
NOTIFICATION_ADAPTER_STATUS = VERIFIED
DATA_ISOLATION_COMPLIANCE   = PASS (Uses canonical /users and /user_devices)
APNS_LINK_STATUS            = BLOCKED_EXTERNAL (GAP-APNS-01 pending)
```
