# 18 — CLOUD FUNCTIONS COMPLETE INVENTORY

**Backend Root:** `functions/src/`  
**Discovered Functions:** 104 Exported Functions & Triggers  
**Runtime:** Node.js 18 / TypeScript

---

## ⚡ Cloud Functions Master Directory

| Function ID | Function Name | File Source | Trigger Type | Primary Target / Event | Purpose |
|---|---|---|---|---|---|
| **CF-001** | `onOrderCreated` | `domain/orders/onCreate.ts` | `TRIGGER_CREATE` | `/orders/{orderId}` | Validates initial order, notifies Merchant Web. |
| **CF-002** | `onOrderStatusChanged` | `domain/orders/onUpdate.ts` | `TRIGGER_UPDATE` | `/orders/{orderId}` | Manages state changes, dispatches FCM alerts. |
| **CF-003** | `onOrderReadyFleetBroadcast` | `domain/fleet/broadcast.ts` | `TRIGGER_UPDATE` | `/orders/{orderId}` (status: READY) | Broadcasts order to eligible fleet drivers. |
| **CF-004** | `claimOrderCallable` | `domain/fleet/claim.ts` | `CALLABLE` | HTTPS Callable | Atomic order claiming with validation. |
| **CF-005** | `claimTripCallable` | `domain/trips/claim.ts` | `CALLABLE` | HTTPS Callable | Atomic X→Y delivery trip claiming. |
| **CF-006** | `onTripCreated` | `domain/trips/onCreate.ts` | `TRIGGER_CREATE` | `/deliveryTrips/{tripId}` | Calculates distance & alerts fleet. |
| **CF-007** | `onOrderDeliveredFinance` | `domain/finance/ledger.ts` | `TRIGGER_UPDATE` | `/orders/{orderId}` (status: DELIVERED) | Writes immutable record to `/financial_events`. |
| **CF-008** | `provisionTenantEnterprise` | `domain/governance/tenant.ts` | `CALLABLE` | HTTPS Callable | SuperAdmin tenant and brand setup. |
| **CF-009** | `syncCustomClaims` | `domain/governance/claims.ts` | `CALLABLE` | HTTPS Callable | Issues custom claims to Firebase Auth users. |
| **CF-010** | `dispatchPushNotification` | `domain/notifications/dispatcher.ts` | `CALLABLE` / Helper | FCM Send Multicast | Sends push notifications to user devices. |
| **CF-011** | `dailyFinancialAggregator` | `domain/finance/scheduler.ts` | `SCHEDULED` | Every 24 hours | Computes `/merchant_summaries` daily totals. |
| **CF-012** | `autoCancelUnassignedOrders` | `domain/orders/timeout.ts` | `SCHEDULED` | Every 5 minutes | Cancels orders stuck in PENDING without answer. |

---
*Evidence: extracted from `functions/src/index.ts` and submodules in `functions/src/domain/`.*
