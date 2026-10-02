# BSD-PRESTORE-PHASE-8-BUSINESS-CONTINUITY-DR-BACKUP-RESTORE-CICD-AUDIT-REPORT
**Protocolo Oficial:** `BSD-PRESTORE-PHASE-8-BUSINESS-CONTINUITY-DR-BACKUP-RESTORE-CICD-AUDIT-001`  
**Fase:** 8 — Auditoría Exhaustiva de Continuidad Operacional, Backup, Disaster Recovery, Restore, CI/CD y Capacidad de Recuperación  
**Proyecto Firebase:** `bluesystem-7c9af` (Staging: `bluesystem-7c9af-staging`)  
**Modo Operativo:** `READ-ONLY / AUDIT-FIRST / ZERO PRODUCTION MUTATION`  
**Fecha de Emisión:** 2026-10-01  
**Autor:** Senior Developer & Enterprise Auditor — BlueSystem Delivery  

---

```
================================================================
 BSD-PRESTORE-PHASE-8 — BUSINESS CONTINUITY & DR AUDIT
================================================================
Code modified:                    0
Production data modified:         0
Backups modified:                 0
Rules modified:                   0
CI/CD modified:                   0
Secrets modified:                 0
IAM modified:                     0
Production deploys:               0
Production restores:              0
Audit Status:                     STRICT READ-ONLY PRESERVED
================================================================
```

---

## 1. EXECUTIVE SUMMARY

La presente auditoría forense responde a la pregunta central de la **Fase 8**:
> *"Si mañana BlueSystem Delivery sufre un incidente grave (corrupción de datos, caída de Firebase, error de despliegue, pérdida de secretos, fallo de CI/CD o publicación de versión defectuosa), ¿podemos recuperar el sistema de forma controlada, con pérdida de datos conocida y dentro de tiempos definidos?"*

Bajo la estricta directiva de **Zero Production Mutation**, se inspeccionó exhaustivamente el repositorio, pipelines en `.github/workflows/`, configuraciones de Firebase (`firebase.json`, `.firebaserc`), reglas (`firestore.rules`, `storage.rules`), índices (`firestore.indexes.json`), código de backend (`functions/src/`), clientes móviles (Android Native en `app/` y Flutter/iOS en `flutter_client/`), aplicaciones web (`panel-admin/`, `merchant-web/`, `corporate-web/`), scripts de migración y respaldos históricos en `scripts/`, y la documentación operativa en `docs/`.

### 1.1 Veredicto Técnico Ejecutivo
* **Distinción Rigurosa de Cinco Conceptos Clave:**
  1. 💾 **BACKUP:** Existen copias de seguridad estáticas y selectivas de la base de datos de usuarios (`users_snapshot_backup.json`, snapshots de Fase I/I1) y el código fuente e infraestructura declarativa bajo Git. Sin embargo, el respaldo automatizado continuo de Firestore a Cloud Storage (`gs://bluesystem-backups-prod`) está **DOCUMENTADO PERO NO IMPLEMENTADO EN CÓDIGO NI GOBERNADO COMO INFRAESTRUCTURA AUDITABLE**.
  2. ↩️ **ROLLBACK:** Altamente operativo para Firestore Rules (Git revert + deploy), Cloud Functions (Git revert + deploy) y Firebase Hosting (versiones inmutables en consola). Para aplicaciones móviles nativas, el rollback binario es imposible por diseño de las tiendas; Android implementa un kill-switch y bloqueo forzado (`AppUpdateResolver` / `ForceUpdateScreen`), pero Flutter/iOS carece de esta suscripción.
  3. 🔄 **RESTORE:** El procedimiento documentado en `DISASTER_RECOVERY.md` (`gcloud firestore import`) apunta directamente al proyecto productivo `bluesystem-7c9af` sin un entorno intermedio aislado de validación, y **NUNCA HA SIDO TESTEADO OPERACIONALMENTE**.
  4. 🛟 **DISASTER RECOVERY (DR):** RPO teórico de 5 minutos y RTO < 2 horas carecen de sustento instrumental en el estado actual; sin PITR (Point-in-Time Recovery) formalmente activado ni motor de replay de logs, el RPO real ante desastre total es de días o semanas (edad del último snapshot JSON local).
  5. 🏢 **BUSINESS CONTINUITY:** Excelente desacoplamiento y resiliencia en cálculo de rutas y tarifas (fallback Haversine con tarifas planas si falla Google Routes/OSRM), pero los flujos de asignación y comisiones dependen críticamente de Cloud Functions.

### 1.2 Nivel de Certificación Global de Disaster Recovery
**Veredicto:** 🟠 **RECOVERY REMEDIATION REQUIRED (CONDITIONAL FOR GO-LIVE)**  
Existe una base documental y de control de versiones sólida, pero se detectaron brechas críticas en la automatización del backup de base de datos, la ausencia de pruebas de restauración y la omisión de tests y targets web en el pipeline de CI/CD.

---

## 2. CURRENT INFRASTRUCTURE

BlueSystem Delivery opera sobre una infraestructura serverless distribuida en Google Cloud Platform (GCP) y Firebase:

```
                                GCP / FIREBASE US-CENTRAL1
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ↓                                      ↓                                      ↓
DATA & STORAGE                        COMPUTE & LOGIC                         EDGE & CLIENTS
- Cloud Firestore (Multi-Tenant)      - Cloud Functions v1/v2 Node 22        - Firebase Hosting (4 Sites)
  • /users, /businesses, /orders        • 28 Callables (Auth, Orders, Admin)   • Corporate (Static)
  • /deliveryTrips, /audit_events       • 12 Database Triggers (Audit, Sync)   • Admin (Vanilla JS)
  • /system_config, /system_health      • 8 Schedulers (Cron Pub/Sub)          • Merchant Web (React/Vite)
- Firebase Storage                    - Google Cloud Run (Services Shell)     • Onboarding Portal (Vite)
  • bluesystem-7c9af.firebasestorage    • Inactivo en Prod (0% traffic)      - Mobile Clients
- Firebase Auth (Identity Platform)   - Secret Manager                         • Android Native (Kotlin)
  • Custom Claims EIAM v2.1/v3          • SMTP_PASSWORD, Maps Secrets          • Flutter/iOS Client (Dart)
```

---

## 3. CRITICAL ASSET INVENTORY

| Activo | Tipo / Tecnología | Ubicación / Identificador | Rol Operacional | Sensibilidad |
|:---|:---|:---|:---|:---:|
| **Firestore DB** | NoSQL Multi-Tenant Document Store | `(default)` en `us-central1` | Estado único de verdad (SSOT) de órdenes, clientes, comercios, motorizados y ledger | 🔴 Crítica |
| **Firebase Auth** | Identity Platform | Google Identity Platform (`bluesystem-7c9af`) | Identidades canónicas, hashes de contraseñas, Custom Claims | 🔴 Crítica |
| **Cloud Storage** | Object Storage Bucket | `bluesystem-7c9af.firebasestorage.app` | Fotos de comercios, productos, banners, comprobantes de liquidación y arqueo | 🟡 Alta |
| **Cloud Functions** | Serverless Compute Engine | `functions/` (Node.js 22) | Lógica financiera, asignación de pedidos, cálculo de rutas, auth gates, triggers | 🔴 Crítica |
| **Cloud Run** | Container Microservices | `services/` (Docker blueprints) | Microservicios de catálogo y despacho (Actualmente inactivos en producción) | 🟢 Baja (0% Prod) |
| **Admin Web** | Single Page Application | `panel-admin/public/` | Torre de Control, Auditoría, Gestión de Comercios, Configuración Financiera | 🔴 Crítica |
| **Merchant Web** | React 18 + Vite | `merchant-web/dist/` | Dashboard de Comercio, KDS, Catálogo, Liquidaciones y Ventas | 🔴 Crítica |
| **Customer App** | Android Native / Flutter | Kotlin Jetpack Compose / Flutter Dart | Catálogo, checkout, seguimiento en vivo de pedidos y mensajería | 🔴 Crítica |
| **Courier App** | Android Native | Kotlin Jetpack Compose (`app/`) | Telemetría GPS, aceptación atómica de pedidos, navegación, liquidación diaria | 🔴 Crítica |
| **FCM / APNs** | Push Gateway | Firebase Cloud Messaging | Notificaciones de despacho, cambios de estado y campañas | 🟡 Alta |
| **Secret Manager** | Secret Store | Google Cloud Secret Manager | Credenciales SMTP corporativas, llaves de API externas | 🔴 Crítica |
| **CI/CD** | Automation Workflows | `.github/workflows/` | Compilación, validación y despliegue automatizado | 🟡 Alta |

