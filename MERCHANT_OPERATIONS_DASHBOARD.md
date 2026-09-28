# MERCHANT OPERATIONS DASHBOARD SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.1)**
**Enterprise Operations Center (EOC) con 10 Mejoras + 7 Adiciones Enterprise**

---

## 1. Visión General del Centro de Operaciones (EOC)

El **Merchant Operations Dashboard (Sprint 15.1)** integra las **10 Mejoras + 7 Adiciones Enterprise** de refinamiento operacional:

1. 🎛️ **Dashboard Layout Profiles**: Cambia al instante entre perfiles preconfigurados (`Operación`, `Cocina`, `Ventas`, `Inventario`, `Personalizado`).
2. 🧩 **Widget Marketplace (Registry & Factory Architecture)**: Patrón `WidgetRegistry` y `WidgetFactory` desacoplado para añadir nuevos módulos sin tocar el core.
3. 📊 **KPIs Históricos Comparativos**: Badges Delta en tiempo real (`Hoy vs Ayer`, `Hoy vs Semana Pasada`) con variación porcentual (+14.5%).
4. 🎯 **Widget de Meta del Día (Daily Sales Goal)**: Tarjeta de objetivo diario con barra de progreso visual (ej: Meta C$ 5,000 | Llevas C$ 3,400 -> 68%).
5. 🟢 **Widget de Salud del Sistema (System Health Monitor)**: Estado operativo integrado (Firestore 🟢, Sincronización 🟢, Offline 🟢, Notificaciones 🟢).
6. ⚡ **Acciones Contextuales Avanzadas**: Menú desplegable contextual enriquecido en tarjetas y alertas.
7. 👤 **Dashboard Snapshots por Usuario**: Persistencia por `userId` + `businessId` para configuraciones multi-usuario.

---

## 2. Diagrama de Widgets Modulares Completo

```mermaid
graph TD
    Omnibox[0. Buscador Unificado Omnibox 🔍] --> Header[1. Smart Header & Selector de Perfiles de Layout 🎛️]
    Header --> OfflineBanner[1.1 Banner Visual Offline ⚠️]
    OfflineBanner --> GoalWidget[2. Meta del Día con Barra de Progreso 🎯]
    GoalWidget --> Row1[3. Live Order KPIs - Nuevos, Cocina, Listos, Ruta]
    Row1 --> Row2[4. Financial KPIs + Deltas Comparativos vs Ayer/Semana]
    Row2 --> Row3[5. Performance KPIs - Tiempo Cocina, Calificación]
    Row3 --> HealthWidget[6. Salud del Sistema - Health Monitor 🟢]
    HealthWidget --> Alerts[7. Centro de Alertas Clasificadas 🔴 / 🟠 / 🔵]
    Alerts --> LiveOrders[8. Centro de Pedidos Vivo Incrustado]
    LiveOrders --> Couriers[9. Widget Motorizados en Ruta 🛵]
    Couriers --> Customers[10. Widget Clientes & Reseñas 👥]
    Customers --> KdsSummary[11. Resumen Cocina KDS]
    KdsSummary --> ProductSummary[12. Control Inventario & Stock]
    ProductSummary --> Assistant[13. Assistant Priority Engine 🤖]
    Assistant --> Timeline[14. Feed Actividad Tiempo Real ⚡]
    Timeline --> QuickActions[15. Acciones Rápidas]
```
