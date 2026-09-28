# C2D26 — ORDERS IMPLEMENTATION

**Module:** Commercial Orders Management  
**File:** `flutter_client/lib/presentation/screens/orders/orders_screen.dart`  

---

## 1. Technical Capabilities

1. **Realtime Stream Subscription:** Subscribes to `/orders` collection filtered by `tenantId` and either `businessId` (for merchant roles) or `customerId` (for client roles).
2. **Status Filtering:** Supports local filtering by `PENDING`, `PREPARING`, `DISPATCHED`, `DELIVERED`, `ALL`.
3. **Order Detail Sheet:** Draggable bottom sheet with itemized breakdown, customer contact details, delivery address, and formatted currency totals.
4. **State Machine Integrity:** Zero local transition overrides; updates are written to Firestore for Cloud Function verification.
