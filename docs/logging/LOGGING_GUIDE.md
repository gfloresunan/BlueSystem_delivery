# Enterprise Structured Logging Guide
**BlueSystem Delivery Enterprise Platform**  
*Sprint 17.1 Infrastructure Foundation*

---

## 1. Directiva de Gobernanza de Logging
Queda **estrictamente prohibido** el uso de `console.log`, `console.error` o `console.warn` en el backend. Todos los logs deben emitirse utilizando la clase `Logger` (`functions/src/shared/logger/logger.ts`).

---

## 2. Esquema del Payload JSON Estructurado

Todos los eventos de log se emiten en formato JSON estructurado compatible con Google Cloud Logging:

```json
{
  "timestamp": "2026-08-07T12:00:00.000Z",
  "severity": "INFO | ERROR | WARN | AUDIT | SECURITY | DEBUG",
  "service": "bluesystem-backend",
  "module": "sendPushNotification",
  "operation": "execute",
  "requestId": "req_1723032000_abc123",
  "correlationId": "req_1723032000_abc123",
  "tenantId": "org_central",
  "businessId": "biz_001",
  "branchId": "branch_main",
  "userId": "uid_admin_01",
  "duration": 145,
  "status": "SUCCESS",
  "message": "Campana Push FCM finalizada: 50 enviadas en 145ms",
  "errorCode": null,
  "stack": null
}
```

---

## 3. Niveles y Categorías Especiales de Log

### 1. `Logger.info(message, context)`
Utilizado para flujo normal de ejecución y métricas operacionales.

### 2. `Logger.error(message, error, context)`
Captura excepciones y errores del sistema registrando automáticamente `errorCode` y `stack` trace.

### 3. `Logger.audit(operation, performedBy, details, context)`
Registra eventos críticos de auditoría EIAM (ej. `CAMBIAR_ROL`, `ELIMINAR_USUARIO`, `ARCHIVE_ORDERS_90_DAYS`).

### 4. `Logger.security(event, severity, details, context)`
Registra intentos de acceso no autorizados, violaciones de App Check o tokens expirados.
