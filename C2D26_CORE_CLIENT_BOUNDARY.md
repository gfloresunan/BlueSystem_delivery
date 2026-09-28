# C2D26 — CORE VS CLIENT ARCHITECTURAL BOUNDARY

**Protocol:** BSD-C2D26-FLUTTER-COMMERCIAL-CLIENT-IMPLEMENTATION-001  
**Principle:** Single Source of Truth (Core backend is authoritative; Flutter is presentation & client interaction layer).

---

## 1. Architectural Boundary Diagram

```
                        ╔══════════════════════════════════╗
                        ║     BLUE SYSTEM CORE (BACKEND)   ║
                        ║  - Authoritative State Machines  ║
                        ║  - Dynamic Pricing Calculation   ║
                        ║  - EIAM v3 Custom Claims Issuer  ║
                        ║  - Multi-Tenant Isolation Rules  ║
                        ║  - Fleet Dispatch & Settlement   ║
                        ║  - Transactional Notifications   ║
                        ╚══════════════════════════════════╝
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
  ┌─────────────────────────────────┐         ┌─────────────────────────────────┐
  │  TRACK A: ANDROID REFERENCE     │         │   TRACK B: FLUTTER CLIENT       │
  │  Native Jetpack Compose / Room  │         │   Multi-Platform Presentation   │
  │  Location Services / Workers    │         │   Dynamic Brand Theming         │
  │  app/                           │         │   flutter_client/               │
  └─────────────────────────────────┘         └─────────────────────────────────┘
```

---

## 2. Core vs Client Responsibilities

| Responsibility | Core (Backend / Cloud Functions / Firestore) | Flutter Client (`flutter_client/`) |
|---|---|---|
| **Authentication & Claims** | Issue canonical custom claims (`role`, `tenantId`, etc.) | Read & hydrate claims; enforce client-side Gatekeeper |
| **Tenant Isolation** | Security rules validate `request.auth.token.tenantId` | Inject `tenantId` into queries; fail-closed on mismatch |
| **Pricing & Fare Engine** | Authoritative calculation ($35 base + km * $15) | Display formatted fare received from backend |
| **Order State Machine** | Validate transitions (e.g. `PENDING` -> `ACCEPTED`) | Submit action requests; display realtime updates |
| **Trip Dispatch Engine** | Driver assignment transaction, Haversine checks | Display status (`ON_WAY_TO_ORIGIN`, `DELIVERED`, etc.) |
| **Brand Theming** | Store `BrandVisualConfig` in `/brands` | Synthesize Material 3 dynamic `ThemeData` |
| **Telemetry Ingestion** | Ingest `/ubicaciones_repartidores/{courierId}` | Read GPS streams and dispatch coordinates |

---

## 3. Boundary Rules & Prohibitions

1. **NO Local Price Calculations:** Pricing logic must never be duplicated in Dart.
2. **NO Local State Transitions:** State transitions must pass through Cloud Functions or authorized Firestore operations.
3. **NO Direct Database Mutations from Unauthenticated Clients:** All writes require valid auth session.
4. **NO Tenant Crossover:** Client requests must never mix data from different `tenantId` contexts.
