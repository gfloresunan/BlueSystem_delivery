# 15 — ORDER & TRIP FINITE STATE MACHINES

**Subsystem:** State Lifecycle & Validation Engine  
**Domains:** Commerce Orders (`/orders`) & Point-to-Point Trips (`/deliveryTrips`)

---

## 🔄 1. Commerce Order State Machine

| Current State | Next Allowed State | Allowed Actor | Trigger / UI Action | Cloud Function Triggered |
|---|---|---|---|---|
| `PENDING` | `PREPARING` | Merchant | Click "Aceptar Pedido" on Kanban | `onOrderStatusChanged` |
| `PENDING` | `CANCELLED` | Customer / Merchant | Click "Cancelar Pedido" | `onOrderCancelled` |
| `PREPARING` | `READY` | Merchant | Click "Marcar Listo" | `onOrderReady` (Fleet Broadcast) |
| `READY` | `ASSIGNED` | Courier / Merchant | Click "Tomar Pedido" in Pool | `onCourierAssigned` |
| `ASSIGNED` | `IN_TRANSIT` | Courier | Click "Confirmar Recogida" | `onOrderPickedUp` |
| `IN_TRANSIT` | `DELIVERED` | Courier | Verify PIN / Signature | `onOrderDelivered` |
| `DELIVERED` | `COMPLETED` | System / Admin | Auto-closure / Settlement | `onOrderCompleted` |

---

## 🛵 2. X → Y Delivery Trip State Machine

| Current State | Next Allowed State | Allowed Actor | Trigger / UI Action |
|---|---|---|---|
| `REQUESTED` | `ASSIGNED` | Courier | Driver accepts trip from Fleet Pool |
| `ASSIGNED` | `PICKING_UP` | Courier | Driver navigating to Origin Pin X |
| `PICKING_UP` | `IN_TRANSIT` | Courier | Driver picks up parcel from Sender |
| `IN_TRANSIT` | `DELIVERED` | Courier | Driver delivers parcel at Destination Pin Y |
| `DELIVERED` | `COMPLETED` | System | Signature and proof photo uploaded |

---
*Evidence: state transition validation in `functions/src/domain/orders/stateMachine.ts`.*
