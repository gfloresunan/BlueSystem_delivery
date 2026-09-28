# MERCHANT FINANCE CENTER (MFC) ARCHITECTURE
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.7)**

---

## 1. Arquitectura Desacoplada Reutilizable para Merchant Web Portal (Sprint 16)

Toda la lógica de cálculos netos, comisiones, ticket promedio, saldos de liquidación, insights deterministas y generadores de reporte PDF/Excel reside en motores desacoplados en `domain/engine/finance/`:

- `MerchantFinanceEngine`
- `SettlementEngine`
- `FinancialInsightEngine`
- `FinancialReportGenerator`

En el **Sprint 16 – Merchant Web Portal**, la aplicación Web React reutilizará el 100% de los motores y esquemas sin escribir lógica contable duplicada.
