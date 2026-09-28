# 01. Informe de Causa Raíz Forense — Catálogo de Productos y Reseñas

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Paquete Android:** `com.aistudio.delivery.djweq` (Namespace: `com.example`)  
**Fecha de Auditoría:** 17 de Agosto, 2026  
**Estatus de Análisis:** 🟢 CONFIRMADO POR INVENTARIO Y REPOSITORIO  

---

## 1. Resumen Ejecutivo

Durante las pruebas funcionales E2E se identificaron dos fallas críticas en la interacción entre la aplicación Android y la base de datos Firestore:

1. **Invisibilidad de Productos en Pantalla de Comercio:** Los productos registrados válidamente desde el portal web `BlueSystem Merchant Portal Enterprise` existían en Firestore `/products`, pero la pantalla de comercio (`ComercioDetalleScreen`) mostraba la lista vacía.
2. **Falla de Publicación y Reseñas Fantasma (Optimistic UI Error):** Al enviar una reseña u opinión sobre un comercio, la app mostraba un error o realizaba una actualización optimista no confirmada que desaparecía al salir y reingresar al comercio.

---

## 2. Evidencia Forense de Causa Raíz

### A. Desalineación del Esquema de Productos (`/products`)
- **Comportamiento en Firestore:** El portal web registra la categoría del producto en los campos `"category"` o `"categoria"` (ej: `"category": "Especialidades NICA"` en FRITONI).
- **Comportamiento en Android (`ProductRepository.kt`):** El conversor Kotlin esperaba encontrar exclusivamente la propiedad `categoryName`. Al no encontrarla en el documento de Firestore, `categoryName` asumía un valor de cadena vacía (`""`).
- **Impacto en UI (`ComercioDetalleScreen.kt`):** La lógica de agrupamiento y filtrado por categoría (`matchesCategory`) comparaba `"Pollo Frito"` o `"Especialidades NICA"` contra `""`, descartando el 100% de los productos de la lista de renderizado.

### B. Fallo de Confirmación y Persistencia en Reseñas (`/reviews`)
- **Comportamiento Anterior:** Se aplicaba una actualización optimista local a `_uiState` antes o en paralelo a la escritura en Firestore mediante `.add()`. Si la llamada a Firestore fallaba por reglas de seguridad o si la promesa diferida no se confirmaba, la reseña solo existía temporalmente en la memoria RAM del teléfono.
- **Falta de Bloqueo de Re-envío:** No se deshabilitaba el botón de publicación durante el estado `submittingReview`, lo que permitía múltiples llamadas simultáneas.

---

## 3. Matriz de Impacto

| Módulo | Síntoma Original | Causa Raíz Técnica | Estado Posterior a la Corrección |
| :--- | :--- | :--- | :--- |
| **Detalle de Comercio** | Lista de productos vacía | `categoryName` resultaba `""` por no leer `category`/`categoria` | 🟢 Corregido mediante mapeo determinístico multicampo |
| **Inicio Cliente (Dashboard)** | Carrusel "Productos Estrella" sin items | Escuchaba exclusivamente `/featuredProducts` | 🟢 Corregido escuchando directamente `/products` |
| **Reseñas de Comercio** | Error "Error al publicar la opinión" / No persistía | Dependencia de Optimistic UI sin `await` confirmado | 🟢 Corregido con escritura síncrona `set().await()` y confirmación de Firestore |

---

## 4. Conclusión Forense

Los productos y datos siempre estuvieron intactos en Firestore. La falla no residía en la base de datos ni en el portal web de comercios, sino en la capa de adaptación y deserialización del cliente Android (`ProductRepository.kt` y `FirebaseManager.kt`).
