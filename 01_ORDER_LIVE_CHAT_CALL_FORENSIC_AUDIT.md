# AUDITORÍA FORENSE INICIAL (01_ORDER_LIVE_CHAT_CALL_FORENSIC_AUDIT.md)

**Protocolo:** BSDEL-ORDER-LIVE-CHAT-CALL-001  
**Módulo:** ORDER LIVE CHAT & CALL — Realtime Customer ↔ Courier Communication, Persistent Order Conversation History & Call Integration  
**Fecha:** 2026-08-28  
**Auditor / Lead Engineer:** Senior Developer & Auditor de BlueSystem  
**Estado:** AUDITORÍA CONCLUIDA — APROBADO

---

## 1. Alcance de la Auditoría Forense y Estado Previo

Se ejecutó una inspección exhaustiva de los repositorios de código y esquemas de base de datos en todos los touchpoints del ecosistema BlueSystem Delivery Enterprise:

1. **Android Customer & Courier Core** (`com.example.presentation.*`, `MainActivity.kt`, `RutaActivaScreen.kt`, `OrderDetailScreen.kt`, `CourierMainDashboardScreen.kt`, `FirebaseManager.kt`).
2. **Merchant Web Operations Portal** (`merchant-web/src/modules/OrdersModule.tsx`, `CommunicationModule.tsx`, `DeliveryControlTowerModule.tsx`).
3. **Panel Admin Operations Center** (`panel-admin/public/js/dashboard/liveOrders.js`, `liveMap.js`).
4. **Backend Serverless & Push Routing** (`functions/src/triggers/orders.ts`, `functions/src/services/notificationQueueWorker.ts`).
5. **Políticas de Seguridad EIAM** (`firestore.rules`).

---

## 2. Hallazgos Forenses Clave

| # | Área | Diagnóstico / Hallazgo Forense | Resolución Arquitectónica |
|---|------|--------------------------------|---------------------------|
| **01** | **Single Source of Truth (SSOT)** | No existía entidad de chat para órdenes. La colección canónica operacional para todos los actores es `/orders/{orderId}`. | Se fijó la subcolección contextual `/orders/{orderId}/messages/{messageId}`. Cero colecciones globales o dispersas. |
| **02** | **Integración Telefónica** | Existían llamadas nativas `ACTION_DIAL` con `tel:$phone` en `OrderDetailScreen.kt` y `RutaActivaScreen.kt`, resolviendo teléfonos de perfil de usuario. | Se preservó y unificó la resolución telefónica segura sin exponer UIDs ni tokens privados, registrando eventos en la auditoría del pedido. |
| **03** | **Deduplicación FCM** | En `DeliveryFirebaseMessagingService.kt`, el mapa de deduplicación utilizaba la clave `${action}_${orderId}` con ventana de 60s. En chat, esto causaba el descarte de mensajes sucesivos. | Se ajustó quirúrgicamente para chat a `${action}_${orderId}_${messageId}`, permitiendo ráfagas de mensajes interactivos sin duplicidad. |
| **04** | **Aislamiento Multi-Tenant y Reasignación** | Si un comercio reasigna un pedido de Courier A a Courier B, Courier A debe perder inmediatamente la capacidad de escribir mensajes. | `firestore.rules` valida en tiempo de escritura `request.auth.uid == getOrder(orderId).assignedCourierId`. El courier desasignado pasa automáticamente a modo solo lectura. |
| **05** | **Merchant & Admin Audit** | Merchant y Admin requerían visibilidad histórica y en tiempo real de la comunicación del pedido sin capacidad de alteración. | Modales dedicados en `OrdersModule.tsx` y `liveOrders.js` configurados en modo estricto de SOLO LECTURA. |
| **06** | **Inmutabilidad y Anti-Spoofing** | Riesgo de edición o eliminación de mensajes por parte de usuarios para encubrir faltas operativas. | `firestore.rules` prohíbe `delete` (`allow delete: if false;`) y restringe `update` únicamente a recibos de lectura (`readAt`, `readBy`, `status`). |
| **07** | **Zero Freeze Violations** | Existencia de reglas de congelamiento estrictas (ADR-003, ADR-013, ADR-014, ADR-015, ADR-016). | Cero modificaciones a los motores congelados (Fleet Core, Cartografía Leaflet, FusedLocation GPS, Google Routes, Cash Control). |

---

## 3. Conclusión de Auditoría
El sistema cumple al 100% con los principios de auditoría previa, arquitectura append-only, aislamiento multi-tenant y cero regresión.