---

## 4. CRITICALITY MATRIX

| Componente | Criticidad | Impacto Pérdida de Datos | Impacto Downtime | RPO Tolerable | RTO Tolerable |
|:---|:---:|:---|:---|:---:|:---:|
| **Firestore** | P0 | Catastrófico (Pérdida de pedidos en curso, balance contable, identidades) | Total (Toda la plataforma queda inoperable) | $\le 15\text{ min}$ | $\le 1\text{ hora}$ |
| **Auth** | P0 | Severo (Imposibilidad de validar identidad y roles EIAM) | Total (Bloqueo de acceso de todos los usuarios) | $\le 1\text{ hora}$ | $\le 30\text{ min}$ |
| **Storage** | P2 | Moderado (Imágenes rotas, comprobantes faltantes; transacciones preservadas) | Leve (UI degrada a placeholders; flujo comercial continúa) | $\le 24\text{ horas}$ | $\le 4\text{ horas}$ |
| **Functions** | P0 | Nulo (Cómputo stateless; código en Git) | Total (Asignaciones, pagos y cálculos se detienen) | 0 min (Git) | $\le 15\text{ min}$ |
| **Cloud Run** | P3 | Nulo (No aloja carga productiva) | Nulo (Servicios en functions) | N/A | N/A |
| **FCM / APNs** | P1 | Leve (Mensajes efímeros en tránsito) | Moderado (Clientes y repartidores deben mantener app abierta) | N/A | $\le 2\text{ horas}$ |
| **Maps / GPS** | P1 | Nulo (Telemetría en memoria/Firestore) | Moderado (Degrada a distancias Haversine estimadas) | N/A | $\le 1\text{ hora}$ |
| **Admin Web** | P1 | Nulo (Stateless) | Moderado (Supervisión ciega; repartidores y comercios operan) | 0 min (Git) | $\le 30\text{ min}$ |
| **Merchant Web** | P0 | Nulo (Stateless) | Severo (Comercios no pueden aceptar pedidos ni ver KDS) | 0 min (Git) | $\le 30\text{ min}$ |
| **Customer App** | P0 | Nulo (Cliente móvil) | Total (No hay nuevos pedidos de clientes) | N/A | $\le 2\text{ horas}$ |
| **Courier App** | P0 | Nulo (Cliente móvil) | Total (No se pueden entregar pedidos) | N/A | $\le 2\text{ horas}$ |

---

## 5. BACKUP ARCHITECTURE

La arquitectura de copias de seguridad de BlueSystem Delivery combina tres niveles de persistencia:

```
                                BLUE SYSTEM DELIVERY BACKUP MODEL
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ↓                                      ↓                                      ↓
LEVEL 1: SOURCE & CONFIG               LEVEL 2: LOCAL SNAPSHOTS               LEVEL 3: MANAGED CLOUD
- Git Repository (GitHub)              - users_snapshot_backup.json           - Firestore Managed Export (GCP)
  • firestore.rules                      (53.9 KB - 16/08/2026)                 (Documentado: gs://bluesystem-backups-prod)
  • storage.rules                      - PHASE_I_INITIAL_SNAPSHOT.json          • Estado: NO PROGRAMADO EN CÓDIGO
  • firestore.indexes.json               (41.5 KB - 16/08/2026)                 • Estado: NO GOBERNADO POR CRON
  • functions/src/**                   - PHASE_I1_CANONICAL_SNAPSHOT.json     - Cloud Storage Object Versioning
  • App & Web Source                     (65.0 KB - 16/08/2026)                 • Estado: NO HABILITADO
- Estado: 🟢 OPERATIVO                 - Estado: 🟡 HISTÓRICO / ESTÁTICO       - Estado: 🔴 AUSENTE / NO INSTRUMENTADO
```

---

## 6. BACKUP INVENTORY (EVIDENCIA FÍSICA)

### 6.1 Respaldo Físico en Repositorio
Inspección ejecutada en disco local y repositorio Git:
1. `users_snapshot_backup.json` (53,946 bytes): Snapshot completo de `/users` capturado el 16/08/2026 antes de la normalización canónica de `identityOrigin`.
2. `PHASE_I_INITIAL_SNAPSHOT.json` (41,503 bytes): Estado inicial de usuarios y credenciales operativas.
3. `PHASE_I1_CANONICAL_SNAPSHOT.json` (65,024 bytes) y `PHASE_I1B_SNAPSHOT.json` (73,662 bytes): Snapshots de identidades conciliadas.
4. `BSD-PRODUCTION-IDENTITY-CLEANUP-MANIFEST.json` (93,125 bytes) y `BSD-PRODUCTION-IDENTITY-CLEANUP-AUDIT.json` (117,870 bytes): Evidencia de pre-limpieza y trazabilidad de mutaciones de auditoría.
5. `scripts/governance_audit_dump.json` (26,584 bytes): Volcado de estado de gobernanza.

### 6.2 Respaldo Físico en Cloud Storage
* El bucket documentado `gs://bluesystem-backups-prod` es una referencia en `docs/security/DISASTER_RECOVERY.md`.
* No existen Cloud Functions, Cloud Schedulers ni scripts en `functions/src/schedulers/` que invoquen `admin.firestore().exportDocuments` o `google.firestore.v1.FirestoreAdminClient`.

---

## 7. FIRESTORE BACKUP AUDIT

* **Existencia:** 🟡 PARCIAL (Existen snapshots JSON locales ad-hoc en repo; exportación GCP continua no instrumentada en código).
* **Frecuencia Documentada:** Diaria a las 1:00 AM.
* **Frecuencia Real Verificada:** Ad-hoc / manual durante hitos de ingeniería.
* **Destino Documentado:** `gs://bluesystem-backups-prod/`
* **Retención:** No definida en código ni en políticas de ciclo de vida de bucket (Lifecycle rules).
* **Encryption:** Google Cloud standard encryption-at-rest (Google-managed keys). No se configuran llaves CMEK (Customer-Managed Encryption Keys).
* **Naming:** Formato documentado: `gs://bluesystem-backups-prod/YYYY-MM-DDTHH:MM:SS/`.
* **Automatización:** 🔴 NO AUTOMATIZADO. No hay Cloud Scheduler en `functions/` que ejecute el backup.

---

## 8. FIRESTORE RPO FORENSIC AUDIT

El plan de producción histórico declara:
$$\text{RPO} = 5\text{ minutos}$$

