# 08 — MERCHANT WEB SCREEN-BY-SCREEN INVENTORY

**Platform:** Merchant Web (React 18 / TS)  
**Audit Protocol:** BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001

---

## Screen & Modal Inventory Summary Table

| Screen ID | Component / View Name | File Path | Primary Purpose |
|---|---|---|---|
| **MER-SCR-001** | `MerchantDashboardView` | `merchant-web/src/views/DashboardView.tsx` | Operational KPI summary, sales today, active orders counter. |
| **MER-SCR-002** | `LiveOrdersKanbanView` | `merchant-web/src/views/LiveOrdersView.tsx` | 4-column live order board with real-time status management. |
| **MER-SCR-003** | `OrderDetailModal` | `merchant-web/src/components/OrderDetailModal.tsx` | Full item breakdown, customer details, print ticket, courier assign. |
| **MER-SCR-004** | `ProductCatalogView` | `merchant-web/src/views/ProductCatalogView.tsx` | Searchable product catalog, stock toggle, category filters. |
| **MER-SCR-005** | `ProductWizardModal` | `merchant-web/src/components/ProductWizard.tsx` | Product creation/edit modal with variants and image upload. |
| **MER-SCR-006** | `ControlTowerView` | `merchant-web/src/views/ControlTowerView.tsx` | Embedded CartoDB Voyager map showing active merchant couriers. |
| **MER-SCR-007** | `RestaurantSettingsView` | `merchant-web/src/views/SettingsView.tsx` | Operating hours, delivery radius, prep times, printer config. |
| **MER-SCR-008** | `MerchantFinanceView` | `merchant-web/src/views/FinanceView.tsx` | Cash register closures, platform commission breakdown, ledger. |
| **MER-SCR-009** | `CourierAssignModal` | `merchant-web/src/components/CourierAssignModal.tsx` | Manual driver assignment vs broadcast to Fleet Pool. |

---

## Detailed Radiography: Screen by Screen

### MER-SCR-002 — LiveOrdersKanbanView

- **Plataforma:** Merchant Web (React)
- **Rol:** `MERCHANT_ADMIN`, `BRANCH_STAFF`
- **Ruta:** `/orders` / `/kanban`
- **Punto de entrada:** Menú lateral "Centro Operativo / Pedidos".
- **Objetivo:** Gestión visual e inmediata del ciclo de vida de los pedidos del restaurante.
- **Qué ve el usuario:**
  - 4 Columnas Kanban en tiempo real:
    1. **Nuevos / Pendientes (`PENDING`):** Tarjetas con fondo parpadeante/alerta sonora. Botones "Aceptar" y "Rechazar".
    2. **En Preparación (`PREPARING`):** Tiempo transcurrido de cocina. Botón "Marcar Listo (`READY`)".
    3. **Listos para Despacho (`READY`):** Muestra estado del repartidor (Buscando repartidor / Asignado / En camino al local).
    4. **En Ruta (`IN_TRANSIT`):** Seguimiento en vivo hacia el cliente.
- **Acciones disponibles:**
  - Aceptar pedido (pasa a `PREPARING`).
  - Marcar como listo (pasa a `READY` y dispara broadcast a flota).
  - Abrir modal de detalle (`MER-SCR-003`).
  - Imprimir comanda de cocina (ESC/POS o impresión nativa).
- **Firestore:** Listener en tiempo real (`onSnapshot`) sobre `/orders` filtrado por `businessId == activeBusinessId`.
- **Estado:** 🟢 `REAL / ACTIVE`
