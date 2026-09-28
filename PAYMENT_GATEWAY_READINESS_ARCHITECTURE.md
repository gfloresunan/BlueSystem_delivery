# 🔵 BLUESYSTEM DELIVERY ENTERPRISE
# ARQUITECTURA DE PREPARACIÓN PARA PASARELA DE PAGOS BANCARIA
## Documento 2: Abstracción, Máquina de Estados, Idempotencia, Seguridad y Adaptador Bancario

---

## 1. PRINCIPIO ARQUITECTÓNICO RECTOR

> **BlueSystem Delivery se adapta al banco, no todo BlueSystem se rediseña para adaptarse al banco.**

La arquitectura está concebida bajo el patrón **Hexagonal / Puertos y Adaptadores (Ports & Adapters)**. El núcleo transaccional de pedidos y finanzas interactúa exclusivamente con un contrato agnóstico (`PaymentGateway Port`). Cuando una entidad bancaria institucional (ej. BAC Credomatic, Banco LAFISE, Banpro, etc.) suministre su API, SDK, webhooks y credenciales oficiales, únicamente se implementará su adaptador correspondiente (`BankGatewayAdapter`), preservando intacto el 100% de los módulos operativos, logísticos y de gobernanza de la plataforma.

---

## 2. DIAGRAMA ARQUITECTÓNICO DE INTEGRACIÓN

```
                               ┌─────────────────────────────┐
                               │     CUSTOMER CHECKOUT UI    │
                               │  (Mobile App / Web Client)  │
                               └──────────────┬──────────────┘
                                              │ 1. Iniciar Pago
                                              ▼
                               ┌─────────────────────────────┐
                               │      PAYMENT SERVICE        │
                               │    (Backend Orchestrator)   │
                               └──────────────┬──────────────┘
                                              │ 2. Invocar Puerto
                                              ▼
                               ┌─────────────────────────────┐
                               │   PAYMENT GATEWAY ADAPTER   │
                               │     (Abstract Interface)    │
                               └──────────────┬──────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
                    ▼                                                   ▼
     ┌─────────────────────────────┐                     ┌─────────────────────────────┐
     │      CASH ADAPTER           │                     │     BANK ADAPTER (FUTURO)   │
     │   (Courier Reconciliation)  │                     │   (Tokenized / Hosted 3DS)  │
     └──────────────┬──────────────┘                     └──────────────┬──────────────┘
                    │                                                   │
                    ▼                                                   ▼
     ┌─────────────────────────────┐                     ┌─────────────────────────────┐
     │      COURIER IN-HAND        │                     │     INSTITUTIONAL BANK      │
     │    (Physical Settlement)    │                     │   (Authorization & Settle)  │
     └─────────────────────────────┘                     └─────────────────────────────┘
```

---

## 3. DESACOPLAMIENTO DE MODELOS: ORDER STATUS vs PAYMENT STATUS

### 3.1. Prohibición de Mezcla de Estados
Es una directiva técnica de primer nivel que **el estado operativo del pedido (`OrderStatus`) jamás sea utilizado como sustituto del estado financiero (`PaymentStatus`)**.

### 3.2. Máquina de Estados Operativa del Pedido (`OrderStatus`)
Representa el ciclo físico y logístico de la cocina y el despacho:
```
PENDING ──► PREPARING ──► READY ──► ASSIGNED ──► IN_TRANSIT ──► DELIVERED ──► COMPLETED
   │            │           │          │             │
   └────────────┴───────────┴──────────┴─────────────┴────────► CANCELLED
```

### 3.3. Máquina de Estados Financiera del Pago (`PaymentStatus`)
Representa el ciclo de autorización, captura y liquidación monetaria:

