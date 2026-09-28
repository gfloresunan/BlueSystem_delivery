# BLUE SYSTEM DELIVERY ENTERPRISE

## MERCHANT WEB DATA SOURCE & EIAM IDENTITY MATRIX

```text
Environment:      Production
URL:              https://bluesystem-7c9af-merchant.web.app/
Execution Mode:   READ-ONLY / FORENSIC AUDIT
Audit Date:       2026-08-08
Auditor:          Antigravity AI (Senior Auditor & Lead Developer)
```

---

## 1. MATRIZ DE FUENTES DE DATOS POR MÓDULO

| Módulo | Fuente Principal | Colección Firestore | Filtro Tenant (`businessId`) | ¿Contiene Mock / Hardcoded? | ¿Sincronizado E2E? | Clasificación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | Firestore `onSnapshot` | `dashboard_summary`, `orders` | `localStorage` (`bluesystem_active_merchant_id`) | SÍ (`fresh_merchant_2026` fallback) | PARCIAL | `MIXED` |
| **Orders (Pedidos)** | Estado Local en React | NINGUNA (Sin Firestore listener) | NO (Sin filtro DB) | SÍ (`INITIAL_ORDERS` estático) | NO | `MOCK / STATIC` |
| **Catalog (Productos)** | Firestore `onSnapshot` | `products` | SÍ (`where('businessId', '==', merchantId)`) | NO (`INITIAL_PRODUCTS` vacíos) | SÍ | `REAL_FIRESTORE` |
| **Customers (Clientes)** | Estado Local en React | NINGUNA | NO | SÍ (Arreglo hardcoded de 3 clientes) | NO | `MOCK / STATIC` |
| **Finance (MFC)** | Estado Local en React | NINGUNA | NO | SÍ (Cifras y depósitos hardcoded) | NO | `MOCK / STATIC` |
| **Settings (RSC)** | Firestore `onSnapshot` | `restaurant_settings`, `businesses` | SÍ (Doc ID `merchantId`) | SÍ (Valores por defecto en estado inicial) | SÍ | `REAL_FIRESTORE` |
| **Staff (Personal)** | Estado Local en React | NINGUNA | NO | SÍ (Arreglo hardcoded de 3 empleados) | NO | `MOCK / STATIC` |
| **Delivery Control Tower** | Estado Local en React | NINGUNA | NO | SÍ (Motorizados y coordenadas ficticias) | NO | `MOCK / STATIC` |
| **Promotions** | Estado Local en React | NINGUNA | NO | SÍ | NO | `MOCK / STATIC` |
| **Reports** | Estado Local en React | NINGUNA | NO | SÍ | NO | `MOCK / STATIC` |
| **Communication (ECP)** | Estado Local en React | NINGUNA | NO | SÍ | NO | `MOCK / STATIC` |

---

## 2. MATRIZ DE IDENTIDAD Y ACCESO EIAM

| Capa | Identidad / ID | Fuente de Origen | Canónica / Verificada | Riesgo Identificado |
| :--- | :--- | :--- | :--- | :--- |
| **Firebase Auth** | `uid`, Token JWT | Firebase Auth SDK | NO (Inexistente en Merchant Web) | `P0 — AUTH MISSING` |
| **EIAM Custom Claims** | `businessId`, `role` | Token JWT Header | NO (No consumido en el cliente web) | `P0 — CLAIMS IGNORED` |
| **Membership Collection** | `membershipId` | Firestore `/membership` | NO (Sin consulta en frontend) | `P1 — NO MEMBERSHIP CHECK` |
| **Merchant Web Session** | `merchantId` | Browser `localStorage` | NO (Modificable en DevTools) | `P0 — TENANT SPOOFING RISK` |
| **Firestore Rules Guard** | `request.auth.token` | Firebase Security Layer | SÍ (Backend rules actitvas) | `P1 — DISCONNECTED FROM FRONTEND` |
| **Admin Panel** | `adminUid`, Claims | Admin Web Portal | SÍ | `OK` |
| **Android App Delivery** | `driverId`, Claims | Android SDK | SÍ | `OK` |

---

## 3. RESUMEN DE COBERTURA FIRESTORE EN MERCHANT WEB

```text
                  COBERTURA DE DATOS EN MERCHANT WEB
┌────────────────────────────────────────────────────────────────────────┐
│ REAL FIRESTORE (22.2%) : CatalogModule, SettingsModule                 │
├────────────────────────────────────────────────────────────────────────┤
│ MIXED / FALLBACK (11.1%) : DashboardModule                             │
├────────────────────────────────────────────────────────────────────────┤
│ PURE MOCK (66.7%)     : Orders, Finance, Customers, Staff,           │
│                         Control Tower, Reports, ECP, Promotions        │
└────────────────────────────────────────────────────────────────────────┘
```

---

```text
════════════════════════════════════════════════════════════════════════════════
                FIN DE LA MATRIZ DE FUENTES DE DATOS Y EIAM
════════════════════════════════════════════════════════════════════════════════
```
