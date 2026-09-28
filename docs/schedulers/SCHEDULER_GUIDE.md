# Cloud Scheduler & Cron Automation Guide
**BlueSystem Delivery Enterprise Platform**  
*Sprint 17.1 Infrastructure Foundation*

---

## 1. Inventario de Cloud Schedulers (Cron Tasks)

Se han implementado **5 tareas programadas** automatizadas en `functions/src/schedulers/`:

| Tarea Programada | Frecuencia (Cron) | Dominio | Archivo | Descripción / Responsabilidad |
| :--- | :--- | :--- | :--- | :--- |
| `archiveOrdersScheduler` | `0 2 * * *` (2 AM) | Orders / Data Retention | `schedulers/archiveOrders.ts` | **ADR-003 Compliance:** Traslada pedidos terminados con antigüedad >90 días a la colección `orders_archive`. |
| `auditCleanupScheduler` | `0 3 * * 0` (Domingos 3 AM) | Security / Audit | `schedulers/auditCleanup.ts` | Purga nocturna semanal de logs de auditoría expirados (>180 días) y cachés temporales. |
| `notificationCleanupScheduler` | `0 4 * * *` (4 AM) | FCM / Maintenance | `schedulers/notificationCleanup.ts` | Limpieza nocturna diaria de tokens FCM declarados inválidos (`tokenStatus == 'invalid'`) y dispositivos desactivados. |
| `dashboardAggregatorScheduler` | `*/15 * * * *` (Cada 15m) | CQRS / Aggregates | `schedulers/dashboardAggregator.ts` | **ADR-003 Compliance:** Sintetiza en segundo plano el documento agregado `aggregates/dashboard_summary` para eliminar lecturas masivas de colecciones vivas. |
| `healthCheckScheduler` | `0 * * * *` (Cada hora) | Monitoring / Ops | `schedulers/healthCheck.ts` | Monitoreo periódico de salud y latencia de lectura/escritura en Firestore (`system_health/health_ping`). |

---

## 2. Garantías de Gobernanza y Observabilidad

1. **Logging Estructurado Obligatorio:** Todos los Schedulers emiten logs estructurados compatible con GCP Cloud Logging registrando `requestId`, `duration`, `status` y `archivedCount`/`cleanedCount`.
2. **Límites de Batch y Paginado:** Todas las operaciones de purga o archivado utilizan `.limit(500)` y escrituras por lotes (`WriteBatch`) para evitar sobrecargar los recursos de Firestore.
