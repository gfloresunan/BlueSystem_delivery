# DELIVERY CONTROL TOWER (DCT) ARCHITECTURE
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.2)**

---

## 1. Arquitectura Desacoplada Reutilizable para Merchant Web Portal (Sprint 16)

La arquitectura del DCT está diseñada de forma **completamente desacoplada**: toda la lógica de negocio y cálculo operacional vive en el dominio compartido (`domain/engine/controltower/`) y expone contratos puros:

- `FleetMapEngine`: Filtros, conteos e indicadores del mapa de flota.
- `ControlTowerEtaEngine`: Desglose automático de tiempos de preparación, despacho y viaje.
- `ControlTowerAlertEngine`: Generación y priorización de alertas críticas.
- `ControlTowerSmartAssignmentEngine`: Algoritmo de sugerencia asistida de repartidores.

La interfaz de usuario Compose (Android/Tablet/Fold) consume exclusivamente estos motores. En el **Sprint 16 – Merchant Web Portal**, la aplicación Web React reutilizará el 100% de los motores y contratos sin duplicar lógica.
