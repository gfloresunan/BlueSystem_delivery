# FIRESTORE INTEGRATION & ADR-003 COST GOVERNANCE (MFC)
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.7)**

---

## 1. Cumplimiento Estricto de Presupuesto ADR-003

- **Listeners Reactivos**: Máximo **2 listeners activos** por sesión (`financialSummaryStream`).
- **Cálculo Sintético**: Consume resúmenes ya agregados en `dashboard_summary` en memoria sin iterar documento por documento ni ejecutar consultas $N+1$.
