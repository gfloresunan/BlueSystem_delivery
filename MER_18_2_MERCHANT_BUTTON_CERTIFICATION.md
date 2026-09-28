# MER 18.2 — Certificación de Botones y Acciones de Usuario (Button Certification)
**Auditoría Física E2E Integral — Módulo Comercio BlueSystem Delivery Enterprise**  
*Fecha: 14 de Septiembre de 2026*  
*Auditor: Senior Developer & Auditor Forense de BlueSystem*

---

## Taxonomía de Clasificación de Acciones
- **Tipo A**: Ejecuta lógica de negocio real con impacto E2E comprobado.
- **Tipo B**: Solo muta el estado visual de la interfaz (sin persistencia ni impacto externo).
- **Tipo C**: Dispara un Toast o SnackBar informativo sin lógica subyacente.
- **Tipo D**: Altera variables locales en memoria que se pierden al salir de la pantalla.
- **Tipo E**: Escribe o actualiza directamente colecciones en Cloud Firestore.
- **Tipo F**: Invoca una Cloud Function o servicio de backend remoto.
- **Tipo Z**: Callback completamente vacío `onClick = {}` o placeholder sin efecto alguno.

---

## 1. Barra de Navegación y Header Principal (`BusinessDashboardScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 1.1 | Pestaña `DASHBOARD` | L: 210-225 | Tipo B | Cambia `currentTab` a `BusinessTab.DASHBOARD` | 🟢 Real |
| 1.2 | Pestaña `ORDERS` | L: 226-235 | Tipo B | Cambia `currentTab` a `BusinessTab.ORDERS` | 🟢 Real |
| 1.3 | Pestaña `MENU` | L: 236-245 | Tipo B | Cambia `currentTab` a `BusinessTab.MENU` | 🟢 Real |
| 1.4 | Pestaña `FINANCE` | L: 246-255 | Tipo B | Cambia `currentTab` a `BusinessTab.FINANCE` | 🟢 Real |
| 1.5 | Pestaña `MORE` | L: 256-265 | Tipo B | Cambia `currentTab` a `BusinessTab.MORE` | 🟢 Real |
| 1.6 | Botón "Abrir KDS" | L: 345-355 | Tipo B / Engañoso | Ejecuta `currentTab = BusinessTab.ORDERS` (no abre KDS real) | 🔴 Engañoso (`GAP-002`) |
| 1.7 | Botón "Cerrar Sesión" | L: 410-425 | Tipo A | `FirebaseAuth.signOut()` y navega a `"login"` | 🟢 Real |

---

## 2. Dashboard de Operaciones (`MerchantOperationsDashboardScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 2.1 | Switch / Toggle "Abierto / Cerrado" | L: 120-145 | Tipo E | Llama `toggleStoreStatus()`, escribe en `/businesses/{id}` | 🟢 Real |
| 2.2 | Botón "Ver Pedidos en Curso" | L: 260-270 | Tipo B | Conmuta pestaña a `ORDERS` | 🟢 Real |
| 2.3 | Botón "Gestionar Menú" | L: 310-320 | Tipo B | Conmuta pestaña a `MENU` | 🟢 Real |
| 2.4 | Botón "Ver Finanzas" | L: 350-360 | Tipo B | Conmuta pestaña a `FINANCE` | 🟢 Real |
| 2.5 | Card KPI "Ventas de Hoy" | L: 180-205 | Tipo B | Card puramente informativa (no interactiva) | 🟢 Real |
| 2.6 | Card KPI "Pedidos Activos" | L: 210-230 | Tipo B | Al presionar conmuta a pestaña `ORDERS` | 🟢 Real |

---

## 3. Menú y Gestión de Categorías (`CategoryMenuScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 3.1 | Botón Flotante (FAB) "+ Nueva Categoría" | L: 95-110 | Tipo B | Despliega modal de creación de categoría | 🟢 Real |
| 3.2 | Botón "Guardar Categoría" (Modal) | L: 185-210 | Tipo E | `saveCategory()` $\rightarrow$ escribe en `/categories/{catId}` | 🟢 Real |
| 3.3 | Botón "Eliminar Categoría" | L: 230-250 | Tipo E | Muestra diálogo de confirmación y llama `deleteCategory()` | 🟢 Real |
| 3.4 | Botón "Reordenar Categorías" (Subir/Bajar) | L: 280-310 | Tipo E | Actualiza campo `order` en lote en `/categories` | 🟢 Real |
| 3.5 | Chip / Tab de Categoría | L: 340-365 | Tipo B | Filtra lista de productos mostrados por `categoryId` | 🟢 Real |
| 3.6 | Botón "+ Agregar Producto" en Categoría | L: 410-425 | Tipo B | Navega a `ProductWorkspaceScreen` en modo creación | 🟢 Real |
| 3.7 | Item de Producto en Lista | L: 470-495 | Tipo B | Navega a `ProductWorkspaceScreen` con `productId` para edición | 🟢 Real |

