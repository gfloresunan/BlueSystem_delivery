# Máquina de Estados de Liquidación Financiera por Comercio

## 1. Definición Formal de Estados
El ciclo de vida de una liquidación comercial se rige por una máquina de estados finita determinista (FSM):

```
       [ INICIO: adminGeneratePreSettlement ]
                         │
                         ▼
                     ┌───────┐
                     │ DRAFT │
                     └───┬───┘
                         │ (Verificación de órdenes y totales)
                         ▼
                    ┌──────────┐
                    │ PREPARED │
                    └───┬──────┘
                         │
                         │ adminRecordSettlementPayment
                         │ (paidCents == netPayableCents + Minuta Bancaria)
                         ▼
             ┌───────────────────────┐
             │ AWAITING_CONFIRMATION │◄───────────────────┐
             └───┬───────────────┬───┘                    │
                 │               │                        │ adminResolveSettlementDispute
                 │               │ merchantDispute        │ (REJECT_DISPUTE)
merchantConfirm  │               ▼                        │
Settlement       │         ┌──────────┐                   │
                 │         │ DISPUTED ├───────────────────┘
                 │         └───┬──────┘
                 │             │
                 │             │ adminResolveSettlementDispute
                 │             │ (ACCEPT_MERCHANT_DISPUTE + adjustmentCents)
                 │             ▼
                 │      ┌──────────────────┐
                 │      │ AWAITING_PAYMENT │
                 │      └──────┬───────────┘
                 │             │ adminRecordSettlementPayment
                 │             └─────────────────────────┐
                 │                                       ▼
                 │                             (Reingresa a AWAITING_CONFIRMATION)
                 ▼
            ┌─────────┐
            │ CLOSED  │ 🔒 [ isFrozen: true — INMUTABLE ]
            └─────────┘
```

---

## 2. Matriz de Estados y Acciones Permitidas

| Estado Origen | Acción / Transición | Endpoint / Trigger | Actor Requerido | Nuevo Estado | Efectos Colaterales en BD |
|---|---|---|---|---|---|
| *(Ninguno)* | `GENERATE_PRE_SETTLEMENT` | `adminGeneratePreSettlement` | Platform Admin | `DRAFT` / `PREPARED` | Genera documento con código `SETTLEMENT-{biz}-{period}`. Calcula `netPayableCents`. |
| `DRAFT` / `PREPARED` / `AWAITING_PAYMENT` | `RECORD_PAYMENT` | `adminRecordSettlementPayment` | Platform Admin | `AWAITING_CONFIRMATION` | Guarda `transferReference`, `bankName`, `paidCents`, `transferReceiptUrl`. |
| `AWAITING_CONFIRMATION` | `MERCHANT_CONFIRM` | `merchantConfirmSettlement` | Comercio Propietario (`businessId`) | `CLOSED` | Sella el documento con `isFrozen: true`, resta `netPayableCents` de `pendingSettlementCents` en `/merchant_summaries/{businessId}`, genera evento en `/audit_events`. |
| `AWAITING_CONFIRMATION` | `MERCHANT_DISPUTE` | `merchantDisputeSettlement` | Comercio Propietario (`businessId`) | `DISPUTED` | Bloquea el cierre, guarda `disputeReason`, `disputedBy`, `disputedAt`, genera alerta administrativa. |
| `DISPUTED` | `RESOLVE_DISPUTE` (Aceptar) | `adminResolveSettlementDispute` | Platform Admin | `AWAITING_PAYMENT` | Aplica `adjustmentCents`, recalcula `netPayableCents`, habilita nuevo registro de pago. |
| `DISPUTED` | `RESOLVE_DISPUTE` (Rechazar) | `adminResolveSettlementDispute` | Platform Admin | `AWAITING_CONFIRMATION` | Ratifica el cálculo contractual original con dictamen en bitácora. Regresa para confirmación del comercio. |
| `CLOSED` | *(Cualquiera)* | *(Bloqueado)* | *(Ninguno)* | *(Rechazo estricto)* | **Error: IMMUTABLE_SETTLEMENT_CANNOT_BE_MUTATED.** Prohibida cualquier modificación. |

---

## 3. Condiciones de Transición Críticas

### C1: Exactitud de Pago vs Excepción Contable
- **Condición:** Si `paidCents !== netPayableCents`, la función `adminRecordSettlementPayment` **rechaza** la operación con `PAYMENT_AMOUNT_MISMATCH_WITHOUT_EXCEPTION`.
- **Excepción Regulada:** Se permite discrepancia únicamente si el administrador envía:
  1. `allowPartialPayment: true`
  2. `exceptionReason: string` (mínimo 5 caracteres explicando la causa contable o contractual del descuadre, ej. retención por cuota de préstamo).

### C2: Bloqueo de Cierre por Disputa
- Si una liquidación se encuentra en estado `DISPUTED`, el endpoint `merchantConfirmSettlement` arroja error `CANNOT_CONFIRM_SETTLEMENT_IN_STATUS_DISPUTED`.
- Ningún comercio puede "confirmar por error" mientras exista un diferendo pendiente de resolución administrativa.

### C3: Inmutabilidad Post-Cierre
- Toda llamada posterior a `merchantConfirmSettlement`, `adminRecordSettlementPayment`, o `merchantDisputeSettlement` sobre una liquidación cerrada verifica de forma preliminar:
  ```typescript
  if (settlement.isFrozen || settlement.status === 'CLOSED') {
      throw new functions.https.HttpsError(
          'failed-precondition',
          'La liquidación está formalmente CERRADA y congelada (Inmutable).'
      );
  }
  ```
- No existen puertas traseras, endpoints de reversión o flags de des-congelamiento.
