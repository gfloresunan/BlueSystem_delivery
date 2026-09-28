# 06 — COURIER APP SCREEN-BY-SCREEN INVENTORY

**Platform:** Android Native (Courier Module)  
**Role Required:** `COURIER` / `MOTORIZADO`  
**Audit Protocol:** BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001

---

## Screen Inventory Summary Table

| Screen ID | Screen / Composable Name | File Path | Primary Purpose |
|---|---|---|---|
| **COU-SCR-001** | `CourierDashboardScreen` | `app/.../courier/CourierDashboardScreen.kt` | Main hub, online toggle, earnings summary, quick tabs. |
| **COU-SCR-002** | `FleetPoolScreen` | `app/.../courier/FleetPoolScreen.kt` | Available unassigned orders/trips ready to be claimed. |
| **COU-SCR-003** | `MyAssignedOrdersScreen` | `app/.../courier/MyAssignedOrdersScreen.kt` | Orders currently assigned to this courier in progress. |
| **COU-SCR-004** | `ActiveDeliveryMapScreen` | `app/.../courier/ActiveDeliveryMapScreen.kt` | Turn-by-turn map, route polyline, customer/store contact. |
| **COU-SCR-005** | `PickupConfirmationDialog` | `app/.../courier/PickupConfirmationDialog.kt` | Verification of package items at restaurant or origin X. |
| **COU-SCR-006** | `DeliveryCompletionDialog` | `app/.../courier/DeliveryCompletionDialog.kt` | PIN confirmation, customer signature, cash settlement input. |
| **COU-SCR-007** | `CourierProfileScreen` | `app/.../courier/CourierProfileScreen.kt` | Vehicle details, plate, documents, rating, shift status. |
| **COU-SCR-008** | `CourierEarningsScreen` | `app/.../courier/CourierEarningsScreen.kt` | Daily/weekly earnings breakdown, tips, completed trips. |
| **COU-SCR-009** | `RejectOrderReasonDialog` | `app/.../courier/RejectOrderReasonDialog.kt` | Rejection reason selection (Vehicle failure, distance, etc.). |

---

## Detailed Radiography: Screen by Screen

### COU-SCR-001 — CourierDashboardScreen

- **Plataforma:** Android Native (Courier)
- **Rol:** `COURIER`
- **Ruta:** `courier/dashboard`
- **Punto de entrada:** Inicio de sesión como repartidor.
- **Objetivo:** Panel principal de control operativo. Permite al repartidor ponerse en línea (conectar GPS), ver su estado actual, órdenes en curso y resumen de ganancias del día.
- **Qué ve el usuario:**
  - Switch prominente: "ESTADO: EN LÍNEA / DESCONECTADO" con indicador de color (Verde/Gris).
  - Tarjeta de Resumen Diario: Pedidos completados hoy, Ganancias acumuladas ($), Calificación promedio (⭐).
  - Pestañas principales de navegación:
    1. **"Disponibles en Flota" (Fleet Pool):** Muestra contador badge de pedidos listos para tomar.
    2. **"Mis Pedidos" (Activos):** Muestra órdenes asignadas en proceso.
  - Tarjeta de alerta de conectividad y GPS.
- **Acciones disponibles:**
  - Conectar / Desconectar switch de turno (inicia/detiene `LocationTrackingService`).
  - Navegar a Fleet Pool (`COU-SCR-002`).
  - Navegar a Mis Pedidos (`COU-SCR-003`).
  - Ver perfil y vehículo (`COU-SCR-007`).
- **Estados:** `Offline`, `Online_Idle`, `Online_ActiveRoute`.
- **Datos consumidos:** `/couriers/{uid}`, `/ubicaciones_repartidores/{uid}`, resumen diario.
- **Firestore:** Lectura y escritura en `/couriers/{uid}` (`isOnline = true/false`).
- **Estado:** 🟢 `REAL / ACTIVE`

---

### COU-SCR-002 — FleetPoolScreen

- **Plataforma:** Android Native (Courier)
- **Rol:** `COURIER`
- **Ruta:** `courier/fleet_pool`
- **Punto de entrada:** Pestaña "Disponibles" en Dashboard.
- **Objetivo:** Explorar y reclamar pedidos de restaurantes o envíos X→Y que están listos (`READY`) y no tienen repartidor asignado.
- **Qué ve el usuario:**
  - Lista de tarjetas de pedidos disponibles en un radio configurable (ej. 10 km).
  - Cada tarjeta muestra: Tipo (Comercio o Envío X→Y), Nombre del Restaurante / Origen, Dirección de destino, Distancia estimada (km), Ganancia estimada para el repartidor ($), Tiempo transcurrido desde que se marcó `READY`.
  - Botón verde prominente: **"TOMAR PEDIDO"**.
- **Acciones disponibles:**
  - Tocar "TOMAR PEDIDO": Ejecuta `claimOrderAtomically` o `claimTripAtomically`.
  - Pull to refresh para forzar recarga de pool.
- **Estados:** `Loading`, `HasOrders`, `EmptyPool` ("No hay pedidos disponibles cerca"), `ClaimingTransaction`.
- **Datos consumidos:** `/orders` (donde `status == "READY"` y `assignedCourierId == null`), `/deliveryTrips` (donde `status == "READY"`).
- **Datos modificados:** Transacción atómica sobre el pedido seleccionado.
- **Estado:** 🟢 `REAL / ACTIVE`
