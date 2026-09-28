# REPORTE DE PRUEBAS E2E Y FLUJOS VERIFICADOS (05_ORDER_LIVE_CHAT_CALL_E2E_TEST_REPORT.md)

**Protocolo:** BSDEL-ORDER-LIVE-CHAT-CALL-001  
**Módulo:** ORDER LIVE CHAT & CALL  
**Fecha:** 2026-08-28  
**Estándar:** Tripartite E2E Certification (Nivel A Técnico + Nivel B Usuario Real)

---

## 1. Matriz de Pruebas de Integración y Flujos Operacionales (E2E-01 a E2E-20)

| Código | Escenario de Prueba E2E | Resultado Esperado | Veredicto |
|---|---|---|---|
| **E2E-01** | Envío de mensaje interactivo Cliente ↔ Motorizado en primer plano | Mensaje se recibe en tiempo real en la pantalla del interlocutor (<500ms) sin recargar la vista | 🟢 PASS |
| **E2E-02** | Motorizado envía mensaje mientras la App del Cliente está en segundo plano | Cliente recibe notificación push FCM con preview del mensaje y sonido prioritario | 🟢 PASS |
| **E2E-03** | Cliente pulsa notificación push FCM desde el System Tray | La App se abre y navega directamente a la pantalla de chat del pedido correspondiente (`order_chat/{orderId}`) | 🟢 PASS |
| **E2E-04** | Arranque en frío (Cold Start) desde notificación de chat con App cerrada | La App inicializa sesión, resuelve el intent pendiente y abre el chat del pedido | 🟢 PASS |
| **E2E-05** | Cliente pulsa botón `📞 Llamar` en la cabecera del chat | Se ejecuta `Intent.ACTION_DIAL` con el número del motorizado y se registra un evento `CALL_EVENT` en la línea de tiempo | 🟢 PASS |
| **E2E-06** | Motorizado pulsa botón `📞 Llamar` en la ruta activa | Se ejecuta `Intent.ACTION_DIAL` con el teléfono del cliente y se registra el evento en el historial | 🟢 PASS |
| **E2E-07** | Pedido marcado como `DELIVERED` (Entregado) | El chat pasa automáticamente a modo `CLOSED` (Solo Lectura), el input de texto se bloquea y los mensajes quedan preservados | 🟢 PASS |
| **E2E-08** | Pedido cancelado (`CANCELLED`) | El chat se congela en modo solo lectura para auditoría permanente | 🟢 PASS |
| **E2E-09** | Comercio abre detalle del pedido en Merchant Web | Se visualiza el historial de mensajes entre cliente y motorizado en modo de solo lectura | 🟢 PASS |
| **E2E-10** | Administrador abre auditoría del pedido en Panel Admin | Se visualiza la conversación completa, roles de remitentes, eventos de llamada y timestamps | 🟢 PASS |
| **E2E-11** | Reasignación manual de Courier A a Courier B | Courier A pierde acceso de escritura inmediatamente; Courier B puede continuar la conversación; se preservan mensajes de Courier A con su firma | 🟢 PASS |
| **E2E-12** | Envío de mensajes en modo offline / pérdida de señal | El mensaje se almacena localmente con estado provisional (reloj) y se sincroniza automáticamente al reconectar | 🟢 PASS |
| **E2E-13** | Marcado de mensajes como leídos (Read Receipts) | Al abrir la pantalla de chat, los mensajes no leídos del interlocutor se marcan como `READ` y el contador en `/orders/{orderId}` se reinicia a 0 | 🟢 PASS |
| **E2E-14** | Mensaje de texto largo (hasta 2000 caracteres) | Se valida correctamente en cliente y backend; se ajusta el texto en la burbuja sin desbordamiento de UI | 🟢 PASS |
| **E2E-15** | Prevención de duplicados en ráfagas rápidas de mensajes | Deduplicación por `messageId` en FCM asegura que cada mensaje genera una notificación independiente | 🟢 PASS |
| **E2E-16** | Ergonomía en teclado virtual en Android | El área de texto y el botón de enviar se elevan fluidamente sobre el teclado (`imePadding()`) sin tapar los mensajes recientes | 🟢 PASS |
| **E2E-17** | Comportamiento del scroll automático | Al recibir o enviar un nuevo mensaje, la lista realiza scroll suave hacia el último elemento (`animateScrollToItem`) | 🟢 PASS |
| **E2E-18** | Rendimiento y Cero Fugas de Memoria | Al salir de la pantalla de chat, los snapshot listeners de Firestore se cancelan inmediatamente en `onCleared` / `DisposableEffect` | 🟢 PASS |
| **E2E-19** | Aislamiento estricto de datos Multi-Tenant | Un comercio o motorizado de otra sucursal/tenant no puede consultar mensajes de pedidos ajenos | 🟢 PASS |
| **E2E-20** | Prueba de No Regresión en GPS y Navegación de Ruta Activa | El motorizado puede abrir y cerrar el chat superpuesto sin perder la telemetría GPS ni el estado de cobro en efectivo/electrónico | 🟢 PASS |
