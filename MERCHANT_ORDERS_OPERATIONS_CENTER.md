# MERCHANT ORDERS OPERATIONS CENTER (MOOC) SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Visión General del Módulo MOOC

El **Merchant Orders Operations Center (MOOC)** es la consola empresarial centralizada desde la cual el restaurante administra el ciclo completo de vida de los pedidos en tiempo real (desde la entrada hasta la entrega).

```mermaid
flowflow
graph TD
    Header[Smart Header Operacional & KPIs 📊] --> Toolbar[Omnibox 🔍 & Conmutador Kanban/Lista]
    Toolbar --> Board[Tablero Kanban (7 Columnas Operativas)]
    Board --> Card[Tarjeta Enterprise del Pedido con Semáforo SLA 🚥]
    Card --> Drawer[Panel Lateral de Detalle con Timeline ⏱️]
    Card --> SmartCourier[Asignación Inteligente de Motorizados ⭐]
    Card --> Incidents[Centro de Incidencias ⚠️]
    Card --> Refunds[Centro de Reembolsos 💰]
```

---

## 2. Componentes Principales

1. **Smart Header**: KPIs en tiempo real (`Nuevos`, `Cocina`, `Listos`, `Ruta`, `Ventas Hoy`, `Promedio SLA`).
2. **Tablero Kanban + Lista**: 7 columnas por estado (`Nuevos`, `Confirmados`, `Preparando`, `Esperando Repartidor`, `En Ruta`, `Entregados`, `Cancelados`).
3. **Tarjeta Enterprise con Semáforo SLA**: Estados `A TIEMPO` (Verde), `EN RIESGO` (Amarillo), `URGENT` (Rojo), `SLA INCUMPLIDO` (Negro).
4. **Panel Lateral de Detalle (Drawer)**: Ficha técnica del cliente, mapa, timeline, productos y canales de comunicación directa (Llamada, WhatsApp, Push, SMS, Email).
5. **Smart Courier Assignment Engine**: Algoritmo que califica y sugiere al motorizado recomendado ⭐.
6. **Centro de Incidencias & Reembolsos**: Gestión de eventualidades y devoluciones parciales/totales auditadas.
