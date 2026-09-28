# 🔐 BLUE SYSTEM DELIVERY ENTERPRISE
# MER 18.3 — MERCHANT MODULE GAP REMEDIATION & FULL E2E HARDENING
## MANIFIESTO DE ARCHIVOS MODIFICADOS (FILE CHANGE MANIFEST)

**Fecha:** 14 de Septiembre de 2026  
**Sistema:** BlueSystem Delivery Enterprise v2.3  
**Módulo:** Merchant / Comercio (Móvil Android)  

---

## 1. RESUMEN DE MODIFICACIONES

Todos los cambios fueron realizados de forma estrictamente quirúrgica y aislada, cumpliendo con la **Regla de Ingeniería: Cambios Mínimos y Aislados**. Ningún archivo perteneciente al Frozen Core (Control Tower, Liquidaciones Merchant, Arqueo Courier, Repartidor Core, X→Y Location) fue alterado.

Total de archivos modificados: **12 archivos** (todos en el directorio `app/src/main/java/`).

---

## 2. LISTADO DETALLADO DE ARCHIVOS MODIFICADOS

### 1. `app/src/main/java/com/example/presentation/customer/profile/OrderHistoryModels.kt`
- **GAP Asociado:** GAP-006 (P0)
- **Modificación:** Se añadió el campo `val selectedOptions: List<SelectedOption> = emptyList()` al modelo de dominio `OrderItem` para soportar la retención y persistencia de extras y modificadores en el historial de pedidos.

### 2. `app/src/main/java/com/example/Models.kt`
- **GAP Asociado:** GAP-006 (P0)
- **Modificación:** En la función de deserialización canónica `parseOrderItems()`, se implementó la extracción segura del mapa `selectedOptions` presente en el documento de Firestore `/orders/{id}`, mapeándolo a objetos `SelectedOption(groupId, groupName, optionId, optionName, priceDelta)`.

### 3. `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`
- **GAP Asociado:** GAP-006 (P0)
- **Modificación:** En el cálculo de subtotales del carrito y creación de pedidos, se actualizó la fórmula para sumar `unitPriceWithExtras * quantity`, y se añadió la serialización del listado `selectedOptions` dentro de cada elemento de `items` enviado a Firestore.

### 4. `app/src/main/java/com/example/ComercioDetalleScreen.kt`
- **GAP Asociados:** GAP-009 (P0), GAP-005 (P0)
- **Modificación:**
  - Se implementó un BottomSheet/Modal interactivo de carrito dentro de la pantalla, evitando el cierre errático con `popBackStack()`, permitiendo ajustar cantidades, vaciar carrito y navegar al checkout.
  - Se añadió la pestaña "COMBOS" en el tab de categorías y la sección "Combos y Paquetes Especiales 🎁" con botón interactivo de adición al carrito.

### 5. `app/src/main/java/com/example/CustomerHomeScreen.kt`
- **GAP Asociado:** GAP-009 (P0)
- **Modificación:** Se agregó un `LaunchedEffect(navController.currentBackStackEntry)` que escucha el parámetro `"open_checkout"` proveniente del detalle del comercio para abrir inmediatamente el diálogo de checkout del carrito en el paso correspondiente.

### 6. `app/src/main/java/com/example/ComercioDetalleViewModel.kt`
- **GAP Asociado:** GAP-005 (P0)
- **Modificación:** Se añadió la lista reactiva `combos: List<Combo> = emptyList()` en `ComercioUiState` y se suscribió al flujo en tiempo real de `comboRepository.getCombosFlow(businessId)`.

### 7. `app/src/main/java/com/example/presentation/business/dashboard/MerchantDashboardViewModel.kt`
- **GAP Asociado:** GAP-010 (P0)
- **Modificación:** Se refactorizó la función `toggleStoreStatus()` para utilizar un `WriteBatch` atómico de Firestore que actualiza sincronizadamente `/businesses/{id}` (`isOpen`) y `/restaurant_settings/{id}` (`abierto`, `isOpenOverride`), con actualización optimista de UI y reversión segura en caso de fallo de red.

### 8. `app/src/main/java/com/example/presentation/business/commerce/ProductWorkspaceScreen.kt`
- **GAP Asociado:** GAP-003 (P1)
- **Modificación:** Se eliminó el botón simulado "Publicar" con `delay(400)` y el badge de cambios pendientes falsos; se eliminaron los ítems vacíos de menú "Snapshots" y "Rollback"; se conectó `CategoriesBottomSheet` a `CategoryRepository.addCategory()`.

### 9. `app/src/main/java/com/example/presentation/business/BusinessDashboardScreen.kt`
- **GAP Asociados:** GAP-001 (P1), GAP-002 (P1), GAP-008 (P1)
- **Modificación:**
  - Se agregaron las constantes `PROMOTIONS`, `KDS` y `STAFF` al enum `BusinessTab`.
  - Se añadieron las rutas a `PromotionsManagementView`, `KitchenDashboardScreen` y `MerchantStaffCenterScreen`.
  - Se integraron los ítems "Promociones 🏷️", "Cocina KDS 🍳" y "Personal y Empleados 👥" en el `MerchantNavigationDrawerContent`.

### 10. `app/src/main/java/com/example/presentation/kitchen/KitchenDashboardScreen.kt`
- **GAP Asociado:** GAP-002 (P1)
- **Modificación:** Se removieron los pedidos de ejemplo hardcodeados (`sampleOrder1`, `sampleOrder2`), se conectó un `addSnapshotListener` de Firestore sobre `/orders` filtrado por `businessId`, se clasificaron los pedidos según estados operacionales y estaciones de cocina, y se conectaron los botones de transición de estado ("Iniciar", "Finalizar") a actualizaciones atómicas de Firestore.

### 11. `app/src/main/java/com/example/eiam/presentation/merchant/MerchantStaffViewModel.kt` y `MerchantStaffCenterScreen.kt`
- **GAP Asociado:** GAP-008 (P1)
- **Modificación:** Se reemplazó el mock estático `usr_staff_1` por un listener en tiempo real sobre `/employees` e integración con `/invitations`, se construyó una interfaz Compose con TopAppBar, lista de miembros con badges de roles EIAM (`Gerente`, `Supervisor`, `Cajero`, `Cocinero`), diálogo modal para registrar colaboradores y confirmación de revocación.

### 12. `app/src/main/java/com/example/presentation/business/orders/MerchantOperationsCenterScreen.kt`
- **GAP Asociado:** GAP-004 (P2)
- **Modificación:** Se reemplazaron las lambdas vacías `onClick = {}` de "Llamar" y "WhatsApp" en el detalle del pedido por llamadas reales a Android Intents (`Intent.ACTION_DIAL` con URI `tel:` y `Intent.ACTION_VIEW` con `https://api.whatsapp.com/send?phone=...`).

### 13. `app/src/main/java/com/example/domain/engine/finance/FinancialReportGenerator.kt` y `MerchantFinanceCenterScreen.kt`
- **GAP Asociado:** GAP-007 (P2)
- **Modificación:** Se implementó la generación de documentos PDF vectoriales nativos mediante `android.graphics.pdf.PdfDocument` y exportación de tablas en formato CSV (con UTF-8 BOM), compartibles mediante `FileProvider` (`${applicationId}.fileprovider`) a través del menú nativo de Android Sharesheet, e invocable desde el botón "Exportar" en el TopBar de Finanzas.

---

## 3. CHECKSUM DE COMPILACIÓN
- **Estado de Build:** `BUILD SUCCESSFUL`
- **Target:** `:app:compileCoreDebugKotlin`
- **Lints / Errores Críticos:** 0
