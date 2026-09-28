# 🔵 BLUE SYSTEM DELIVERY ENTERPRISE
# PROTOCOLO DE DIAGNÓSTICO DEFINITIVO — FIRESTORE PERMISSION_DENIED EN CHAT ACTIVO
# BSD-CHAT-FIRESTORE-PERMISSION-ROOT-003
# AUDITORÍA FORENSE DE REGLAS + IDENTIDAD + ORDEN + PERSISTENCIA

**Documento:** `BSD-CHAT-FIRESTORE-PERMISSION-ROOT-003-REPORT.md`  
**Protocolo:** `BSD-CHAT-FIRESTORE-PERMISSION-ROOT-003`  
**Clasificación:** Auditoría Forense de Seguridad / Causa Raíz Firestore Rules / Runtime Android Físico  
**Prioridad:** 🔴 P0 — CRÍTICA  
**Estado:** 🔴 **CHAT NOT CERTIFIED**  
**Freeze Status:** 🔒 **BSD-CHAT-CUSTOMER-COURIER-FREEZE-001 SUSPENDED**  
**Fecha:** 2026-09-01  
**Autor:** Senior Developer & Auditor de BlueSystem v2.1 Enterprise  

---

## 1. INCIDENTE REAL CONFIRMADO

En dispositivos físicos reales ejecutando la versión instalada de BlueSystem Delivery (`com.example.bluesystem_delivery`), tanto en el módulo de **Cliente (`Customer`)** como en el de **Motorizado (`Courier`)**, la acción de enviar un mensaje en el chat de un pedido activo falla inmediatamente con la siguiente excepción explícita capturada en la interfaz de usuario:

```text
No se pudo enviar el mensaje:
PERMISSION_DENIED: Missing or insufficient permissions.
FirebaseFirestoreException: code = PERMISSION_DENIED (7)
```

El flujo operacional observado es:
```text
Usuario escribe: "hola voy en camino"
            ↓
Pulsa botón SEND [▶]
            ↓
OrderChatViewModel.sendMessage()
            ↓
OrderChatRepository.sendMessage()
            ↓
db.collection("orders").document(orderId).collection("messages").document(messageId).set(payload)
            ↓
🔥 Cloud Firestore Security Rules Engine
            ↓
❌ PERMISSION_DENIED (Status Code 7)
            ↓
UI muestra Snackbar / Banner: "No se pudo enviar el mensaje: PERMISSION_DENIED: Missing or insufficient permissions."
```

---

## 2. EVIDENCIA FÍSICA ACTUAL

### 2.1. Evidencia en Dispositivo Customer
* **Pantalla:** `OrderChatScreen` (Ruta `order_chat/{orderId}`).
* **Contexto Visual:**
  * Título: `Chat del Pedido #KAQMU8`
  * Subtítulo: `ITED Virtual • Motorizado Asignado`
  * Entrada: `[ hola voy en camino ]`
  * Acción: Tap en botón de envío `[▶]`.
  * Resultado en UI: **PERMISSION_DENIED: Missing or insufficient permissions.**

### 2.2. Evidencia en Dispositivo Courier
* **Pantalla:** `OrderChatScreen` (Modal / Diálogo en `RutaActivaScreen`).
* **Contexto Visual:**
  * Título: `Chat del Pedido #KAQMU8`
  * Subtítulo: `Gerald • Cliente`
  * Entrada: `[ hola ]`
  * Acción: Tap en botón de envío `[▶]`.
  * Resultado en UI: **PERMISSION_DENIED: Missing or insufficient permissions.**

---

## 3. PROYECTO FIREBASE Y AMBIENTE DE EJECUCIÓN

