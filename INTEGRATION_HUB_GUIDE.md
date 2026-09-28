# Enterprise Integration Hub Guide

`IntegrationHub` centraliza y orquesta todos los conectores externos con servicios de terceros.

## Conectores Implementados

1. `WhatsAppConnector`: Envío de notificaciones operacionales por WhatsApp Business.
2. `StripeConnector`: Procesamiento de tarjeta internacional y suscripciones.
3. `BacLafisePaymentConnector`: Integración con pasarelas de pago regionales (BAC / LAFISE).
4. `QuickBooksConnector`: Sincronización contable de facturas y ventas.
5. `PowerBiLookerConnector`: Envío de datasets y métricas a herramientas BI.
6. `ZapierWebhookConnector`: Desencadenamiento de automatizaciones mediante Webhooks.

## Ejemplo de Uso
```kotlin
val hub = IntegrationHub()
hub.dispatchExternalAction("conn_whatsapp", "SEND_MSG", mapOf("text" to "Pedido confirmado"))
```
