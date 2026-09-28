# C2D26 — API CONTRACT AUDIT

**Phase:** C2D.26  
**Scope:** TypeScript Core (backend) contracts vs Dart Flutter client contracts  

---

## 1. Firestore Collection Contract Comparison

| Collection | Canonical Fields (Backend TS) | Flutter Dart Entity | Alignment |
|---|---|---|---|
| `/orders` | orderId, tenantId, businessId, customerId, customerName, customerPhone, deliveryAddress, status, total, items[], createdAt, updatedAt | `OrderEntity` — all fields present | 🟢 ALIGNED |
| `/deliveryTrips` | tripId, tenantId, customerId, assignedCourierId, originAddress, originLat, originLng, destinationAddress, destinationLat, destinationLng, status, fare, distanceKm | `TripEntity` — all fields present | 🟢 ALIGNED |
| `/ubicaciones_repartidores` | courierId, tenantId, latitude, longitude, timestamp, isOnline, speedKmh, batteryLevel, courierName | `CourierLocationEntity` — all fields present | 🟢 ALIGNED |
| `/tenants` | tenantId, name, status, plan, createdAt | `TenantEntity` — consumed via `FirestorePlatformService` | 🟢 ALIGNED |
| `/brands` | brandId, tenantId, displayName, visual{primaryColor,...}, status | `BrandEntity` + `BrandVisualConfig` | 🟢 ALIGNED |
| `/subscriptions` | subscriptionId, tenantId, planId, planTier, enabledFeatures[], disabledFeatures[], limits{} | `SubscriptionEntity` + `SubscriptionQuotas` | 🟢 ALIGNED |
| `/app_configs` | configId, tenantId, brandId, platform, environment, distribution{}, providers{}, featureFlags{} | `AppConfigEntity` | 🟢 ALIGNED |

---

## 2. Status Enum Contract Comparison

### OrderStatus
| Backend Value | Flutter Enum | Match |
|---|---|---|
| PENDING | `OrderStatus.pending` | ✅ |
| ACCEPTED | `OrderStatus.accepted` | ✅ |
| PREPARING | `OrderStatus.preparing` | ✅ |
| READY_FOR_PICKUP | `OrderStatus.readyForPickup` | ✅ |
| DISPATCHED | `OrderStatus.dispatched` | ✅ |
| DELIVERED | `OrderStatus.delivered` | ✅ |
| CANCELLED | `OrderStatus.cancelled` | ✅ |

### TripStatus
| Backend Value | Flutter Enum | Match |
|---|---|---|
| OFFERED | `TripStatus.offered` | ✅ |
| ASSIGNED | `TripStatus.assigned` | ✅ |
| ON_WAY_TO_ORIGIN | `TripStatus.onWayToOrigin` | ✅ |
| ARRIVED_ORIGIN | `TripStatus.arrivedOrigin` | ✅ |
| PICKED_UP | `TripStatus.pickedUp` | ✅ |
| ON_WAY_DESTINATION | `TripStatus.onWayDestination` | ✅ |
| ARRIVED_DESTINATION | `TripStatus.arrivedDestination` | ✅ |
| DELIVERED | `TripStatus.delivered` | ✅ |
| CANCELLED | `TripStatus.cancelled` | ✅ |

---

## 3. EIAM v3 Custom Claims Contract

| Claim Field (Backend) | Flutter `CanonicalCustomClaimsV3` Field | Match |
|---|---|---|
| `role` | `role: EiamRole` | ✅ |
| `tenantId` | `tenantId: String?` | ✅ |
| `brandId` | `brandId: String?` | ✅ |
| `orgId` | `orgId: String?` | ✅ |
| `businessId` | `businessId: String?` | ✅ |
| `branchId` | `branchId: String?` | ✅ |
| `status` | `status: String` | ✅ |
| `eiamVer` | `eiamVer: int` | ✅ |

---

## 4. Gaps Identified

| GAP ID | Description | Priority |
|---|---|---|
| **GAP-API-01** | Courier settlement/liquidation API — no Cloud Function contract certified yet | P2 — 🟡 CONTRACT REQUIRED |
| **GAP-API-02** | Loyalty/coupon redemption API — no Flutter contract defined | P3 — 🟡 CONTRACT REQUIRED |

---

## 5. Conclusion

```
CONTRACTS ALIGNED:      🟢 ALL CANONICAL FIELDS MATCHED
INVENTED FIELDS:        0
RENAMED CONTRACTS:      0
CONTRACT GAPS:          2 (P2, P3 — non-blocking for C2D.26)
```
