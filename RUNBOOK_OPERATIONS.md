# Enterprise Runbook Operations Manual

## Procedimientos de Operación y Diagnóstico

1. **Activación de Kill Switch:** Invocar `FeatureFlagEngine.registerFlag(flag.copy(isKillSwitchActive = true))`.
2. **Expiración de Caché:** Limpiar L1 via `MultiLevelCacheManager.clearL1()`.
3. **Auditoría de Errores:** Consultar StackTrace filtrado por `TraceId`.
