# CERTIFICACIÓN DEL CENTRO DE GESTIÓN X→Y EN ADMIN WEB
## BlueSystem Delivery Enterprise v6.1.0
### Referencia: BSD-X2Y-EXPRESS-ADMIN-CENTER-CERTIFICATION

---

### 1. Resumen Ejecutivo
Se implementó y certificó el nuevo módulo **Delivery Express (X→Y)** en el Panel de Administración (`panel-admin/public/js/dashboard/deliveryExpress.js`).
El módulo provee supervisión operativa en tiempo real de encomiendas activas, visualización cartográfica mediante Leaflet con CartoDB Voyager ($0\text{ Maps Cost}$), administración de tarifas canónicas y simulación interactiva de cotizaciones.

---

### 2. Especificación Técnica de Componentes

#### A. Archivos Integrados
1. **Módulo de Gestión**: `panel-admin/public/js/dashboard/deliveryExpress.js` (Exportado como `window.deliveryExpressModule`).
2. **Controlador Central**: `panel-admin/public/js/dashboard/dashboard.js`:
   - Registrado en `getModule(id)`.
   - Incluido en `fullTabs` y en `allowedTabs` para roles `super_admin`, `admin`, `auditor`, `supervisor` y `operator`.
   - Agregado en el menú lateral bajo la categoría `LOGÍSTICA & FLOTA`.
3. **Página Principal**: `panel-admin/public/dashboard.html`:
   - Importado mediante `<script src="js/dashboard/deliveryExpress.js?v=6.1.0"></script>`.

#### B. Funcionalidades de la Sección "Encomiendas en Vivo"
- **Monitoreo en Tiempo Real**: Escucha reactiva sobre `/deliveryTrips` (ordenada por `createdAt` desc, límite gobernado a 50 registros para protección de cuotas de Firestore).
- **Tarjetas de Métricas (KPIs)**:
  - Total de Encomiendas.
  - En Tránsito / Activas.
  - Pendientes de Asignación.
  - Tarifas Acumuladas ($C\$$).
- **Filtros Avanzados**: Búsqueda en vivo (por ID, nombres de remitente/destinatario o motorizado) y filtro por estados canónicos (`PENDING`, `ASSIGNED`, `EN_ROUTE_PICKUP`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`).
- **Modal Cartográfico con Leaflet**:
  - Tiles CartoDB Voyager (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`).
  - Marcador de Punto A (Origen, pin azul).
  - Marcador de Punto B (Destino, pin rojo).
  - Marcador de Motorizado en Vivo (con actualización GPS reactiva de `/ubicaciones_repartidores/{courierId}`).
  - Trazo de Polilínea Vial decodificada.
  - Desglose financiero completo.

---

### 3. Veredicto Técnico
🟢 **CERTIFIED ADMIN CENTER**: El módulo de administración X→Y cumple con todos los requerimientos de diseño estético, aislamiento y rendimiento.
