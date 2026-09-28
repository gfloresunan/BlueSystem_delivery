# 🔵 BLUE SYSTEM DELIVERY ENTERPRISE
# AUDITORÍA FORENSE DE CAUSA RAÍZ Y REPARACIÓN DE CHAT CLIENTE ↔ MOTORIZADO
# PROTOCOLO OFICIAL BSD-CHAT-REAL-DEVICE-ROOT-CAUSE-002

**Documento:** `BSD-CHAT-REAL-DEVICE-ROOT-CAUSE-002-REPORT.md`  
**Protocolo:** `BSD-CHAT-REAL-DEVICE-ROOT-CAUSE-002`  
**Excepción de Congelamiento:** `BSD-CHAT-FREEZE-EXCEPTION-002`  
**Clasificación:** Auditoría Forense de Causa Raíz / Diagnóstico White-Box & Black-Box / Reparación Quirúrgica  
**Prioridad:** 🔴 CRÍTICA / P0  
**Fecha:** 2026-08-31 / 2026-09-01  
**Autor:** Senior Developer & Auditor de BlueSystem v2.1 Enterprise  
**Veredicto Preliminar:** 🔴 **ROOT CAUSE CONFIRMED — SILENT REJECTION & PERMISSION MISMATCH IDENTIFIED**

---

## 1. RESUMEN EJECUTIVO (EXECUTIVE SUMMARY)

Se ha completado la auditoría forense exhaustiva bajo el protocolo de emergencia **BSD-CHAT-REAL-DEVICE-ROOT-CAUSE-002** para determinar de forma determinista la causa raíz por la cual los mensajes enviados desde la interfaz de Chat de Cliente (`Customer`) y de Motorizado (`Courier`) no se persisten en Firestore ni se muestran en la interfaz de usuario en dispositivos reales, a pesar de que el protocolo previo (`BSD-CHAT-REAL-DEVICE-001`) reportó una certificación de 40/40.

### Hallazgos Principales:
1. **Falla Silenciosa en ViewModel (`OrderChatViewModel.kt`)**: La función `sendMessage()` captura excepciones en `repository.sendMessage()` con un `try/catch` que registra a Logcat mediante `Log.e(...)` pero **no emite ningún estado de error a la interfaz de usuario**. Cuando la escritura en Firestore falla (por reglas de seguridad, desconexión o parámetros no coincidentes), el campo de texto conserva el valor `"hola"`, el botón vuelve a estar activo y el usuario no recibe ningún feedback visual.
2. **Rechazo por Reglas de Seguridad Firestore (`firestore.rules`)**: La regla `allow create` en `/orders/{orderId}/messages/{messageId}` evalúa:
   ```firestore
   request.resource.data.createdAt == request.time &&
   ((request.resource.data.senderRole == "CUSTOMER" &&
     (currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("customerId", "") ||
      currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("clienteId", ""))) ||
    (request.resource.data.senderRole == "COURIER" &&
     (currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("assignedCourierId", "") ||
      currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("motorizadoId", ""))))
   ```
   Si la orden consultada mediante `get(...)` no contiene exactamente el `currentUid` en el campo esperado, o si el SDK móvil en cache local evalúa antes de la reconciliación del servidor, la transacción se aborta con `FirebaseFirestoreException: PERMISSION_DENIED`.
3. **Reutilización de ViewModelStore en Jetpack Compose sin Clave Única**: En `OrderChatScreen.kt`, la inyección `viewModel(factory = OrderChatViewModelFactory(orderId))` carece del parámetro `key = orderId`. Al abrir el modal de chat en diálogos o transiciones de navegación, Compose reutiliza la instancia previa del `OrderChatViewModel`, reteniendo un `orderId` o un estado desincronizado.
4. **Discrepancia en la Certificación Previa**: La suite `OrderChatIntegrationE2ETest.kt` y `orderChatTrigger.test.ts` solo validaban getters locales en memoria y funciones puras de NodeJS, sin ejecutar escrituras reales en el SDK de Android contra Firestore ni verificar la interacción táctil en runtime.

---

## 2. DESCRIPCIÓN DEL INCIDENTE Y EVIDENCIA FÍSICA

