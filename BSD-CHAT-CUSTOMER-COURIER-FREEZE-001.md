# 🔒 BLUE SYSTEM DELIVERY ENTERPRISE
# CONTRATO DE CONGELAMIENTO ARQUITECTÓNICO (ARCHITECTURAL FREEZE)
# CHAT CLIENTE ↔ MOTORIZADO v2.2 ENTERPRISE

**Documento:** `BSD-CHAT-CUSTOMER-COURIER-FREEZE-001`  
**Clasificación:** Baseline Inmutable / Architectural Freeze / SSOT  
**Fecha de Congelamiento:** 2026-08-30  
**Estatus:** 🔒 **FROZEN & IMMUTABLE**  
**Gobernanza:** ADR-003, ADR-013, ADR-014, ADR-015, ADR-016  

---

## 1. DECLARACIÓN DE CONGELAMIENTO

Habiéndose completado satisfactoriamente los protocolos:
- **`BSD-CHAT-CUSTOMER-COURIER-E2E-001`** (Auditoría Forense, Reparación Quirúrgica y Certificación E2E)
- **`BSD-CHAT-REAL-DEVICE-001`** (Smoke Test Físico E2E en Dispositivos Reales — 40/40 Tests PASS)

Se declara formalmente **CONGELADO E INMUTABLE** el subsistema de comunicación interactiva por chat entre **Cliente y Motorizado** de BlueSystem Delivery Enterprise.

---

## 2. COMPONENTES BLINDADOS (INMUTABLE BASELINE)

Queda estrictamente prohibido alterar la lógica, esquema o comportamiento de los siguientes 8 pilares arquitectónicos sin la apertura de un nuevo ADR formal:

### 1. Ruta Canónica y Subcolección Firestore SSOT
```text
/orders/{orderId}/messages/{messageId}
```
*Prohibido crear colecciones paralelas de chat o mensajes fuera de este árbol canónico.*

### 2. Esquema Inmutable del Mensaje
```typescript
interface OrderChatMessageEntity {
  id: string;                      // Identificador único del mensaje (msg_<timestamp>_<rand>)
  orderId: string;                 // ID canónico de la orden
  senderId: string;                // UID de Firebase Auth del remitente
  senderRole: "CUSTOMER" | "COURIER"; // Rol verificado
  senderNameSnapshot: string;      // Snapshot inmutable del nombre al momento de emitir
  senderName: string;              // Nombre legible
  text: string;                    // Contenido textual (1 - 2000 caracteres)
  type: "TEXT" | "CALL_EVENT";     // Tipo de evento
  createdAt: FieldValue;           // Server timestamp de Firestore
  readBy: string[];                // Lista de UIDs que han leído el mensaje
  readAt?: FieldValue;             // Timestamp de lectura
  status: "SENT" | "READ";         // Estado de lectura
  tenantId?: string;               // Aislamiento multi-tenant
  businessId?: string;             // Aislamiento por comercio
}
```

### 3. Reglas de Seguridad Anti-Spoofing en Firestore (`firestore.rules`)
- Creación restringida exclusivamente a `request.resource.data.senderId == currentUid()`.
- Rol `CUSTOMER` validado contra `customerId` o `clienteId` de la orden padre.
- Rol `COURIER` validado contra `assignedCourierId` o `motorizadoId` de la orden padre.
- Prohibición de nuevos mensajes si la orden está en estado finalizado (`delivered`, `completed`, `cancelled`).
- Eliminación de mensajes prohibida absolutamente (`allow delete: if false`).

### 4. Notificaciones Push FCM y Payload Multi-Dispositivo
- Cloud Function Trigger: `onOrderChatMessageCreated` en `functions/src/triggers/orderChat.ts`.
- Multicast FCM consultando la colección canónica `/user_devices`.
- Filtro estricto anti-auto-notificación: el remitente jamás recibe notificación de su propio mensaje.
- Payload canónico:
  ```json
  {
    "action": "ORDER_CHAT_MESSAGE",
    "screen": "order_chat",
    "orderId": "ORDER_ID",
    "messageId": "MESSAGE_ID",
    "senderRole": "CUSTOMER | COURIER",
    "senderName": "NAME"
  }
  ```

### 5. Enrutamiento por Deep Link en Android (`MainActivity.kt`)
- Acción interceptada: `ORDER_CHAT_MESSAGE` con `screen == "order_chat"`.
- Destino canónico: `Screen.OrderChat.createRoute(orderId)`.
- Soporte certificado para:
  - **Foreground:** Recepción reactiva por listener sin interrupción de pantalla.
  - **Background:** Notificación expandible y salto directo a la conversación activa.
  - **Cold Start (App Cerrada):** Inyección de `pendingTargetRoute` tras la restauración de sesión.

### 6. Contrato de Trazabilidad y Auditoría Admin Web (`liveOrders.js`)
- Modo estricto **Read-Only**: la consola administrativa no puede inyectar mensajes haciéndose pasar por cliente o motorizado.
- Suscripción en tiempo real mediante `onSnapshot` acotada al modal del pedido abierto.

### 7. Integración UI en Cliente (`TrackingScreen.kt`)
- Tarjeta de información del motorizado (`CourierDetails`) con botón interactivo de Chat en vivo.
- Modal de detalle del motorizado con botón de acción directa hacia `Screen.OrderChat`.

### 8. Integración UI en Motorizado (`RutaActivaScreen.kt`)
- Botón de Chat en vivo en la barra de control de entrega con acceso directo e instantáneo a la conversación con el cliente.

---

## 3. PROTOCOLO DE GOBERNANZA ANTE MODIFICACIONES FUTURAS

Cualquier cambio futuro en este subsistema requerirá obligatoriamente:
1. Demostración de falla técnica insalvable o nuevo requerimiento de negocio mediante un **ADR (Architectural Decision Record)** formal.
2. Ejecución previa de la suite de pruebas unitarias backend y Android con 100% de éxito.
3. Ejecución obligatoria de prueba de regresión sobre el protocolo **BSD-CHAT-REAL-DEVICE-001** en dispositivo físico.
4. Autorización explícita y humana de despliegue según **ADR-014 (NO AUTO-ROLLOUT POLICY)**.

---

# 🔒 CHAT CONTRACT FROZEN
**Baseline Inmutable Certificado — BlueSystem Delivery Enterprise v2.2**