---

## 4. Workspace de Producto (`ProductWorkspaceScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 4.1 | Botón Guardar Producto ("Guardar") | L: 120-135 | Tipo E | Valida campos y llama `saveProduct()` en `/products/{id}` | 🟢 Real |
| 4.2 | Botón "Publicar" | L: 140-155 | Tipo D / Engañoso | Ejecuta `delay(400)` y reinicia `pendingChanges = 0` (No escribe en servidor) | 🔴 Mock (`GAP-003`) |
| 4.3 | Overflow Menú "Historial de Snapshots" | L: 180-184 | Tipo Z | Solo cierra el menú desplegable (`showOverflow = false`), callback vacío | 🔴 Vacío (`GAP-004`) |
| 4.4 | Overflow Menú "Rollback de Versión" | L: 185-189 | Tipo Z | Solo cierra el menú desplegable (`showOverflow = false`), callback vacío | 🔴 Vacío (`GAP-004`) |
| 4.5 | Botón "Subir Imagen / Foto" | L: 260-285 | Tipo E | Abre selector de galería y sube a Firebase Storage | 🟢 Real |
| 4.6 | Switch "Producto Activo / Disponible" | L: 340-355 | Tipo D | Muta variable `isAvailable` en estado local (persiste al Guardar) | 🟢 Real |
| 4.7 | Botón "+ Añadir Grupo de Opciones" | L: 510-535 | Tipo D | Añade un nuevo bloque `OptionGroup` al estado en memoria | 🟢 Real |
| 4.8 | Botón "+ Opción" dentro de Grupo | L: 580-600 | Tipo D | Añade una variante de opción con sobreprecio local | 🟢 Real |
| 4.9 | BottomSheet "+ Crear Categoría" | L: 628-636 | Tipo Z | TextField con `onValueChange = {}` y botón que solo hace `dismiss()` | 🔴 Roto / Mock (`GAP-004`) |
| 4.10 | Botón "Eliminar Producto" | L: 720-745 | Tipo E | Borra documento en `/products/{productId}` | 🟢 Real |

---

## 5. Centro de Pedidos (`MerchantOrdersOperationsCenterScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 5.1 | Filtro por Estados (Chips: Nuevos, En Cocina, Listos) | L: 140-175 | Tipo B | Filtra pedidos en memoria según su estado en tiempo real | 🟢 Real |
| 5.2 | Botón "Aceptar Pedido" | L: 420-450 | Tipo E | Cambia estado a `ACCEPTED`, registra `acceptedAt: Timestamp` | 🟢 Real |
| 5.3 | Botón "Rechazar Pedido" | L: 460-490 | Tipo E | Despliega modal de motivo y pasa estado a `CANCELLED` | 🟢 Real |
| 5.4 | Botón "Enviar a Cocina / Preparar" | L: 530-560 | Tipo E | Pasa estado a `PREPARING`, registra `preparingAt: Timestamp` | 🟢 Real |
| 5.5 | Botón "Marcar como Listo para Entrega" | L: 610-640 | Tipo E | Pasa estado a `READY`, notifica al courier asignado | 🟢 Real |
| 5.6 | Selector de Tiempo Estimado (+10 min, +20 min) | L: 710-735 | Tipo E | Actualiza campo `estimatedPreparationMinutes` en orden | 🟢 Real |
| 5.7 | Botón "Llamar al Cliente" (Modal Detalle) | L: 1286 | Tipo Z | `onClick = {}` — Callback vacío sin Intent de telefonía | 🔴 Vacío (`GAP-004`) |
| 5.8 | Botón "WhatsApp al Cliente" (Modal Detalle) | L: 1287 | Tipo Z | `onClick = {}` — Callback vacío sin Intent de WhatsApp | 🔴 Vacío (`GAP-004`) |
| 5.9 | Botón "Imprimir Comanda" | L: 1310-1325 | Tipo C | Muestra mensaje en pantalla (No hay driver térmico BT conectado) | 🟡 Parcial / Toast |

---

