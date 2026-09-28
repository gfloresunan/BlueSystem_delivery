# 🔵 BLUE SYSTEM DELIVERY ENTERPRISE
# PROTOCOLO OFICIAL DE RESOLUCIÓN ARQUITECTÓNICA DEL CHAT
# BSD-CHAT-DOMAIN-ALIGNMENT-004
# AUDITORÍA DEFINITIVA /orders ↔ /deliveryTrips ↔ CHAT

**Documento:** `BSD-CHAT-DOMAIN-ALIGNMENT-004-REPORT.md`  
**Protocolo:** `BSD-CHAT-DOMAIN-ALIGNMENT-004`  
**Clasificación:** Arquitectura de Datos / Separación de Dominios / Seguridad EIAM / Persistencia de Chat  
**Prioridad:** 🔴 P0 — CRÍTICA  
**Estado:** 🔴 **CHAT NOT CERTIFIED**  
**Freeze Status:** 🔒 **BSD-CHAT-CUSTOMER-COURIER-FREEZE-001 SUSPENDED**  
**Fecha:** 2026-09-01  
**Autor:** Senior Developer & Auditor de BlueSystem v2.1 Enterprise  

---

## 1. RESUMEN EJECUTIVO (EXECUTIVE SUMMARY)

Se ha completado la auditoría arquitectónica forense bajo el protocolo **BSD-CHAT-DOMAIN-ALIGNMENT-004** para resolver de forma estructural y definitiva el error `PERMISSION_DENIED` en el envío de mensajes de chat en dispositivos físicos reales.

### Hallazgo Primario Inapelable:
El sistema BlueSystem Delivery opera bajo **dos dominios ontológicos completamente independientes**:
1. **Dominio A — Commerce Delivery (Marketplace / Restaurantes / Tiendas):** Colección canónica `/orders/{orderId}`.
2. **Dominio B — X→Y Delivery (Encomiendas P2P / Punto a Punto):** Colección canónica `/deliveryTrips/{tripId}`.

El origen fundamental del `PERMISSION_DENIED` en las pruebas de dispositivos reales ocurrió porque el pedido de prueba fue generado en el **Dominio B (X→Y Delivery)**, pero la infraestructura de mensajería (ViewModel, Repository, Security Rules, FCM Triggers y Admin Web) estaba **hardcodeada exclusivamente para el Dominio A (`/orders/{orderId}/messages`)**.

Al ser reclamado el viaje por el repartidor mediante `claimTripAtomically()` en `/deliveryTrips/{tripId}`, la asignación (`assignedCourierId`) se registró en `/deliveryTrips`, dejando el documento `/orders` sin courier asignado. Al intentar enviar un mensaje a `/orders/{orderId}/messages`, las reglas de Firestore evaluaron `currentUid() == get(/orders/...).assignedCourierId`, lo cual devolvió `FALSE` y bloqueó la escritura con `PERMISSION_DENIED`.

---

## 2. PRINCIPIOS ARQUITECTÓNICOS INNEGOCIABLES

Conforme a la documentación maestra de arquitectura (**ADR-015**, **ADR-016**, `13_X_TO_Y_DELIVERY.md` y `BlueSystem_Delivery_Ecosistema_Enterprise.pptx`):

* 🚫 **PROHIBIDO** Convertir `/orders` y `/deliveryTrips` en una sola entidad artificial o fusionar colecciones.
* 🚫 **PROHIBIDO** Replicar o duplicar pedidos de forma artificial solo para forzar el funcionamiento del chat.
* 🚫 **PROHIBIDO** Abrir las reglas de Firestore globalmente (`allow create: if isAuthenticated()`).
* 🚫 **PROHIBIDO** Permitir que un courier no asignado pueda leer o escribir en una conversación que no le pertenece.

---

## 3. MATRIZ DE COMPARACIÓN DE DOMINIOS

