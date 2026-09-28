# MERCHANT_WEB_FIRESTORE.md
## Estrategia de Consultas e Índices Firestore

## 📊 1. Colecciones Consumidas por el Merchant Web
- `/businesses/{businessId}`
- `/branches/{branchId}`
- `/orders/{orderId}` (filtrado por `businessId == claim.businessId`)
- `/products/{productId}` (filtrado por `businessId`)
- `/menu_categories/{catId}`
- `/employees/{employeeId}`
- `/invitations/{token}`
- `/sessions/{sessionId}`
- `/audit_events/{eventId}`

## ⚡ 2. Presupuesto ADR-003
- **Listeners Activos**: Máximo 2 listeners activos por pantalla/módulo (`onSnapshot`).
- **Paginación Obligatoria**: Consultas con `limit(25)` y `startAfter()`.
