# 🔐 BLUE SYSTEM DELIVERY ENTERPRISE
# MER 18.3 — MERCHANT MODULE GAP REMEDIATION & FULL E2E HARDENING
## INFORME DE IMPACTO Y GOBERNANZA EN FIRESTORE (FIRESTORE IMPACT REPORT)

**Fecha:** 14 de Septiembre de 2026  
**Sistema:** BlueSystem Delivery Enterprise v2.3  
**Gobernanza:** ADR-003-PERFORMANCE-COST-SCALABILITY.md  
**Resultado de Auditoría:** 🟢 **COMPLIANT — SIN CONSULTAS N+1 NI UNBOUNDED LISTENERS**

---

## 1. EVALUACIÓN DE COLECCIONES IMPACTADAS

Las remediaciones realizadas en MER 18.3 interactúan exclusivamente con las siguientes colecciones canónicas:

| Colección | Operación | Tipo | Justificación / GAP Asociado | Medida de Protección de Rendimiento |
|---|---|---|---|---|
| `/orders` | Lectura / Listener | `addSnapshotListener` | GAP-002 (KDS Cocina) | Filtrado obligatorio por `businessId == restaurantId`. Efímero por ciclo de vida Composable. |
| `/orders` | Escritura | `update()` | GAP-002 (KDS Cocina) | Transición atómica de estados `preparing` y `ready`. |
| `/orders` | Escritura | `add()` / `set()` | GAP-006 (Extras en Pedidos) | Serialización estructurada de `selectedOptions`. Cero escrituras extras (mismo documento de pedido). |
| `/combos` | Lectura | `getCombosFlow()` | GAP-005 (Combos en Detalle) | Acotado por `businessId == currentBusinessId`. Caché local habilitada. |
| `/businesses/{id}` | Escritura | `WriteBatch.update()` | GAP-010 (Apertura / Cierre) | Mutación atómica única de `isOpen` y `updatedAt`. |
| `/restaurant_settings/{id}` | Escritura | `WriteBatch.update()` | GAP-010 (Apertura / Cierre) | Mutación atómica única de `abierto` y `isOpenOverride`. |
| `/categories` | Escritura | `addCategory()` | GAP-003 (Gestión de Categorías) | Escritura bajo demanda (solo cuando el comercio crea una categoría nueva). |
| `/employees` | Lectura / Listener | `addSnapshotListener` | GAP-008 (Staff Center) | Filtrado por `businessId`. Cancelación del listener en `onCleared()`. |
| `/employees` | Escritura | `set()` / `delete()` | GAP-008 (Staff Center) | Escrituras individuales bajo demanda al registrar o revocar colaboradores. |
| `/invitations` | Escritura | `set()` | GAP-008 (Staff Center) | Generación de token de invitación con TTL de 48 horas. |

---

## 2. CUMPLIMIENTO DE DIRECTIVAS ADR-003

1. **Cero Consultas $N+1$:**  
   Ninguna operación iterativa ejecuta consultas a Firestore dentro de bucles `for` o `forEach`. Los datos de productos, combos y órdenes se obtienen de forma agregada o mediante listeners acotados a nivel de colección con filtro por tenant.

2. **Gestión de Ciclo de Vida de Listeners:**  
   Los listeners añadidos en `KitchenDashboardScreen` y `MerchantStaffViewModel` están debidamente enlazados a `DisposableEffect` y `onCleared()` de Android ViewModel, asegurando que se desuscriban automáticamente al salir de la vista para no incurrir en fugas de memoria ni lecturas fantasma.

3. **Presupuesto de Lecturas por Sesión:**  
   - KDS: 1 lectura por comanda activa en curso.
   - Staff: 1 lectura agregada del listado de empleados por apertura de vista.
   - Combos: 1 lectura por carga de detalle de tienda.

---

## 3. VEREDICTO DE GOBERNANZA DE BASE DE DATOS
La implementación respeta estrictamente los principios de ADR-003, optimizando los costos de infraestructura y garantizando una escalabilidad predecible para comercios de alto volumen.