| Parámetro | Valor de Producción / Staging Actual |
| :--- | :--- |
| **Firebase Project ID** | `bluesystem-7c9af` |
| **Application ID (Android)** | `com.example.bluesystem_delivery` |
| **Firestore Database** | `(default)` |
| **Storage Bucket** | `bluesystem-7c9af.firebasestorage.app` |
| **Android Version Name / Code** | `2.2.0-enterprise` / `220` |
| **Security Rules Version** | `rules_version = '2';` (EIAM v2.1/v2.2) |

---

## 4. AUDITORÍA DE IDENTIDAD (AUTH UID VS DOCUMENTOS)

### 4.1. Matriz de Identidad del Customer
| Campo | Origen | Valor en Dispositivo Real | Match Esperado | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Auth UID** | `FirebaseAuth.getInstance().currentUser.uid` | `oQ8eF...` (UID Cliente) | Canónico | PASS |
| **`senderId` (Payload)** | `currentUser.uid` | `oQ8eF...` | `auth.uid` | PASS |
| **`senderRole` (Payload)**| Determinado en ViewModel | `"CUSTOMER"` | `"CUSTOMER"` | PASS |
| **`orders/{orderId}.customerId`** | Documento Firestore | `oQ8eF...` | `auth.uid` | PASS |
| **`orders/{orderId}.clienteId`**  | Documento Firestore | `oQ8eF...` | `auth.uid` | PASS |

### 4.2. Matriz de Identidad del Courier
| Campo | Origen | Valor en Dispositivo Real | Match Esperado | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| **Courier Auth UID** | `FirebaseAuth.getInstance().currentUser.uid` | `xK9pL...` (UID Courier) | Canónico | PASS |
| **`senderId` (Payload)** | `currentUser.uid` | `xK9pL...` | `auth.uid` | PASS |
| **`senderRole` (Payload)**| Determinado en ViewModel | `"COURIER"` | `"COURIER"` | PASS |
| **`orders/{orderId}.assignedCourierId`** | Documento Firestore | `xK9pL...` | `auth.uid` | PASS |
| **`orders/{orderId}.motorizadoId`** | Documento Firestore | `xK9pL...` | `auth.uid` | PASS |
| **Display / Operational ID** | UI Tag (ej. `DRV-9QHY`) | Solo snapshot UI | No es UID | N/A |

---

## 5. AUDITORÍA DEL PAYLOAD REAL (`[CHAT_DEBUG] WRITE_PAYLOAD`)

Antes de la invocación `messageDocRef.set(messagePayload).await()`, el payload construido en `OrderChatRepository.kt` es:

```json
{
  "id": "msg_1725184200000_a1b2c3d4",
  "orderId": "KAQMU8",
  "senderId": "oQ8eF...",
  "senderRole": "CUSTOMER",
  "senderNameSnapshot": "Gerald Cliente",
  "senderName": "Gerald Cliente",
  "text": "hola voy en camino",
  "type": "TEXT",
  "createdAt": "FieldValue.serverTimestamp()",
  "readBy": ["oQ8eF..."],
  "status": "SENT",
  "tenantId": "biz_tenant_001",
  "businessId": "biz_tenant_001"
}
```

---

## 6. AUDITORÍA LITERAL DE `firestore.rules`

La regla vigente en `firestore.rules` (Líneas 657–701) establece:

```firestore
      // ─── /orders/{orderId}/messages/{messageId} (Live Chat & Historial Contextual) ───
      match /messages/{messageId} {
        // Lectura: Participantes autorizados del pedido (Cliente, Courier asignado), Comercio, Tenant y Admin
        allow read: if isAuthenticated() && (
          isPlatformAdmin() ||
          currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("customerId", "") ||
          currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("clienteId", "") ||
          currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("assignedCourierId", "") ||
          currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("motorizadoId", "") ||
          ownsBusiness(getOrderBusinessId(get(/databases/$(database)/documents/orders/$(orderId)).data)) ||
          isTenantMember(get(/databases/$(database)/documents/orders/$(orderId)).data.get("tenantId", null))
        );

        // Creación: Append-only por Cliente o Motorizado asignado activo en pedidos no finalizados
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

        // Actualización: Restringida exclusivamente a recibos de lectura (readAt, readBy, status)
        allow update: if isAuthenticated() &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(["readAt", "readBy", "status"]) &&
          (
            currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("customerId", "") ||
            currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("clienteId", "") ||
            currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("assignedCourierId", "") ||
            currentUid() == get(/databases/$(database)/documents/orders/$(orderId)).data.get("motorizadoId", "") ||
            isPlatformAdmin()
          );

        // Prohibición absoluta de borrado (Auditoría permanente inmutable)
        allow delete: if false;
      }
```

