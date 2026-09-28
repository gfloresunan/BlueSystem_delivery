# RESTAURANT SETTINGS CENTER (RSC) ARCHITECTURE
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.5)**

---

## 1. Arquitectura Desacoplada Reutilizable para Merchant Web Portal (Sprint 16)

Toda la lógica de validación, versionado, rollback, cálculo de checksum SHA-256 y diagnóstico de preparación (**Restaurant Readiness Score 0-100%**) reside en el motor desacoplado `RestaurantSettingsEngine`.

La interfaz UI Compose del RSC consume exclusivamente este motor. En el **Sprint 16 – Merchant Web Portal**, el portal Web reutilizará el 100% de la lógica y esquemas de configuración sin duplicar código.