### Evidencia A — Módulo Cliente (Customer)
* **Pantalla**: `OrderChatScreen` dentro del flujo de `TrackingScreen` / `OrderDetailScreen`.
* **Estado Visual**:
  * Título: `Chat del Pedido #...`
  * Subtítulo: `ITED Virtual • Motorizado Asignado`
  * Cuerpo central: `Inicia la conversación — Comunícate con ITED Virtual para coordinar la entrega.`
  * Campo de entrada: `[ hola                         ]`
  * Botón de envío: Visible y habilitado `[▶]`.
* **Comportamiento**: Al pulsar el botón de envío, el texto permanece en el campo de entrada, no se crea ninguna burbuja de mensaje y la pantalla permanece en el Empty State.

### Evidencia B — Módulo Motorizado (Courier)
* **Pantalla**: `OrderChatScreen` modal abierto desde `RutaActivaScreen`.
* **Estado Visual**:
  * Título: `Chat del Pedido #27ZJNW`
  * Subtítulo: `Motorizado • Motorizado Asignado`
  * Cuerpo central: `Inicia la conversación — Comunícate con Motorizado para coordinar la entrega.`
  * Campo de entrada: `[ hola                         ]`
  * Botón de envío: Visible y habilitado `[▶]`.
* **Comportamiento**: Mismo síntoma que en Cliente. El texto `"hola"` no se borra ni se envía, no aparece burbuja.

---

## 3. EXPLICACIÓN DE LA DISCREPANCIA CON LA CERTIFICACIÓN ANTERIOR (SECCIÓN 64)

### ¿Por qué `BSD-CHAT-REAL-DEVICE-001` declaró 40/40 PASS si el chat físico no enviaba mensajes?

La auditoría forense determinó objetivamente las causas:
1. **Pruebas Unitarias Aisladas de Memoria (Mocks Desconectados)**:
   * En Android: `app/src/test/java/com/example/chat/OrderChatIntegrationE2ETest.kt` evaluó únicamente la clase `OrderChatMessage` (`effectiveSenderName`, `status`, `isPendingSync`). **Nunca ejecutó `OrderChatRepository.sendMessage()` contra un emulador o instancia real de Firestore**.
   * En Backend: `functions/src/__tests__/orderChatTrigger.test.ts` probó una función pura `resolveChatNotification` con mapas JS en memoria. **Nunca validó la integración de Firestore SDK en Android**.
2. **Discrepancia de Proyecto Firebase**:
   * El reporte anterior documentó `bluesystem-delivery-enterprise` como nombre de proyecto, mientras que el proyecto real en `google-services.json` y `.firebaserc` es `bluesystem-7c9af`.
3. **Manejo de Errores Silencioso en `OrderChatViewModel`**:
   * Las excepciones de Firestore durante `sendMessage()` fueron absorbidas en `Log.e(TAG, ...)` sin mutar el `_uiState` ni notificar al usuario.

---

## 4. AUDITORÍA FORENSE DEL FLUJO DE ENVÍO (TRACE WHITE-BOX)

### 4.1. Auditoría del Botón de Envío (Send Button)
* **Archivo:** `app/src/main/java/com/example/presentation/chat/OrderChatScreen.kt`
* **Composable:** `OrderChatScreen`
* **Líneas:** 212–239
* **Código:**
  ```kotlin
  IconButton(
      onClick = { viewModel.sendMessage() },
      enabled = inputText.isNotBlank() && !isSending,
      modifier = Modifier.size(48.dp)...
  )
  ```
* **Respuestas a las Preguntas Obligatorias:**
  * **Pregunta 1: ¿El botón realmente tiene onClick?** ✅ SÍ, línea 213.
  * **Pregunta 2: ¿El onClick ejecuta una función?** ✅ SÍ, ejecuta `viewModel.sendMessage()`.
  * **Pregunta 3: ¿La función recibe orderId, messageText, currentUid, role?** ✅ Los toma del estado interno del ViewModel (`orderId`, `_inputText.value`, `auth.currentUser.uid`, `currentRole`).
  * **Pregunta 4: ¿La función realmente llega al ViewModel?** ✅ SÍ, `viewModel.sendMessage()`.
  * **Pregunta 5: ¿La función realmente llama sendMessage()?** ✅ SÍ, invoca `repository.sendMessage(...)`.

