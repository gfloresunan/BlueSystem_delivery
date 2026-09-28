# C2D24 — FIREBASE FLAVOR STRATEGY
## Estrategia de Configuración Firebase Multi-Flavor
**Protocol ID:** `C2D.24`  

---

### 1. Modelo de Proyecto y Clientes en `google-services.json`
- **Proyecto Unificado:** El proyecto de Firebase `bluesystem-7c9af` actúa como el backend multi-tenant central.
- **Múltiples Clientes Android:** Google Services permite registrar múltiples objetos dentro del array `client[]` en `google-services.json`, cada uno con su propio `package_name` (ej. `com.aistudio.delivery.djweq`, `com.fitoni.delivery`, `com.bluesystem.delivery`).
- **Resolución Automática:** El plugin `com.google.gms.google-services` selecciona automáticamente el cliente correspondiente basándose en el `applicationId` del flavor compilado.
- **Cero Proyectos Dedicados:** No se crean nuevos proyectos en Firebase en C2D.24.
