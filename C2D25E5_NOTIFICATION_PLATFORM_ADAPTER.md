# C2D.25E.5 — NOTIFICATION PLATFORM ADAPTER SPECIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Arquitectura de Notificaciones Push (FCM + APNs)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION ADAPTER ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                     INotificationService (Domain)                           │
│                                   │                                         │
│                 PlatformNotificationAdapter (Data)                          │
│                                   │                                         │
│         ┌─────────────────────────┴─────────────────────────┐               │
│         │                                                   │               │
│         ▼                                                   ▼               │
│  Firebase Cloud Messaging                           Apple Push Notification  │
│  (FCM Direct Channels)                             Service (APNs Payload)   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Registro Multidispositivo y Canales

- **Registro en Firestore:** El token de dispositivo se almacena atómicamente en `/users/{uid}` (`fcmTokens: FieldValue.arrayUnion([token])`).
- **Compatibilidad con `notificationQueueWorker.ts`:** El backend genera payloads duales con soporte para cabeceras `android` y cabeceras `apns` (`headers: { "apns-priority": "10" }`), garantizando entrega oportuna tanto en Android como en iOS.
