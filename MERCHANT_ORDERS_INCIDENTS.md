# MERCHANT ORDERS INCIDENTS CENTER SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Tipos de Incidencias Soportadas

El Centro de Incidencias del MOOC permite registrar eventualidades durante la operación:

- `CUSTOMER_UNRESPONSIVE`: Cliente no responde llamadas ni chat.
- `WRONG_ADDRESS`: Dirección incorrecta o fuera de cobertura.
- `PRODUCT_OUT_OF_STOCK`: Producto agotado en cocina.
- `PAYMENT_REJECTED`: Verificación de transferencia o pago fallido.
- `COURIER_BREAKDOWN`: Avería o retraso del repartidor.
- `FAILED_DELIVERY`: Entrega no completada.

Todas las incidencias generan un evento auditable y cambian la prioridad del pedido a `URGENT`.
