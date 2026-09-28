# C2D.29 — iOS CAPABILITIES MATRIX
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target:** `com.bluesystem.delivery.client`  
**Date:** 2026-09-14  

---

## 1. Principio de Justificación Estricta (Zero-Invention Rule)
No se activará ninguna capability de iOS únicamente por conveniencia o por ser común en aplicaciones móviles. Cada capability debe estar expresamente justificada por:
1. Código existente en `flutter_client/lib/`.
2. Dependencias declaradas en `flutter_client/pubspec.yaml`.
3. Contratos de integración con el Core de BlueSystem Delivery.

---

## 2. Matriz Completa de Capabilities y Evaluación Forense

| Capability iOS | Justificación en Código / Arquitectura | Estado C2D.29 |
| :--- | :--- | :--- |
| **Push Notifications** | `PlatformNotificationAdapter` (FCM + APNs) en `flutter_client/lib/platform/notifications/` | 🟢 **REQUIRED** (Debe activarse en App ID) |
| **Background Modes: Remote Notifications** | Wakeup de mensajería en segundo plano para recepción de estados de órdenes | 🟢 **REQUIRED** (`UIBackgroundModes: [remote-notification]`) |
| **Background Modes: Location Updates** | No requerido para cliente comercial consumidor (sólo tracking en primer plano) | ⚪ **NOT_REQUIRED** |
| **Background Modes: Background Processing** | No hay tareas prolongadas en segundo plano implementadas en cliente Flutter | ⚪ **NOT_REQUIRED** |
| **Sign in with Apple** | Arquitectura actual utiliza Firebase Auth nativo (Email/Password & SMS/Phone) | 🟡 **DEFERRED** (No contemplado en alcance actual) |
| **Associated Domains (Universal Links)** | Enlaces dinámicos diferidos para fases posteriores | 🟡 **DEFERRED** |
| **Keychain Sharing** | `PlatformSecureStorage` utiliza Keychain estándar de app; no comparte con extensiones | ⚪ **NOT_REQUIRED** |
| **In-App Purchase (IAP)** | Modelo de cobro opera mediante pasarelas bancarias y contra-entrega en Core | ⚪ **NOT_REQUIRED** |
| **App Groups** | No existen widgets de pantalla de inicio ni extensiones auxiliares | ⚪ **NOT_REQUIRED** |
| **Critical Alerts** | Reservado a servicios de emergencia / salud médica | ⚪ **NOT_REQUIRED** |

---

## 3. Capabilities Mínimas Requeridas para Host iOS
Para la generación del host en C2D.29.1, el conjunto exacto de capabilities autorizadas es:
1. `Push Notifications`
2. `UIBackgroundModes: remote-notification`

Cualquier adición adicional queda estrictamente prohibida sin un ADR previo y evidencia objetiva.
