# 🔵 BLUESYSTEM DELIVERY ENTERPRISE
# MAPEO DE CONTRATOS: PAYMENT GATEWAY PORT VS PASARELA BANCARIA
## Documento 2: Mapeo de Métodos, Máquina de Estados, Errores, Idempotencia y Finanzas en Centavos

---

## 1. PRINCIPIO ARQUITECTÓNICO DE MAPEO

> **"BlueSystem interactúa exclusivamente con el contrato agnóstico `PaymentGatewayPort`. El `BankGatewayAdapter` traduce y aísla la semántica bancaria externa."**

```
    [BlueSystem Domain] ──► [PaymentGatewayPort] ──► [BankGatewayAdapter] ──► [Bank REST API]
```

---

## 2. MATRIZ DE MAPEO DE OPERACIONES

| Operación `PaymentGatewayPort` | Equivalente Bancario Estándar | Compatibilidad | Comportamiento en `BankGatewayAdapter` |
| :--- | :--- | :---: | :--- |
| **`createPaymentIntent`** | `/v1/checkouts` / `/v1/intents` | 🟢 Compatible | Genera sesión segura y URL de checkout/tokenización. |
| **`authorizePayment`** | `/v1/payments/authorize` | 🟢 Compatible | Bloquea fondos en el emisor de la tarjeta. |
| **`capturePayment`** | `/v1/payments/{id}/capture` | 🟢 Compatible | Transfiere fondos a la cuenta recaudadora; marca `PAID`. |
| **`voidPayment`** | `/v1/payments/{id}/void` | 🟢 Compatible | Cancela autorización no capturada; marca `CANCELLED`. |
| **`refundPayment`** | `/v1/payments/{id}/refund` | 🟢 Compatible | Reembolsa monto total o parcial; marca `REFUNDED`. |
| **`getPaymentStatus`** | `/v1/payments/{id}` | 🟢 Compatible | Consulta autoritativa de conciliación ante timeouts. |
| **`verifyWebhook`** | Validación HMAC-SHA256 | 🟢 Compatible | Verifica autenticidad criptográfica y anti-replay. |

---

## 3. MATRIZ DE MAPEO DE ESTADOS

| Estado Bancario Crudo | Estado Canónico BlueSystem | Acción Operativa y Financiera en BlueSystem |
| :--- | :---: | :--- |
| `APPROVED`, `CAPTURED`, `SETTLED` | `PAID` | Orden pasa a `PREPARING`; Courier NO cobra efectivo; evento `ORDER_REVENUE` emitido. |
| `AUTHORIZED`, `HELD`, `PRE_AUTH` | `AUTHORIZED` | Fondos retenidos; esperando confirmación de cocina o captura automática. |
| `PENDING`, `PROCESSING`, `CHALLENGE_3DS` | `PENDING` | En espera de acción del cliente (3DS); pedido NO liberado como pagado. |
| `DECLINED`, `REJECTED`, `INSUFFICIENT_FUNDS` | `FAILED` | Pedido cancelado/fallido; cliente recibe feedback para reintentar con otro medio. |
| `VOIDED`, `CANCELLED` | `CANCELLED` | Autorización anulada antes del despacho; no genera cargos bancarios. |
| `REFUNDED`, `PARTIALLY_REFUNDED` | `REFUNDED` | Evento inmutable de reembolso registrado en `/financial_events`. |
| `UNKNOWN`, `TIMEOUT` | `PENDING` | Consulta activa vía `getPaymentStatus`; **NUNCA asumir `PAID`**. |

---

## 4. MATRIZ DE MAPEO DE ERRORES

| Código de Error Bancario | Código Canónico BlueSystem | Acción en la Plataforma |
| :--- | :---: | :--- |
| `CARD_DECLINED` / `05` | `FAILED` | Notifica al usuario tarjeta rechazada; solicita otro método. |
| `INSUFFICIENT_FUNDS` / `51` | `FAILED` | Notifica fondos insuficientes. |
| `EXPIRED_CARD` / `54` | `FAILED` | Notifica tarjeta expirada. |
| `INVALID_CVV` / `82` | `FAILED` | Notifica código de seguridad inválido. |
| `3DS_AUTHENTICATION_FAILED` | `FAILED` | Notifica fallo en autenticación de dos factores. |
| `DUPLICATE_TRANSACTION` / `94` | `EXISTING_TRANSACTION` | Retorna el resultado del intento original (Idempotencia). |
| `GATEWAY_TIMEOUT` / `BANK_UNAVAILABLE` | `PAYMENT_GATEWAY_NOT_AVAILABLE` | Conmuta a contingencia Efectivo (CASH). |

---

## 5. SEPARACIÓN ESTRICTA DE IDENTIFICADORES

| Identificador | Dominio | Formato | Propósito |
| :--- | :--- | :--- | :--- |
| **`orderId`** | BlueSystem Core | `order_174053...` | Identidad del pedido en cocina, cliente y repartidor. |
| **`intentId`** | Payment Port | `pi_order_174053...` | Sesión de pago efímera antes de confirmación. |
| **`transactionId`** | Banco Proveedor | `txn_98234723...` | Código único de autorización emitido por el procesador bancario. |
| **`settlementId`** | Finanzas / Banco | `settle_20260825...` | Lote de liquidación bancaria diaria. |

---

## 6. PRECISIÓN FINANCIERA: ENTEROS EN CENTAVOS

Para evitar discrepancias por coma flotante, toda la comunicación interna se realiza en centavos enteros:

```
    Total Pedido: C$ 435.00  ──►  amountInCents: 43500 (NIO)  ──►  Bank Payload: 43500 o 435.00
```
- **Monedas soportadas:** Córdobas (`NIO`) y Dólares (`USD`).
- **Tolerancia de Discrepancia:** Cero (0 centavos). Si `bankAmount != orderAmount`, la transacción se rechaza de inmediato.
