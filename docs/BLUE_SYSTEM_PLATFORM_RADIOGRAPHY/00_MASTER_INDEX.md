# 00 — MASTER INDEX: BLUE SYSTEM DELIVERY ENTERPRISE PLATFORM RADIOGRAPHY

**Protocol:** `BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001`  
**Version:** Enterprise 2.2 Canonical Baseline  
**Firebase Project:** `bluesystem-7c9af`  
**Target Audience:** UX/UI Auditors, Lead Architects, Product Owners & Engineers  
**Execution Mode:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION`

---

## 📑 Executive Document Inventory & Sitemap

This master documentation suite provides a deep, evidence-backed functional, technical, and UX/UI radiography of the entire **BlueSystem Delivery Enterprise** ecosystem. Every statement, screen, flow, and schema is verified directly against active workspace code.

### Platform Radiography Navigation Index

| Doc ID | File Name | Platform / Domain | Purpose & Core Content |
|---|---|---|---|
| **00** | [00_MASTER_INDEX.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/00_MASTER_INDEX.md) | Ecosystem Master | Master index, taxonomy, sitemap, recommended reading path. |
| **01** | [01_EXECUTIVE_PLATFORM_OVERVIEW.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/01_EXECUTIVE_PLATFORM_OVERVIEW.md) | Platform Strategy | Executive summary, business models, architectural pillars, high-level scope. |
| **02** | [02_SYSTEM_ARCHITECTURE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/02_SYSTEM_ARCHITECTURE.md) | System Technical | One Core / Multi-Tenant architecture, tech stack, data layers, boundaries. |
| **03** | [03_CUSTOMER_APP_COMPLETE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/03_CUSTOMER_APP_COMPLETE.md) | Customer App (Android) | Full architecture, state management, checkout, tracking, X→Y, AI assistant. |
| **04** | [04_CUSTOMER_APP_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/04_CUSTOMER_APP_SCREEN_INVENTORY.md) | Customer App (Android) | Screen-by-screen inventory (`CUS-SCR-001` to `CUS-SCR-030`), UI hierarchy, actions. |
| **05** | [05_COURIER_APP_COMPLETE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/05_COURIER_APP_COMPLETE.md) | Courier App (Android) | Telemetry, Fleet Pool vs Assigned Orders, atomic claims, GPS tracking, proof of delivery. |
| **06** | [06_COURIER_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/06_COURIER_SCREEN_INVENTORY.md) | Courier App (Android) | Screen-by-screen inventory (`COU-SCR-001` to `COU-SCR-025`), delivery flow, UI actions. |
| **07** | [07_MERCHANT_WEB_COMPLETE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/07_MERCHANT_WEB_COMPLETE.md) | Merchant Web (React/TS) | Operational Center, Kanban, Product Wizard, branch config, finance & settlements. |
| **08** | [08_MERCHANT_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/08_MERCHANT_SCREEN_INVENTORY.md) | Merchant Web (React/TS) | Screen-by-screen inventory (`MER-SCR-001` to `MER-SCR-020`), modals, actions, drawers. |
| **09** | [09_ADMIN_WEB_COMPLETE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/09_ADMIN_WEB_COMPLETE.md) | Admin Panel Web (SPA) | Governance Center, EIAM management, tenant provisioning, system health, canary rollout. |
| **10** | [10_ADMIN_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/10_ADMIN_SCREEN_INVENTORY.md) | Admin Panel Web (SPA) | Screen-by-screen inventory (`ADM-SCR-001` to `ADM-SCR-025`), controls, tables, modals. |
| **11** | [11_CONTROL_TOWER_COMPLETE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/11_CONTROL_TOWER_COMPLETE.md) | Control Tower (Web) | CartoDB Voyager map, live fleet tracking, dispatching, incident monitoring. |
| **12** | [12_COMMERCE_DELIVERY_FLOW.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/12_COMMERCE_DELIVERY_FLOW.md) | Domain: Commerce | E2E lifecycle from cart creation to order preparation, dispatch, delivery & review. |
| **13** | [13_X_TO_Y_DELIVERY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/13_X_TO_Y_DELIVERY.md) | Domain: Point-to-Point | Independent `/deliveryTrips` domain, custom pricing engine, pin picker, recipient flow. |
| **14** | [14_FLEET_CORE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/14_FLEET_CORE.md) | Fleet Dispatch Engine | `FleetEligibilityEngine`, atomic transactions (`claimOrderAtomically`), timeouts, routing. |
| **15** | [15_ORDER_STATE_MACHINE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/15_ORDER_STATE_MACHINE.md) | State Governance | Finite state machines for Commerce and X→Y, allowed transitions, actors, triggers. |
| **16** | [16_FIRESTORE_COMPLETE_MAP.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/16_FIRESTORE_COMPLETE_MAP.md) | Database Map | 98 collections mapped, schemas, indexes, read/write actors, canonical vs legacy status. |
| **17** | [17_FIRESTORE_SECURITY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/17_FIRESTORE_SECURITY.md) | Security & Rules | Security rules audit, multi-tenant boundaries, custom claims, RBAC/EIAM enforcement. |
| **18** | [18_CLOUD_FUNCTIONS_COMPLETE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/18_CLOUD_FUNCTIONS_COMPLETE.md) | Backend Functions | 104 Cloud Functions inventory (`CF-001` to `CF-104`), triggers, callables, scheduled workers. |
| **19** | [19_APIS_AND_EXTERNAL_SERVICES.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/19_APIS_AND_EXTERNAL_SERVICES.md) | External Integrations | Google Maps, FCM, Gemini AI Logic, Geocoding, Directions, Storage APIs. |
| **20** | [20_GPS_MAPS_ROUTING.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/20_GPS_MAPS_ROUTING.md) | Telemetry & Routing | GPS sync frequency (5s/60s), Haversine engine, Leaflet vs Google Maps Native, ETAs. |
| **21** | [21_NOTIFICATIONS_FCM.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/21_NOTIFICATIONS_FCM.md) | Push & Messaging | Device registration (`/user_devices`), notification payloads, deep links, lifecycle. |
| **22** | [22_OFFLINE_SYNC.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/22_OFFLINE_SYNC.md) | Offline Resilience | Room database, DAOs, WorkManager sync, pending operation queues, conflict resolution. |
| **23** | [23_AUTH_EIAM_ROLES.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/23_AUTH_EIAM_ROLES.md) | Identity & Access | Firebase Auth, Custom Claims, EIAM v2.1/v3 roles, tenant & branch context switching. |
| **24** | [24_PAYMENTS_FINANCE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/24_PAYMENTS_FINANCE.md) | Financial & Ledger | Cash payment verification, electronic vouchers, `/financial_events`, merchant ledger. |
| **25** | [25_MENU_BANNERS_PROMOTIONS.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/25_MENU_BANNERS_PROMOTIONS.md) | Marketing & Catalog | Dynamic banners, coupons, promotion engine, menu versioning & cache invalidation. |
| **26** | [26_UX_UI_FORENSIC_AUDIT.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/26_UX_UI_FORENSIC_AUDIT.md) | UX/UI Specialist Handoff | Cross-platform UX audit, hierarchy, touch targets, loading states, design debt. |
| **27** | [27_SCREENSHOTS_INDEX.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/27_SCREENSHOTS_INDEX.md) | Visual Assets | Visual artifact registry, screen capture index, technical placeholders & reasons. |
| **28** | [28_NAVIGATION_MAP.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/28_NAVIGATION_MAP.md) | Navigation Architecture | Comprehensive NavGraph, deep links, backstack behavior, route transitions. |
| **29** | [29_CROSS_MODULE_TRACEABILITY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/29_CROSS_MODULE_TRACEABILITY.md) | End-to-End Tracing | UI Component → ViewModel → Repository → Cloud Function → Firestore → FCM → Client UI. |
| **30** | [30_ROLE_PERMISSION_MATRIX.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/30_ROLE_PERMISSION_MATRIX.md) | RBAC Matrix | Matrix of capabilities across Customer, Merchant, Courier, Admin, Governance. |
| **31** | [31_FEATURE_STATUS_MATRIX.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/31_FEATURE_STATUS_MATRIX.md) | Implementation Truth | Status classification (REAL, PARTIAL, FALLBACK, LEGACY, DEPRECATED, BROKEN). |
| **32** | [32_KNOWN_ISSUES_AND_FINDINGS.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/32_KNOWN_ISSUES_AND_FINDINGS.md) | Findings & Bugs | Comprehensive forensic findings registry (`FIND-001` to `FIND-025`), no code mutation. |
| **33** | [33_CERTIFICATIONS_AND_VALIDATIONS.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/33_CERTIFICATIONS_AND_VALIDATIONS.md) | Audit History | Summary of historical ADRs, Sprints (13B-18.1), certifications, and test gates. |
| **34** | [34_CROSS_PLATFORM_ARCHITECTURE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/34_CROSS_PLATFORM_ARCHITECTURE.md) | Platform Cohesion | Multi-client cohesion (Android native, Web SPA, React Admin, future iOS readiness). |
| **35** | [35_EXTERNAL_DEPENDENCIES_AND_COST_DRIVERS.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/35_EXTERNAL_DEPENDENCIES_AND_COST_DRIVERS.md) | Operational Costing | Billing drivers (Maps API, Cloud Functions invocations, Firestore reads/writes, FCM). |
| **36** | [36_FINAL_SYSTEM_RADIOGRAPHY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/36_FINAL_SYSTEM_RADIOGRAPHY.md) | Master Synthesis | Final executive balance, Completeness Score, and UX/UI expert handoff protocol. |

---

## 🎯 Recommended Reading Paths

### Path A: For UX/UI Auditors & Product Designers
1. [01_EXECUTIVE_PLATFORM_OVERVIEW.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/01_EXECUTIVE_PLATFORM_OVERVIEW.md)
2. [26_UX_UI_FORENSIC_AUDIT.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/26_UX_UI_FORENSIC_AUDIT.md)
3. [04_CUSTOMER_APP_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/04_CUSTOMER_APP_SCREEN_INVENTORY.md)
4. [06_COURIER_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/06_COURIER_SCREEN_INVENTORY.md)
5. [08_MERCHANT_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/08_MERCHANT_SCREEN_INVENTORY.md)
6. [10_ADMIN_SCREEN_INVENTORY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/10_ADMIN_SCREEN_INVENTORY.md)
7. [28_NAVIGATION_MAP.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/28_NAVIGATION_MAP.md)

### Path B: For Software Engineers & Cloud Architects
1. [02_SYSTEM_ARCHITECTURE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/02_SYSTEM_ARCHITECTURE.md)
2. [16_FIRESTORE_COMPLETE_MAP.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/16_FIRESTORE_COMPLETE_MAP.md)
3. [17_FIRESTORE_SECURITY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/17_FIRESTORE_SECURITY.md)
4. [18_CLOUD_FUNCTIONS_COMPLETE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/18_CLOUD_FUNCTIONS_COMPLETE.md)
5. [14_FLEET_CORE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/14_FLEET_CORE.md)
6. [29_CROSS_MODULE_TRACEABILITY.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/docs/BLUE_SYSTEM_PLATFORM_RADIOGRAPHY/29_CROSS_MODULE_TRACEABILITY.md)

---
*Generated under Protocol BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001 (Zero-Mutation / Audit-Only).*
