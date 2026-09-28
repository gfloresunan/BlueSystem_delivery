# API & Contract Versioning Policy
**BlueSystem Delivery Enterprise Platform**  
*Sprint 17.1.2 Enterprise Evolution*

---

## 1. Estándar de Versionado Inmutable

Para evitar romper compatibilidad hacia atrás cuando evolucione la plataforma, todos los servicios expuestos (Cloud Functions, Cloud Run REST/gRPC y esquemas de Eventos) deben cumplir con el estándar de versionado explícito:

### 1. Cloud Functions & REST Endpoints
- **Patrón URL / Namespace:** `/v1/`, `/v2/`
- **Ejemplo Callable:** `exports.v1_adminUpdateUser`, `exports.v2_adminUpdateUser`.
- **Ejemplo REST Cloud Run:** `https://dispatch.bluesystem.app/v1/assign-driver`.

### 2. Eventos de Dominio (Domain Event Payloads)
- **Patrón:** `OrderCreated_v1`, `OrderCreated_v2`.
- Los campos existentes en una versión nunca pueden ser eliminados o renombrados; cualquier modificación estructural exige incrementar la versión del evento.

---

## 2. Política de Depreciación y Soporte (SLA 90 Días)

1. **Notificación de Depreciación:** Una versión anterior se marca como `DEPRECATED` mediante headers HTTP (`Warning: 299 - "API v1 is deprecated"`).
2. **Ventana de Migración Obligatoria:** Se garantiza un periodo mínimo de **90 días de soporte continuo** para la versión anterior antes de su retiro (`DELETED`).
3. **Backward Compatibility:** Los cambios que solo añadan campos opcionales no requieren incrementar la versión mayor de la API.