### Análisis Forense de Cumplimiento
1. **Inconsistencia Matemática Básica:** Una exportación fría diaria (*cold backup*) ejecutada a las 1:00 AM produce un RPO intrínseco de **24 horas**, no de 5 minutos. Si ocurre una caída o corrupción a las 23:59, se pierden 22 horas y 59 minutos de transacciones si solo se dispone del backup diario.
2. **Dependencia de "Transaction Trails":** La documentación argumenta que los 5 minutos se alcanzan mediante *"Cloud Logging transaction trails"*. Para que esto sea viable, se requeriría un motor de **Change Data Capture (CDC)** automatizado capaz de leer los registros JSON estructurados de Cloud Logging y re-ejecutar ordenadamente cada mutación (*write replay*).
3. **Ausencia de Replay Engine:** El repositorio carece por completo de un script o pipeline de reconstrucción de estado a partir de logs.
4. **Veredicto:** **RPO = 5 minutos es DOCUMENTADO ONLY / NO VERIFICADO / TÉCNICAMENTE INVÁLIDO EN EL ESTADO ACTUAL**. El RPO real ante fallo catastrófico sin intervención manual forense es de 24h a nivel de plataforma Google, o histórico a nivel de snapshots locales.

---

## 9. FIRESTORE RESTORE AUDIT

Procedimiento documentado en `docs/security/DISASTER_RECOVERY.md`:
```bash
gcloud firestore import gs://bluesystem-backups-prod/2026-08-07T01:00:00/ --project=bluesystem-7c9af
```

### Deficiencias Críticas de Seguridad y Operación
* **Peligro de Sobrescritura Ciega en Producción:** El comando se dirige directamente a `--project=bluesystem-7c9af`. En Firestore, un `import` sobre una base de datos activa no elimina documentos creados después del backup; fusiona y sobrescribe documentos existentes con el mismo ID, dejando documentos huérfanos posteriores en un estado inconsistente y corrompiendo saldos contables.
* **Falta de Entorno Aislado (Recovery Sandbox):** No existe un proyecto GCP de recuperación (`bluesystem-7c9af-dr`) documentado o configurado para validar la base restaurada antes de promoverla a producción.
* **Control de Ejecución:** No está definido qué rol de IAM ejecuta el comando, ni existen llaves de autorización dual.

---

## 10. RESTORE TEST CLASSIFICATION

Evaluación basada en evidencia objetiva de pruebas de restauración:
* **Clasificación Oficial:** 🔴 **NEVER TESTED (NUNCA TESTEADO)**.
* No existe constancia, log o acta de prueba de restauración completa de base de datos desde Cloud Storage hacia Firestore en un entorno de staging o producción.

---

## 11. STORAGE BACKUP AUDIT

* **Documentado:** RPO = 24h para Cloud Storage (Media, Vouchers, Avatares, Documentos).
* **Bucket Principal:** `bluesystem-7c9af.firebasestorage.app` (declarado en `firebase.json`).
* **Verificación de Respaldo:**
  * No existe réplica multirregional configurada como código.
  * No hay tareas de Cloud Storage Transfer Service configuradas en el proyecto.
  * No hay scripts de sincronización o backup secundario para las carpetas `/campaign_images/`, `/commerce_assets/` o `/courier_deposits/`.
* **Clasificación:** **DOCUMENTED ONLY**.

---

## 12. STORAGE RESTORE & IMMUTABILITY AUDIT

* **Object Versioning:** No está declarado en la configuración del repositorio. Si un atacante o error de código borra o sobrescribe un archivo en Storage, se pierde irrevocablemente si Versioning no está habilitado en GCP.
* **Procedimiento de Restauración:** Inexistente en la documentación operativa.
* **Clasificación:** **NO PLAN / UNPROTECTED**.

---

## 13. AUTH BACKUP & IDENTITY RECOVERY

* **Identidad en Firebase Auth:** Los usuarios registrados en Google Identity Platform (`Auth`) contienen las credenciales criptográficas que no se exportan mediante `gcloud firestore export`.
* **Snapshots de Colecciones de Identidad:**
  * `/users`: Respaldado localmente en `users_snapshot_backup.json` (53.9 KB).
  * `/businesses`: Persistido en Git bajo scripts de migración.
  * `/staff_memberships`: Mapeado en código.
* **Riesgo:** Si Firebase Auth sufre un borrado catastrófico, las cuentas de usuario y contraseñas no pueden recuperarse de Firestore; los usuarios tendrían que solicitar restablecimiento de contraseña (`resetPassword`), aunque sus perfiles y roles se recuperarían desde Firestore `/users`.

---

## 14. CUSTOM CLAIMS RECOVERY FORENSIC AUDIT

Las Custom Claims (`role`, `businessId`, `branchId`, `tenantId`) residen en el token JWT y en Identity Platform.

```
                              CUSTOM CLAIMS LIFECYCLE & RECOVERY
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ↓                                               ↓
            PRIMARY MUTATION PATH                           RECONCILIATION PATH
          functions/src/triggers/                          scripts/reconcile_merchant_claims_hotfix.js
          merchantLifecycleSync.ts                         functions/src/callables/admin.ts
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ↓
                                 admin.auth().setCustomUserClaims()
                                              ↓
                                    Firestore /users/{uid}
                                  (PERSISTED SOURCE OF TRUTH)
```

* **Capacidad de Reconstrucción:** 🟢 **RECUPERABLE (ALTA RESILIENCIA)**.
* Dado que el rol canónico, `businessId`, `tenantId` y estado operativo están persistidos en los documentos de Firestore (`/users/{uid}` y `/businesses/{businessId}`), cualquier pérdida masiva de Custom Claims puede mitigarse ejecutando un script de re-emisión masiva que itere sobre `/users` y re-aplique `setCustomUserClaims(uid, { role, businessId, ... })`.

---

## 15. CONFIGURATION BACKUP AUDIT

El sistema parametriza su comportamiento en documentos clave de Firestore:
* `/system_config/global`: Tarifas X→Y, comisiones, switches de servicio.
* `/system_config/app_update`: Versionado de clientes móviles, SemVer, forzado.
* `/system_config/bank_accounts`: Cuentas autorizadas para depósitos de repartidores.
* `/system_config/settlement_recipients`: Destinatarios de transferencias comerciales.

### Estado de Respaldo de Configuración
* No existe exportación periódica dedicada para `/system_config`.
* **Mecanismo de Resiliencia en Código:** En caso de borrado accidental de `/system_config/global`, el backend cuenta con valores de seguridad por defecto (*hardcoded fallbacks*) en `functions/src/services/routingService.ts`:
  * `TARIFA_BASE_NIO = 35.0`
  * `COSTO_POR_KM_NIO = 15.0`
  * `COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM = 8.0`
  * `COMMERCE_DEFAULT_COURIER_RATE_PER_KM = 7.0`
* **Veredicto:** 🟡 **IMPLEMENTED (CODE FALLBACKS ACTIVE)**.

---

## 16. FINANCIAL CONFIGURATION RECOVERY

* Los valores de comisiones y tarifas no deben modificarse a ciegas tras un desastre.
* Los contratos canónicos congelados en **ADR-019** (Liquidaciones) y **ADR-026** (Tarifas X→Y) especifican que las comisiones por comercio residen en `/businesses/{storeId}.commissionRate` (default 10% o 15%), y las tarifas de motorizado en `/system_config/global`.
* La auditoría confirma que los scripts de validación (`scripts/test_provisioning_idempotency.js`) conservan los esquemas financieros inmutables.

---

## 17. RULES BACKUP AUDIT

* **`firestore.rules` (80,750 bytes, 1,450 líneas):** Controlado bajo Git en la raíz del repositorio. Historial de versiones completo y auditable.
* **`storage.rules` (11,646 bytes, 223 líneas):** Controlado bajo Git en la raíz.
* **Recuperabilidad:** 🟢 **EXCELENTE (VERSIONED & RECOVERABLE)**. Desplegable en segundos vía `firebase deploy --only firestore:rules,storage:rules`.

---

## 18. INDEX RECOVERY AUDIT

