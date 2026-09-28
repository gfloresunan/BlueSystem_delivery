# SLA & Performance Budget Specification

## Presupuestos de Rendimiento Móvil y SLA

| Componente | Presupuesto SLA / Latencia | Límite RAM | Listeners Activos |
|---|---|---|---|
| **Feature Flags** | $< 1\text{ ms}$ (L1 Cache) | - | 0 |
| **Remote Config** | $< 50\text{ ms}$ | - | 0 |
| **Tenant Settings** | $< 20\text{ ms}$ | - | 0 |
| **Business Dashboard** | $< 300\text{ ms}$ | $< 150\text{ MB}$ | 1 (`dashboard_summary`) |
| **KDS Kanban** | $< 300\text{ ms}$ | $< 180\text{ MB}$ | 1 (`kds_summary`) |
| **App Delivery Cliente** | Cold Start $< 2\text{ s}$ | $< 150\text{ MB}$ | 1 (`menuVersion`) |
