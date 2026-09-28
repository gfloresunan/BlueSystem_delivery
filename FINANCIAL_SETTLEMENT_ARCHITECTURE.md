# Arquitectura de Liquidación Financiera por Comercio (BSD-FINANCE-MERCHANT-SETTLEMENT-001)

## 1. Misión y Alcance Canónico
El presente documento define la arquitectura integral, el modelo matemático-contable y la separación de responsabilidades para el ciclo completo de liquidación financiera entre **BlueSystem Delivery Enterprise** y cada **Comercio Afiliado**.

### Principios Fundamentales:
1. **Sin Contabilidad Paralela:** La única fuente de verdad económica (SSOT) son las colecciones canónicas `/financial_events`, `/orders` y `/merchant_summaries/{businessId}`.
2. **Aritmética Estricta en Céntimos Enteros:** Todo cálculo, agregación, deducción y pago se expresa en enteros (`cents`), erradicando por diseño los errores de punto flotante IEEE 754.
3. **Inmutabilidad Post-Cierre (Frozen Barrier):** Una vez que una liquidación alcanza el estado `CLOSED` con `isFrozen: true`, queda formalmente sellada contra cualquier recálculo, mutación o anulación retroactiva.
4. **Aislamiento Multi-Tenant de Grado Bancario:** La identidad del comercio se deriva exclusivamente de los Custom Claims validados en el token (`businessId`, `tenantId`). Queda terminantemente prohibido confiar en identificadores suministrados por el cliente móvil o web.

---

## 2. Diagrama de Arquitectura de 3 Capas

```mermaid
flowchart TD
    subgraph CapaBackend [Capa Autoritativa Backend - Cloud Functions]
        CF1[adminGeneratePreSettlement]
        CF2[adminRecordSettlementPayment]
        CF3[merchantConfirmSettlement]
        CF4[merchantDisputeSettlement]
        CF5[adminResolveSettlementDispute]
        CF6[adminConfigureMerchantSettlement]
    end

    subgraph BaseDatos [Persistencia & Auditoría - Cloud Firestore]
        FE[/financial_events/]
        MS[/merchant_summaries/{businessId}/]
        Settle[/merchant_settlements/{settlementId}/]
        SettleCfg[/merchant_settlement_configs/{businessId}/]
        Audit[/audit_events/]
        Storage[/settlement_receipts/{businessId}/{settlementId}/]
    end

    subgraph Frontends [Touchpoints Certificados]
        AdminWeb[Panel Admin Web - Centro Financiero]
        MerchantWeb[Merchant Web - Tab Liquidaciones]
    end

    AdminWeb -->|1. Ejecutar Corte| CF1
    CF1 -->|Lee eventos no liquidados| FE
    CF1 -->|Genera borrador| Settle

    AdminWeb -->|2. Registrar Pago + Minuta| CF2
    CF2 -->|Sube Comprobante| Storage
    CF2 -->|Actualiza a AWAITING_CONFIRMATION| Settle

    MerchantWeb -->|3a. Confirmar Liquidación| CF3
    CF3 -->|runTransaction atómico: CLOSED & isFrozen| Settle
    CF3 -->|Descuenta pendingSettlementCents| MS
    CF3 -->|Registra firma de conformidad| Audit

    MerchantWeb -->|3b. Disputar Liquidación| CF4
    CF4 -->|Bloquea cierre: DISPUTED| Settle
    CF4 -->|Registra motivo de reclamo| Audit

    AdminWeb -->|4. Resolver Disputa| CF5
    CF5 -->|Dictamen + Ajuste Cents| Settle
    CF5 -->|Bitácora de resolución| Audit
```

---

## 3. Desglose Aritmético Canónico

Para cualquier período $[t_{\text{start}}, t_{\text{end}}]$ sobre el comercio $B$:

$$\text{grossSalesCents} = \sum_{e \in \text{DeliveredOrders}} e.\text{productSubtotalCents} - e.\text{discountCents}$$

$$\text{platformFeesCents} = \text{round}\left(\text{grossSalesCents} \times \text{platformFeeRate}\right)$$

$$\text{netPayableCents} = \max\left(0, \text{grossSalesCents} - \text{platformFeesCents} + \text{adjustmentsCents}\right)$$

### Restricciones Contractuales:
- La comisión de la plataforma (ej. 15%) se deduce exclusivamente sobre el valor bruto de los productos vendidos por el comercio afiliado.
- La tarifa de envío (`deliveryFee`) pertenece íntegramente a la logística / motorizados (`courierDeliveryEarnings`) y no entra en la masa liquidable del comercio.
- Las propinas de clientes (`tipAmount`) corresponden al motorizado de forma exclusiva.
- Cualquier cobro de servicio administrativo de plataforma (`additionalChargeAmount`) ingresa directamente a las arcas de la plataforma y no forma parte del neto del comercio.

---

## 4. Invariantes de Integridad Financiera

| Código Invariante | Descripción Técnica | Mecanismo de Control |
|---|---|---|
| **INV-SETTLE-001** | Cero centavos flotantes | `Math.round(val * 100)` y tipado estricto `*Cents: number` |
| **INV-SETTLE-002** | Protección contra doble cómputo | Validación de rango de fechas contra liquidaciones `CLOSED` existentes |
| **INV-SETTLE-003** | Consistencia de saldo pendiente | Mutación atómica en `/merchant_summaries/{businessId}` vía `FieldValue.increment(-netPayableCents)` |
| **INV-SETTLE-004** | Barrera inmutable post-cierre | `if (settlement.isFrozen || settlement.status === 'CLOSED') throw Error()` |
| **INV-SETTLE-005** | Validación estricta de pago | `paidCents === netPayableCents` requerido, salvo flag explícito `allowPartialPayment` con `exceptionReason` |
| **INV-SETTLE-006** | Aislamiento EIAM v3 | Verificación criptográfica de `context.auth.token.businessId` en endpoints de comercio |
