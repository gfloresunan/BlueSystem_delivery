# Enterprise Communication Platform Specification

`Enterprise Communication Platform (ECP)` es la infraestructura transversal oficial para la distribución y entrega de comunicaciones multicanal en BlueSystem.

## Canales Integrados
1. `IN_APP`: Entrega en tiempo real al `NotificationCenter` oficial.
2. `PUSH`: Firebase Cloud Messaging (FCM).
3. `EMAIL`: Integración SMTP / SendGrid.
4. `WHATSAPP`: API de WhatsApp Business.
5. `SMS`: Pasarelas de mensajería corta.
6. `TELEGRAM`: Telegram Bot API.
7. `WEBHOOK`: Webhooks salientes personalizados.

## Garantías de Calidad
- **Idempotencia:** Deduplicación de mensajes por `messageId`.
- **Trazabilidad:** Correlación de trazado con `TraceId` y `SpanId`.
- **Rendimiento:** Latencia de despacho $< 100\text{ms}$.