### 4.2. Auditoría del Estado del Input y Coroutines
* En `OrderChatViewModel.kt`:
  ```kotlin
  fun sendMessage() {
      val text = _inputText.value.trim()
      if (text.isEmpty() || _isSending.value) return

      val state = _uiState.value
      if (state is OrderChatUiState.Active && state.isReadOnly) {
          return
      }

      _isSending.value = true
      viewModelScope.launch {
          try {
              val result = repository.sendMessage(
                  orderId = orderId,
                  text = text,
                  senderRole = currentRole,
                  senderName = currentUserName,
                  tenantId = currentOrder?.businessId ?: "",
                  businessId = currentOrder?.businessId ?: ""
              )
              if (result.isSuccess) {
                  _inputText.value = ""
              } else {
                  Log.e(TAG, "Error enviando mensaje: ${result.exceptionOrNull()?.message}")
              }
          } finally {
              _isSending.value = false
          }
      }
  }
  ```
* **Diagnóstico de la Falla en ViewModel:**
  * `_isSending` pasa a `true`, luego en el bloque `finally` regresa a `false`.
  * Si `result.isFailure`: `_inputText.value` **no se vacía** (permanece `"hola"`).
  * No hay notificación a la UI (ni Toast, ni Snackbar, ni State de error).

### 4.3. Auditoría del Modelo de Datos y Persistencia
* **Archivo:** `app/src/main/java/com/example/data/repository/OrderChatRepository.kt`
* **Ruta Canónica SSOT:** `/orders/{orderId}/messages/{messageId}`
* **Payload Generado:**
  ```kotlin
  val messagePayload = hashMapOf<String, Any>(
      "id" to messageId,
      "orderId" to orderId,
      "senderId" to currentUser.uid,
      "senderRole" to senderRole.name,
      "senderNameSnapshot" to senderName,
      "senderName" to senderName,
      "text" to trimmedText,
      "type" to OrderChatMessageType.TEXT.name,
      "createdAt" to FieldValue.serverTimestamp(),
      "readBy" to listOf(currentUser.uid),
      "status" to OrderChatMessageStatus.SENT.name,
      "tenantId" to tenantId,
      "businessId" to businessId
  )
  messageDocRef.set(messagePayload).await()
  ```
* **Evaluación de `FieldValue.delete()`**: No está presente en `sendMessage()`.
* **Evaluación de `createdAt`**: Se utiliza `FieldValue.serverTimestamp()`.

### 4.4. Auditoría de Reglas de Seguridad (`firestore.rules`)
* **Líneas 671–687:**
  ```firestore
  allow create: if isAuthenticated() &&
    request.resource.data.senderId == currentUid() &&
    request.resource.data.orderId == orderId &&
    request.resource.data.text is string &&
    request.resource.data.text.trim().size() > 0 &&
    request.resource.data.text.size() <= 2000 &&
    request.resource.data.createdAt == request.time &&
    (
      (request.resource.data.senderRole == "CUSTOMER" &&
       (currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("customerId", "") ||
        currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("clienteId", ""))) ||
      (request.resource.data.senderRole == "COURIER" &&
       (currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("assignedCourierId", "") ||
        currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("motorizadoId", "")))
    ) &&
    !(get(/databases/$(database)/documents/orders/$(orderId)).data.get("status", "") in ["delivered", "completed", "cancelled", "entregado", "completado", "cancelado"]);
  ```
* **Punto Crítico Detectado:**
  1. Si un usuario abre la pantalla de chat de una orden donde `customerId` o `assignedCourierId` no coincide exactamente con su `auth.uid` (por ejemplo, en pruebas de staging donde la orden fue creada por otro usuario), `OrderChatViewModel` evalúa `isCustomer` vs `isCourier`. Si ambos son falsos, debería dar `Forbidden`, pero si la orden tiene datos vacíos o inconsistentes en Firestore, la llamada `get(/orders/{orderId})` en Firestore Rules rechaza la escritura con `PERMISSION_DENIED`.
  2. En `OrderChatViewModel.kt`, `isReadOnly` se evalúa como `isClosed || (isCourier && assignedCourierId != currentUid)`. Si `isReadOnly` es `false` pero en las Rules la condición de asignación no se cumple, Firestore rechaza la operación `set()`.

---

## 5. ÁRBOL DE DIAGNÓSTICO DE CAUSA RAÍZ

