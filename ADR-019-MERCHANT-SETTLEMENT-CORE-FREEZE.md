# ADR-019: Merchant Financial Settlement Lifecycle Freeze
## Baseline Inmutable v2.3 Enterprise — Dominio Settlement / Liquidaciones Comerciales

**Estatus:** 🔒 **ACCEPTED & FROZEN**  
**Fecha:** 2026-09-07  
**Área de Gobernanza:** Finanzas & Liquidaciones Comerciales (Merchant Settlement)  
**Protocolo Base:** `BSD-FINANCE-SETTLEMENT-POSTCERT-PRODUCTION-E2E-001`  
**Referencia Inmutable:** `/merchant_settlements/IBlriitmnP97CMw2IGqI` (TECNOSTORE — CLOSED + isFrozen=true)

---

## 1. Contexto y Cadena Completa de Certificación

El dominio de Liquidaciones Comerciales (Settlement) de BlueSystem Delivery Enterprise ha completado satisfactoriamente su ciclo integral de certificación tripartita en producción. La cadena contable, operacional y de notificación está 100% cerrada y blindada:

```text
                 SETTLEMENT
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      CORE FSM              FINANCIAL
          │                   LEDGER
          ▼                     │
      PAYMENT ◄─────────────────┘
          │
          ▼
       RECEIPT
          │
          ▼
    NOTIFICATIONS
          │
          ▼
      MERCHANT
          │
      ┌───┴────┐
      ▼        ▼
  CONFIRM    DISPUTE
      │        │
      │     RESOLUTION
      │        │
      │     ADJUSTMENT
      │        │
      └────┬───┘
           ▼
        CLOSED
           │
           ▼
    🔒 isFrozen=true
```

---

## 2. Decisión Arquitectónica

Se declara formalmente el **CONGELAMIENTO ARQUITECTÓNICO INMUTABLE (FREEZE)** sobre el dominio de **Liquidaciones Financieras por Comercio (Merchant Settlement Lifecycle)**.

### Componentes Blindados:

1. **Backend Cloud Functions (`functions/src/callables/merchantSettlement.ts`):**
   - `adminGeneratePreSettlement`
   - `adminRecordSettlementPayment`
   - `merchantConfirmSettlement`
   - `merchantDisputeSettlement`
   - `adminResolveSettlementDispute`
   - `adminConfigureMerchantSettlement`

2. **Pipeline de Notificaciones Post-Pago:**
   - Encolamiento idempotente en `/notification_campaigns` bajo clave `settlement_{id}_PAYMENT_REGISTERED`.
   - Sanitización de payload FCM sin datos financieros sensibles.
   - Despacho no-bloqueante vía `EmailService` con plantilla `/email_templates/settlement_payment_registered`.

3. **Motor de Paginación Cursor Firestore:**
   - `useSettlements.ts` (Merchant Web): Paginación acotada con `limit(20)` y `startAfter(cursor)`.
   - `financeCenter.js` (Panel Admin): Paginación por cursor Firestore sincronizada con filtros y KPIs.

4. **Integridad de Datos y Gobernanza:**
   - Colección canónica `/merchant_settlements` con inmutabilidad irreversible (`isFrozen === true`).
   - Auditoría estricta en `/audit_events` con `businessId` canónico.
   - Documento de referencia `IBlriitmnP97CMw2IGqI` (TECNOSTORE) blindado contra cualquier mutación.

---

## 3. Consecuencias

- Queda terminantemente prohibido modificar el código de los componentes certificados sin la apertura de una **NUEVA FASE FORMAL DE INGENIERÍA** con auditoría forense previa y justificación de negocio aprobada.
- El equipo y los agentes de IA se enfocarán en el siguiente módulo prioritario del roadmap corporativo.
