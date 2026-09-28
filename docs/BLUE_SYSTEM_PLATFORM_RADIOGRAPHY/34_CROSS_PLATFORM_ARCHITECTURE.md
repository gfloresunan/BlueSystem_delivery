# 34 — CROSS-PLATFORM COHESION & FUTURE IOS READINESS

**Current State:** Dual Android Native (Customer & Courier) + Web (Merchant, Admin, Onboarding)  
**Future Readiness:** iOS Customer & Courier Blueprint

---

## 📱 1. Platform Topology

```mermaid
flowchart TD
    BACKEND[Unified Backend & Security Rules]
    
    subgraph "Production Active Clients"
        AND_CUS["Customer App (Android Kotlin / Compose)"]
        AND_COU["Courier App (Android Kotlin / Compose)"]
        WEB_MER["Merchant Web (React 18 / TS)"]
        WEB_ADM["Admin Governance Panel (Enterprise SPA)"]
        WEB_ONB["Merchant Onboarding Portal (React / TS)"]
    end
    
    subgraph "Future iOS Blueprint (Zero Backend Mutation Required)"
        IOS_CUS["Customer App iOS (Swift / SwiftUI)"]
        IOS_COU["Courier App iOS (Swift / SwiftUI)"]
    end
    
    BACKEND <--> AND_CUS & AND_COU & WEB_MER & WEB_ADM & WEB_ONB
    BACKEND -.-> |Future Protocol| IOS_CUS & IOS_COU
```

---

## 🍏 2. iOS Readiness & Reusable Backend Contracts

The backend requires **zero mutations** to support future iOS clients:
1. **Firestore Schemas:** The 98 Firestore collections and documents use platform-agnostic JSON schemas fully compatible with Swift `Codable`.
2. **Authentication:** Firebase Auth and Custom Claims work identically on iOS via Apple Sign-In and Google Sign-In.
3. **Push Notifications:** Cloud Functions use Firebase Admin SDK `sendEachForMulticast`, which natively translates FCM payloads to APNs (Apple Push Notification service).
4. **GPS Telemetry:** `CLLocationManager` on iOS can publish directly to `/ubicaciones_repartidores/{courierId}` using the identical 5s/60s frequency model.

---
*Evidence: architectural blueprint analysis.*