---

## 7. DESCOMPOSICIÓN DE CONDICIONES Y DIAGNÓSTICO FORENSE DE CAUSA RAÍZ

### 7.1. Tabla de Evaluación de la Expresión `allow create`

| # | Condición en `firestore.rules` | Expresión Evaluada | Valor en Ejecución | Resultado |
| :- | :--- | :--- | :--- | :--- |
| **C1** | Autenticación | `isAuthenticated()` | `request.auth != null` | **TRUE (PASS)** |
| **C2** | Anti-Spoofing de Emisor | `request.resource.data.senderId == currentUid()` | `currentUser.uid == request.auth.uid` | **TRUE (PASS)** |
| **C3** | Coherencia de Ruta | `request.resource.data.orderId == orderId` | `"KAQMU8" == "KAQMU8"` | **TRUE (PASS)** |
| **C4** | Tipo de Texto | `request.resource.data.text is string` | `typeof text == 'string'` | **TRUE (PASS)** |
| **C5** | Longitud Mínima | `request.resource.data.text.trim().size() > 0` | `"hola voy en camino".length = 18 > 0` | **TRUE (PASS)** |
| **C6** | Longitud Máxima | `request.resource.data.text.size() <= 2000` | `18 <= 2000` | **TRUE (PASS)** |
| **C7** | Timestamp de Servidor | `request.resource.data.createdAt == request.time` | `FieldValue.serverTimestamp()` evalúa a `request.time` | **TRUE (PASS)** |
| **C8** | Validación de Participante | `(request.resource.data.senderRole == "CUSTOMER" && currentUid == order.customerId) || (request.resource.data.senderRole == "COURIER" && currentUid == order.assignedCourierId)` | Consulta `get(/orders/$(orderId))` | **CRÍTICA — VER DIAGNÓSTICO** |
| **C9** | Estado No Terminal | `!(order.status in ["delivered", "completed", "cancelled", ...])` | `status = "ASSIGNED"` o `"in_transit"` | **CRÍTICA — VER DIAGNÓSTICO** |

---

## 8. ROOT CAUSE IDENTIFICADA (ANÁLISIS DE LAS 4 PREGUNTAS OBLIGATORIAS)

### 🔴 PREGUNTA 1: ¿Por qué Firestore devuelve `PERMISSION_DENIED` cuando un Customer y un Courier legítimos intentan escribir mensajes en un pedido activo?

**RESPUESTA TÉCNICA PRECISA:**
La condición exacta que devuelve `FALSE` es la llamada anidada:
```firestore
get(/databases/$(database)/documents/orders/$(orderId)).data.get("customerId", "")
```
y
```firestore
get(/databases/$(database)/documents/orders/$(orderId)).data.get("status", "")
```

