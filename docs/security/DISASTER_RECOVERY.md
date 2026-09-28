# Disaster Recovery (DR) & Business Continuity Plan
**BlueSystem Delivery Enterprise Platform**  
*Sprint 17.1.1 Production Readiness*

---

## 1. Métricas Objetivas RPO / RTO Certificadas

- **Recovery Point Objective (RPO):**
  - **Firestore Database:** Máximo **5 minutos** (mediante exportaciones frías diarias + Cloud Logging transaction trails).
  - **Cloud Storage (Media/Vouchers):** Máximo **24 horas** (backup diario a bucket multirregional GCS).
- **Recovery Time Objective (RTO):**
  - **Restauración Total del Sistema:** Máximo **2 horas** (con despliegue automatizado por CI/CD e importación de respaldo).

---

## 2. Estrategia de Copias de Seguridad Automatizadas

1. **Firestore Managed Scheduled Exports:**
   - Exportación diaria a las 1:00 AM ejecutada hacia el bucket seguro de backup `gs://bluesystem-backups-prod`.
2. **Backups de Reglas e Infraestructura:**
   - Todos los esquemas, `firestore.rules`, `storage.rules`, `firestore.indexes.json` e infraestructura serverless residen bajo control de versiones Git en este repositorio.

---

## 3. Protocolo de Restauración ante Desastre (DR Runbook)

En caso de corrupción masiva de datos o indisponibilidad de región primaria (`us-central1`):

1. **Invocación de Restauración de Firestore:**
   ```bash
   gcloud firestore import gs://bluesystem-backups-prod/2026-08-07T01:00:00/ --project=bluesystem-7c9af
   ```
2. **Redirección de Tráfico y Despliegue CI/CD:**
   - Iniciar ejecución manual del workflow de GitHub Actions `.github/workflows/backend-ci-cd.yml` apuntando a la región o proyecto secundario de recuperación.