```
                      ┌───────────────┐
                      │    CREATED    │
                      └───────┬───────┘
                              │
                              ▼
                      ┌───────────────┐
                      │    PENDING    │◄──────────────┐ (Reintento controlado)
                      └───────┬───────┘               │
                              │                       │
              ┌───────────────┼───────────────┐       │
              │               │               │       │
              ▼               ▼               ▼       │
      ┌───────────────┐ ┌───────────┐ ┌───────────────┤
      │  AUTHORIZED   │ │  FAILED   │ │   EXPIRED     │
      └───────┬───────┘ └───────────┘ └───────────────┘
              │
              ▼
      ┌───────────────┐
      │     PAID      │ (Captura confirmada / Conciliada)
      └───────┬───────┘
              │
              ▼
      ┌───────────────┐
      │   REFUNDED    │ (Reembolso total o parcial)
      └───────────────┘
```

#### Descripción de Estados Canónicos de Pago:
1. `CREATED`: Intención de pago generada con ID interno y monto bloqueado.
2. `PENDING`: En espera de interacción del usuario (3D Secure, redirección a pasarela hosted o procesamiento bancario).
3. `AUTHORIZED`: Fondos retenidos exitosamente en el emisor de la tarjeta, listos para captura.
4. `PAID`: Pago capturado y confirmado de forma irrevocable por el banco.
5. `FAILED`: Transacción rechazada por el banco (fondos insuficientes, tarjeta bloqueada, fraude, etc.).
6. `EXPIRED`: La sesión de pago superó el tiempo límite sin respuesta.
7. `CANCELLED`: Intención de pago cancelada por el usuario o por el sistema antes de la captura.
8. `REFUNDED`: Fondos devueltos al titular tras una cancelación post-pago.

---

## 4. DECISIÓN CRÍTICA: ESTRATEGIA DE CREACIÓN DEL PEDIDO (A vs B)

### Evaluación Comparativa:

| Criterio de Evaluación | Estrategia A (Pago $\rightarrow$ Pedido) | Estrategia B (Pedido $\rightarrow$ Pago $\rightarrow$ Confirmación) |
| :--- | :--- | :--- |
| **Flujo** | El pedido no se crea en `/orders` hasta que el banco confirme `PAID`. | El pedido se crea con `status = "pending"` y `paymentStatus = "PENDING"`. |
| **Riesgo Operativo** | Cero riesgo de que la cocina prepare un pedido no pagado. | Alto riesgo de que el comercio comience a preparar antes de la autorización. |
| **Resiliencia de Conexión** | Si la app se cierra durante el pago, el webhook de backend crea el pedido de forma confiable. | Requiere lógica de cancelación/limpieza si el pago falla o expira. |
| **Experiencia de Usuario** | Si el pago es rechazado, el carrito no se pierde y el cliente puede reintentar con otra tarjeta. | Si falla, el pedido queda huérfano o cancelado, obligando al cliente a rehacer el carrito. |
| **Compatibilidad con Firestore** | No contamina la colección `/orders` con intentos fallidos. | Genera cientos de órdenes abortadas que requieren schedulers de limpieza. |

### Decisión Arquitectónica Oficial:
**Se adopta la ESTRATEGIA A para Pagos con Tarjeta (con soporte para Estado B en Efectivo):**
1. **Para TARJETA:** El cliente autoriza el pago mediante la pasarela bancaria. Una vez que el backend valida criptográficamente el resultado (`PAID`), se persiste la orden autoritativa en `/orders` y se notifica al comercio.
2. **Para EFECTIVO:** El pedido se crea inmediatamente en `/orders` con `paymentMethod = "efectivo"`, `paymentStatus = "PENDING"`, y pasa a `PAID` cuando el courier confirma la recaudación física en entrega.

---

## 5. CONTRATO INTERNO DE INTEGRACIÓN (AGNOSTIC PORT)

### 5.1. Estructuras de Datos Canónicas (TypeScript & Kotlin)

