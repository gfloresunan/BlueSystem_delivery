# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — ARQUITECTURA CANÓNICA DE JERARQUÍA (ORGANIZATION → BUSINESS → BRANCH)

**PROYECTO:** BlueSystem Delivery Enterprise  
**FIREBASE PROJECT:** bluesystem-7c9af  
**FECHA:** 2026-08-17  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION / ZERO DEPLOY  

---

### 1. DEFINICIÓN SEMÁNTICA CANÓNICA DE ENTIDADES

#### 1.1 Organization (Holding / Tenant Raíz Enterprise)
- **Definición Canónica:** Representa el Grupo Empresarial, Holding o Franquicia matriz. Es el Tenant Raíz de Gobernanza y consolidación contable/financiera.
- **Colección Firestore:** `/organizations/{orgId}`
- **Esquema Canónico:**
  ```typescript
  interface CanonicalOrganization {
    orgId: string;                 // Primary Key (UUID v4)
    name: string;                  // Nombre comercial del Holding
    legalName?: string;            // Razón Social
    ruc?: string;                  // Identificación fiscal / RUC / NIF
    ownerUid: string;              // UID del Propietario del Holding
    adminUids: string[];           // UIDs de Administradores del Holding
    businessIds: string[];         // Referencia a Comercios Hijos
    status: "ACTIVE" | "SUSPENDED" | "DEPROVISIONED";
    plan: "Enterprise" | "Standard";
    config: {
      currency: string;
      timezone: string;
      allowCrossBusinessDelivery: boolean;
    };
    createdAt: number | Timestamp;
    updatedAt: number | Timestamp;
  }
  ```
- **Relaciones & Custom Claims:** Mapea directamente al Custom Claim `orgId` en el token JWT del usuario.

#### 1.2 Business (Comercio / Empresa Operativa)
- **Definición Canónica:** Representa la marca comercial u operación gastronómica/comercial individual. Mantiene el catálogo principal, configuración de marca y parámetros operativos.
- **Colección Firestore:** `/businesses/{businessId}`
- **Esquema Canónico:**
  ```typescript
  interface CanonicalBusiness {
    businessId: string;            // Primary Key (UUID v4)
    orgId: string;                 // Foreign Key -> /organizations/{orgId} (MANDATORIO)
    ownerUid: string;              // UID del Propietario del Comercio
    name: string;                  // Nombre Fantasía / Comercial
    legalName?: string;            // Razón Social
    ruc?: string;                  // Identificador Fiscal
    category: string;              // Categoria comercial (Restaurante, Farmacia, etc.)
    branchIds: string[];           // Referencia a Sucursales Hijas
    status: "ACTIVE" | "DISABLED" | "DELETED";
    lifecycleStatus: "ONBOARDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED" | "DEPROVISIONED";
    applicationId?: string;       // Referencia a /merchant_applications/{appId}
    createdAt: number | Timestamp;
    updatedAt: number | Timestamp;
  }
  ```

#### 1.3 Branch (Sucursal Física / Operativa / Punto GPS)
- **Definición Canónica:** Representa el punto de venta físico, cocina oculta (dark kitchen) o sucursal geográfica. Es la entidad responsable del despacho de pedidos y gestión de inventario real.
- **Colección Firestore:** `/branches/{branchId}`
- **Esquema Canónico:**
  ```typescript
  interface CanonicalBranch {
    branchId: string;              // Primary Key (UUID v4)
    businessId: string;            // Foreign Key -> /businesses/{businessId} (MANDATORIO)
    orgId: string;                 // Foreign Key -> /organizations/{orgId} (MANDATORIO)
    name: string;                  // Nombre de la sucursal (ej: "Sucursal Central", "Paso del Cobobo")
    address: string;               // Dirección física
    city: string;                  // Ciudad
    zone?: string;                 // Zona / Barrio
    location: GeoPoint;            // Coordenadas GPS (lat, lng)
    phone: string;                 // Teléfono operativo
    isPrimary: boolean;            // Indicador de sucursal principal por defecto
    status: "OPERATIONAL" | "CLOSED" | "MAINTENANCE" | "DISABLED";
    isActive: boolean;             // Flag operacional
    employeeIds: string[];         // Lista de empleados asignados
    createdAt: number | Timestamp;
    updatedAt: number | Timestamp;
  }
  ```

---

### 2. REGLAS DE ASIGNACIÓN Y OPERACIÓN SIN SUCURSAL

1. **¿Puede existir una Branch sin Business?**  
   🔴 **PROHIBIDO**. Toda sucursal debe pertenecer obligatoriamente a un `businessId` válido.
2. **¿Un Business puede tener N Branches?**  
   ✅ **SÍ**. Relación 1:N (`business.branchIds: []`).
3. **¿Existe una Branch principal por defecto?**  
   ✅ **SÍ**. Al aprovisionar un comercio se crea la sucursal inicial con `isPrimary: true`.
4. **Operación Sin Sucursal (Single-Location / Legacy):**  
   En comercios de sucursal única, la aplicación mapea transparentemente la `Branch` principal. Si en compras cliente no se selecciona sucursal, se marca `BRANCH_UNRESOLVED` en pedidos históricos, conservando intacta la trazabilidad.