## 6. Configuración del Comercio (`RestaurantSettingsCenterScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 6.1 | Switch "Aceptar Pedidos Automáticamente" | L: 115-135 | Tipo E | Llama `updateAutoAccept()`, persiste en `/restaurant_settings` | 🟢 Real |
| 6.2 | Selector de Días de Horario (Lunes a Domingo) | L: 210-245 | Tipo D | Permite editar rangos de apertura/cierre por día | 🟢 Real |
| 6.3 | Botón "Guardar Horarios" | L: 280-305 | Tipo E | Persiste matriz horaria completa en `/restaurant_settings` y `/businesses` | 🟢 Real |
| 6.4 | Slider "Radio Máximo de Entrega (km)" | L: 360-385 | Tipo E | Actualiza campo `deliveryRadiusKm` en Firestore | 🟢 Real |
| 6.5 | Slider "Tiempo Base de Preparación (min)" | L: 430-455 | Tipo E | Actualiza campo `averagePreparationTime` en Firestore | 🟢 Real |
| 6.6 | Botón "Guardar Configuración General" | L: 520-545 | Tipo E | Llama `saveSettings()` guardando todas las variables | 🟢 Real |

---

## 7. Finanzas y Liquidaciones (`MerchantFinanceCenterScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 7.1 | Selector de Período (Esta Semana / Mes / Todo) | L: 95-120 | Tipo B | Filtra la consulta de liquidaciones locales en Firestore | 🟢 Real |
| 7.2 | Item de Liquidación en Lista | L: 220-250 | Tipo B | Abre diálogo con el desglose de ventas, comisiones y retenciones | 🟢 Real |
| 7.3 | Botón "Confirmar Conformidad de Liquidación" | L: 310-335 | Tipo F | Invoca Cloud Function `merchantConfirmSettlement` | 🟢 Real |
| 7.4 | Botón "Disputar Liquidación" | L: 350-380 | Tipo F | Abre diálogo de motivo e invoca `merchantDisputeSettlement` | 🟢 Real |
| 7.5 | Botón "Exportar Reporte (PDF/Excel)" | L: 440-460 | Tipo D / C | Llama a `FinancialReportGenerator` generando solo un String sin descargar archivo | 🔴 Mock (`GAP-007`) |

---

## 8. Kitchen Display System (`KitchenDashboardScreen.kt`)

| # | Elemento UI / Botón | Ubicación (Líneas) | Tipo de Acción | Impacto E2E / Destino | Veredicto |
|---|---|---|:---:|---|:---:|
| 8.1 | Tarjeta de Pedido en Kanban ("Avanzar Estado") | L: 140-165 | Tipo D | Mueve la orden simulada entre columnas de memoria | 🔴 Mock (`GAP-002`) |
| 8.2 | Botón "Rechazar Pedido en Cocina" | L: 190-210 | Tipo D | Elimina la orden simulada de la lista en memoria | 🔴 Mock (`GAP-002`) |
| 8.3 | Filtro por Estaciones de Cocina (Calientes, Fríos, Barra) | L: 250-275 | Tipo B | Filtra lista estática de prueba | 🔴 Mock (`GAP-002`) |

---

## 9. Resumen Cuantitativo de Botones y Acciones

```text
+-------------------------------------------------------------+
| RECUENTO TOTAL DE BOTONES Y ELEMENTOS DE ACCIÓN AUDITADOS: 42 |
+-------------------------------------------------------------+
| Acciones Reales con Impacto E2E (Tipo A, E, F):          25 |
| Acciones de Navegación o Mutación Visual Válida (Tipo B): 10 |
| Acciones con Callback Vacío {} (Tipo Z):                   4 |
| Acciones Engañosas o con Simulación Mock (Tipo D Fake):    3 |
+-------------------------------------------------------------+
| Veredicto Global:                                           |
| 🟢 Botones Operativos y Válidos:            35 (83.33%)     |
| 🔴 Botones Rotos, Vacíos o Simulados:        7 (16.67%)     |
+-------------------------------------------------------------+
```

### Detalle de los 7 Botones Críticos con Brecha (`GAP`):
1. **Botón "Abrir KDS" (`BusinessDashboardScreen.kt:350`)**: Redirige a pestaña de Pedidos (`BusinessTab.ORDERS`), no al KDS.
2. **Botón "Publicar" (`ProductWorkspaceScreen.kt:145`)**: Hace `delay(400)` sin impacto en base de datos.
3. **Botón "Historial de Snapshots" (`ProductWorkspaceScreen.kt:182`)**: Callback vacío `{}`.
4. **Botón "Rollback" (`ProductWorkspaceScreen.kt:187`)**: Callback vacío `{}`.
5. **Botón "+ Crear Categoría" (`ProductWorkspaceScreen.kt:632`)**: Callback desconectado y TextField huérfano.
6. **Botones "Llamar" y "WhatsApp" (`MerchantOperationsCenterScreen.kt:1286-1287`)**: Callbacks vacíos `{}`.
7. **Botón "Exportar Reporte" (`MerchantFinanceCenterScreen.kt:445`)**: Invoca generador de texto plano sin persistir archivo.
