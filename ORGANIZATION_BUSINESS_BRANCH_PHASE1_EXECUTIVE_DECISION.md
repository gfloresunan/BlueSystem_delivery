========================================================
BLUE SYSTEM DELIVERY ENTERPRISE
PHASE 1 — CANONICAL ARCHITECTURE & MIGRATION PLANNING
========================================================

CURRENT ARCHITECTURE:
LEVEL 1 — BUSINESS MULTI-TENANT

TARGET ARCHITECTURE:
ORGANIZATION → BUSINESS → BRANCH

CURRENT STATUS:
Fase 1 de Análisis Forense de Solo Lectura completada. Se ha documentado la semántica canónica de Organization, Business y Branch, diseñado el plan de migración sin escrituras y evaluado el impacto en todos los módulos de la plataforma.

DATA MIGRATION COMPLEXITY:
MEDIUM

ANDROID IMPACT:
HIGH

OFFLINE IMPACT:
HIGH

SECURITY IMPACT:
MEDIUM

FLEET CORE IMPACT:
LOW

ACCOUNTING IMPACT:
LOW

EIAM IMPACT:
LOW

HISTORICAL DATA RISK:
LOW

ORPHAN ENTITIES:
ORGANIZATIONS: FOUND / DETECTED IN DEPROVISIONING

UNRESOLVED RELATIONSHIPS:
ORDERS WITHOUT ORG: 100% OF HISTORICAL DATA
PRODUCTS WITHOUT ORG: 100% OF HISTORICAL DATA

MIGRATION STRATEGY:
REQUIRES DECISION

SOURCE MODIFICATIONS:
0

FIRESTORE WRITES:
0

RULES MODIFICATIONS:
0

AUTH MODIFICATIONS:
0

DEPLOY:
NO

FINAL STATUS:
PHASE 1 — READ-ONLY ARCHITECTURAL PLAN COMPLETE
========================================================

---

### DESGLOSE DE DECISIÓN DE ARQUITECTURA Y HOJA DE RUTA

#### 🟢 SAFE TO IMPLEMENT (Elementos Listos para Fase 2 en Entornos Dev/Staging)
1. **Reforzamiento de Cloud Functions (`triggers/merchantApplications.ts`):**  
   El aprovisionamiento automatizado ADR-011 ya genera `orgId`, `businessId` y `branchId` atómicamente. Se puede mantener intacto.
2. **Custom Claims EIAM:**  
   El modelo de claims (`role`, `orgId`, `businessId`, `branchId`) en Auth está listo y verificado.
3. **Preservación de Fleet Core y Contabilidad:**  
   Fleet Core, trazabilidad GPS y conciliaciones financieras no se verán afectadas y pueden permanecer en su código actual.

---

#### 🟡 REQUIRES ARCHITECTURAL DECISION (Decisiones Requeridas del Usuario)
1. **Modelo de Propiedad de Catálogo (Products Ownership):**  
   Confirmar si los Productos pertenecerán a nivel `Business` con disponibilidad `Branch` (Recomendado), o si se requiere separación estricta de productos por Sucursal.
2. **Estrategia de Normalización de Fallback Org en Admin Web:**  
   Decidir si se eliminará el String fallback `'org_default_bluesystem'` reemplazándolo por una Organización por defecto creada formalmente en Firestore para comercios legacy.

---

#### 🔴 BLOCKED (Puntos Bloqueados — Prohibido Modificar en Producción sin Aprobación)
1. **Backfill de `orgId` en `/orders` de Producción:**  
   Bloqueado hasta recibir autorización explícita para ejecutar el script de actualización en lote en FASE 2.
2. **Migración de Entidades Room SQLite en Android:**  
   Bloqueado hasta implementar los nuevos campos `creatorUid` y `orgId` en la capa de datos de la APK Android.
