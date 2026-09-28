# 14 — FLEET CORE & SMART DISPATCH ENGINE

**Subsystem:** Fleet Allocation, Dispatching & Telemetry  
**Components:** `FleetEligibilityEngine`, `SmartAssignmentWorker`, `claimOrderAtomically`  
**Baseline Freeze:** ADR-016 (Courier Core & Control Tower Freeze)

---

## ⚡ 1. Fleet Dispatch Architecture

```mermaid
flowchart TD
    ORDER_READY[Order or Trip Marked READY] --> FLEET_ENGINE[FleetEligibilityEngine]
    
    subgraph "Eligibility Verification Filter"
        F1["Filter 1: isOnline == true"]
        F2["Filter 2: GPS Freshness <= 10 minutes"]
        F3["Filter 3: Tenant & City Boundary Match"]
        F4["Filter 4: Vehicle Capacity & Active Route Load < Max"]
    end
    
    FLEET_ENGINE --> F1 --> F2 --> F3 --> F4
    F4 --> ELIGIBLE_COURIERS["Eligible Candidate Couriers"]
    
    ELIGIBLE_COURIERS --> MODE_A["Mode A: Auto-Dispatch (Proximity Sort)"]
    ELIGIBLE_COURIERS --> MODE_B["Mode B: Broadcast to Fleet Pool"]
    
    MODE_A --> TIMEOUT{"Courier Responded in 30s?"}
    TIMEOUT --> |Yes| ASSIGNED[Courier Assigned]
    TIMEOUT --> |No / Rejected| REASSIGN[Re-dispatch to Next Nearest Courier]
```

---

## 🛡️ 2. Atomic Claim Mechanism (`claimOrderAtomically`)

To eliminate race conditions across distributed Android clients:
```typescript
// Cloud Function / Firestore Transaction Pattern
await db.runTransaction(async (transaction) => {
  const orderRef = db.collection('orders').doc(orderId);
  const orderDoc = await transaction.get(orderRef);
  
  if (!orderDoc.exists) throw new Error('ORDER_NOT_FOUND');
  const data = orderDoc.data();
  
  if (data.status !== 'READY' || data.assignedCourierId) {
    throw new Error('ORDER_ALREADY_CLAIMED');
  }
  
  transaction.update(orderRef, {
    assignedCourierId: courierId,
    courierAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'ASSIGNED'
  });
});
```

---
*Evidence: inspection of `functions/src/domain/fleet/` and `FirebaseManager.kt`.*
