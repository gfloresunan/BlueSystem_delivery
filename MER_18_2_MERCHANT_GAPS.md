# MER 18.2 — Catálogo Oficial de Brechas Técnicas (Merchant Gaps Registry)
**Auditoría Física E2E Integral — Módulo Comercio BlueSystem Delivery Enterprise**  
*Fecha: 14 de Septiembre de 2026*  
*Auditor: Senior Developer & Auditor Forense de BlueSystem*  
*Destino: Backlog Obligatorio de Corrección para MER 18.3*

---

## Índice de Brechas Detectadas (GAPs)

| ID | Pantalla / Módulo | Nivel de Severidad | Categoría | Resumen del Defecto |
|---|---|:---:|:---:|---|
| `GAP-001` | Promociones (`PromotionsManagementView`) | 🔴 ALTA | Huérfano / Desconectado | Módulo de promociones existe en código pero es inaccesible desde la UI de la APK. |
| `GAP-002` | KDS (`KitchenDashboardScreen`) | 🔴 ALTA | Mock / Redirección Engañosa | Tablero KDS usa datos estáticos en memoria; botón en Dashboard redirige a Pedidos. |
| `GAP-003` | Catálogo (`ProductWorkspaceScreen`) | 🔴 ALTA | Simulación Mock | Botón "Publicar" ejecuta `delay(400)` sin escribir en Firestore ni servidor. |
| `GAP-004` | Acciones Rápidas y Catálogo | 🟡 MEDIA | Callbacks Vacíos `{}` | Botones de llamada, WhatsApp, snapshots y crear categoría tienen `onClick = {}`. |
| `GAP-005` | Combos (`MenuComboRepositoryImpl`) | 🟠 MEDIA | Falta de Consumo Cliente | Combos se guardan en `/combos` pero la App Cliente no los escucha ni muestra. |
| `GAP-006` | Carrito y Pedidos (`CustomerHomeViewModel`) | 🔴 ALTA | Pérdida de Datos en Checkout | Opciones y extras seleccionados no se empaquetan en los items de la orden en `/orders`. |
| `GAP-007` | Finanzas (`FinancialReportGenerator`) | 🟡 MEDIA | Mock de Exportación | Exportación de reporte solo compone un String sin generar PDF o Excel descargable. |
| `GAP-008` | Personal (`MerchantStaffCenterScreen`) | 🔴 ALTA | Desconectado / Mock | Pantalla de staff es de solo lectura y no tiene ruta de navegación en el comercio. |
| `GAP-009` | Detalle Comercio (`ComercioDetalleScreen`) | 🔴 ALTA | Navegación Rota en Checkout | Botón "Ver Mi Carrito 🛒" hace `popBackStack()` en lugar de abrir Checkout. |
| `GAP-010` | Dashboard y Configuración | 🟡 MEDIA | Dualidad SSOT / Split-Brain | Toggle rápido de apertura escribe en `/businesses`, dejando `/restaurant_settings` desfasado. |

---

## Fichas Técnicas de Detalle Forense

---

### GAP-001: Módulo de Promociones Desconectado de la Navegación en APK
- **Pantalla / Componente**: `BusinessDashboardScreen.kt` / `PromotionsManagementView`
- **Botón / Elemento**: Ausencia de ítem en `NavigationBar` o Drawer.
- **Acción Esperada**: El comercio debe poder acceder a una pestaña o subsección "Promociones" para configurar descuentos, cupones y ofertas que incentiven sus ventas.
- **Acción Real**: La vista `PromotionsManagementView` y su ViewModel `PromotionViewModel` existen en el código fuente, pero ningún componente de navegación en `BusinessDashboardScreen.kt` los invoca ni los enlaza.
- **Descripción Técnica**: La enumeración `BusinessTab` solo incluye `DASHBOARD`, `ORDERS`, `MENU`, `FINANCE`, `MORE`. No hay ninguna ruta que renderice `PromotionsManagementView`.
- **Impacto Operativo**: Los comercios no pueden autogestionar ofertas desde su dispositivo móvil; dependen exclusivamente de la plataforma web o de soporte técnico.
- **Evidencia Forense**:
  - `app/src/main/java/com/example/bluesystem_delivery/presentation/business/BusinessDashboardScreen.kt` (Líneas 787-840).
- **Corrección Recomendada (MER 18.3)**:
  - Añadir un acceso directo en `RestaurantSettingsCenterScreen` ("Promociones y Descuentos") o integrar una sub-pestaña en el centro de Catálogo que navegue formalmente a `PromotionsManagementView`.

---

