# PRODUCT WIZARD ENTERPRISE SPECIFICATION
**BlueSystem Delivery Enterprise v2.1**
**Rediseño UX/UI y Asistente Inteligente de 6 Pasos**

---

## 1. Visión General del Rediseño

El **Product Wizard Enterprise** transforma la experiencia de creación y edición de productos de un formulario tradicional en un **Asistente Inteligente de 6 Pasos**, optimizado para permitir que cualquier comercio configure un platillo complejo en **menos de 2 minutos**.

Inspirado en **Uber Eats Merchant**, **PedidosYa Partner**, **Shopify** y **Canva**, el asistente combina:
- **Flujo Guiado de 6 Pasos**: Información ➔ Precio ➔ Fotos ➔ Opciones/Extras ➔ Inventario ➔ Vista Previa.
- **Validaciones en Tiempo Real**: Bloqueo inmediato ante errores (ej. precio anterior menor al actual).
- **Compresión Nativa de Imágenes**: WebP / JPEG con redimensionamiento a 1200px.
- **Persistencia Total del Paso 4**: Guardado real de `MenuOptionGroup` e `OptionItem` en Firestore.
- **AutoSave & Borradores**: Guardado automático local cada 15 segundos con recuperación ante cierres.
- **Card Preview Espejo Fiel**: Vista previa exacta de cómo se renderiza el producto en la App Cliente.

---

## 2. Definición de los 6 Pasos

### Paso 1: Información del Producto
- **Campos**: Nombre del platillo, descripción corta (cards), descripción larga (detalle), categoría dinámica, subcategoría, tipo de cocina, tiempo de preparación (minutos), etiquetas.
- **Banderas Comerciales**: `isPopular` (Popular 🔥), `isNew` (Nuevo ✨), `isTopSeller` (Más Vendido 🏆), `isRecommended` (Recomendado 👍).
- **Nivel de Picante**: Selector del 0 al 3 (No picante, Suave, Medio, Picante 🌶️).

### Paso 2: Precios, Impuestos y Márgenes
- **Campos**: Precio de Venta (C$), Precio Anterior (para mostrar tachado), Costo Estimado (C$), Impuesto ISV (% default 15%).
- **Cálculo Automático**:
  - `Margen de Ganancia (%)` = `((Precio - Costo) / Precio) * 100`
  - `Ganancia Bruta (C$)` = `Precio - Costo`
- **Validación Fuerte**: Si `Precio Anterior < Precio Venta`, la UI muestra un mensaje de error rojo inmediato y deshabilita el botón de guardado.

### Paso 3: Galería Profesional (Sin Base64)
- **Compresión en Cliente**: Redimensionamiento máximo a 1200px con compresión WebP/JPEG (`ImageCompressionEngine`).
- **Gestión de Portada**: La primera foto seleccionada se asigna automáticamente como portada (`imageUrl`), manteniendo la lista completa en `images`.
- **Acciones**: Carga desde cámara o galería, eliminación de fotos y selección de portada con botón estrella.

### Paso 4: Variantes y Extras (Persistencia Total)
- **Persistencia Firestore**: Cada grupo agregado (`MenuOptionGroup`) y sus ítems (`OptionItem`) se estructuran en la propiedad `optionGroups` de `Product`.
- **Configuración por Grupo**: Nombre del grupo (ej. *"Tamaño"*, *"Extras"*), indicador de obligatorio, selección mínima y máxima.
- **Ítems**: Nombre del adicional y precio extra (C$).

### Paso 5: Inventario y Horarios
- **Gestión de Stock**: Switch de disponible/agotado, cantidad numérica de unidades o inventario ilimitado, alerta de stock mínimo (default 5).
- **Ocultamiento Automático**: Opción para ocultar el producto en la App Cliente si el stock llega a 0.
- **Días Activos**: Selector de días de la semana (Lunes a Domingo).

### Paso 6: Vista Previa Fiel (Live Card Mirror)
- **Renderizado Espejo**: Muestra la tarjeta del producto idéntica a la vista del cliente.
- **Controles UI**: Toggle entre modo Claro / Oscuro para verificar legibilidad de contrastes.