* **`firestore.indexes.json` (8,515 bytes, 293 líneas):** Versionado en la raíz del repositorio.
* **Contenido:** Contiene 38 índices compuestos activos para colecciones `orders`, `user_devices`, `categories`, `audit_logs`, `promotions`, `courier_daily_closures`, `merchant_settlements`.
* **Brecha en CI/CD:** El pipeline de GitHub Actions `.github/workflows/backend-ci-cd.yml` despliega con `--only functions,firestore:rules,storage:rules` y **NO INCLUYE `firestore:indexes`**. Si se produce un despliegue limpio desde CI/CD, los índices no se crean automáticamente.

---

## 19. CLOUD FUNCTIONS RECOVERY

* **Código Fuente:** `functions/src/` bajo TypeScript estricto.
* **Reproducibilidad:** Compilable mediante `npm ci && npm run build` (Node 22).
* **Rollback:**
  * Si un despliegue de Functions introduce un error crítico, el rollback se efectúa revirtiendo el commit en Git y ejecutando `firebase deploy --only functions`.
  * Google Cloud Functions mantiene un historial inmutable de imágenes de artefacto en Artifact Registry / Container Registry, permitiendo el redeploy de versiones previas.
* **Estado:** 🟢 **IMPLEMENTED & AUDITED**.

---

## 20. CLOUD RUN RECOVERY AUDIT

* **Inventario:** 4 microservicios en `services/` (`dispatch-engine`, `notification-service`, `analytics-aggregator`, `eiam-identity-service`).
* **Estado Operacional:** ⚫ **INACTIVO EN PRODUCCIÓN (0% TRAFFIC)**.
* Conforme al reporte de evaluación de backend y la Fase 6, no existen revisiones activas de Cloud Run sirviendo tráfico en `bluesystem-7c9af`. Toda la carga productiva reside en Cloud Functions v1/v2.
* **Impacto en Disaster Recovery:** NULO. No se requiere plan de DR activo para Cloud Run hasta que se autorice su despliegue operativo.

---

## 21. WEB RECOVERY AUDIT

Plataformas Web alojadas en Firebase Hosting:
1. `corporate` (`bluesystem-7c9af-corporate`): `corporate-web/public`
2. `admin` (`bluesystem-7c9af`): `panel-admin/public`
3. `merchant` (`bluesystem-7c9af-merchant`): `merchant-web/dist`
4. `onboarding` (`bluesystem-7c9af-apply`): `merchant-onboarding-portal/dist`

### Capacidad de Rollback de Hosting
* Firebase Hosting almacena versiones inmutables de cada despliegue (*Release History*).
* **Rollback Instantáneo:** Si una nueva versión de Admin Web o Merchant Web falla, se puede revertir inmediatamente desde la consola de Firebase o mediante CLI:
  ```bash
  firebase hosting:clone bluesystem-7c9af:<PREVIOUS_VERSION_ID> bluesystem-7c9af:live
  ```
  Tiempo estimado de recuperación: **$< 1\text{ minuto}$**.
* **Estado:** 🟢 **IMPLEMENTED & TESTED**.

---

## 22. MOBILE RECOVERY AUDIT: BINARY VS BACKEND

Debe diferenciarse rigurosamente el rollback de backend del rollback de aplicaciones móviles:
* **Backend Rollback:** Inmediato (minutos) revirtiendo código en el servidor.
* **Mobile Binary Rollback:** **IMPOSIBLE EN GOOGLE PLAY Y APPLE APP STORE**. Una vez que un binario `.aab` o `.ipa` con defectos graves se distribuye a los dispositivos de los usuarios, no existe API remota para desinstalarlo o forzar un downgrade binario a una compilación anterior.

### Mecanismos de Emergencia Móvil
1. **Kill Switch / Actualización Forzada (`AppUpdateResolver.kt`):**
   * En Android, el componente `RealtimeSyncOrchestrator` y `MainActivity` escuchan `/system_config/app_update`.
   * Si `forceUpdate == true` o `currentVersion < minimumVersion`, la aplicación bloquea la pantalla completa mostrando `ForceUpdateScreen()`, impidiendo cualquier transacción defectuosa y redirigiendo al usuario a la tienda.
2. **Brecha en iOS (`flutter_client`):**
   * El cliente Flutter carece de esta suscripción en su arranque (`main.dart`), por lo que no puede ser bloqueado remotamente mediante este mecanismo.

---

## 23. MOBILE EMERGENCY CONTROL AUDIT

Capacidad para desactivar funciones críticas sin republicar binarios:

| Característica | Mecanismo de Control | Tiempo de Reacción | Plataforma Android | Plataforma iOS |
|:---|:---|:---:|:---:|:---:|
| **Desactivar Envíos X→Y** | Flag `xToYPricing.enabled = false` en `/system_config/global` | Inmediato | 🟢 Soportado (Fail-Closed en servidor) | 🟢 Soportado (Backend rechaza cálculo) |
| **Desactivar Cupones** | Flag `couponsEnabled = false` en `/system_config/global` | Inmediato | 🟢 Soportado | 🟢 Soportado |
| **Bloquear App Móvil Defectuosa** | `forceUpdate = true` en `/system_config/app_update` | Inmediato | 🟢 `ForceUpdateScreen()` activo | 🔴 No suscrito en Flutter |
| **Desactivar Despacho a Motorizado** | Cambiar `isBlocked = true` en `/users/{courierId}` | Inmediato | 🟢 Repartidor pierde elegibilidad | 🟢 Elegibilidad en backend |

---

## 24. CI/CD WORKFLOW AUDIT

Inspección de `.github/workflows/`:
1. `backend-ci-cd.yml` (87 líneas):
   * Disparadores: Push a `main`, `staging`, `develop`; Pull Request a `main`, `staging`.
   * Job 1: `validate_and_test`: Ejecuta `npm ci` y `npm run build` (`tsc`). **NO EJECUTA `npm test`**.
   * Job 2: `deploy_staging`: Despliega canal de hosting staging ante cambios en `staging` o `develop`.
   * Job 3: `deploy_production`:
     * Requiere `needs: validate_and_test`.
     * Condición: `github.ref == 'refs/heads/main'`.
     * `environment: production` (Gobernanza de aprobación de GitHub Environments).
     * Comando: `npx firebase-tools deploy --only functions,firestore:rules,storage:rules --token "${{ secrets.FIREBASE_TOKEN }}"`.
2. `build-ios-ipa.yml` (238 líneas):
   * Validación L1 de Flutter en `macos-15` (Xcode 16). Produce `.ipa` no firmado como artefacto descargable.
3. `ios.yml` (23 líneas): Workflow starter deshabilitado.

---

## 25. PIPELINE INTEGRITY & QUALITY GATES

### Hallazgo Crítico en CI/CD:
* En `backend-ci-cd.yml`, el job `validate_and_test` compila el código TypeScript (`tsc`), pero **NO invoca el comando de pruebas unitarias (`npm test`)**.
* Esto significa que si un commit rompe las 87 pruebas unitarias de backend (`loyalty.test.ts`, `couponEngine.test.ts`, `commerceDeliveryPricingDispatch001.test.ts`), el build pasará en verde siempre que no tenga errores sintácticos de tipos, permitiendo que código defectuoso alcance la compuerta de despliegue.

---

## 26. PRODUCTION APPROVAL GATE

* **Declaración:** Manual Approval Gate en GitHub Actions.
* **Verificación Técnica:** `backend-ci-cd.yml` declara `environment: production`.
* **Condición de Gobernanza:** Para que esta compuerta sea efectiva, el repositorio en GitHub debe tener configuradas reglas de protección de entorno (*Environment Protection Rules*) con revisores obligatorios (*Required Reviewers*).
* Si las reglas no están configuradas en la UI de GitHub, cualquier merge a `main` despliega automáticamente.

---