### GAP-002: KDS con Datos Hardcodeados y Redirección Engañosa en Dashboard
- **Pantalla / Componente**: `KitchenDashboardScreen.kt` y `BusinessDashboardScreen.kt`
- **Botón / Elemento**: Botón "Abrir KDS" en el Header del Dashboard.
- **Acción Esperada**: Abrir la pantalla de Kitchen Display System (`KitchenDashboardScreen`) mostrando los pedidos en tiempo real clasificados por estaciones de cocina.
- **Acción Real**:
  1. Al presionar "Abrir KDS" en el Dashboard, ejecuta `currentTab = BusinessTab.ORDERS`, enviando al usuario al centro de órdenes estándar.
  2. Si se navega directamente a `KitchenDashboardScreen`, la pantalla renderiza datos estáticos en memoria con órdenes simuladas (`"ORD-101"`, `"ORD-102"`, `"rest_demo"`).
- **Descripción Técnica**: `KitchenDashboardScreen.kt` carece de un ViewModel conectado a Firestore. Utiliza listas mutables locales `remember { mutableStateListOf(...) }`.
- **Impacto Operativo**: El personal de cocina no dispone de una pantalla operativa real para controlar el flujo de producción gastronómica en tablet o móvil.
- **Evidencia Forense**:
  - `BusinessDashboardScreen.kt` (Línea 350): `onClick = { currentTab = BusinessTab.ORDERS }`.
  - `KitchenDashboardScreen.kt` (Líneas 45-85): Órdenes hardcodeadas con IDs ficticios.
- **Corrección Recomendada (MER 18.3)**:
  - Crear `KitchenDashboardViewModel` con un snapshot listener sobre `/orders` filtrando por `businessId == currentId` y estados `ACCEPTED`, `PREPARING`, `READY`.
  - Conectar el botón "Abrir KDS" para que lance `KitchenDashboardScreen` en modo fullscreen/apaisado.

---

### GAP-003: Botón "Publicar" Falso en Workspace de Catálogo
- **Pantalla / Componente**: `ProductWorkspaceScreen.kt`
- **Botón / Elemento**: Botón "Publicar" en la barra superior del Workspace.
- **Acción Esperada**: Invalidar la caché de menú o actualizar la versión de catálogo (`menuVersion`) en Firestore para forzar a las apps de clientes a descargar la nueva versión del menú (ADR-003).
- **Acción Real**: Ejecuta una corrutina con un retardo simulado de 400 ms, pone el contador de cambios pendientes en cero y muestra un SnackBar de éxito sin escribir en Firestore.
- **Descripción Técnica**:
  ```kotlin
  // ProductWorkspaceScreen.kt L:142-152
  scope.launch {
      isPublishing = true
      delay(400)
      pendingChangesCount = 0
      isPublishing = false
      snackbarHostState.showSnackbar("Menú publicado con éxito")
  }
  ```
- **Impacto Operativo**: Falsa sensación de seguridad en el comerciante. Si editó productos sin guardarlos individualmente, los cambios se pierden.
- **Evidencia Forense**: `ProductWorkspaceScreen.kt` (Líneas 140-155).
- **Corrección Recomendada (MER 18.3)**:
  - Eliminar el `delay(400)` artificial. Si el botón representa una publicación de cambios por lotes, debe ejecutar un `WriteBatch` sobre `/products` e incrementar atómicamente `businesses/{id}.menuVersion`. Si la edición es atómica por producto, remover el botón engañoso para evitar confusión.

---

### GAP-004: Botones con Callbacks Vacíos `onClick = {}`
- **Pantallas Afectadas**: `MerchantOperationsCenterScreen.kt` y `ProductWorkspaceScreen.kt`
- **Elementos UI**:
  1. Botón "Llamar" al cliente: `onClick = {}` (`MerchantOperationsCenterScreen.kt:1286`).
  2. Botón "WhatsApp" al cliente: `onClick = {}` (`MerchantOperationsCenterScreen.kt:1287`).
  3. Overflow "Historial de Snapshots": `onClick = { showOverflowMenu = false }` (`ProductWorkspaceScreen.kt:182`).
  4. Overflow "Rollback de Versión": `onClick = { showOverflowMenu = false }` (`ProductWorkspaceScreen.kt:187`).
  5. Bottom Sheet "+ Crear Categoría": `onValueChange = {}` y botón que solo hace `dismiss()` (`ProductWorkspaceScreen.kt:628-636`).
