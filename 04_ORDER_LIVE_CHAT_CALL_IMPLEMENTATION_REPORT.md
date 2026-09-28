# REPORTE DE IMPLEMENTACIÓN DETALLADO (04_ORDER_LIVE_CHAT_CALL_IMPLEMENTATION_REPORT.md)

**Protocolo:** BSDEL-ORDER-LIVE-CHAT-CALL-001  
**Módulo:** ORDER LIVE CHAT & CALL  
**Fecha:** 2026-08-28  
**Estado:** IMPLEMENTACIÓN COMPLETADA

---

## 1. Resumen de Archivos y Componentes Creados / Modificados

### 1.1 Backend Cloud Functions
- **`functions/src/triggers/orderChat.ts` [NUEVO]**:
  - Implementa el trigger `onOrderChatMessageCreated` en `orders/{orderId}/messages/{messageId}`.
  - Resuelve autoritativamente al destinatario desde `/orders/{orderId}`.
  - Consulta tokens activos en `/user_devices` y envía notificación push FCM prioritaria.
  - Actualiza de forma atómica los contadores `hasConversation`, `messageCount`, `lastMessageAt`, `unreadCustomerCount` y `unreadCourierCount`.
- **`functions/src/index.ts` [MODIFICADO]**:
  - Exporta `onOrderChatMessageCreated`.

### 1.2 Reglas de Seguridad Firestore
- **`firestore.rules` [MODIFICADO]**:
  - Añade la subcolección `match /orders/{orderId}/messages/{messageId}` con reglas estrictas de autorización, append-only e inmutabilidad (`allow delete: if false;`).

### 1.3 Aplicación Android (Jetpack Compose & Kotlin)
- **`app/src/main/java/com/example/domain/model/OrderChatMessage.kt` [NUEVO]**:
  - Modelo de datos con enumeraciones de roles, tipos de mensajes y estados de entrega/lectura.
- **`app/src/main/java/com/example/data/repository/OrderChatRepository.kt` [NUEVO]**:
  - Manejo de flujo reactivo en tiempo real (`listenOrderMessages`), envío idempotente con UUIDs de cliente, recibos de lectura y registro de eventos de llamada.
- **`app/src/main/java/com/example/presentation/chat/OrderChatViewModel.kt` [NUEVO]**:
  - Manejo de estados de UI (`Active`, `Loading`, `Forbidden`, `Closed`, `Error`), control de concurrencia en envíos y escucha de estados del pedido.
- **`app/src/main/java/com/example/presentation/chat/OrderChatScreen.kt` [NUEVO]**:
  - Pantalla Compose moderna con diseño adaptativo, scroll automático, burbujas temáticas con `MaterialTheme.colorScheme`, soporte para Safe Area / IME insets e integración directa de botón de llamada telefónica `ACTION_DIAL`.
- **`app/src/main/java/com/example/MainActivity.kt` [MODIFICADO]**:
  - Registro de la ruta `Screen.OrderChat`, navegación composable y manejo de deep links de notificación push FCM (`ORDER_CHAT_MESSAGE`).
- **`app/src/main/java/com/example/service/DeliveryFirebaseMessagingService.kt` [MODIFICADO]**:
  - Corrección de la clave de deduplicación a `${action}_${orderId}_${messageId}` para no descartar mensajes consecutivos.
- **`app/src/main/java/com/example/presentation/customer/profile/OrderDetailScreen.kt` [MODIFICADO]**:
  - Incorporación del botón interactivo `💬 Chat` en `DeliveryInfoCard` con navegación a la conversación.
- **`app/src/main/java/com/example/RutaActivaScreen.kt` [MODIFICADO]**:
  - Incorporación del botón interactivo `💬 Chat` y visualización en overlay modal nativo sin interrumpir la navegación por GPS.

### 1.4 Merchant Web (React + TypeScript)
- **`merchant-web/src/modules/OrdersModule.tsx` [MODIFICADO]**:
  - Añade botón `💬 Chat` en tarjetas Kanban y filas de lista.
  - Implementa modal de conversación de solo lectura (`OrderChatModal`) con escucha en tiempo real de Firestore.

### 1.5 Panel Admin
- **`panel-admin/public/js/dashboard/liveOrders.js` [MODIFICADO]**:
  - Añade tarjeta de auditoría en vivo en el modal de detalle del pedido con visualización de mensajes y eventos de llamada.