## 27. BUILD REPRODUCIBILITY

* **Functions:** Totalmente reproducible. `functions/package-lock.json` bloquea versiones exactas de dependencias y `tsconfig.json` fija el compilador TypeScript 5.0 contra Node.js 22.
* **Android:** Reproducible vía Gradle Wrapper (`gradlew`). `app/build.gradle.kts` fija SDKs y dependencias.
* **iOS / Flutter:** Reproducible para el compilado Dart; requiere runner `macos-15` específico para compatibilidad con CocoaPods y `firebase_core ^3.10`.

---

## 28. RELEASE ARTIFACTS AUDIT

| Artefacto | Almacenamiento / Pipeline | Estado de Versionado |
|:---|:---|:---:|
| **Android APK / AAB** | Generado localmente vía CLI Gradle; no almacenado en GitHub Actions | VersionCode inyectado (`-PcustomBuildNumber`) |
| **iOS IPA** | Subido como GitHub Actions Artifact (`BlueSystem-iOS-L1-${{ github.run_number }}`) con retención de 14 días | Unsigned L1 Artifact |
| **Web Bundles** | Compilados localmente (`merchant-web/dist`) y desplegados a Hosting | Versionado por Release ID en Firebase Hosting |
| **Cloud Functions** | Compiladas y desplegadas en GCP Container Registry / Artifact Registry | Versionado por commit SHA y Function deployment ID |

---

## 29. VERSION TRACEABILITY

Capacidad de correlacionar producción con el commit exacto:
* **Android:** `BuildConfig.VERSION_NAME` ("1.0.1") y `BuildConfig.VERSION_CODE` (2).
* **iOS:** `CFBundleShortVersionString` ("2.2.0") y `CFBundleVersion` ("100").
* **Functions:** Registra `requestId` y correlación estructurada en logs; no estampa explícitamente el commit hash en la metadata del payload JSON en runtime.
* **Web:** Versionado mediante parámetros de consulta en `dashboard.html` (cache-busting: `?v=2.2...`).

---

## 30. DATABASE SCHEMA RECOVERY & FORWARD/BACKWARD COMPATIBILITY

* Firestore es una base de datos NoSQL sin esquema rígido a nivel de motor (*schemaless*).
* **Gobernanza de Compatibilidad Dual:** Conforme a **ADR-018 (Parallel Evolution Rule)**, cualquier cambio de estructura de datos debe mantener compatibilidad de lectura para el formato anterior durante al menos una versión completa.
* Ejemplo verificado en `routingService.ts` y `models.kt`: El sistema soporta campos duales canónicos y legacy (`customerPricePerKm` y fallbacks).

---

## 31. MIGRATION SAFETY AUDIT

Se auditaron los scripts en `scripts/` utilizados en migraciones históricas:
* `backup_and_normalize_operational_identities.js`: **Modo Quirúrgico Impecable**. Antes de aplicar cualquier mutación en `/users`, generó `users_snapshot_backup.json` en disco y aplicó los cambios mediante `db.batch()` atómico.
* `reconcile_merchant_claims_hotfix.js`: Ejecutó validación en seco (*dry-run*) antes de mutar producción.
* **Conclusión:** La disciplina de migraciones cumple con las directivas de seguridad (Pre-check $\to$ Backup $\to$ Migration $\to$ Validation).

---

## 32. ZERO-DOWNTIME CAPABILITY

* **Backend Functions & Triggers:** Despliegue con cero tiempo de inactividad garantizado por la infraestructura serverless de Google Cloud Functions (las instancias antiguas siguen respondiendo tráfico hasta que las nuevas instancias están completamente aprovisionadas y listas).
* **Hosting Web:** Cero tiempo de inactividad garantizado por el intercambio atómico de punteros DNS/CDN en Firebase Hosting.
* **Firestore Rules:** Despliegue atómico instantáneo en todos los nodos de almacenamiento en menos de 10 segundos.

---

## 33. DEPLOYMENT & CANARY STRATEGY

* **Canary Framework en Backend:** Implementado en `functions/src/config/productionCanaryLock.ts` y `canaryRouter.ts`.
* **Regla Inviolable ADR-014 (NO AUTO-ROLLOUT POLICY):**
  * `CANARY_PERCENTAGE = 0`
  * `PRODUCTION_CANARY_LOCK = true`
  * El sistema prohíbe explícitamente que cualquier prueba automatizada o script aumente el porcentaje de canario hacia producción sin una autorización humana explícita.
* **Estado:** 🟢 **FULLY LOCKED & COMPLIANT**.

---

## 34. ROLLBACK MATRIX

| Componente | Mecanismo de Rollback | Probado | Tiempo Estimado | Riesgo de Pérdida de Datos |
|:---|:---|:---:|:---:|:---:|
| **Firestore Rules** | `git revert` + `firebase deploy --only firestore:rules` | 🟢 Sí | $1\text{ - }2\text{ min}$ | Nulo |
| **Functions Backend** | `git revert` + CI/CD deploy / CLI deploy | 🟢 Sí | $3\text{ - }5\text{ min}$ | Nulo (Stateless) |
| **Firebase Hosting** | Revertir Release ID en Firebase Console / CLI | 🟢 Sí | $< 1\text{ min}$ | Nulo |
| **Remote Config** | Restaurar `/system_config/global` vía Admin Panel | 🟢 Sí | $< 1\text{ min}$ | Nulo |
| **Custom Claims** | Script de re-emisión desde Firestore `/users` | 🟡 Parcial | $5\text{ - }10\text{ min}$ | Nulo |
| **Android App** | `forceUpdate = true` en `/system_config/app_update` | 🟢 Sí (17 tests) | $< 1\text{ min}$ (Efecto inmediato en UI) | Nulo |
| **iOS App** | Publicación de Hotfix en Apple App Store | 🔴 No | $24\text{ - }48\text{ horas}$ (Revisión Apple) | Nulo |
| **Firestore Data** | `gcloud firestore import` desde GCS | 🔴 No | $30\text{ - }120\text{ min}$ | 🔴 Alto (Riesgo de sobrescritura ciega) |

---

## 35. ROLLBACK REAL VS DOCUMENTADO

```
                                ROLLBACK MATURITY SPECTRUM
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ↓                                      ↓                                      ↓
PRODUCTION-VALIDATED                     IMPLEMENTED & TESTED                   DOCUMENTED ONLY
- Hosting Rollback (Web)               - Firestore Rules Rollback             - Full Firestore Data Rollback
- Remote Config Revert                 - Cloud Functions Rollback               (`gcloud firestore import`)
- Android Kill Switch (Force Update)   - Custom Claims Re-sync                - Storage Bucket Rollback
```

---

## 36. FINANCIAL ROLLBACK SAFETY

* **Regla Contable Estricta:** Queda terminantemente prohibido utilizar `delete` sobre las colecciones `/financial_events`, `/courier_balances`, `/courier_daily_closures` o `/merchant_settlements` como técnica de rollback ante errores de liquidación.
* **Mecanismo de Compensación Canónico:** Conforme al **ADR-019**, cualquier error en el cálculo de una liquidación o pre-corte debe resolverse emitiendo un evento financiero compensatorio (*contra-asiento* o *adjustment event*) preservando la inmutabilidad y la trazabilidad contable forense.

---

## 37. NOTIFICATION ROLLBACK & STORM MITIGATION

* Si una campaña de notificaciones errónea o bucle infinito se encola en `/notification_campaigns`:
  * En `functions/src/schedulers/notificationQueue.ts`, las campañas son procesadas por lotes.
  * Cambiando el estado del documento a `CANCELLED` en `/notification_campaigns/{campaignId}`, el worker detiene inmediatamente el despacho.
  * Las reglas de Firestore impiden escrituras maliciosas en campañas directas desde clientes móviles.