| Dimensión | Dominio A: Commerce Delivery | Dominio B: X → Y Delivery |
| :--- | :--- | :--- |
| **Fuente Canónica (SSOT)** | `/orders/{orderId}` | `/deliveryTrips/{tripId}` |
| **Creación** | `CustomerHomeViewModel` / Carrito | `SolicitarEnvioScreen` (Punto X → Punto Y) |
| **Intermediario de Negocio** | Comercio / Tienda (`businessId`, `tenantId`, `branchId`) | **Ninguno** (Envío P2P directo) |
| **Tarificación** | Subtotal productos + Delivery Fee Comercio | Motor Haversine Base $35 + $15/km |
| **Participante Cliente** | `customerId` / `clienteId` | `customerId` / `clienteId` |
| **Participante Courier** | `assignedCourierId` / `motorizadoId` | `assignedCourierId` / `courierId` |
| **Método de Reclamación** | `claimOrderAtomically(orderId, courierId, ...)` | `claimTripAtomically(tripId, courierId, ...)` |
| **Mutación en Reclamación** | Actualiza `/orders/{orderId}` | Actualiza `/deliveryTrips/{tripId}` |
| **Subcolección Canónica de Chat** | `/orders/{orderId}/messages/{messageId}` | `/deliveryTrips/{tripId}/messages/{messageId}` |

---

## 4. AUDITORÍA DE LAS FUNCIONES DE RECLAMACIÓN (`claimAtomically`)

### 4.1. `claimOrderAtomically()` (Dominio A)
* **Archivo:** `app/src/main/java/com/example/FirebaseManager.kt` (Líneas 107–132)
* **Documento modificado:** `/orders/{orderId}`
* **Campos escritos:**
  ```kotlin
  "assignedCourierId" to courierId,
  "motorizadoId" to courierId,
  "courierName" to courierName,
  "status" to "ASSIGNED",
  "estado" to "asignado",
  "courierPhase" to 2,
  "assignedAt" to Timestamp.now()
  ```
* **Comportamiento:** Exclusivo de Dominio A. **No toca `/deliveryTrips`**.

### 4.2. `claimTripAtomically()` (Dominio B)
* **Archivo:** `app/src/main/java/com/example/FirebaseManager.kt` (Líneas 135–158)
* **Documento modificado:** `/deliveryTrips/{tripId}`
* **Campos escritos:**
  ```kotlin
  "courierId" to courierId,
  "assignedCourierId" to courierId,
  "courierName" to courierName,
  "status" to "ASSIGNED",
  "assignedAt" to Timestamp.now()
  ```
* **Comportamiento:** Exclusivo de Dominio B. **No toca `/orders`**.

---

## 5. TRAZA DETALLADA DE LA FALLA EN EL PEDIDO DE PRUEBA (KAQMU8)

```text
[SENDER / CUSTOMER]
SolicitarEnvioScreen ──► Crea Viaje X→Y ──► Persiste en /deliveryTrips/KAQMU8
                                                   │
                                                   ▼
[COURIER FLEET POOL]
Courier ve encomienda en Pool ──► Pulsa "Aceptar"
                                                   │
                                                   ▼
[ATOMIC TRANSACTION]
claimTripAtomically("KAQMU8", courierUid) ──► Mutación en /deliveryTrips/KAQMU8
  - assignedCourierId = "xK9pL..." (UID Courier)
  - status = "ASSIGNED"
                                                   │
                                                   ▼
[OPEN CHAT SCREEN]
Ambos abren OrderChatScreen(orderId = "KAQMU8")
  - OrderChatViewModel lee /orders/KAQMU8 (¡Dominio equivocado!)
  - /orders/KAQMU8 tiene assignedCourierId = "" (No fue mutado por claimTripAtomically)
                                                   │
                                                   ▼
[USER SENDS MESSAGE]
Pulsa botón SEND [▶]
  - OrderChatRepository escribe a /orders/KAQMU8/messages/msg_123
                                                   │
                                                   ▼
[FIRESTORE SECURITY RULES]
Evalúa regla create en /orders/KAQMU8/messages/msg_123:
  currentUid() == get(/orders/KAQMU8).assignedCourierId
  "xK9pL..." == "" ──► FALSE
                                                   │
                                                   ▼
❌ PERMISSION_DENIED (Status Code 7)
```

