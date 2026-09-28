# CHANGELOG — BlueSystem Delivery Enterprise Platform

## [Sprint 17.1] - Enterprise Infrastructure Foundation - 2026-08-07

### ADDED
- **Google Cloud Secret Manager:** Servicio Singleton `SecretService` (`functions/src/config/secretManager.ts`) con caché TTL, deduplicación de peticiones e invalidación.
- **Cloud Schedulers (5 Cron Tasks):**
  - `ArchiveOrdersScheduler`: Archivado nocturno de pedidos >90 días (Gobernanza ADR-003).
  - `AuditCleanupScheduler`: Purga semanal de logs expirados >180 días.
  - `NotificationCleanupScheduler`: Limpieza nocturna de tokens FCM inválidos y dispositivos huérfanos.
  - `DashboardAggregatorScheduler`: Re-sintetizador cada 15m de `aggregates/dashboard_summary` (ADR-003).
  - `HealthCheckScheduler`: Monitoreo horario de salud y latencia del sistema.
- **Enterprise Structured Logger:** Módulo `Logger` (`functions/src/shared/logger/logger.ts`) compatible con GCP Cloud Logging emitirá JSON estructurado en niveles `INFO`, `ERROR`, `AUDIT`, `SECURITY`.
- **Middleware Callable Validator:** Módulo `validateCallableContext` (`functions/src/shared/middleware/validator.ts`) para validación unificada de Auth, App Check, Roles, Tenant, Business, Branch y esquemas.
- **Firebase Storage Security Rules:** Creado `storage.rules` para aislamiento EIAM y comprobación App Check.
- **Documentación Enterprise:** Suite completa de guías e informes (`SECRET_MANAGEMENT.md`, `APP_CHECK.md`, `LOGGING_GUIDE.md`, `SCHEDULER_GUIDE.md`, `OBSERVABILITY_GUIDE.md`, `SPRINT-17.1-INFRASTRUCTURE-REPORT.md`, `BUILD_REPORT.md`, `SECURITY_REPORT.md`, `TEST_REPORT.md`).

### CHANGED
- **Cloud Functions Backend Unification:** Migrado el 100% de Cloud Functions a TypeScript modularizado en `functions/src/`.
- **FCM Push Notification Optimization:** Sustituido el Full Scan $O(N)$ de `sendPushNotification` por consultas indexadas filtradas en Firestore (`isActive == true`, `role == segment`), reduciendo lecturas en un ~95%.
- **Firestore Security Rules:** Actualizado `firestore.rules` con el helper `isAppCheckVerified()` para atestación de cliente Play Integrity y reCAPTCHA Enterprise.

### REMOVED
- **Dual Codebase JS+TS:** Eliminado completamente `functions/index.js` (monolito JavaScript legacy).
- **Hardcoded Secret Usage:** Eliminado el uso de `process.env.API_KEY` directo para secretos sensibles.
- **Console Log Legacy:** Removidas las llamadas a `console.log` nativo en el backend.