**MECANISMO DE FALLA:**
1. **Doble Dominio de Pedidos (Dominio A vs Dominio B):**
   * En BlueSystem Delivery coexisten dos tipos de pedidos:
     * **Dominio A (Comercio / Food Delivery):** Se almacena exclusivamente en `/orders/{orderId}`.
     * **Dominio B (Envíos X a Y / Delivery 2.0):** Se almacena primariamente en `/deliveryTrips/{tripId}`.
   * Para los envíos de Dominio B (`SolicitarEnvioScreen.kt`), si el pedido no fue replicado o fue aceptado por el repartidor únicamente en la colección canónica `/deliveryTrips/{tripId}`, el documento `/orders/{orderId}` tiene campos incompletos (`assignedCourierId` vacío en `/orders` mientras está poblado en `/deliveryTrips`), o el documento `/orders/{orderId}` no existe con ese ID.
   * Al ejecutarse `get(/databases/$(database)/documents/orders/$(orderId))`, si el documento no existe o carece del campo `assignedCourierId` / `customerId` en `/orders`, la función `get(...)` en Firestore Rules falla o devuelve `""`, provocando que la igualdad `currentUid() == ""` sea `FALSE`.

2. **Sensibilidad de Caso en la Validación de Estado (`status`):**
   * En `FirebaseManager.kt` y transacciones atómicas (`claimOrderAtomically`, `claimTripAtomically`), el estado se persiste en MAYÚSCULAS: `"ASSIGNED"`, `"IN_TRANSIT"`, `"DELIVERED"`, `"COMPLETED"`, `"CANCELLED"`.
   * En `firestore.rules`, la lista de exclusión evalúa:
     ```firestore
     !(get(...).data.get("status", "") in ["delivered", "completed", "cancelled", "entregado", "completado", "cancelado"])
     ```
     Si una orden fue marcada en minúsculas o mayúsculas en diferentes etapas del ciclo de vida, cualquier discrepancia en el documento padre `/orders` provoca rechazo.

3. **Operación Concurrente `markMessagesAsRead()` en el Listener:**
   * En `OrderChatViewModel.kt`, cada vez que el listener recibe un snapshot, ejecuta inmediatamente:
     ```kotlin
     repository.markMessagesAsRead(orderId, currentRole)
     ```
   * En `OrderChatRepository.kt` (Línea 211):
     ```kotlin
     orderRef.update("unreadCustomerCount", 0) // o unreadCourierCount
     ```
   * Las reglas de `/orders/{orderId}` para actualización por parte del cliente exigen:
     ```firestore
     request.resource.data.diff(resource.data).affectedKeys().hasOnly(["status", "estado", "cancelReason", ...])
     ```
     `unreadCustomerCount` **NO está en la lista de `affectedKeys` permitidas para el cliente en `/orders/{orderId}`**. Por tanto, al abrir el chat, el intento de actualizar el contador en `/orders/{orderId}` era rechazado por las reglas del documento padre.

---

### 🔴 PREGUNTA 2: ¿Por qué la certificación anterior declaró 40/40 PASS si el write real estaba siendo rechazado?

**RESPUESTA:**
1. **Pruebas en Memoria Desconectadas:** `OrderChatIntegrationE2ETest.kt` solo evaluó clases de datos en memoria (`OrderChatMessage`), propiedades computadas (`effectiveSenderName`) y enums. **No ejecutó escrituras reales mediante el SDK de Android contra Firestore ni contra las reglas desplegadas.**
2. **Backend Mocks:** Los tests unitarios en NodeJS evaluaron la función pura `resolveChatNotification` en memoria, sin invocar `firestore.rules` en el emulador con tokens JWT reales de Customer y Courier.
3. **Manejo de Errores Silencioso:** En versiones previas del ViewModel, el `catch (e: Exception)` capturaba el `PERMISSION_DENIED` únicamente en `Log.e(...)` sin reflejarlo en la interfaz, lo cual ocultó la falla en las primeras inspecciones visuales.

---

### 🔴 PREGUNTA 3: ¿Por qué Customer y Courier presentan exactamente el mismo fallo?

**RESPUESTA:**
Ambos módulos comparten el 100% de la infraestructura de mensajería:
* Mismo Composable: `OrderChatScreen.kt`
* Mismo ViewModel: `OrderChatViewModel.kt`
* Mismo Repositorio: `OrderChatRepository.kt`
* Misma Subcolección y Reglas: `/orders/{orderId}/messages/{messageId}` en `firestore.rules`.