```typescript
// ─── Canonic Payment Request ──────────────────────────────────────────────────
export interface CreatePaymentIntentRequest {
  internalPaymentId: string;       // ID idempotente único (ej. pay_9f8a7b6c5d)
  orderCorrelationId: string;      // ID de correlación de la orden
  customerId: string;              // UID del cliente autenticado
  businessId: string;              // ID del comercio
  branchId?: string;               // Sucursal
  amountCents: number;             // Monto total en centavos enteros (evita float)
  currency: 'NIO' | 'USD';         // Moneda estandarizada ISO 4217
  paymentMethodType: 'CARD' | 'CASH' | 'WALLET' | 'BANK_TRANSFER';
  idempotencyKey: string;          // Llave única para prevenir cobro doble
  description: string;             // Detalle del cargo
  customerEmail?: string;          // Para recibo bancario
  customerPhone?: string;          // Para 3DS SMS
  redirectUrls?: {                 // Para pasarelas tipo Hosted Checkout
    successUrl: string;
    cancelUrl: string;
    failureUrl: string;
  };
}

// ─── Canonic Payment Result ───────────────────────────────────────────────────
export interface PaymentExecutionResult {
  internalPaymentId: string;
  provider: string;                // Nombre del proveedor (ej. 'BAC', 'LAFISE', 'PROMERICA')
  providerTransactionId: string;   // Código de referencia emitido por el banco
  status: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'CANCELLED';
  amountCents: number;
  currency: 'NIO' | 'USD';
  paidAt?: string;                 // ISO 8601
  authCode?: string;               // Código de autorización de la red (Visa/Mastercard)
  maskedCard?: string;             // Ej. '•••• 4242' (Únicamente últimos 4 dígitos)
  cardBrand?: string;              // 'VISA', 'MASTERCARD', etc.
  failureCode?: string;            // Código de error estandarizado
  failureMessage?: string;         // Mensaje amigable para el usuario
  rawSignatureValid: boolean;      // Confirmación de firma criptográfica
}
```

### 5.2. Interfaz del Adaptador (`PaymentGateway`)

```typescript
export interface PaymentGatewayPort {
  /**
   * Inicializa la transacción con el banco y retorna token de sesión o URL hosted.
   */
  createPaymentSession(request: CreatePaymentIntentRequest): Promise<{
    sessionId: string;
    clientToken?: string;
    redirectUrl?: string;
  }>;

  /**
   * Procesa la captura de un pago previamente autorizado.
   */
  capturePayment(internalPaymentId: string, amountCents: number): Promise<PaymentExecutionResult>;

  /**
   * Consulta el estado sincrónico de una transacción en el banco.
   */
  getPaymentStatus(providerTransactionId: string): Promise<PaymentExecutionResult>;

  /**
   * Procesa la anulación o reembolso de un cobro.
   */
  refundPayment(internalPaymentId: string, amountCents: number, reason: string): Promise<{
    refundId: string;
    status: 'REFUNDED' | 'FAILED';
  }>;

  /**
   * Valida la autenticidad del webhook entrante utilizando HMAC-SHA256.
   */
  verifyWebhookSignature(rawPayload: string, signatureHeader: string, secret: string): boolean;
}
```

---

## 6. CONTROL DE IDEMPOTENCIA Y PROTECCIÓN CONTRA DOBLE COBRO

### 6.1. Vectores de Riesgo Mitigados
1. **Doble Clic / Doble Submit:** El cliente presiona repetidamente el botón "Pagar".
2. **Timeout de Red:** La petición llega al banco pero la conexión se corta antes del ack al móvil.
3. **Reintentos Automáticos de Webhook:** El banco reenvía el mismo evento HTTP 5 veces.
4. **App Cerrada o Puesta en Background:** El cliente sale de la app durante el desafío 3D Secure.

### 6.2. Protocolo de Idempotencia Canónica
1. **Generación de Llave Única:** Cada intención de pago nace con una llave inmutable:
   `idempotencyKey = idem_${customerId}_${cartHash}_${timestampBucket}`.
2. **Bloqueo en Firestore:** Antes de emitir cualquier petición externa, se reserva el documento `/payment_intents/{internalPaymentId}` en una transacción atómica con estado `PENDING`.
3. **Deduplicación en Webhook:** Cuando el webhook bancario recibe una notificación, verifica si el `internalPaymentId` ya posee `status == "PAID"`. Si es así, **retorna HTTP 200 inmediatamente sin re-procesar pedidos ni duplicar cobros**.

---

