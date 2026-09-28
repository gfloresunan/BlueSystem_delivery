# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — EVALUACIÓN DE IMPACTO EN EIAM & MATRIZ DE CUSTOM CLAIMS JWT

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. EVALUACIÓN DE COMPATIBILIDAD CON EIAM v2.1 & v2.2

La arquitectura EIAM ya contempla formalmente los campos de Custom Claims JWT:
- `role`: Rol canónico de autorización.
- `orgId`: Identificador del Tenant / Holding matriz.
- `businessId`: Identificador del Comercio.
- `branchId`: Identificador de la Sucursal asignada.

---

### 2. MATRIZ DEFINITIVA DE PERMISOS Y SCOPES POR ACTOR

| Rol EIAM (`role`) | Scope Org (`orgId`) | Scope Business (`businessId`) | Scope Branch (`branchId`) | Permisos de Sistema |
| :--- | :--- | :--- | :--- | :--- |
| `PLATFORM_ADMIN` | Global (`null`) | Global (`null`) | Global (`null`) | Control total del sistema y Governance Center |
| `ORGANIZATION_ADMIN`| Asignado | Multi-Business | Multi-Branch | Gestión consolidada del Holding y reportes corporativos |
| `BUSINESS_OWNER` | Asignado | Asignado | Multi-Branch | Gestión completa de la marca, finanzas y menú |
| `BUSINESS_MANAGER` | Asignado | Asignado | Multi-Branch | Operación diaria, KDS, catálogo y promociones |
| `BRANCH_MANAGER` | Asignado | Asignado | Asignado | Operación del punto de venta y cierre de caja de la sucursal |
| `BRANCH_STAFF` | Asignado | Asignado | Asignado | Preparación en cocina y marcaje de despacho en KDS |
| `COURIER` | N/A | N/A | N/A | Recepción y entrega de pedidos asignados |
| `CUSTOMER` | N/A | N/A | N/A | Exploración de catálogo y creación de pedidos propios |
