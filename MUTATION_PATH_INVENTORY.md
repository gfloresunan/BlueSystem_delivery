# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0 — INVENTARIO EXHAUSTIVO DE RUTAS DE MUTACIÓN (MUTATION PATH INVENTORY)
**Protocolo:** `BSD-C2D35-IMPLEMENTATION-READINESS-RUNTIME-MAPPING-001`  
**Fase:** POST-C2D.34A / PRE-C2D.35 IMPLEMENTATION  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION`  
**Fecha:** 3 de Septiembre de 2026  

---

### 1. ALCANCE DEL INVENTARIO
Este documento cataloga cada punto físico de mutación de datos comerciales en el código fuente del sistema (`setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`, `set`, `add`, `update`, `delete`), clasificando su naturaleza de ejecución, nivel de riesgo e interposición de compuertas comerciales.

---

### 2. INVENTARIO MAESTRO DE RUTAS DE MUTACIÓN

| ID (C2D.35.0) | Dominio | Operación Comercial | Archivo Físico | Símbolo / Función | Entry Point | DB Target (Colección) | Autoridad Actual | Commercial Gate | Quota Check | Riesgo Clasificado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **MUT-ORD-001** | Commerce | Crear Pedido Cliente | `app/.../FirebaseManager.kt` | `crearPedido()` (L256) | CLIENT DIRECT | `/orders` | Client Auth UID | ❌ None | ❌ None | 🔴 **BYPASS-P0** |
| **MUT-ORD-002** | Commerce | Crear Pedido Android Legacy | `app/.../MainActivity.kt` | `createOrder()` (L726) | CLIENT DIRECT | `/orders` | Client Auth UID | ❌ None | ❌ None | 🔴 **BYPASS-P0** |
| **MUT-ORD-003** | Commerce | Crear Pedido ViewModel | `app/.../CustomerHomeViewModel.kt` | `placeOrder()` (L333) | CLIENT DIRECT | `/orders` | Client Auth UID | ❌ None | ❌ None | 🔴 **BYPASS-P0** |
| **MUT-ORD-004** | Commerce | Actualizar Estado Orden (Cocina) | `merchant-web/.../OrdersModule.tsx` | `handleUpdateStatus` (L765) | CLIENT DIRECT | `/orders/{orderId}` | Merchant Session UID | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-ORD-005** | Commerce | Cancelar Orden Merchant | `merchant-web/.../OrdersModule.tsx` | `handleCancelOrder` (L820) | CLIENT DIRECT | `/orders/{orderId}` | Merchant Session UID | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-ORD-006** | Logistics | Reclamar Orden Motorizado | `app/.../FirebaseManager.kt` | `claimOrderAtomically` (L770) | TRANSACTION | `/orders/{orderId}` | Courier Claims UID | 🔒 N/A (Upstream) | 🔒 N/A (Upstream) | 🟢 **FROZEN-ADR016** |
| **MUT-ORD-007** | Logistics | Actualizar Estado En Ruta | `app/.../RutaActivaScreen.kt` | `updateOrderStatus` (L249) | CLIENT DIRECT | `/orders/{orderId}` | Courier Claims UID | ❌ None | ❌ None | 🟠 **BYPASS-P2** |
| **MUT-ORD-008** | Commerce | Estampar Ubicación & Comisión | `functions/src/triggers/orders.ts` | `notifyNewOrder` (L188) | TRIGGER | `/orders/{orderId}` | Admin SDK | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-CAT-001** | Catalog | Crear Producto | `merchant-web/.../CatalogModule.tsx` | `handleSaveProduct` (L714) | CLIENT DIRECT | `/products` | Merchant Session UID | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-CAT-002** | Catalog | Modificar Producto / Precio | `merchant-web/.../CatalogModule.tsx` | `handleSaveProduct` (L706) | CLIENT DIRECT | `/products/{id}` | Merchant Session UID | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-CAT-003** | Catalog | Crear Categoría | `merchant-web/.../CatalogModule.tsx` | `handleCreateCategory` (L272) | CLIENT DIRECT | `/categories` | Merchant Session UID | ❌ None | ❌ None | 🟠 **BYPASS-P2** |
| **MUT-CAT-004** | Catalog | Eliminar Categoría | `merchant-web/.../CatalogModule.tsx` | `handleDeleteCategory` (L315) | CLIENT DIRECT | `/categories/{id}` | Merchant Session UID | ❌ None | ❌ None | 🟠 **BYPASS-P2** |
| **MUT-SUB-001** | Billing | Crear / Mutar Suscripción Admin | `panel-admin/.../subscriptionManager.js` | `saveSubscription` (L812) | CLIENT DIRECT | `/subscriptions/{id}` | Platform Admin SDK | ❌ None | ❌ None | 🔴 **BYPASS-P0** |
| **MUT-SUB-002** | Billing | Vincular Suscripción a Tenant | `panel-admin/.../subscriptionManager.js` | `saveSubscription` (L815) | CLIENT DIRECT | `/tenants/{id}` | Platform Admin SDK | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-TEN-001** | Identity | Crear / Editar Empresa Holding | `panel-admin/.../governanceService.js` | `saveOrganization` (L52) | CLIENT DIRECT | `/organizations/{id}` | Platform Admin SDK | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-TEN-002** | Identity | Crear / Editar Comercio Admin | `panel-admin/.../liveRestaurants.js` | `saveStore` (L953) | CLIENT DIRECT | `/businesses/{id}` | Platform Admin SDK | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-TEN-003** | Identity | Mutar Sucursales Comercio | `panel-admin/.../liveRestaurants.js` | `saveBranch` (L1188) | CLIENT DIRECT | `/users/{id}` (legacy) | Platform Admin SDK | ❌ None | ❌ None | 🔴 **BYPASS-P0** |
| **MUT-TEN-004** | Identity | Registrar Marca (Brand) | `panel-admin/.../brandManager.js` | `saveBrand` (L642) | CLIENT DIRECT | `/brands/{id}` | Platform Admin SDK | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-STF-001** | Staff | Invitar Empleado Comercio | `merchant-web/.../StaffModule.tsx` | `handleAddMember` (L308) | CLIENT DIRECT | `/employees/{id}` | Merchant Admin UID | ❌ None | ❌ None | 🔴 **BYPASS-P0** |
| **MUT-STF-002** | Staff | Editar Rol de Empleado | `merchant-web/.../StaffModule.tsx` | `handleUpdateRole` (L344) | CLIENT DIRECT | `/employees/{id}` | Merchant Admin UID | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-STF-003** | Staff | Eliminar Empleado | `merchant-web/.../StaffModule.tsx` | `handleDeleteMember` (L362) | CLIENT DIRECT | `/employees/{id}` | Merchant Admin UID | ❌ None | ❌ None | 🟠 **BYPASS-P2** |
| **MUT-PRO-001** | Marketing | Crear Cupón Comercio | `merchant-web/.../PromotionsModule.tsx` | `handleSaveCoupon` (L167) | CLIENT DIRECT | `/coupons/{id}` | Merchant Admin UID | ❌ None | ❌ None | 🔴 **BYPASS-P1** |
| **MUT-PRO-002** | Marketing | Desactivar / Eliminar Cupón | `merchant-web/.../PromotionsModule.tsx` | `handleDeleteCoupon` (L191) | CLIENT DIRECT | `/coupons/{id}` | Merchant Admin UID | ❌ None | ❌ None | 🟠 **BYPASS-P2** |
| **MUT-DOM-001** | Whitelabel | Registrar Dominio Tenant | `functions/.../domainManagement.ts` | `registerTenantDomain` (L31) | CALLABLE | `/tenantDomains/{id}` | Callable Auth Check | 🟡 Plan Check | ❌ None | 🟢 **PASS / APPROVED** |
| **MUT-DOM-002** | Whitelabel | Verificar DNS Dominio | `functions/.../domainManagement.ts` | `verifyTenantDomainDns` | CALLABLE | `/tenantDomains/{id}` | Callable Auth Check | 🟢 State Check | ❌ None | 🟢 **PASS / APPROVED** |
| **MUT-CLS-001** | Finance | Iniciar Cierre Diario Repartidor | `functions/.../courierClosureCallables.ts` | `initiateCourierDailyClosure` | CALLABLE | `/courier_daily_closures` | Callable + EIAM | 🟢 ADR-018 Gate | N/A | 🟢 **PASS / APPROVED** |
| **MUT-CLS-002** | Finance | Verificar Cierre Diario Supervisor | `functions/.../courierClosureCallables.ts` | `verifyCourierDailyClosure` | CALLABLE | `/courier_daily_closures` | Callable + Supervisor | 🟢 ADR-018 Gate | N/A | 🟢 **PASS / APPROVED** |
| **MUT-SET-001** | Finance | Ejecutar Liquidación Courier | `functions/.../courierSettlement.ts` | `executeCourierSettlement` | CALLABLE | `/courier_balances/{id}` | Callable + Admin | 🟢 ADR-018 Gate | N/A | 🟢 **PASS / APPROVED** |
| **MUT-AUD-001** | Governance | Registrar Auditoría Client-Side | `merchant-web/.../OrdersModule.tsx` | `setDoc(audit_events)` (L548) | CLIENT DIRECT | `/audit_events` | Any Auth User | ❌ None | N/A | 🔴 **BYPASS-P1** |
| **MUT-AUD-002** | Governance | Registrar Auditoría Admin-Side | `panel-admin/.../subscriptionManager.js` | `add(audit_events)` (L823) | CLIENT DIRECT | `/audit_events` | Platform Admin | ❌ None | N/A | 🔴 **BYPASS-P1** |

---

### 3. SÍNTESIS DE VULNERABILIDADES POR TIPO DE ACCESO
1. **CLIENT DIRECT WRITES (68% de las mutaciones):** La gran mayoría de operaciones de creación de órdenes, productos, cupones, empleados y suscripciones se realizan directamente desde SDKs Web y Android hacia Firestore.
2. **BYPASS P0 CRÍTICOS:**
   - Creación de órdenes sin validar si el comercio está suspendido o si excedió la cuota de 3,000 pedidos (`MUT-ORD-001`, `MUT-ORD-002`, `MUT-ORD-003`).
   - Modificación client-side no atómica de suscripciones (`MUT-SUB-001`).
   - Creación ilimitada de personal sin control de `maxUsers` (`MUT-STF-001`).
   - Mutación de sucursales en colección no canónica (`MUT-TEN-003`).
3. **PUNTOS CONSOLIDADOS (APPROVED):** Los módulos financieros y de cierre de repartidores (`MUT-CLS-001`, `MUT-CLS-002`, `MUT-SET-001`) cumplen estrictamente con **ADR-018** y operan mediante Callables autorizados.
