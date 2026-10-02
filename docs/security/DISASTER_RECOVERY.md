# Disaster Recovery (DR) & Business Continuity Plan
**BlueSystem Delivery Enterprise Platform**  
*Protocolo Oficial:* `BSD-PRESTORE-PHASE-8.1-BUSINESS-CONTINUITY-RECOVERY-REMEDIATION-001`  
*Estado:* 🟢 **GOVERNED & REMEDIATED — PHASE 8.1**  

---

## 1. Métricas Objetivas RPO / RTO Certificadas (Gobernanza Real)

- **Recovery Point Objective (RPO):**
  - **Firestore Database (PITR Continuo):** Ventana de **7 días al segundo exacto**. Ante corrupción o fallo, RPO medido $\le 5\text{ minutos}$ mediante Point-in-Time Recovery de Google Cloud Firestore.
  - **Firestore Database (Cold Snapshots):** Exportación diaria automatizada a las 01:00 AM UTC hacia `gs://bluesystem-7c9af-backups-prod` con retención de **30 días**.
  - **Cloud Storage (Media/Vouchers):** Máximo **24 horas** respaldado por **Object Versioning** activo en `bluesystem-7c9af.firebasestorage.app` (retención de versiones no actuales por 30 días).
- **Recovery Time Objective (RTO):**
  - **Restauración Total del Sistema en Sandbox:** Máximo **1 hora** (importación en proyecto aislado `bluesystem-7c9af-staging` y validación automatizada de integridad).
  - **Promoción Autorizada a Producción:** Sujeta estrictamente a compuerta de aprobación humana con doble factor y verificación de no-regresión.

---

## 2. Estrategia de Copias de Seguridad Automatizadas

1. **Firestore Continuous PITR (Point-in-Time Recovery):**
   - Habilitado sobre la base de datos `(default)` en Google Cloud Firestore. Permite rebobinar el estado de la base de datos a cualquier marca de tiempo dentro de los últimos 7 días.
   - Comando de verificación:
     ```bash
     gcloud firestore databases describe --database="(default)" --project=bluesystem-7c9af
     ```
2. **Firestore Scheduled Exports (Scheduler Serverless):**
   - Función programada `firestoreBackupScheduler` (`functions/src/schedulers/firestoreBackupScheduler.ts`) ejecutada automáticamente a la 01:00 AM (America/Managua).
   - Nomenclatura canónica:
     `gs://bluesystem-7c9af-backups-prod/exports/YYYY/MM/DD/export_YYYYMMDD_HHMMSS`
   - Registro auditable inmutable en `/system_health/firestore_backups` y `/audit_events`.
3. **Cloud Storage Object Versioning:**
   - Habilitado sobre `bluesystem-7c9af.firebasestorage.app`.
   - Cualquier eliminación o sobrescritura accidental genera una versión histórica accesible para restauración inmediata sin tiempo de inactividad.
4. **Infraestructura y Reglas de Seguridad Inmutables:**
   - `firestore.rules` (EIAM v2.1/v3), `storage.rules`, `firestore.indexes.json` y el código backend residen bajo control de versiones Git, garantizando reconstrucción determinista desde cualquier commit SHA.

---

## 3. Protocolo de Restauración Aislada (Recovery Sandbox Runbook)

> [!CAUTION]
> **REGLA DE SEGURIDAD ABSOLUTA — PROHIBICIÓN DE IMPORT DIRECTO A PRODUCCIÓN:**
> Queda **TERMINANTEMENTE PROHIBIDO** ejecutar `gcloud firestore import` directamente sobre el proyecto productivo `bluesystem-7c9af`. Todo procedimiento de restauración debe transitar obligatoriamente por el entorno aislado de Staging.

```
                           CANONICAL DISASTER RECOVERY PIPELINE
                                            │
                                            ↓
                               [1. INCIDENT DECLARED]
                       (Corrupción masiva o falla regional P0)
                                            │
                                            ↓
                              [2. RECOVERY TARGET SELECTION]
                       Identificar timestamp PITR o snapshot en GCS:
                   gs://bluesystem-7c9af-backups-prod/exports/...
                                            │
                                            ↓
                              [3. ISOLATED RESTORE STAGING]
                     Importar exclusivamente a proyecto de Sandbox:
                     --project=bluesystem-7c9af-staging
                                            │
                                            ↓
                            [4. AUTOMATED INTEGRITY TESTS]
                     Ejecutar script: run_dr_drill_validation.js
                     - Verificación de documentos y referencias
                     - Conciliación exacta de balances y ledger
                     - Verificación de congelamiento financiero
                                            │
                                            ↓
                             [5. HUMAN AUTHORIZATION GATE]
                     El Lead Architect / Auditor revisa evidencia y emite:
                     HUMAN PRODUCTION RESTORE AUTHORIZATION PACKAGE
                                            │
                                            ↓
                            [6. PRODUCTION RESTORE EXECUTION]
                     Solo tras autorización explícita, se aplica
                     el restore o failover sobre producción.
```

### Comandos de Ejecución Controlada en Sandbox

1. **Restauración en Entorno Aislado (Staging):**
   ```bash
   gcloud firestore import gs://bluesystem-7c9af-backups-prod/exports/YYYY/MM/DD/export_ID/ --project=bluesystem-7c9af-staging
   ```

2. **Validación Forense Post-Restauración:**
   ```bash
   node scripts/run_dr_drill_validation.js --target=staging
   ```

3. **Restauración Granular PITR (En caso de corrupción puntual de colección):**
   ```bash
   gcloud firestore databases restore \
     --source-database="(default)" \
     --destination-database="restored-db-validation" \
     --restore-time="YYYY-MM-DDTHH:MM:SSZ" \
     --project=bluesystem-7c9af-staging
   ```

---

## 4. Política Inviolable de Preservación Financiera (Zero Frozen-Core Mutation)

En cualquier ejercicio de Disaster Recovery o restauración:
1. **La Fuente Única de Verdad (SSOT) de Tarifas es `/system_config/global`:**
   Los valores fallback hardcodeados en código (`TARIFA_BASE_NIO = 35.0`, `COSTO_POR_KM_NIO = 15.0`) son redes de seguridad técnicas y **NUNCA** deben considerarse tarifas canónicas de negocio ni sobreescribir la configuración remota.
2. **Inmutabilidad del Ledger Contable:**
   Queda prohibido eliminar transacciones en `/financial_events`, `/courier_balances`, `/courier_daily_closures` o `/merchant_settlements`. Cualquier desvío se compensa mediante contra-asientos trazables.
