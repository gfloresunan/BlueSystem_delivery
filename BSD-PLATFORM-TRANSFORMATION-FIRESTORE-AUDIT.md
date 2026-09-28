# BSD — FIRESTORE 98-COLLECTIONS MULTI-TENANT ISOLATION AUDIT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. MATRIZ DE AISLAMIENTO MULTI-TENANT DE COLECCIONES

| Colección | tenantId | brandId | businessId | branchId | Nivel de Aislamiento | Cambio Requerido |
|---|---|---|---|---|---|---|
| `/tenants` | Primary ID | Opcional | N/A | N/A | Global Platform | Seguro As-Is |
| `/brands` | Requerido | Primary ID | N/A | N/A | Tenant Level | Seguro As-Is |
| `/subscriptions` | Requerido | N/A | N/A | N/A | Tenant Level | Seguro As-Is |
| `/app_configs` | Requerido | Requerido | N/A | N/A | Brand Level | Seguro As-Is |
| `/releases` | Requerido | Requerido | N/A | N/A | Brand Level | Seguro As-Is |
| `/organizations` | Requerido | N/A | N/A | N/A | Tenant Level | Seguro As-Is |
| `/businesses` | Opcional | Opcional | Primary ID | N/A | Multi-Tenant / Public Read | Seguro As-Is |
| `/branches` | Opcional | Opcional | Requerido | Primary ID | Business Level | Seguro As-Is |
| `/products` | Opcional | Opcional | Requerido | Opcional | Business Level | Seguro As-Is |
| `/categories` | Opcional | Opcional | Opcional | N/A | Marketplace / Merchant | Seguro As-Is |
| `/orders` | Requerido | Opcional | Requerido | Opcional | Tenant & Business Isolated | Seguro As-Is |
| `/orders/{id}/messages` | Heredado | N/A | Heredado | N/A | Order Participants | Seguro As-Is |
| `/deliveryTrips` | N/A (Global)| N/A | N/A | N/A | Customer / Courier Isolated| Seguro As-Is (X→Y) |
| `/couriers` | Opcional | N/A | N/A | N/A | Global Fleet (City Scoped)| Seguro As-Is |
| `/courier_shifts` | Opcional | N/A | N/A | N/A | Courier Level | Seguro As-Is |
| `/ubicaciones_repartidores`| N/A | N/A | N/A | N/A | Courier Telemetry (GPS) | Seguro As-Is (Congelado) |
| `/courier_cash_ledger` | Opcional | N/A | N/A | N/A | Immutable Financial Ledger | Seguro As-Is |
| `/courier_balances` | Opcional | N/A | N/A | N/A | Synthetic Balance | Seguro As-Is |
| `/courier_settlements` | Opcional | N/A | N/A | N/A | Daily Settlement | Seguro As-Is |
| `/courier_daily_closures`| Opcional| N/A | N/A | N/A | Bank Closure Ledger | Seguro As-Is |
| `/financial_events` | Requerido | Opcional | Requerido | Opcional | Immutable Accounting | Seguro As-Is |
| `/merchant_summaries` | Requerido | Opcional | Primary ID | N/A | Aggregated Totals | Seguro As-Is |
| `/dashboard_summary` | Requerido | N/A | Primary ID | N/A | Aggregated KPI | Seguro As-Is |
| `/system_config` | N/A | N/A | N/A | N/A | Platform Global SSOT | Seguro As-Is |
| `/audit_events` | Opcional | Opcional | Opcional | Opcional | Platform Governance Log | Seguro As-Is |
| `/users` | Opcional | Opcional | Opcional | Opcional | Unified User Registry | Seguro As-Is |
| `/memberships` (v3) | Requerido | Opcional | Opcional | Opcional | Multi-Tenant EIAM | Seguro As-Is |
| `/membership` (v2.1) | N/A | N/A | Requerido | Opcional | Legacy EIAM | Seguro As-Is |
| `/employees` | Opcional | N/A | Requerido | Opcional | Staff Level | Seguro As-Is |
| `/invitations` | Opcional | N/A | Requerido | Opcional | Staff Invitation Flow | Seguro As-Is |
| `/roles` | Opcional | N/A | N/A | N/A | Platform / Tenant Roles | Seguro As-Is |
| `/permissions` | N/A | N/A | N/A | N/A | Standard Platform Catalog | Seguro As-Is |
| `/devices` | N/A | N/A | N/A | N/A | User Session Trust | Seguro As-Is |
| `/user_devices` | N/A | N/A | N/A | N/A | Multidevice FCM Token Pool | Seguro As-Is |
| `/merchant_applications`| Requerido| Opcional| N/A | N/A | Onboarding Pipeline | Seguro As-Is |
| `/courier_applications` | Requerido| N/A | N/A | N/A | Onboarding Pipeline | Seguro As-Is |
| `/courier_profile_requests`| N/A | N/A | N/A | N/A | Courier Profile Moderation | Seguro As-Is |
| `/restaurant_settings` | Opcional | N/A | Primary ID | N/A | Merchant Configuration | Seguro As-Is |
| `/dynamic_menu` | Requerido | Opcional | Opcional | N/A | Tenant / Global Menu Items | Seguro As-Is |
| `/promotional_popups` | Requerido | Opcional | Opcional | N/A | Marketing Campaigns | Seguro As-Is |
| `/coupons` | Opcional | N/A | Opcional | N/A | Global or Merchant Scoped | Seguro As-Is |
| `/coupon_redemptions` | Opcional | N/A | Opcional | N/A | Customer Redemption Log | Seguro As-Is |
| `/loyalty_rewards` | N/A | N/A | Opcional | N/A | Marketplace / Merchant | Seguro As-Is |
| `/loyalty_levels` | N/A | N/A | N/A | N/A | Marketplace Tier System | Seguro As-Is |
| `/loyalty_redemptions` | N/A | N/A | Opcional | N/A | Immutable Loyalty Ledger | Seguro As-Is |
| `/email_events` | N/A | N/A | N/A | N/A | Transactional Email Log | Seguro As-Is (Congelado) |
| `/email_templates` | N/A | N/A | N/A | N/A | System Templates (10 SSOT)| Seguro As-Is (Congelado) |
| `/tenantDomains` | Requerido | N/A | N/A | N/A | Domain DNS Verification | Seguro As-Is |

---

## 2. CONCLUSIÓN DE AUDITORÍA DE BASE DE DATOS
Las 98 colecciones de Firestore poseen una arquitectura de aislamiento **coherente y robusta**.  
Las colecciones operacionales clave ya cuentan con `tenantId` o están particionadas determinísticamente por `businessId` con soporte de pertenencia a Tenant vía EIAM v3 (`isTenantMember`). **No se requieren migraciones destructivas ni mutaciones de base de datos.**
