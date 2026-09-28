# MERCHANT ORDERS TEST PLAN & VERIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Suite de Pruebas Unitarias (10 Clases)

Ubicación: `app/src/test/java/com/example/orders/`

1. `MerchantOrdersViewModelTest.kt`: Estado inicial, conmutador de vista Kanban/Lista y filtros.
2. `OrderPriorityEngineTest.kt`: Ordenamiento automático por prioridad (URGENT -> VIP -> SLA -> FIFO).
3. `CourierAssignmentEngineTest.kt`: Algoritmo de calificación de repartidores (Smart Mode).
4. `RefundEngineTest.kt`: Estructura y procesamiento de reembolsos.
5. `IncidentEngineTest.kt`: Registro y estados de incidencias operativas.
6. `TimelineEngineTest.kt`: Verificación de sellos de tiempo en la línea de tiempo.
7. `SlaEngineTest.kt`: Cálculo de SLA, retrasos y semáforos de color.
8. `OperationalAnalyticsTest.kt`: Analíticas y feature flags.
9. `FirestoreOrdersRepositoryTest.kt`: Inicialización JVM safe del repositorio.
10. `PerformanceBudgetOrdersTest.kt`: Presupuestos de rendimiento (render < 800 ms).