---

## 6. DECISIÓN ARQUITECTÓNICA DEFINITIVA (ARQUITECTURA DE CHAT BICANAL)

Para mantener la separación de dominios sin violar las políticas de seguridad ni inventar entidades híbridas:

```mermaid
flowchart TD
    subgraph DOMINIO_A [Dominio A: Commerce Delivery]
        ORD[/orders/{orderId}/]
        ORD_CHAT[/orders/{orderId}/messages/{messageId}/]
        ORD --> ORD_CHAT
        RULES_A[Rules: Valida contra /orders/{orderId}]
        FCM_A[Cloud Function: onOrderChatMessageCreated]
        ADMIN_A[Admin Web: Live Orders Chat Box]
    end

    subgraph DOMINIO_B [Dominio B: X to Y Delivery]
        TRIP[/deliveryTrips/{tripId}/]
        TRIP_CHAT[/deliveryTrips/{tripId}/messages/{messageId}/]
        TRIP --> TRIP_CHAT
        RULES_B[Rules: Valida contra /deliveryTrips/{tripId}]
        FCM_B[Cloud Function: onTripChatMessageCreated]
        ADMIN_B[Admin Web: Live Trips Chat Box]
    end
```

### 6.1. Especificación del Contrato de Mensajería

| Componente | Dominio Commerce | Dominio X → Y |
| :--- | :--- | :--- |
| **Colección Padre** | `/orders/{orderId}` | `/deliveryTrips/{tripId}` |
| **Subcolección Chat**| `/orders/{orderId}/messages/{messageId}` | `/deliveryTrips/{tripId}/messages/{messageId}` |
| **Identificador Canónico** | `orderId` | `tripId` |
| **Resolución en ViewModel** | Escucha `/orders/{orderId}` | Escucha `/deliveryTrips/{tripId}` |
| **Validación en Rules** | `get(/orders/$(orderId))` | `get(/deliveryTrips/$(tripId))` |
| **Push Trigger FCM** | `orders/{orderId}/messages/{messageId}` | `deliveryTrips/{tripId}/messages/{messageId}` |
| **Deep Link Action** | `Screen.OrderChat.createRoute(orderId)` | `Screen.TripChat.createRoute(tripId)` o unificado con prefijo de dominio |

---

## 7. ESPECIFICACIÓN DE REGLAS DE SEGURIDAD PARA X→Y (`firestore.rules`)

Bajo el bloque `match /deliveryTrips/{tripId}` se debe formalizar la subcolección de mensajes con exactamente el mismo nivel de rigor y auditoría:

```firestore
      // ─── /deliveryTrips/{tripId}/messages/{messageId} (Live Chat Encomiendas X→Y) ───
      match /messages/{messageId} {
        // Lectura: Participantes autorizados del viaje (Cliente remitente, Courier asignado) y Admin
        allow read: if isAuthenticated() && (
          isPlatformAdmin() ||
          currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("customerId", "") ||
          currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("clienteId", "") ||
          currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("assignedCourierId", "") ||
          currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("courierId", "")
        );

        // Creación: Append-only por Cliente o Motorizado asignado en viajes no finalizados
        allow create: if isAuthenticated() &&
          request.resource.data.senderId == currentUid() &&
          request.resource.data.orderId == tripId &&
          request.resource.data.text is string &&
          request.resource.data.text.trim().size() > 0 &&
          request.resource.data.text.size() <= 2000 &&
          request.resource.data.createdAt == request.time &&
          (
            (request.resource.data.senderRole == "CUSTOMER" &&
             (currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("customerId", "") ||
              currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("clienteId", ""))) ||
            (request.resource.data.senderRole == "COURIER" &&
             (currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("assignedCourierId", "") ||
              currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("courierId", "")))
          ) &&
          !(get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("status", "") in ["DELIVERED", "COMPLETED", "CANCELLED", "delivered", "completed", "cancelled", "entregado", "completado", "cancelado"]);

        // Actualización: Restringida a recibos de lectura
        allow update: if isAuthenticated() &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(["readAt", "readBy", "status"]) &&
          (
            currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("customerId", "") ||
            currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("clienteId", "") ||
            currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("assignedCourierId", "") ||
            currentUid() == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.get("courierId", "") ||
            isPlatformAdmin()
          );

        // Prohibición absoluta de borrado
        allow delete: if false;
      }
```