- **Acción Esperada**: Disparar Intents nativos de llamada/WhatsApp, desplegar historial de versiones y crear categorías al vuelo.
- **Acción Real**: No realizan ninguna acción.
- **Descripción Técnica**: Componentes declarados a nivel de interfaz visual con lambdas de evento vacías o que solo mutan un booleano de visibilidad.
- **Impacto Operativo**: Frustración del operador al intentar comunicarse con el cliente ante emergencias de entrega, e imposibilidad de crear categorías desde el modal de producto.
- **Evidencia Forense**:
  - `MerchantOperationsCenterScreen.kt` (Líneas 1286-1287).
  - `ProductWorkspaceScreen.kt` (Líneas 180-189, 628-636).
- **Corrección Recomendada (MER 18.3)**:
  - Implementar `Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))` y `Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/..."))`.
  - Conectar el formulario de categoría al `MenuViewModel.saveCategory()`.
  - Ocultar las opciones de snapshots si no se cuenta con backend de versionado histórico.

---

### GAP-005: Combos Creados por Comercio No se Reflejan en App Cliente
- **Pantalla / Componente**: `MenuComboRepositoryImpl.kt` vs `ComercioDetalleViewModel.kt`
- **Acción Esperada**: Los combos promocionales creados por el comercio deben aparecer en la carta de la App Cliente para que los usuarios puedan comprarlos.
- **Acción Real**: El comercio crea combos y se guardan correctamente en `/combos/{comboId}`. Sin embargo, en la App Cliente, `ComercioDetalleViewModel.kt` solo consulta `/categories` y `/products`, ignorando por completo la colección `/combos`.
- **Descripción Técnica**: Falta la suscripción a `/combos` y la sección visual correspondiente en `ComercioDetalleScreen.kt`.
- **Impacto Operativo**: Pérdida de oportunidades de venta comercial; los paquetes de productos creados por el comercio son invisibles para el público comprador.
- **Evidencia Forense**:
  - `app/src/main/java/com/example/bluesystem_delivery/data/repository/MenuComboRepositoryImpl.kt` (Persiste en `/combos`).
  - `app/src/main/java/com/example/bluesystem_delivery/presentation/customer/ComercioDetalleViewModel.kt` (Oromisión de consulta a `/combos`).
- **Corrección Recomendada (MER 18.3)**:
  - Añadir consulta a `/combos` en `ComercioDetalleViewModel` y renderizar la sección "Combos Especiales" en la cabecera de la carta del cliente.

---

### GAP-006: Modificadores y Opciones Extras Omitidas en Creación de Orden
- **Pantalla / Componente**: `ComercioDetalleScreen.kt` vs `CustomerHomeViewModel.kt`
- **Acción Esperada**: Cuando el cliente selecciona opciones (ej. término de carne, salsa extra, refresco grande), estos modificadores deben viajar dentro del objeto de cada ítem de la orden para que el restaurante sepa cómo cocinar el platillo.
- **Acción Real**: En el modal de producto el cliente selecciona los grupos de opciones, pero al ejecutar el checkout, `CustomerHomeViewModel.kt` solo copia campos base (`productId`, `productName`, `price`, `quantity`, `subtotal`, `imageUrl`), omitiendo el array `selectedOptions`.
- **Descripción Técnica**:
  ```kotlin
  // CustomerHomeViewModel.kt L:618-627
  val orderItems = cartItems.map { cartItem ->
      OrderItem(
          productId = cartItem.product.id,
          productName = cartItem.product.name,
          price = cartItem.product.price,
          quantity = cartItem.quantity,
          subtotal = cartItem.product.price * cartItem.quantity,
          imageUrl = cartItem.product.imageUrl
          // selectedOptions OMITIDO
      )
  }
  ```
- **Impacto Operativo**: Error crítico en cocina: el comercio recibe el pedido genérico sin saber qué extras pagó el cliente o qué ingredientes pidió excluir.
- **Evidencia Forense**: `CustomerHomeViewModel.kt` (Líneas 618-627).
- **Corrección Recomendada (MER 18.3)**:
  - Extender el modelo `OrderItem` para incluir `selectedOptions: List<SelectedOption>` y mapearlo en la transacción de creación de la orden.

---

