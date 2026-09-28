# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — PLAN DE EVOLUCIÓN DE GOVERNANCE CENTER (PANEL ADMIN WEB)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. CLASIFICACIÓN DE CÓDIGO ACTUAL EN `governanceService.js` Y `governanceCenter.js`

| Módulo / Función | Estado Auditado | Clasificación Futura | Estrategia de Evolución |
| :--- | :--- | :--- | :--- |
| `getOrganizations` | Genera fallback `BlueSystem Holding Principal` si BD retorna 0 | `DEBE REFACTORIZARSE` | Reemplazar el fallback en memoria por provisión real en Firestore al desplegar la plataforma |
| `subscribeToBusinesses` | Inyecta `org_default_bluesystem` si el campo `orgId` es nulo | `DEBE REFACTORIZARSE` | Exigir `orgId` canónico y eliminar la inyección del String fallback hardcodeado |
| `approveMerchantApplication` | Crea atómicamente Org, Business, Branch y Application | `DEBE CONSERVARSE` | Es la implementación más cercana al estándar canónico ADR-011 |
| `deprovisionTenant` | Desactiva por `businessId` sin eliminar la Org | `DEBE REFACTORIZARSE` | Incorporar limpieza de Organizaciones huérfanas en modo `HARD_DELETE` |

---

### 2. PLAN DE EVOLUCIÓN DEL DASHBOARD DE GOBERNANZA

1. **Navegación Jerárquica Canónica (UI):**
   ```text
   Organizations / Holdings (Vista Matriz)
          │
          └── Select Organization
                     │
                     ├── Businesses / Comercios (Vista Marca)
                     │        │
                     │        └── Select Business
                     │                   │
                     │                   └── Branches / Sucursales (Puntos GPS)
                     └── Añadir Comercio
   ```
2. **Eliminación Progresiva de Fallbacks:**
   - La eliminación de los fallbacks `'org_default_bluesystem'` y `'BlueSystem Holding Principal'` se ejecutará únicamente tras completar el backfill de `orgId` en los comercios legacy de producción.