## 7. SEGURIDAD Y PERÍMETRO DE WEBHOOKS BANCARIOS

### 7.1. Arquitectura de Recepción
```
BANCO INSTITUCIONAL ──► [POST /api/webhooks/bank-payment] (Cloud Function HTTPS)
                              │
                              ├─► 1. Verificación de IP (Whitelist bancaria si aplica)
                              ├─► 2. Validación de Timestamp (Replay Protection: máx 5 min)
                              ├─► 3. Verificación de Firma Digital (HMAC-SHA256 con PAYMENT_SECRET)
                              ├─► 4. Chequeo de Idempotencia (¿Ya procesado?)
                              ├─► 5. Transición Atómica en Firestore Transaction
                              ├─► 6. Creación/Confirmación de Orden + FCM Push
                              └─► 7. Retorno HTTP 200 OK al Banco
```

### 7.2. Principio Zero Secrets en Código
- Todas las credenciales, llaves de API y secretos de firma se almacenan exclusivamente en **Google Cloud Secret Manager** o variables de entorno protegidas de Firebase Functions (`functions.config()` / Secret Manager).
- **Prohibido colocar secretos en el repositorio Git, código Kotlin o JavaScript del cliente.**

---

## 8. PRINCIPIO DE AISLAMIENTO PCI DSS (ZERO SENSITIVE DATA)

1. **Prohibición Total de Almacenamiento de Datos Sensibles:**
   - La plataforma BlueSystem Delivery **NO almacenará en ninguna base de datos, memoria, log o caché números completos de tarjeta de crédito/débito (PAN), códigos CVV/CVC, fechas completas de expiración ni contraseñas/PINs**.
2. **Método de Integración Requerido:**
   - Se utilizarán exclusivamente tecnologías de **Tokenización Segura (Hosted Fields / Drop-in SDK / Hosted Payment Page con 3D Secure 2.0)** certificadas por el banco proveedor (PCI-DSS Level 1 Compliant).
3. **Datos Permitidos para Visualización:**
   - Marca de la tarjeta (`VISA`, `MASTERCARD`).
   - Últimos 4 dígitos enmascarados (`•••• 1234`).
   - Código de referencia / Autorización bancaria.

---

## 9. MATRIZ DE RESPONSABILIDADES Y ACCESO POR ROL

| Touchpoint / Rol | Visualización Permitida | Acciones Permitidas | Restricciones Absolutas |
| :--- | :--- | :--- | :--- |
| **Customer** | Monto, estado de pago, tarjeta enmascarada | Iniciar pago, cancelar antes de cobro | No puede marcarse como pagado a sí mismo |
| **Merchant** | Método de pago, monto bruto, comisión, estado (`PAGADO`) | Consultar facturación, liquidación | Nunca ve datos de tarjeta ni CVV |
| **Courier** | Efectivo a cobrar (CASH) o badge `PAGADO` (CARD) | Cobrar y liquidar efectivo recibido | Cero interacción con tarjetas bancarias |
| **Admin / Finance** | Auditoría completa de eventos, conciliación, settlement | Gestionar reembolsos, investigar discrepancias | Acceso auditado, sin exposición de PAN |

---

## 10. ESTRATEGIA DE FEATURE FLAGGING

Para mantener la máxima seguridad operativa mientras no exista pasarela conectada:
1. **Configuración Central:**
   `CARD_PAYMENTS_ENABLED = false`
2. **Comportamiento en UI (App Cliente):**
   - La opción de pago con tarjeta en el checkout se presenta deshabilitada con el badge *"Próximamente"* o se oculta por completo si el feature flag está en `false`.
3. **Comportamiento en Backend (Cloud Functions):**
   - Todo intento de crear un pedido con `paymentMethod = "tarjeta"` sin una sesión válida de pasarela es rechazado con error `PAYMENT_GATEWAY_NOT_AVAILABLE`.
4. **Activación Segura:**
   - La activación productiva de `CARD_PAYMENTS_ENABLED = true` requerirá validación en Sandbox, certificación E2E y orden explícita según las directivas de gobernanza (ADR-014).
