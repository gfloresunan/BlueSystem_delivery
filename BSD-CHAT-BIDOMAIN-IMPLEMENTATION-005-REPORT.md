# REPORTE DE IMPLEMENTACIÓN QUIRÚRGICA BI-DOMINIO DE CHAT
## Protocolo BSD-CHAT-BIDOMAIN-IMPLEMENTATION-005
### Sistema Unificado de Chat Cliente ↔ Motorizado para Commerce Delivery y X→Y Delivery

---

### 1. Resumen Ejecutivo
| Parámetro | Estatus / Valor |
|---|---|
| **Protocolo** | `BSD-CHAT-BIDOMAIN-IMPLEMENTATION-005` |
| **Prioridad** | 🔴 P0 — Crítica |
| **Estado Previo** | 🔴 `CHAT NOT CERTIFIED` / `PERMISSION_DENIED` en Real Device |
| **Estado de Implementación** | 🟢 `IMPLEMENTATION COMPLETE` (Sujeto a Verificación Física) |
| **Aislamiento de Dominio** | 🔒 Estricto: `/orders/{orderId}/messages` y `/deliveryTrips/{tripId}/messages` |
| **Security Rules (`firestore.rules`)** | 🟢 Certificadas y Desplegadas en Reglas |
| **Android Layer (Models, Repo, VM, UI, Nav, FCM)** | 🟢 Compilado y Validado (`testCoreDebugUnitTest` Passed) |
| **Cloud Functions (Triggers FCM)** | 🟢 TypeScript Compilado (`npm run build` Passed, 11 Tests Passed) |

---

### 2. Cambios Quirúrgicos Implementados por Módulo

#### A. Modelo de Dominio e Identidad Canónica (`OrderChatMessage.kt`)
- Se definió el enum canónico y no heurístico:
  ```kotlin
  enum class ChatDomain {
      COMMERCE_ORDER,
      X_TO_Y_TRIP
  }
  ```
- Se añadieron los campos canónicos `tripId: String = ""` y `domain: String = ChatDomain.COMMERCE_ORDER.name`.
- Se definió el selector unificado de conversación: `val conversationId: String get() = tripId.ifBlank { orderId }`.

#### B. Repositorio Reactivo con Ruteo Canónico (`OrderChatRepository.kt`)
- Se incorporó la función determinística `getParentCollectionName(domain: ChatDomain)`:
  - `COMMERCE_ORDER` $\to$ `"orders"`
  - `X_TO_Y_TRIP` $\to$ `"deliveryTrips"`
- Se adaptaron todas las operaciones (`listenOrderMessages`, `sendMessage`, `recordCallEvent`, `markMessagesAsRead`) para aceptar `domain: ChatDomain` y `conversationId: String`.
- Se añadieron logs estructurados forenses `[CHAT_DEBUG]` que registran:
  `DOMAIN`, `CONVERSATION_ID`, `PATH`, `AUTH_UID`, `SENDER_ID`, `SENDER_ROLE`, `WRITE_START`, `WRITE_SUCCESS`, `WRITE_ERROR`.

#### C. Capa de Presentación y Máquina de Estados (`OrderChatViewModel.kt` & `OrderChatScreen.kt`)
- `OrderChatViewModel` ahora recibe `conversationId: String` y `domain: ChatDomain`.
- El listener del documento padre se suscribe dinámicamente a `/orders/{conversationId}` o `/deliveryTrips/{conversationId}` para resolver los participantes (`customerId`/`clienteId` y `courierId`/`assignedCourierId`/`motorizadoId`).
- `OrderChatScreen` adapta su top bar (`Chat del Pedido #...` vs `Chat del Envío Directo #...`) según el dominio.

#### D. Navegación y Enrutamiento Global (`MainActivity.kt` & `RutaActivaScreen.kt`)
- Ruta canónica en Compose: `"order_chat/{orderId}?domain={domain}"`.
- `RutaActivaScreen` inyecta automáticamente el dominio exacto:
  `domain = if (serviceTypeState == "X_TO_Y_DELIVERY" || serviceTypeState == "P2P") ChatDomain.X_TO_Y_TRIP else ChatDomain.COMMERCE_ORDER`.