### GAP-007: Exportación de Reportes Financieros en Texto Plano Mockeado
- **Pantalla / Componente**: `MerchantFinanceCenterScreen.kt` / `FinancialReportGenerator.kt`
- **Botón / Elemento**: Botón "Exportar Reporte (PDF/Excel)".
- **Acción Esperada**: Descargar un archivo binario en PDF o Excel (CSV/XLSX) con el membrete oficial del comercio, balance y desglose de liquidaciones, o compartirlo mediante un Intent de Android (`FileProvider`).
- **Acción Real**: `FinancialReportGenerator.kt` simplemente concatena un `StringBuilder` produciendo un `String` de texto plano. Además, el botón en `MerchantFinanceCenterScreen` ni siquiera invoca este generador de forma reactiva hacia el almacenamiento público.
- **Descripción Técnica**: Falta un motor de generación PDF (como `PdfDocument` de Android usado exitosamente en Courier Cash Closure ADR-018) o un exportador CSV formal.
- **Impacto Operativo**: El comerciante no puede entregar extractos a su contador ni archivar sus comprobantes de liquidación externamente.
- **Evidencia Forense**: `app/src/main/java/com/example/bluesystem_delivery/presentation/business/finance/FinancialReportGenerator.kt`.
- **Corrección Recomendada (MER 18.3)**:
  - Implementar generador vectorial nativo vía `android.graphics.pdf.PdfDocument` y exportador CSV con almacenamiento vía `MediaStore` o `FileProvider`.

---

### GAP-008: Módulo de Staff Aislado y Sin Funcionalidad de Invitación
- **Pantalla / Componente**: `MerchantStaffCenterScreen.kt`
- **Acción Esperada**: El dueño del comercio debe poder invitar cajeros, cocineros y administradores mediante correo o código, asignando roles y permisos.
- **Acción Real**: La pantalla solo muestra una lista estática de solo lectura y no existe ninguna opción en el menú del comercio en Android para ingresar a ella.
- **Descripción Técnica**: No hay integración con Firebase Auth / Cloud Functions para vincular UIDs a un comercio (`/businesses/{id}/staff`), ni formulario de alta.
- **Impacto Operativo**: Imposibilidad de delegar la operación en empleados desde la APK móvil.
- **Evidencia Forense**: `MerchantStaffCenterScreen.kt` (Líneas 1-280).
- **Corrección Recomendada (MER 18.3)**:
  - Implementar Callable de invitación de personal o enlazar el acceso al módulo web de Staff donde sí está soportado.

---

### GAP-009: Botón "Ver Mi Carrito 🛒" Cierra la Pantalla en Lugar de Checkout
- **Pantalla / Componente**: `ComercioDetalleScreen.kt`
- **Botón / Elemento**: Botón flotante inferior "Ver Mi Carrito 🛒 (X items)".
- **Acción Esperada**: Abrir la pantalla o modal de resumen de carrito y checkout para proceder al pago del pedido.
- **Acción Real**: Ejecuta `navController.popBackStack()`, devolviendo al cliente a la lista general de restaurantes en lugar de llevarlo a finalizar la compra.
- **Descripción Técnica**:
  ```kotlin
  // ComercioDetalleScreen.kt L:1102-1110
  ExtendedFloatingActionButton(
      onClick = {
          navController.popBackStack() // FALLA: Debería navegar a "cart" o "checkout"
      },
      ...
  )
  ```
- **Impacto Operativo**: Interrupción total del embudo de ventas (funnel drop-off). El cliente confuso es expulsado del comercio cuando decide pagar.
- **Evidencia Forense**: `ComercioDetalleScreen.kt` (Líneas 1102-1110).
- **Corrección Recomendada (MER 18.3)**:
  - Sustituir `navController.popBackStack()` por `navController.navigate("cart")` o desplegar el `CartBottomSheet`.

---

### GAP-010: Desincronización SSOT en Switch Rápido de Apertura
- **Pantalla / Componente**: `MerchantOperationsDashboardScreen.kt` vs `RestaurantSettingsCenterScreen.kt`
- **Acción Esperada**: El cambio del estado abierto/cerrado debe reflejarse atómicamente en todos los documentos de configuración del local.
- **Acción Real**: El switch rápido del Dashboard actualiza únicamente `/businesses/{id}.isOpen`. No actualiza `/restaurant_settings/{id}.isOpenOverride`.
- **Descripción Técnica**: Falta de escritura atómica multi-documento (`WriteBatch`).
- **Impacto Operativo**: Inconsistencia interna entre lo que muestra el Dashboard principal y lo que muestra la pantalla de Ajustes y Horarios.
- **Evidencia Forense**:
  - `MerchantDashboardViewModel.kt` (Líneas 145-160).
  - `RestaurantSettingsRepository.kt` (Líneas 80-110).
- **Corrección Recomendada (MER 18.3)**:
  - Unificar la actualización de apertura en un método transaccional que actualice tanto `/businesses/{id}` como `/restaurant_settings/{id}` en un solo batch.
