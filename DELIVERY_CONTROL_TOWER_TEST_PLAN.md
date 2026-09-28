# DELIVERY CONTROL TOWER TEST PLAN
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Suite de Pruebas Unitarias (10 Clases)

Ubicación: `app/src/test/java/com/example/controltower/`

1. `DeliveryControlTowerViewModelTest.kt`: Estado inicial de la Torre de Control y salud del sistema.
2. `SmartAssignmentEngineTest.kt`: Algoritmo de sugerencia asistida de repartidores.
3. `FleetMapEngineTest.kt`: Conteo e indicadores del mapa de flota.
4. `OperationalTimelineTest.kt`: Verificación de cronología del pedido.
5. `EtaCalculatorTest.kt`: Desglose automático de tiempos (Prep + Despacho + Viaje).
6. `AlertCenterTest.kt`: Generación y priorización de alertas críticas.
7. `IncidentCenterTest.kt`: Manejo de incidencias abiertas.
8. `HealthMonitorIntegrationTest.kt`: Integración del Health Monitor en DCT.
9. `FirestoreControlTowerTest.kt`: Inicialización JVM safe del repositorio.
10. `PerformanceBudgetControlTowerTest.kt`: Verificación del presupuesto de rendimiento (< 600 ms).
