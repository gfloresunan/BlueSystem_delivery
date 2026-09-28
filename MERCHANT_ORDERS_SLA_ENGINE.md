# SLA ENGINE & PRIORITY ENGINE SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Reglas de SLA y Semáforo de Tiempo

El `SlaEngine` calcula el tiempo transcurrido desde la creación del pedido y asigna el nivel de riesgo:

- **NORMAL (🟢)**: Tiempo transcurrido $\le 20$ min.
- **WARNING (🟡)**: Tiempo transcurrido entre $21$ y $25$ min.
- **CRITICAL (🔴)**: Tiempo transcurrido entre $26$ y $35$ min.
- **BREACHED (⚫)**: Tiempo transcurrido $> 35$ min.

---

## 2. Motor de Priorización Operativa

El `OrderPriorityEngine` ordena automáticamente la cola de pedidos en tiempo real:

1. `URGENT`: Pedidos con incidencias abiertas o en estado crítico.
2. `VIP`: Pedidos de clientes frecuentes o de alto valor (> C$ 1,500).
3. `SLA_RISK`: Pedidos con semáforo amarillo o rojo.
4. `STANDARD`: Pedidos regulares (FIFO).
