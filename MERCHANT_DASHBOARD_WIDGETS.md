# MERCHANT DASHBOARD MODULAR WIDGETS SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.1 - 10 Mejoras Enterprise)**

---

## 1. Matriz Ampliada de Widgets Modulares

| Widget | Tipo Enum | Descripción | Densidades Soportadas |
| :--- | :--- | :--- | :--- |
| **Buscador Unificado** | `UNIFIED_SEARCH_BAR` | Búsqueda global Omnibox (Productos, Pedidos, Clientes, Promos). | Compact, Medium, Expanded |
| **Header Inteligente** | `SMART_HEADER` | Estado de tienda, sucursal e indicador offline. | Medium, Expanded |
| **Live Order KPIs** | `LIVE_ORDER_KPIS` | Nuevos, Preparando, Listos, En Ruta. | Compact, Medium, Expanded |
| **Métricas Financieras** | `FINANCIAL_KPIS` | Ventas Hoy, Estimado Semana, Ticket Promedio. | Compact, Medium, Expanded |
| **Rendimiento Operativo** | `PERFORMANCE_KPIS` | Tiempo Cocina, Calificación, Cancelaciones. | Compact, Medium, Expanded |
| **Centro de Alertas** | `CLASSIFIED_ALERTS` | Alertas clasificadas 🔴 / 🟠 / 🔵 con botón de resolución. | Medium, Expanded |
| **Centro Pedidos Vivo** | `LIVE_ORDERS_CENTER` | Comandas activas incrustadas (Aceptar, Preparar, Listo). | Medium, Expanded |
| **Motorizados en Ruta** | `COURIER_TRACKING` | Monitoreo en vivo de repartidores activos y ETA. | Compact, Medium |
| **Métricas de Clientes** | `CUSTOMER_INSIGHTS` | Clientes Nuevos, Recurrentes, VIP y Reseña. | Compact, Medium |
| **Resumen KDS** | `KDS_SUMMARY` | Estado de cocina y comanda en cola. | Medium |
| **Control Inventario** | `PRODUCT_SUMMARY` | Productos agotados y stock bajo. | Medium, Expanded |
| **Merchant Assistant** | `MERCHANT_ASSISTANT` | Insights ordenados por `AssistantPriorityEngine`. | Medium, Expanded |
| **Feed Actividad** | `REALTIME_TIMELINE` | Eventos cronológicos en tiempo real. | Medium, Expanded |
| **Acciones Rápidas** | `QUICK_ACTIONS` | Botones de acceso rápido a funciones clave. | Compact, Medium |
