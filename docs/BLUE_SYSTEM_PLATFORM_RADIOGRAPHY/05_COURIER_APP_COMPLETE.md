# 05 — COURIER APP COMPLETE RADIOGRAPHY

**Platform:** Android Native (Courier Module)  
**Language / Framework:** Kotlin / Jetpack Compose / Material Design 3  
**Package:** `com.example.ui.courier` & `com.example.service`  
**Primary Entry Point:** `CourierMainActivity.kt` (Role: `COURIER` / `MOTORIZADO`)

---

## 🛵 1. Functional Architecture & Operating Modes

The Courier App is the operational driver client for fleet members. It features two fundamental dispatch modes:

```mermaid
flowchart TD
    ONLINE[Toggle Shift: ONLINE] --> DISPATCH{Dispatch Flow}
    
    DISPATCH --> |Mode 1: Self-Service Pool| POOL["Fleet Pool Tab (/orders or /deliveryTrips where status='READY')"]
    DISPATCH --> |Mode 2: Direct Assignment| ASSIGNED["My Assigned Orders Tab (assignedCourierId == myUid)"]
    
    POOL --> |claimOrderAtomically()| CLAIM_TX[Firestore Atomic Transaction]
    CLAIM_TX --> |Success: Lock Acquired| ASSIGNED
    CLAIM_TX --> |Conflict: Already Taken| POOL_REFRESH[Refresh Pool]
    
    ASSIGNED --> PICKUP[Route to Merchant / Origin X]
    PICKUP --> |Confirm Pickup| IN_TRANSIT[Active Navigation to Customer / Destination Y]
    IN_TRANSIT --> |Confirm Delivery| POD[Proof of Delivery / PIN / Signature / Cash]
    POD --> COMPLETED[Order Marked DELIVERED]
```

---

## 🛰️ 2. High-Precision Telemetry & Background GPS Engine

- **Service:** `LocationTrackingService.kt` (Android Foreground Service with sticky notification).
- **Worker:** `LocationSyncWorker.kt` for background battery-efficient updates.
- **Publish Path:** Writes to `/ubicaciones_repartidores/{courierId}`.
- **Payload Schema:**
  ```json
  {
    "courierId": "uid_123",
    "courierName": "Carlos Mendoza",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "heading": 84.5,
    "speed": 22.4,
    "isOnline": true,
    "currentOrderId": "ord_456",
    "tenantId": "tenant_enterprise",
    "updatedAt": "SERVER_TIMESTAMP"
  }
  ```
- **Sync Frequencies:**
  - **In Active Route:** Broadcast every **5 seconds** with high accuracy (`PRIORITY_HIGH_ACCURACY`).
  - **Idle / Standby:** Broadcast every **60 seconds** to minimize battery and cloud write overhead.

---

## 🔒 3. Concurrency Protection & Atomic Claims

To eliminate double-assignment race conditions when 10+ couriers see the same order in the Fleet Pool:
1. The app invokes `claimOrderAtomically(orderId, courierId)` via Firestore `runTransaction`.
2. The transaction verifies that `order.assignedCourierId == null` and `order.status == "READY"`.
3. If valid, it writes `assignedCourierId = courierId`, sets `status = "ASSIGNED"`, and sets `assignedAt = now()`.
4. If already claimed by another driver, transaction aborts cleanly, and the UI displays "Pedido tomado por otro repartidor".

---
*Evidence: active inspection of `app/src/main/java/com/example/ui/courier/` and `FirebaseManager.kt`.*
