# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — PLAN DE MIGRACIÓN DE CATÁLOGO Y MODELO DE PROPIEDAD DE PRODUCTOS

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. MODELO RECOMENDADO DE PROPIEDAD DE CATÁLOGO (CATALOG OWNERSHIP MODEL)

Antes de proponer escrituras en la colección `/products`, se ha evaluado la semántica del catálogo a través de POS, Merchant Web y Delivery. Se establece formalmente el modelo recomendado:

```text
BUSINESS (Comercio Matriz)
   │  
   ├── PROPIETARIO DEL CATÁLOGO BASE
   │     ├── Definición de Productos (/products)
   │     ├── Precios Base, Descripciones e Imágenes
   │     ├── Categorías Globales / Privadas
   │     └── Variantes, Modificadores y Combos
   │
   └── BRANCH / SUCURSALES (Puntos de Venta)
         ├── Disponibilidad y Stock Realtime (In-Stock / Out-of-Stock)
         ├── Sobrescritura de Precios Específicos por Zona (Opcional)
         └── Horarios Operativos de Menú por Sucursal
```

---

### 2. PLAN DE INCORPORACIÓN DE `orgId` Y `branchId` EN `/products`

1. **Catálogo a Nivel de Comercio (`Business Level`):**
   - El documento `/products/{productId}` pertenece primariamente al `businessId`.
   - Se inyecta `orgId` resolviéndolo desde su `businessId` padre (`product.businessId -> business.orgId`).

2. **Disponibilidad por Sucursal (`Branch Inventory Overrides`):**
   - En lugar de duplicar productos por cada sucursal (lo cual provocaría un crecimiento masivo $N \times M$ e inviabilizaría el costo de lecturas en Firestore), la disponibilidad por sucursal se maneja en un mapa ligero dentro del producto o en la colección subyacente `/products/{productId}/branch_availability/{branchId}`:
     ```typescript
     interface ProductBranchAvailability {
       branchId: string;
       isAvailable: boolean;
       priceOverride?: number;
       stockQuantity?: number;
     }
     ```

3. **Migración Futura de Productos Existentes:**
   - Asignar `product.orgId = business.orgId`.
   - Mantener inmutable la estructura de categorías, opciones e imágenes.
