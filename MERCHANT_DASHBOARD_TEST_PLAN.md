# MERCHANT DASHBOARD TEST PLAN SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.1)**

---

## 1. Suite de Pruebas Unitarias Implementadas

Se implementaron **10 Clases de Prueba Unitarias** bajo `app/src/test/java/com/example/dashboard/`:

1. `MerchantDashboardViewModelTest.kt`: Prueba el inicio y estado inicial del ViewModel EOC.
2. `DashboardSummaryTest.kt`: Valida la conmutación de visibilidad de widgets modulares.
3. `AlertEngineTest.kt`: Comprueba el motor de clasificación de alertas (🔴/🟠/🔵).
4. `KpiCalculatorTest.kt`: Evalúa la precisión en el cálculo de ticket promedio y proyecciones.
5. `RealtimeTimelineTest.kt`: Prueba la construcción de ítems para el feed de actividad.
6. `QuickActionsTest.kt`: Valida los disparadores de acciones rápidas.
7. `KitchenWidgetTest.kt`: Comprueba los datos del widget KDS resumido.
8. `AnalyticsWidgetTest.kt`: Prueba las proyecciones de analíticas.
9. `PerformanceBudgetTest.kt`: Verifica el límite de 2 listeners según ADR-003.
10. `FirestoreDashboardTest.kt`: Comprueba el mapeo de `BusinessInfo`.

---

## 2. Ejecución

```powershell
.\gradlew testDebugUnitTest --tests "com.example.dashboard.*"
```
