# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — GRAFO DIRIGIDO ACÍCLICO REMEDIADO (DAG MAESTRO)
**Remediated Implementation Dependency Graph & Workstream Sequencing**

- **Protocolo Oficial:** `BSD-C2D35.0R-DAG-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** C2D.34A Decision Baseline (`DEC-01` a `DEC-25`)
- **Modo:** `READ-ONLY ARCHITECTURAL SPECIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. REESTRUCTURACIÓN DEL GRAFO DE DEPENDENCIAS (RF-08)

El grafo de dependencias anterior ha sido corregido para reflejar estrictamente las prelaciones físicas de ingeniería y los hallazgos remediados en **C2D.35.0-R**.

### 1.1 Modelo Visual del DAG Remediado

```
                         C2D.34A CLOSED
                               │
                               ▼
                   ┌───────────────────────┐
                   │    WS-1 SECURITY P0   │
                   │    Rules Perimeter    │
                   │  • /users isolation   │
                   │  • /courier_balances  │
                   │  • /audit_events      │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ CONTRACT RUNTIME BASE │
                   │  • Gatekeeper Adapter │
                   │  • PAST_DUE 5d grace  │
                   │  • Fail-Closed engine │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │   QUOTA FOUNDATION    │
                   │  • 5 physical shards  │
                   │  • Billing resolver   │
                   │  • Reserve / Commit   │
                   └───────────┬───────────┘
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
             ┌───────────────┐   ┌───────────────┐
             │ WS-3 SUBS     │   │ WS-5 PROV.    │
             │ • Lifecycle   │   │ • Idempotent  │
             │ • Version int │   │   Saga        │
             │ • Token rev.  │   │ • Rollback    │
             └───────┬───────┘   └───────┬───────┘
                     │                   │
                     └─────────┬─────────┘
                               ▼
                   ┌───────────────────────┐
                   │    WS-6 ORDER CTRL    │
                   │  • Pre-commit order   │
                   │  • Inbound Lock       │
                   │  • Outbound Drain     │
                   │  • Courier Core safe  │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │        WS-7 UI        │
                   │  • Merchant shell     │
                   │  • Admin shell        │
                   │  • Plan normalization │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  WS-9 CERTIFICATION   │
                   │  • E2E Integration    │
                   │  • Concurrency tests  │
                   │  • C2D.36 Gate        │
                   └───────────────────────┘
```

---

## 2. EXCLUSIÓN FORMAL DE CUSTOMER DISCOVERY (WS-8)

Conforme a **DEC-12**, el módulo de descubrimiento geográfico de clientes (*Customer Discovery Boundary*) permanece formalmente clasificado como:
### 🔒 FUTURE CONTRACT — FROZEN / NOT IN CURRENT IMPLEMENTATION
- No se implementa en C2D.35.1.
- No se altera la pantalla de inicio del cliente en Android.
- No se abre como atajo o workaround de cuotas.
- Queda totalmente desacoplado del flujo de cierre de suscripciones comerciales.

---

## 3. REGLAS ESTRICTAS DE PRELACIÓN Y DEPENDENCIAS

1. **Regla de Bloqueo Absoluto de Seguridad (Security P0 First):**  
   Ningún archivo de `functions/src` ni endpoint de API puede desplegarse antes de que `WS-1` selle `firestore.rules` (`/users`, `/courier_balances`, `/audit_events`). Cualquier intento de ejecutar WS-2 sin WS-1 certificado es **RECHAZADO**.
2. **Regla de Base de Contrato antes de Cuotas:**  
   No se pueden instanciar contadores de cuotas (`QUOTA FOUNDATION`) sin tener activo el adaptador de Gatekeeper que evalúa planes y estados comerciales.
3. **Regla de Fundación de Cuotas antes de Mutaciones:**  
   Ni la máquina de ciclo de vida (`WS-3`) ni la saga de aprovisionamiento (`WS-5`) pueden implementarse sin el modelo físico de 5 shards y el resolver de período.
4. **Regla de Desacoplamiento de Despacho:**  
   `WS-6` implementa el control de órdenes aguas arriba en Cloud Functions sin tocar en ningún momento `claimOrderAtomically` ni el núcleo congelado de motorizados (**ADR-016**).
5. **Regla de UI al Final del Backend:**  
   Las interfaces de Admin Web y Merchant Web (`WS-7`) solo se conectan a los Callables una vez que estos han sido certificados en emuladores.

---

## 4. TABLA DE DEPENDENCIAS DE WORKSTREAMS

| Workstream | Nombre del Componente | Prerrequisitos Obligatorios | Artefactos Producidos | Estado de Bloqueo |
| :--- | :--- | :--- | :--- | :---: |
| **WS-1-SEC** | Security Foundation | Ninguno (Fase 0) | `firestore.rules` endurecido | 🟢 READY TO CODE |
| **WS-2-RT** | Commercial Runtime Base | **WS-1-SEC** | `GatekeeperRuntimeAdapter.ts` | 🔒 BLOCKED BY WS-1 |
| **WS-4-QTA** | Quota Foundation | **WS-2-RT** | Subcolección `/shards`, `QuotaEngine.ts` | 🔒 BLOCKED BY WS-2 |
| **WS-3-SUB** | Subscription Lifecycle | **WS-4-QTA** | `adminMutateSubscription.ts` | 🔒 BLOCKED BY WS-4 |
| **WS-5-PRV** | Provisioning Saga | **WS-4-QTA** | `provisionTenantEnterprise.ts` | 🔒 BLOCKED BY WS-4 |
| **WS-6-ORD** | Order Control & Continuity | **WS-3-SUB**, **WS-5-PRV** | `createAuthoritativeOrder.ts` | 🔒 BLOCKED BY WS-3, WS-5 |
| **WS-7-UI** | Administrative UI Shell | **WS-3-SUB**, **WS-6-ORD** | `subscriptionManager.js` adaptado | 🔒 BLOCKED BY WS-6 |
| **WS-9-CRT** | Certification & E2E Tests | Todos los anteriores | Suite de pruebas de integración | 🔒 BLOCKED BY WS-7 |

---

## 5. CONCLUSIÓN Y CIERRE DE RF-08 (DAG)

El grafo acíclico queda completamente alineado con la ingeniería forense:
- **Secuencialidad garantizada:** Imposible caer en dependencias circulares.
- **Perímetro blindado:** Seguridad primero, lógica de negocio después, UI al final.
