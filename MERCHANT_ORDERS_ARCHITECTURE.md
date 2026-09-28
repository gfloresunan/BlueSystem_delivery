# MERCHANT ORDERS OPERATIONS CENTER (MOOC) ARCHITECTURE
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Patrón Arquitectónico y Capas

El MOOC sigue el patrón **Clean Architecture + Unidirectional Data Flow (UDF)**:

- **Dominio**: `MerchantOrder`, `SlaStatus`, `OrderPriority`, `CourierRecommendation`, `OrderIncident`, `OrderRefund`, `OrderTimelineStep`.
- **Motores (Engines)**: `SlaEngine`, `OrderPriorityEngine`, `SmartCourierAssignmentEngine`.
- **Datos**: `MerchantOrdersRepository` (ADR-003 compliant: máx 2 listeners activos).
- **Presentación**: `MerchantOrdersViewModel`, `MerchantOrdersOperationsCenterScreen`.

---

## 2. Diagrama de Flujo de Datos

```mermaid
sequenceDiagram
    participant Firestore as Firestore Database
    participant Repo as MerchantOrdersRepository
    participant VM as MerchantOrdersViewModel
    participant UI as MOOC Screen (Compose)

    Firestore->>Repo: Live Orders Stream & Available Couriers Stream (2 Listeners)
    Repo->>VM: Emit Pedidos & Repartidores Raw
    VM->>VM: Enriquecer Pedidos + SlaEngine + PriorityEngine + SmartCourierEngine
    VM->>UI: Render MerchantOrdersUiState (Kanban / Lista / Drawer)
    UI->>VM: Acción (Aceptar, Asignar Repartidor, Incidencia)
    VM->>Firestore: Actualización Atómica & Log Event Bus / AuditLogger
```
