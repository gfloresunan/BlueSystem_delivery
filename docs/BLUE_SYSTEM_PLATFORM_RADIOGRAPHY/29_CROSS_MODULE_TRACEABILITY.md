# 29 — CROSS-MODULE TRACEABILITY MATRIX

**Purpose:** End-to-end trace from UI Component through ViewModel, Repository, Cloud Function, Firestore to Final UI Output.

---

## 🔬 Master Traceability Matrix

| UI Component / Trigger | ViewModel / Controller | Repository / Service | Cloud Function | Firestore Path | Resulting Client Output |
|---|---|---|---|---|---|
| `CheckoutScreen.kt` (Click Pagar) | `CheckoutViewModel` | `OrderRepository` | `onOrderCreated` | `/orders/{orderId}` | Merchant Web Kanban chimes & shows card. |
| `LiveOrdersView.tsx` (Click Aceptar) | `LiveOrdersModule` | `firebaseService` | `onOrderStatusChanged` | `/orders/{orderId}` | Customer app timeline moves to "PREPARING". |
| `LiveOrdersView.tsx` (Click Listo) | `LiveOrdersModule` | `firebaseService` | `onOrderReadyFleetBroadcast` | `/orders/{orderId}` | Couriers receive push; card appears in Fleet Pool. |
| `FleetPoolScreen.kt` (Click Tomar) | `CourierViewModel` | `claimOrderAtomically` | `claimOrderCallable` | `/orders/{orderId}` | Order locks to courier; disappears from other pool views. |
| `ActiveDeliveryMapScreen.kt` (GPS) | `LocationViewModel` | `LocationTrackingService` | None (Direct write) | `/ubicaciones_repartidores/{id}` | Customer & Merchant maps animate bike marker smoothly. |
| `SolicitarEnvioScreen.kt` (Crear) | `SolicitarEnvioViewModel`| `DeliveryTripRepository`| `onTripCreated` | `/deliveryTrips/{tripId}` | Direct broadcast to Fleet Pool for courier pickup. |
| `DeliveryCompletionDialog.kt` (PIN) | `CourierViewModel` | `OrderRepository` | `onOrderDeliveredFinance` | `/orders/{orderId}` | Customer receives review modal; `/financial_events` updated. |

---
*Evidence: verified across full-stack codebase.*
