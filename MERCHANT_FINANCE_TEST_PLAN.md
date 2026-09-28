# MERCHANT FINANCE TEST PLAN
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.7)**

---

## 1. Suite de Pruebas Unitarias (10 Clases)

Ubicación: `app/src/test/java/com/example/finance/`

1. `MerchantFinanceViewModelTest.kt`: Estado inicial del MFC y aplicación de filtros temporales.
2. `MerchantFinanceEngineTest.kt`: Fórmulas de ventas netas, comisiones y utilidad estimada.
3. `FinancialKpiCalculatorTest.kt`: Cálculo de ticket promedio.
4. `SettlementEngineTest.kt`: Generación y saldos de liquidaciones.
5. `CommissionCalculatorTest.kt`: Cálculo de tasa de comisión.
6. `FinancialInsightEngineTest.kt`: Generación de alertas e insights deterministas.
7. `PdfReportGeneratorTest.kt`: Generación de contenido PDF con firmas SHA-256.
8. `ExcelExportTest.kt`: Estructura de hojas compuestas para Excel.
9. `FirestoreFinanceRepositoryTest.kt`: Inicialización JVM safe del repositorio.
10. `PerformanceBudgetFinanceTest.kt`: Rendimiento y presupuesto de renderizado (< 500 ms).