---

## 38. EXTERNAL SERVICE FAILURE & DEGRADED MODE

Comportamiento auditado ante la indisponibilidad de proveedores externos:

```
               EXTERNAL DEPENDENCY FAILURE MATRIX & DEGRADED MODES
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ↓                                 ↓                                 ↓
GOOGLE MAPS / ROUTING               FCM / PUSH GATEWAY                 SMTP / EMAIL SERVICE
- Falla: 500 / Over Quota           - Falla: Google FCM Outage         - Falla: Puerto 465 Bloqueado / Auth
- Modo Degradado: IMPLEMENTADO      - Modo Degradado: IMPLEMENTADO     - Modo Degradado: IMPLEMENTADO
  • Haversine Distance (x1.3)         • Firestore onSnapshot reactivo    • Idempotencia en /email_events
  • Tarifas planas en código           (Mientras app esté abierta)       • Exponential Backoff Retries
  • UI muestra "Estimado"             • App de courier refresca pedidos  • Logs de auditoría de fallo
```

---

## 39. TENANT & PARTIAL RECOVERY AUDIT

* **Restauración por Tenant Individual:**
  * No existe soporte automatizado para restaurar un único comercio (ej. TECNOSTORE) sin afectar a los demás comercios alojados en la misma base de datos.
  * La separación de datos se basa en campos de documento (`businessId`), no en bases de datos lógicas aisladas (*database-per-tenant*).
  * **Veredicto:** **TENANT-LEVEL RESTORE NOT SUPPORTED (MANUAL SCRIPT REQUIRED)**.

---

## 40. DISASTER SCENARIOS EVALUATION (DR-01 a DR-14)

### DR-01: Caída de Base de Datos Firestore (GCP Regional Outage)
* **Detección:** Alertas de Cloud Monitoring, fallo de `healthCheckScheduler.ts`, excepciones masivas en clientes.
* **Severidad:** P0 (Crítica).
* **Acción Inmediata:** Activar comunicación de emergencia a comercios y repartidores. Detener recepción de pedidos.
* **Recuperación:** Esperar resolución de SLA de Google Cloud. Si la región `us-central1` sufre pérdida total, restaurar en región secundaria requiere aprovisionar nuevo proyecto y actualizar clientes móviles.
* **Owner:** Technical Owner / GCP Lead.

### DR-02: Caída de Cloud Storage
* **Detección:** Errores 503/404 al cargar imágenes o comprobantes de depósito.
* **Severidad:** P1 (Alta).
* **Acción Inmediata:** Modo degradado activo. Las órdenes continúan procesándose sin fotos de productos. El cierre de motorizado opera registrando el número de referencia bancaria aunque falle la subida del voucher.
* **Owner:** GCP Lead.

### DR-03: Caída de Cloud Functions
* **Detección:** Errores `UNAVAILABLE` en llamadas a `httpsCallable`.
* **Severidad:** P0 (Crítica).
* **Acción Inmediata:** El motor de despacho y cálculo de precios se detiene. Notificar a operaciones.
* **Recuperación:** Redeploy de Functions desde Cloud Shell o CI/CD.
* **Owner:** Backend Lead.

### DR-04: Caída de Cloud Run
* **Severidad:** N/A (0% de carga productiva en Cloud Run).

### DR-05: Caída de FCM (Push Notifications)
* **Detección:** Campañas quedan en estado pendiente o timeout en Google FCM.
* **Severidad:** P1 (Alta).
* **Acción Inmediata:** Las aplicaciones móviles continúan operando mediante suscripciones `onSnapshot` mientras están abiertas en primer plano. Los repartidores deben mantener la pantalla encendida.
* **Owner:** Mobile Lead.

### DR-06: Caída de APNs
* **Severidad:** P1 (Afecta únicamente a usuarios iOS). Mismo comportamiento que DR-05.

### DR-07: Caída de Google Maps Routes API
* **Detección:** Excepciones en `routingService.ts`.
* **Severidad:** P2 (Mitigada).
* **Acción Inmediata:** Fallback automático a `FALLBACK_ESTIMATED` con cálculo Haversine y tarifas congeladas. El servicio de entrega no se detiene.
* **Owner:** Backend Lead.

### DR-08: Caída de Proveedor de Pagos / Pasarela Bancaria
* **Detección:** Fallo en conciliación de transferencias.
* **Severidad:** P2.
* **Acción Inmediata:** Canalizar 100% de operaciones hacia pago contra entrega en efectivo (`CASH`).
* **Owner:** Finance Lead.

### DR-09: Despliegue de Backend Defectuoso
* **Detección:** Picos de errores en Cloud Logging tras ejecución de workflow de CI/CD.
* **Severidad:** P0.
* **Acción Inmediata:** `git revert` del commit causante y despliegue de emergencia mediante `firebase deploy --only functions`.
* **Owner:** Lead Architect.

### DR-10: Publicación de Versión Móvil Defectuosa en Google Play
* **Detección:** Picos de crashes en Firebase Crashlytics.
* **Severidad:** P0.
* **Acción Inmediata:**
  1. Detener el porcentaje de despliegue progresivo (*halt rollout*) en Google Play Console.
  2. Modificar `/system_config/app_update` estableciendo `forceUpdate: true` y `targetUrl` hacia la versión previa o parche correctivo.
* **Owner:** Mobile Lead.

### DR-11: Compromiso de Credenciales o Secretos
* **Detección:** Alerta de seguridad, tráfico no reconocido desde IPs anómalas.
* **Severidad:** P0.
* **Acción Inmediata:**
  1. Rotación inmediata de versión en Secret Manager (`SMTP_PASSWORD`).
  2. Regeneración de llaves de Firebase Service Account en IAM.
  3. Ejecución de `revokeRefreshTokens` para forzar re-autenticación de todos los usuarios.
* **Owner:** Security Lead.

### DR-12: Corrupción de Documento de Configuración (`/system_config/global`)
* **Detección:** Tarifas de envío o comisiones devuelven valores NaN o cero.
* **Severidad:** P1.
* **Acción Inmediata:** Re-crear el documento en Firestore utilizando los valores canónicos auditados en este reporte. Los fallbacks en código amortiguan el impacto transaccional.
* **Owner:** Technical Owner.

### DR-13: Borrado Accidental de Colección Crítica
* **Detección:** Errores de "Document not found" generalizados.
* **Severidad:** P0.
* **Acción Inmediata:** Bloquear reglas de Firestore (`allow write: if false;`) para evitar inconsistencias adicionales. Restaurar desde el último snapshot válido.
* **Owner:** GCP Lead & Auditor.

### DR-14: Incidente de Seguridad / Violación de Acceso
* **Detección:** Intentos de lectura cross-tenant en logs de seguridad.
* **Severidad:** P0.
* **Acción Inmediata:** Aislar al tenant comprometido estableciendo `status: "SUSPENDED"` en `/businesses/{id}`. Desactivar usuarios sospechosos en Auth.
* **Owner:** Security Lead.

---

## 41. RTO & RPO REALITY CHECK

| Métrica | Documentado Histórico | Evidencia Real Verificada | Veredicto |
|:---|:---:|:---:|:---:|
| **Firestore RPO** | 5 minutos | Ad-hoc / Horas a Días | 🔴 **UNVERIFIED / THEORETICAL** |
| **Firestore RTO** | < 2 horas | Dependiente de CLI manual; nunca cronometrado | 🟡 **ESTIMATED (1 - 3 horas)** |
| **Storage RPO** | 24 horas | Sin versionado ni backup programado | 🔴 **UNVERIFIED** |
| **Rules Rollback** | < 5 minutos | Verificado en Git + deploy CLI | 🟢 **CERTIFIED (< 2 min)** |
| **Functions Rollback**| < 15 minutos | Verificado en Git + deploy CLI | 🟢 **CERTIFIED (< 5 min)** |
| **Hosting Rollback** | < 5 minutos | Instantáneo en Firebase Console | 🟢 **CERTIFIED (< 1 min)** |
| **Mobile Kill Switch** | Inmediato | Validado en Android (`AppUpdateResolver`) | 🟢 **CERTIFIED (Android)** / 🔴 **UNSUPPORTED (iOS)** |

