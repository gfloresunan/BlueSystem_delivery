# PRODUCT WIZARD FIREBASE STORAGE SPECIFICATION
**BlueSystem Delivery Enterprise v2.1**

---

## 1. Estrategia de Compresión y Subida

- **Eliminación de Base64**: La carga de imágenes a producción descarta el envío de cadenas gigantes Base64 en Firestore.
- **Compresión Nativa en Cliente**: `ImageCompressionEngine` escala los Bitmaps a una dimensión máxima de 1200px (mantenimiento de relación de aspecto) y aplica compresión `WEBP_LOSSY` (Android R+) o `JPEG` al 80% de calidad.
- **Ruta en Storage**: `product_images/{productId}.jpg`
- **Asignación de Portada**: La primera foto seleccionada por el usuario es asignada como la URL de portada principal (`imageUrl`), mientras que el listado completo se mantiene en `images`.