---

## 8. INTEGRACIÓN DE PUSH NOTIFICATIONS (FCM) & ADMIN WEB

### 8.1. Cloud Functions (`onTripChatMessageCreated`)
* Se define el trigger en `functions/src/triggers/tripChat.ts` sobre `deliveryTrips/{tripId}/messages/{messageId}`.
* Resuelve `recipientUid`:
  * Si `senderRole === "CUSTOMER"` → `recipientUid = tripData.assignedCourierId || tripData.courierId`.
  * Si `senderRole === "COURIER"` → `recipientUid = tripData.customerId || tripData.clienteId`.
* Envía notificación push con action `TRIP_CHAT_MESSAGE` y data `{ tripId, messageId, senderRole }`.

### 8.2. Admin Web
* Para pedidos de comercio: Escucha `/orders/{orderId}/messages` en el modal de detalle de orden.
* Para encomiendas X→Y: Escucha `/deliveryTrips/{tripId}/messages` en el módulo de Encomiendas/Viajes X→Y.

---

## 9. PLAN DE IMPLEMENTACIÓN QUIRÚRGICO (STEP-BY-STEP)

1. **Paso 1 — Security Rules:** Incorporar la regla de subcolección `/deliveryTrips/{tripId}/messages/{messageId}` en `firestore.rules` con el mismo estándar de auditoría e inmutabilidad.
2. **Paso 2 — Android Chat Engine:**
   * Actualizar `OrderChatRepository.kt` para soportar la ruta canónica basada en el dominio (`orders` o `deliveryTrips`).
   * Actualizar `OrderChatViewModel.kt` para resolver la entidad padre (`orders` vs `deliveryTrips`) dinámicamente o por parámetro `domain`.
3. **Paso 3 — Backend FCM Trigger:** Agregar el trigger para `deliveryTrips/{tripId}/messages/{messageId}` en Cloud Functions.
4. **Paso 4 — Pruebas de Regresión y Validación Física:**
   * Prueba 1: Commerce Delivery Customer → Courier (`TEST-COMMERCE-CUSTOMER-004`).
   * Prueba 2: Commerce Delivery Courier → Customer (`TEST-COMMERCE-COURIER-004`).
   * Prueba 3: X→Y Delivery Customer → Courier (`TEST-X2Y-CUSTOMER-004`).
   * Prueba 4: X→Y Delivery Courier → Customer (`TEST-X2Y-COURIER-004`).
   * Validación de `PERMISSION_DENIED = 0`.

---

## 10. VEREDICTO DE LA AUDITORÍA

* **Diagnóstico de Causa Raíz:** 🟢 **CONFIRMADO DETERMINÍSTICAMENTE (Falta de soporte de subcolección de chat en Dominio B `/deliveryTrips`)**.
* **Estado Actual:** 🔴 **CHAT NOT CERTIFIED** (Pendiente ejecución de reparación quirúrgica).
* **Freeze Status:** 🔒 **BSD-CHAT-CUSTOMER-COURIER-FREEZE-001 SUSPENDED**.

---
*Reporte emitido conforme a la regla de gobernanza arquitectónica y preservación de aislamiento de dominios de BlueSystem v2.1 Enterprise.*