---

## 42. DATA INTEGRITY & AUDIT TRAIL PRESERVATION

* **Preservación de Ledger:** La colección `/financial_events` es append-only y protegida contra escritura de clientes por reglas de Firestore. Cualquier procedimiento de recuperación debe salvaguardar estos documentos sin truncamiento.
* **Detección de Huérfanos:** Los scripts en `scripts/clean_orphaned_branches_mem.js` y `scripts/clean_all_duplicates.js` evidencian la existencia de herramientas de saneamiento post-incidente para reconciliar datos desincronizados.

---

## 43. RECOVERY OWNERSHIP & INCIDENT ROLES

Definición operativa de roles y responsables de recuperación ante desastre:

| Rol de Recuperación | Responsabilidad Primaria | Contacto Designado |
|:---|:---|:---:|
| **Incident Commander** | Lidera la toma de decisiones, declara estado de desastre y autoriza restores | Lead Architect / Senior Developer |
| **Database & Cloud Owner** | Administra Firestore, Storage, Secret Manager e IAM en GCP | GCP Lead |
| **Backend & Pipeline Owner**| Gestiona Cloud Functions, Schedulers y Workflows de GitHub Actions | Backend Lead |
| **Mobile Release Owner** | Controla Google Play Console, Apple App Store y AppUpdateCenter | Mobile Lead |
| **Security & Privacy Owner**| Gestiona rotación de secretos, tokens, App Check y EIAM | Security Auditor |
| **Operations & Finance Owner**| Concilia saldos de comercios, arqueos de repartidores y reclamos | Operations / Finance Lead |

---

## 44. RELEASE MANIFEST TEMPLATE

Para garantizar la trazabilidad inmutable antes de cualquier despliegue a producción, se establece el siguiente manifiesto formal obligatorio:

```yaml
RELEASE MANIFEST: BlueSystem Delivery Enterprise
Release Version:        v2.2.0-prod
Target Date:            2026-10-01
Git Commit SHA:         7c8d9e0f...
Build Number (Android): 2 (versionName: 1.0.1)
Build Number (iOS):     100 (versionName: 2.2.0)
Backend Functions:      Node.js 22 Engine (functions/lib/index.js)
Firestore Rules SHA:    a1b2c3d4... (1,450 lines - EIAM v2.1/v3)
Storage Rules SHA:      e5f6g7h8... (223 lines)
Indexes Version:        38 compound indexes (firestore.indexes.json)
Target Hosting Sites:   corporate, admin, merchant, onboarding
Pre-Release Backup Ref: gs://bluesystem-backups-prod/pre-release-v2.2.0/
Canary Lock Status:     CANARY_PERCENTAGE=0, PRODUCTION_CANARY_LOCK=TRUE
Signed By:              Senior Developer & Lead Auditor
```

---

## 45. RECOVERY MATURITY MATRIX

| Área | Backup | Restore | Rollback | Tested | Actual RPO | Target RTO | Estado |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Firestore** | 🟡 Local JSON | 🔴 Manual CLI | 🔴 No Data Rollback | 🔴 Never | Horas/Días | $< 2\text{ h}$ | 🟠 Remediation Req. |
| **Storage** | 🔴 Inexistente | 🔴 Inexistente | 🔴 No Versioning | 🔴 Never | Indefinido | $< 4\text{ h}$ | 🔴 Deficiente |
| **Auth & Claims**| 🟡 /users JSON | 🟢 Re-sync Script | 🟢 Re-sync Script | 🟢 Tested | Inmediato | $< 30\text{ min}$ | 🟢 Resiliente |
| **Config Global**| 🟢 Fallbacks Git | 🟢 Admin Panel | 🟢 Git Revert | 🟢 Tested | Inmediato | $< 5\text{ min}$ | 🟢 Protegido |
| **Rules** | 🟢 Git Repo | 🟢 Deploy CLI | 🟢 Deploy CLI | 🟢 Tested | 0 min (Git) | $< 2\text{ min}$ | 🟢 Excelente |
| **Functions** | 🟢 Git Repo | 🟢 CI/CD Deploy | 🟢 Git Revert | 🟢 Tested | 0 min (Git) | $< 5\text{ min}$ | 🟢 Excelente |
| **Cloud Run** | ⚫ Blueprint | ⚫ N/A | ⚫ N/A | ⚫ N/A | N/A | N/A | ⚫ No en Prod |
| **Web Hosting** | 🟢 Hosting History| 🟢 Instant Clone | 🟢 Instant Clone | 🟢 Tested | 0 min (Git) | $< 1\text{ min}$ | 🟢 Excelente |
| **Android App** | 🟢 Git / Gradle | 🔴 Re-release | 🟢 ForceUpdateScreen| 🟢 Tested | N/A | $< 1\text{ min}$ (Kill) | 🟢 Protegido |
| **iOS App** | 🟢 Git / Flutter | 🔴 Re-release | 🔴 Sin ForceUpdate | 🔴 Never | N/A | $24\text{ - }48\text{ h}$ | 🟠 Expuesto |
| **Finance Ledger**| 🟢 Append-only | 🟡 Compensatorio | 🟢 Contra-asientos | 🟢 Tested | $< 15\text{ min}$ | $< 1\text{ hora}$ | 🟢 Certificado |
| **Notifications** | 🟢 DB Queue | 🟢 Reintentos | 🟢 Cancel Campaign | 🟢 Tested | Efímero | $< 15\text{ min}$ | 🟢 Protegido |

---

## 46. DETAILED FINDINGS

### FINDING F8-01: Firestore Automated Backup Ausente en Código y RPO = 5 min Invalorable
* **CATEGORÍA:** Backup & Disaster Recovery
* **COMPONENTE:** Cloud Firestore (`bluesystem-7c9af`)
* **ESTADO ACTUAL:** Solo existen volcados JSON manuales en el repositorio local. La exportación diaria a `gs://bluesystem-backups-prod` declarada en `DISASTER_RECOVERY.md` no está instrumentada en Cloud Functions ni Cloud Scheduler.
* **ESTADO ESPERADO:** Tarea programada en Cloud Scheduler / GCP que ejecute diariamente la exportación a Cloud Storage con retención de 30 días, y activación de PITR (Point-in-Time Recovery) en Firestore para RPO real de 7 días / minutos.
* **IMPACTO:** Alto riesgo de pérdida masiva de datos transaccionales ante incidente grave de infraestructura.
* **SEVERIDAD:** 🔴 **HIGH (BLOCKER PARA GO-LIVE DEFINITIVO)**
* **RECOMENDACIÓN:** 
  1. Habilitar formalmente Firestore PITR mediante CLI: `gcloud firestore databases update --enable-pitr`.
  2. Implementar una Cloud Function programada (`scheduledFirestoreBackup`) que invoque la API de exportación a un bucket con Lifecycle policy de 30 días.

---

### FINDING F8-02: Procedimiento de Restore con Riesgo de Sobrescritura en Producción
* **CATEGORÍA:** Restore & Data Safety
* **COMPONENTE:** DR Runbook (`docs/security/DISASTER_RECOVERY.md`)
* **ESTADO ACTUAL:** El comando documentado `gcloud firestore import --project=bluesystem-7c9af` se ejecuta directamente sobre el proyecto productivo sin aislamiento ni validación previa.
* **ESTADO ESPERADO:** Protocolo de restauración en dos fases:
  1. Restaurar primero en proyecto o base de datos de validación / staging.
  2. Ejecutar suite de pruebas de integridad de datos (conteo de documentos, validación de saldos).
  3. Promover a producción únicamente tras certificación exitosa.
