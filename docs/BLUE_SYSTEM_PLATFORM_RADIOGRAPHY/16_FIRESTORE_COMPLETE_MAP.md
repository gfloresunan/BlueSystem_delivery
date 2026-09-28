# 16 — FIRESTORE COMPLETE DATABASE MAP

**Database:** Cloud Firestore (Project `bluesystem-7c9af`)  
**Discovered Collections:** 98 Collections Across Modules  
**Canonical Baseline:** 2.2 Enterprise

---

## 🗂️ 1. Core Canonical Collections Inventory

| Collection Path | Purpose | Primary Readers | Primary Writers | Subcollections |
|---|---|---|---|---|
| `/orders` | Canonical commerce delivery orders | Customer, Merchant, Courier, Admin | Customer, Merchant, Courier, Cloud Functions | `/orders/{id}/events` |
| `/deliveryTrips` | Canonical X→Y delivery shipments | Customer, Courier, Admin | Customer, Courier, Cloud Functions | `/deliveryTrips/{id}/tracking` |
| `/users` | Unified user profiles & roles | Customer, Courier, Admin | Auth triggers, User profile view | `/users/{id}/saved_addresses` |
| `/couriers` | Fleet courier operational profiles | Courier, Merchant, Admin | Courier, Admin, Onboarding | `/couriers/{id}/shifts` |
| `/ubicaciones_repartidores` | Real-time GPS telemetry stream | Customer, Merchant, Control Tower | Courier Location Service (5s/60s) | None (Flat telemetry) |
| `/user_devices` | Multidevice FCM token registry | Cloud Functions Dispatcher | Mobile Apps on Token Refresh | None |
| `/merchants` | Merchant accounts & store profiles | Customer, Merchant, Admin | Merchant Admin, Provisioning | `/products`, `/branches`, `/categories` |
| `/products` | Global / Tenant product catalog | Customer, Merchant Web | Merchant Web, Product Wizard | None |
| `/categories` | Product and store categories | Customer, Admin Web | Admin Web, Merchant Web | None |
| `/banners` | App home carousel marketing | Customer App | Admin Web Banners Module | None |
| `/promotions` | Active merchant promotional rules | Customer, Merchant | Merchant Web, Admin | None |
| `/coupons` | Discount coupon codes | Customer Checkout | Admin Web, Merchant | None |
| `/reviews` | 5-star customer reviews & ratings | Customer, Merchant, Admin | Customer App (Post-delivery) | None |
| `/financial_events` | Immutable platform financial ledger | Admin Finance, Merchant Finance | Cloud Functions (Delivered orders) | None |
| `/merchant_summaries` | Synthesized daily merchant totals | Merchant Dashboard | Cloud Functions Daily Aggregator | None |
| `/system_config` | Platform fees, canary & feature flags | All platforms (Read) | Platform Admin (Write) | None |
| `/audit_events` | Governance compliance logs | Super Admin, Auditor | Admin actions, Cloud Functions | None |
| `/tenants` | White-label multi-tenant metadata | Super Admin, EIAM Gate | Platform Admin Provisioning | None |

---
*Evidence: validated from `firestore.rules` and source code scanning across 589 Kotlin and 108 Web files.*
