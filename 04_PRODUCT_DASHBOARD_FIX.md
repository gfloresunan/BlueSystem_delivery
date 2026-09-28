# 04. Integración Dinámica de Productos en el Dashboard del Cliente

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Componente:** `CustomerHomeScreen.kt`, `FirebaseManager.kt`  

---

## 1. Ajustes Solicitados y Soluciones Aplicadas

1. **Eliminación de Productos Falsos/Simulados:**
   - Se eliminaron todos los fallbacks estáticos y productos de relleno en el inicio del cliente.
   - Las listas de **Productos Estrella ⭐**, **Ofertas Flash ⚡** y **Productos con Descuentos 🏷️** leen únicamente datos reales desde Firestore (`/products`, `/featuredProducts`, `/flashDeals`).

2. **Renombrado de Sección:**
   - La sección anteriormente llamada `Precios Imperdibles %` fue renombrada a **`Productos con Descuentos 🏷️`**.

3. **Mapeo Dinámico de Nombres de Comercio:**
   - `FirebaseManager.listenToFeaturedProducts()` consulta la colección `/businesses` para asociar dinámicamente el nombre real del negocio (`businessName`) a cada producto del carrusel.
   - `StarProductCard` renderiza `AsyncImage` para cargar la imagen original cargada desde el portal web admin.

---

## 2. Comportamiento en Estado Vacío (Clean Empty State)

Si el administrador no ha configurado ofertas o si no existen productos con descuento en Firestore, cada carrusel despliega una tarjeta limpia con mensaje explicativo en lugar de inventar productos simulados:

- *"No hay productos estrella configurados actualmente."*
- *"No hay ofertas flash activas en este momento."*
- *"No hay productos con descuentos configurados actualmente."*