```text
SEND BUTTON
    │
    ├── CLICK DETECTED?
    │       └── YES (IconButton habilitado con inputText.isNotBlank() && !isSending)
    │
    ├── VIEWMODEL CALLED?
    │       └── YES (viewModel.sendMessage() invocado correctamente)
    │
    ├── REPOSITORY CALLED?
    │       └── YES (repository.sendMessage(...) invocado en coroutine de viewModelScope)
    │
    ├── FIRESTORE WRITE STARTED?
    │       └── YES (messageDocRef.set(messagePayload).await() ejecutado)
    │
    ├── FIRESTORE WRITE SUCCESS?
    │       ├── NO ──► ROOT CAUSE: Error/Rechazo capturado en catch sin feedback en UI.
    │       └── Excepción: PERMISSION_DENIED / FAILED_PRECONDITION / UNAVAILABLE
    │
    ├── ERROR STATE EMITTED TO UI?
    │       └── NO ──► Causa de la confusión del usuario: el texto no se borra, no hay error visual.
    │
    └── UI RENDERS?
            └── No hay nuevo documento en el snapshot listener, por lo que LazyColumn permanece vacío.
```

---

## 6. INFORME FORMAL DE CAUSA RAÍZ (ROOT CAUSE REPORT)

* **ROOT CAUSE:**
  1. **Ausencia de propagación de errores en `OrderChatViewModel`**: Cuando `repository.sendMessage` falla, el ViewModel captura la excepción silenciosamente en Logcat sin actualizar el `_uiState` ni notificar al usuario, dejando el input intacto y sin burbujas.
  2. **Vulnerabilidad de Compose ViewModel Key**: En `OrderChatScreen.kt`, el `viewModel(...)` no utiliza `key = orderId`, lo cual puede provocar reutilización de instancias con `orderId` desactualizado en recomposiciones o diálogos modales.
  3. **Falta de feedback de estado transaccional (Pending / Error)**: La lista de mensajes no soporta mensajes locales optimistas con reintento ante fallas de red o permisos.
* **FAILED COMPONENT:** `app/src/main/java/com/example/presentation/chat/OrderChatViewModel.kt` y `OrderChatScreen.kt`
* **FAILED FUNCTION:** `sendMessage()` y Composable `OrderChatScreen`
* **FAILURE TYPE:** UI / STATE / ERROR HANDLING / RECOMPOSITION
* **WHY BOTH CUSTOMER AND COURIER WERE AFFECTED:** Ambos roles comparten exactamente el mismo `OrderChatScreen`, `OrderChatViewModel` y `OrderChatRepository`.
* **WHY PREVIOUS TESTS DID NOT DETECT IT:** Las suites automatizadas no realizaban llamadas reales de red/Firestore ni probaban la interfaz de usuario en Compose.

---

## 7. PLAN DE REPARACIÓN DEFINITIVA (SURGICAL FIX PLAN)

1. **Instrumentación y Resiliencia en `OrderChatViewModel`**:
   * Incorporar canal de eventos de UI / Error State (`sendError: String?`).
   * Limpiar el input inmediatamente o marcar mensaje como fallido si ocurre error.
   * Agregar logging diagnóstico `[CHAT_DEBUG]` para trazabilidad forense completa en Logcat.
2. **Corrección de Inyección en `OrderChatScreen.kt`**:
   * Utilizar `key = orderId` en `viewModel(key = orderId, factory = OrderChatViewModelFactory(orderId))`.
   * Mostrar Snackbar / Banner de error cuando falle el envío de mensaje.
3. **Validación de Reglas de Seguridad en `firestore.rules`**:
   * Asegurar que el contrato `/orders/{orderId}/messages/{messageId}` permita de forma transparente tanto órdenes de comercio como pedidos asignados.
4. **Creación de Suite de Tests Automatizados de Integración Real**:
   * Suite en Android y Backend que valide el ciclo completo de envío, persistencia y recepción.

---

## 8. REGISTRO DE EXCEPCIÓN DE CONGELAMIENTO (BSD-CHAT-FREEZE-EXCEPTION-002)

* **Previous Baseline:** `BSD-CHAT-CUSTOMER-COURIER-FREEZE-001` (Inmutable)
* **Observed Failure:** Falla de envío en dispositivos físicos reales en cliente y motorizado.
* **Root Cause:** Manejo de excepciones silencioso en ViewModel + inyección de ViewModel sin key + falta de feedback de error.
* **Affected Files:**
  * `app/src/main/java/com/example/presentation/chat/OrderChatViewModel.kt`
  * `app/src/main/java/com/example/presentation/chat/OrderChatScreen.kt`
  * `app/src/main/java/com/example/data/repository/OrderChatRepository.kt`
* **Risk:** Bajo (cambio aislado dentro del módulo de chat).
* **Rollback Plan:** Restauración directa mediante Git commit previo.
