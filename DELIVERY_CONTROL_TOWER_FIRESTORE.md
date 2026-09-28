# FIRESTORE INTEGRATION & ADR-003 COST GOVERNANCE (DCT)
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Cumplimiento Estricto de Presupuesto ADR-003

El Delivery Control Tower mantiene un consumo responsable en Firestore:

- **Listeners Reactivos**: Máximo **2 listeners activos** por sesión (`controlTowerOrdersStream` y `fleetCouriersStream`).
- **Agregación en Memoria**: Todos los cálculos de promedios, filtros y estados se realizan en la capa de dominio sin ejecutar consultas $N+1$.