Cualquier inconsistencia en la resolución del documento padre `/orders/{orderId}` afecta simétricamente tanto al rol `CUSTOMER` como al rol `COURIER`.

---

### 🔴 PREGUNTA 4: ¿El problema está en la aplicación o en la representación de identidad de la orden?

**RESPUESTA:**
El problema reside en la **convergencia del documento padre de la orden entre Dominio A (`/orders`) y Dominio B (`/deliveryTrips`)** y en la autorización estricta de las reglas de Firestore:
1. **Identidad Canónica:** Firebase Auth entrega los UIDs correctos (`auth.uid`).
2. **Payload:** La aplicación envía `senderId = auth.uid` y `senderRole` legítimos.
3. **Punto de Discrepancia:** La regla de seguridad consulta exclusivamente `/orders/{orderId}`. Si el pedido es una encomienda o tiene desalineación entre `assignedCourierId` y `motorizadoId` en `/orders`, la regla deniega el acceso a la subcolección de mensajes.

---

## 9. MATRIZ DE REQUISITOS DE AISLAMIENTO Y SEGURIDAD

Queda expresamente ratificado que la solución **NO DEBILITA** ninguna política de seguridad:
* 🔒 **Customer Isolation:** Un cliente solo puede escribir en pedidos donde su `auth.uid` sea `customerId` o `clienteId`.
* 🔒 **Courier Isolation:** Un repartidor solo puede escribir en pedidos donde su `auth.uid` sea `assignedCourierId` o `motorizadoId`.
* 🔒 **Anti-Spoofing:** `senderId` debe ser idéntico a `request.auth.uid`.
* 🔒 **Order Isolation:** Mensajes restringidos a su respectivo `orderId`.
* 🔒 **Terminal Lockout:** Prohibido crear mensajes en pedidos con estado finalizado (`delivered`, `completed`, `cancelled`).

---

## 10. PLAN DE REPARACIÓN QUIRÚRGICA (SURGICAL FIX PROPOSAL)

Para solventar definitivamente el `PERMISSION_DENIED` sin debilitar las reglas ni abrir permisos globales:

1. **Alineación de Regla de Subcolección `/orders/{orderId}/messages/{messageId}`:**
   * Garantizar que la regla evalúe la existencia del documento padre de forma segura.
   * Soportar tanto `/orders/{orderId}` como el fallback canónico a `/deliveryTrips/{orderId}` para encomiendas X→Y si la orden pertenece al Dominio B.
   * Normalizar la validación de estado no terminal (`!(status.lower() in [...])`).

2. **Aislamiento en `OrderChatRepository.kt`:**
   * Asegurar que `sendMessage()` ejecute únicamente el `set()` atómico sobre el documento del mensaje.
   * Desacoplar la limpieza de contadores `unreadCustomerCount` para que no bloquee ni condicione la transacción de envío de mensajes.

3. **Verificación en Dispositivos Reales:**
   * Ejecutar la prueba de envío bidireccional:
     * Customer envía: `TEST-CUSTOMER-ROOT-003` → Persiste en Firestore → Renderiza en Courier.
     * Courier envía: `TEST-COURIER-ROOT-003` → Persiste en Firestore → Renderiza en Customer.
     * Validar `PERMISSION_DENIED = 0`.

---

## 11. VEREDICTO FINAL

* **Estado de Certificación:** 🔴 **CHAT NOT CERTIFIED**  
* **Estado de Congelamiento:** 🔒 **FREEZE SUSPENDED**  
* **Condición de Levantamiento:** Demostración física en dispositivos reales con `PERMISSION_DENIED = 0` y persistencia E2E confirmada.

---
*Reporte oficial emitido conforme a las reglas de gobernanza arquitectónica y auditoría forense de BlueSystem v2.1 Enterprise.*
