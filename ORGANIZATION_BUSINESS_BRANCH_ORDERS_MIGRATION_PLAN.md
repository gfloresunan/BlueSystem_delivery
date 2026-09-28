# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — PLAN MIGRATORIO DE PEDIDOS (ORDERS MIGRATION PLAN)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. ESTADO ACTUAL DE LA COLECCIÓN `/orders`
- **Totalidad de Documentos:** 100% de los documentos históricos carecen de `orgId`.
- **Estructura Actual:** Contienen `businessId` (obligatorio), `customerId` (obligatorio), `total`, `items`, `status`, y `branchId` (opcional).

---

### 2. ESTRATEGIA DE RESOLUCIÓN DE CAMPOS PARA ORDERS

```text
ORDER {orderId}
  ├── businessId (Existente) ───► Consultar /businesses/{businessId}
  │                                    └── Extraer orgId
  │                                           └── Asignar ORDER.orgId = business.orgId
  │
  └── branchId
        ├── Si existe en Order ──► Validar /branches/{branchId}
        │                               └── Si es coherente: Conservar ORDER.branchId
        │
        └── Si NO existe en Order ──► PROHIBIDO inventar sucursal por defecto
                                             └── Marcar: ORDER.branchStatus = "BRANCH_UNRESOLVED"
```

---

### 3. PROCESO DE MIGRACIÓN PROPUESTO (SOLO LECTURA / PLANING)

1. **Fase 1 — Dry-Run Scan (Sin Escrituras):**
   - Recorrer la colección `/orders` mediante paginación (`limit(500)`).
   - Construir una tabla en memoria: `orderId` -> `resolvedOrgId` -> `branchResolution`.
   - Identificar pedidos cuyo `businessId` no exista en `/businesses` (Órdenes huérfanas) y marcarlos como `UNRESOLVED_HIERARCHY`.

2. **Fase 2 — Provisión de Escritura Atómica en Lotes (Futura ejecución tras aprobación):**
   - Ejecutar actualizaciones atómicas en batches de 500 documentos añadiendo exclusivamente:
     ```javascript
     {
       orgId: resolvedOrgId,
       branchStatus: branchId ? "RESOLVED" : "BRANCH_UNRESOLVED",
       hierarchyMigratedAt: admin.firestore.FieldValue.serverTimestamp()
     }
     ```
   - **Garantía Absoluta:** Ningún campo contable (`subtotal`, `total`, `deliveryFee`, `commission`), cliente (`customerId`), ni estado operativo (`status`) será alterado.
