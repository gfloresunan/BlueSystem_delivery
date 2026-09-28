# MERCHANT DASHBOARD FIRESTORE INTEGRATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.1)**

---

## 1. Colecciones Consumidas en Tiempo Real

1. **`orders`**:
   - Query: `.whereEqualTo("businessId", businessId).orderBy("createdAt", DESCENDING)`
   - Procesa KPIs de ventas, tiempos, ticket promedio y el Centro de Pedidos Vivo.
2. **`businesses`**:
   - Documento: `/businesses/{businessId}`
   - Procesa estado `isOpen`, nombre comercial, horarios y configuración general.
3. **`products`**:
   - Query: `.whereEqualTo("businessId", businessId)`
   - Determina conteo de productos agotados y stock bajo.