#### E. Notificaciones Push Multidominio (`DeliveryFirebaseMessagingService.kt` & `tripChat.ts`)
- `DeliveryFirebaseMessagingService` procesa acciones `"ORDER_CHAT_MESSAGE"` y `"TRIP_CHAT_MESSAGE"`.
- Navegación por deep link configurada para abrir el chat con el dominio correspondiente.
- Cloud Function Trigger `onTripChatMessageCreated` creada bajo `deliveryTrips/{tripId}/messages/{messageId}` con idempotencia y deduplicación FCM multidevice.

#### F. Reglas de Seguridad Inviolables (`firestore.rules`)
Se incorporó el bloque canónico para subcolecciones de mensajes bajo `deliveryTrips`:
```firestore
match /deliveryTrips/{tripId} {
  ...
  match /messages/{messageId} {
    allow read: if isAuthenticated() && (
      isAdmin() ||
      resource.data.senderId == currentUid() ||
      get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.customerId == currentUid() ||
      get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.clienteId == currentUid() ||
      get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.assignedCourierId == currentUid() ||
      get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.courierId == currentUid() ||
      get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.motorizadoId == currentUid()
    );

    allow create: if isAuthenticated() &&
      request.resource.data.senderId == currentUid() &&
      request.resource.data.createdAt == request.time &&
      !(get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.status in [
        'DELIVERED', 'COMPLETED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'FAILED'
      ]) &&
      (
        isAdmin() ||
        (
          request.resource.data.senderRole == 'CUSTOMER' && (
            get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.customerId == currentUid() ||
            get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.clienteId == currentUid()
          )
        ) ||
        (
          request.resource.data.senderRole == 'COURIER' && (
            get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.assignedCourierId == currentUid() ||
            get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.courierId == currentUid() ||
            get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.motorizadoId == currentUid()
          )
        )
      );

    allow update: if isAuthenticated() &&
      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readAt', 'readBy', 'status']);

    allow delete: if false;
  }
}
```

---

### 3. Matriz de Validación y Suite de Pruebas

| Touchpoint / Capa | Test Suite | Resultado |
|---|---|---|
| **Android Unit Tests** | `com.example.chat.OrderChatIntegrationE2ETest` | 🟢 `BUILD SUCCESSFUL` (0 errores) |
| **Role & Domain Tests** | `testChatDomain_EnumAndCollectionResolution` | 🟢 Passed |
| **X→Y Message Construction** | `testChatMessage_XYTripDomain_ConversationIdResolution` | 🟢 Passed |
| **Commerce Message Construction** | `testChatMessage_CommerceDomain_ConversationIdResolution` | 🟢 Passed |
| **Cloud Functions TypeScript** | `npm --prefix functions run build` | 🟢 Exit Code 0 |
| **Cloud Functions Unit Tests** | `npm --prefix functions test` | 🟢 11/11 Passed |

---

### 4. Protocolo de Verificación en Dispositivo Físico Real (Galaxy Z Fold 5)

Para completar el paso 40 del protocolo y declarar formalmente 🟢 `CHAT CERTIFIED` y restaurar `BSD-CHAT-CUSTOMER-COURIER-FREEZE-001`, se debe ejecutar en hardware físico:

1. **Flujo Commerce Order:**
   - Iniciar pedido de comercio real (`/orders/{orderId}`).
   - Asignar repartidor.
   - Abrir chat desde App Cliente y enviar mensaje.
   - Verificar en Logcat: `[CHAT_DEBUG] writeMessage START: domain=COMMERCE_ORDER, path=orders/{orderId}/messages/{msgId}`.
   - Verificar recepción y respuesta desde App Motorizado.
   - Verificar: `PERMISSION_DENIED = 0`.

2. **Flujo X→Y Trip:**
   - Crear solicitud de envío directo X→Y (`/deliveryTrips/{tripId}`).
   - Aceptar servicio como repartidor (`RutaActivaScreen`).
   - Abrir chat del viaje y enviar mensaje.
   - Verificar en Logcat: `[CHAT_DEBUG] writeMessage START: domain=X_TO_Y_TRIP, path=deliveryTrips/{tripId}/messages/{msgId}`.
   - Verificar recepción y respuesta en tiempo real.
   - Verificar: `PERMISSION_DENIED = 0`.
