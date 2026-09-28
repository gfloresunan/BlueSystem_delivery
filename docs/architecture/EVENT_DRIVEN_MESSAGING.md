# Event-Driven Messaging & Cloud Tasks Specification
**BlueSystem Delivery Enterprise Platform**  
*Sprint 17.2 Cloud Run & Messaging Foundation*

---

## 1. Arquitectura de Mensajería Asíncrona (Pub/Sub + Cloud Tasks)

Para desacoplar completamente los microservicios y evitar llamadas HTTP directas bloqueantes entre servicios, la plataforma implementa una arquitectura **Event-Driven respaldada por Google Cloud Pub/Sub y Cloud Tasks**.

```mermaid
graph TD
    Client[📱 Client / API] --> CloudFunctions[⚡ Cloud Functions / Edge]
    CloudFunctions -->|Publish Event| PubSub[📡 GCP Pub/Sub Topics]

    subgraph EventBus["Domain Event Bus (Pub/Sub)"]
      PubSub --> Topic1[Topic: orders-events]
      PubSub --> Topic2[Topic: payments-events]
      PubSub --> Topic3[Topic: driver-events]
    end

    Topic1 -->|Subscribe| Dispatch[🛵 Dispatch Engine Service]
    Topic1 -->|Subscribe| Analytics[📊 Analytics Aggregator Worker]
    Topic1 -->|Subscribe| Notifications[🔔 Notification Service]

    Notifications -->|Enqueue Task| CloudTasks[⏱️ Cloud Tasks Queues]

    subgraph AsyncQueues["Cloud Tasks Queues & Retries"]
      CloudTasks --> Q1[notificationQueue]
      CloudTasks --> Q2[emailQueue]
      CloudTasks --> Q3[retryQueue]
    end

    Q1 --> FCM[FCM Provider]
    Q2 --> SMTP[SMTP / SendGrid Provider]
```

---

## 2. Inventario de Tópicos Pub/Sub & Subscripciones

| Tópico Pub/Sub | Tipo de Eventos | Subscriptores (Push Subscriptions) | Dead Letter Queue (DLQ) |
| :--- | :--- | :--- | :--- |
| `orders-events` | `OrderCreated`, `OrderAccepted`, `OrderCancelled` | `dispatch-engine`, `analytics-aggregator`, `notification-service` | `orders-events-dlq` |
| `driver-events` | `DriverAssigned`, `DriverArrived`, `OrderDelivered` | `analytics-aggregator`, `notification-service` | `driver-events-dlq` |
| `payments-events` | `PaymentVerified`, `PaymentFailed` | `notification-service`, `analytics-aggregator` | `payments-events-dlq` |
| `merchant-events` | `MerchantApproved` | `notification-service`, `eiam-identity-service` | `merchant-events-dlq` |

---

## 3. Inventario de Colas de Cloud Tasks (Reintentos & Asincronismo)

1. `notificationQueue`: Cola de envío transaccional de notificaciones Push FCM (Reintentos con Backoff Exponencial).
2. `emailQueue`: Cola asíncrona para envío de correos de confirmación y factura.
3. `paymentQueue`: Procesamiento asíncrono de webhooks de pago y reconciliación.
4. `retryQueue`: Cola general de re-intentos para fallos temporales de red downstream.
