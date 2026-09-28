# FIRESTORE INTEGRATION & ADR-003 COST GOVERNANCE (MOOC)
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Cumplimiento Estricto de Presupuesto ADR-003

El MOOC garantiza un consumo optimizado en Firestore:

1. **Límite de Listeners Activos**: Máximo **2 listeners reactivos** por sesión (`ordersStream` y `couriersStream`).
2. **Sin Consultas N+1**: Toda agregación se realiza en memoria utilizando las colecciones sintetizadas (`orders` filtrado por `businessId` y `couriers`).
3. **Paginación y Filtrado en Servidor**: Consultas indexadas con `whereEqualTo("businessId", bId)`.