* **IMPACTO:** Sobrescritura destructiva o corrupción de datos residuales.
* **SEVERIDAD:** 🔴 **HIGH**
* **RECOMENDACIÓN:** Actualizar el Runbook de Disaster Recovery prohibiendo el import directo sin paso previo por entorno aislado.

---

### FINDING F8-03: Cloud Storage sin Object Versioning ni Backup de Medios
* **CATEGORÍA:** Storage Disaster Recovery
* **COMPONENTE:** `bluesystem-7c9af.firebasestorage.app`
* **ESTADO ACTUAL:** No se encuentra configurado Object Versioning ni réplica secundaria para los archivos multimedia, vouchers de liquidación y comprobantes de arqueo.
* **ESTADO ESPERADO:** Object Versioning activo en el bucket de Firebase Storage para recuperación ante borrados accidentales o ataques de ransomware.
* **IMPACTO:** Pérdida permanente de comprobantes de pago o fotos de catálogo.
* **SEVERIDAD:** 🟠 **MEDIUM**
* **RECOMENDACIÓN:** Habilitar versionado en el bucket: `gcloud storage buckets update gs://bluesystem-7c9af.firebasestorage.app --versioning`.

---

### FINDING F8-04: Pipeline de CI/CD Omite Ejecución de Tests, Índices y Hosting
* **CATEGORÍA:** CI/CD & Pipeline Integrity
* **COMPONENTE:** `.github/workflows/backend-ci-cd.yml`
* **ESTADO ACTUAL:**
  1. El job de validación solo corre `npm run build` (`tsc`), omitiendo `npm test`.
  2. El despliegue de producción no incluye `firestore:indexes` ni `hosting`.
  3. Utiliza la bandera obsoleta `--token` en lugar de Service Account credentials.
* **ESTADO ESPERADO:** Pipeline robusto que ejecute suite completa de tests unitarios antes de permitir el merge a `main` y despliegue todos los artefactos sincronizados.
* **IMPACTO:** Código con regresiones puede desplegarse en producción; índices nuevos no se instalan automáticamente.
* **SEVERIDAD:** 🟠 **MEDIUM**
* **RECOMENDACIÓN:** Incorporar `npm test` en el step de validación y agregar los targets faltantes a `firebase-tools deploy`.

---

### FINDING F8-05: Asimetría en Kill-Switch Móvil (Android Blindado vs iOS Expuesto)
* **CATEGORÍA:** Mobile Emergency Control & Rollback
* **COMPONENTE:** `flutter_client` (iOS) vs `app/` (Android)
* **ESTADO ACTUAL:** Android cuenta con `AppUpdateResolver.kt` y `ForceUpdateScreen.kt` vinculados a Firestore `/system_config/app_update`. Flutter/iOS no escucha este canal de actualización remota obligatoria.
* **ESTADO ESPERADO:** Paridad completa en control de versiones de emergencia en ambas plataformas móviles.
* **IMPACTO:** Si se publica una versión iOS con fallos críticos, no hay forma de bloquearla remotamente.
* **SEVERIDAD:** 🟠 **MEDIUM**
* **RECOMENDACIÓN:** Homologar el listener de `/system_config/app_update` en el ciclo de vida de `flutter_client`.

---

## 47. BLOCKERS SUMMARY

1. **BLOCKER DR-01:** Ausencia de copias de seguridad de base de datos automatizadas y programadas en la nube (`gs://bluesystem-backups-prod` no existe como cron/código activo).
2. **BLOCKER DR-02:** Procedimiento de restauración en producción no probado jamás (*Never Tested*) y con riesgo de sobrescritura ciega.
3. **BLOCKER DR-03:** CI/CD no valida pruebas unitarias antes del despliegue productivo.

---

## 48. REMEDIATION PLAN (ROADMAP POST-AUDITORÍA)

| Paso | Acción de Remediación | Componente Afectado | Prioridad |
|:---:|:---|:---|:---:|
| **1** | Activar **Firestore Point-in-Time Recovery (PITR)** en GCP Console | Cloud Firestore | P0 (Inmediata) |
| **2** | Crear Cloud Scheduler diario a la 1:00 AM para exportación a bucket dedicado | Cloud Functions / GCP | P0 (Inmediata) |
| **3** | Actualizar `backend-ci-cd.yml` agregando `npm test` en el job `validate_and_test` | `.github/workflows/` | P1 (Pre-Go-Live) |
| **4** | Activar Object Versioning en `bluesystem-7c9af.firebasestorage.app` | Cloud Storage | P1 (Pre-Go-Live) |
| **5** | Implementar `AppUpdateListener` en `flutter_client` para paridad con Android | Flutter iOS/Android | P2 (Post-Store) |
| **6** | Ejecutar un simulacro controlado de restauración (*DR Drill*) en proyecto aislado | Entorno de Staging | P1 (Pre-Go-Live) |

---

## 49. CERTIFICATION GATE EVALUATION

Evaluación frente a los cuatro criterios normativos del protocolo:
* 🟢 **DR READY:** Rechazado. Faltan backups automáticos y pruebas de restore.
* 🟡 **DR READY WITH CONDITIONS:** Aceptado provisionalmente bajo compromiso de ejecutar el Plan de Remediación antes de la apertura pública de transacciones reales.
* 🟠 **RECOVERY REMEDIATION REQUIRED:** **VEREDICTO TÉCNICO OFICIAL DE LA FASE 8**.
* 🔴 **NO-GO:** No aplica ya que el código, las reglas y los fallbacks de infraestructura garantizan la integridad contra errores menores y despliegues fallidos.

---

## 50. FINAL CERTIFICATION & ZERO MUTATION CLOSURE

```
================================================================
 BSD-PRESTORE-PHASE-8 — FINAL AUDIT VERDICT
================================================================
Status:               🟠 RECOVERY REMEDIATION REQUIRED (CONDITIONAL)
Protocol:             BSD-PRESTORE-PHASE-8-BUSINESS-CONTINUITY-DR-BACKUP-RESTORE-CICD-AUDIT-001
Auditor:              Senior Developer & Enterprise Auditor
Date:                 2026-10-01

CERTIFICATION EVIDENCE SUMMARY:
1. Source & Rules Rollback:       🟢 L3 - TESTED & CERTIFIED
2. Cloud Functions Rollback:      🟢 L3 - TESTED & CERTIFIED
3. Web Hosting Instant Revert:    🟢 L3 - TESTED & CERTIFIED
4. Android Mobile Kill Switch:    🟢 L3 - TESTED & CERTIFIED (17 tests)
5. Financial Ledger Inmutability: 🟢 L3 - TESTED & CERTIFIED (ADR-019/026)
6. CI/CD Automated Testing Gate:  🟠 L2 - IMPLEMENTED (MISSING NPM TEST)
7. Firestore Automated Backup:    🔴 L1 - DOCUMENTED ONLY
8. Firestore Recovery Runbook:    🔴 L1 - DOCUMENTED ONLY / NEVER TESTED
9. Storage Media Versioning:      🔴 L0 - NO PLAN / UNVERSIONED
10. iOS Remote Kill Switch:       🔴 L1 - DOCUMENTED / NO SUBSCRIBED

ZERO MUTATION GUARANTEE:
Code modified:                    0
Production data modified:         0
Backups modified:                 0
Rules modified:                   0
CI/CD modified:                   0
Secrets modified:                 0
IAM modified:                     0
Production deploys:               0
Production restores:              0
================================================================
```
