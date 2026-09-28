# ARCHITECTURE DECISIONS & DECISION MATRICES (ADR)
## Restaurant Menu Engine - Phase 13B (v2.2 Enterprise Hardened)

## 📌 Document Overview & Status
- **System**: BlueSystem Delivery Enterprise Edition
- **Version**: 2.2.0-APPROVED
- **Status**: **APPROVED FOR IMPLEMENTATION**
- **Scope**: Formal Architecture Decision Records (ADR-001 through ADR-006)

---

## 1. ADR-001: Consistencia del Menú Denormalizado y Reconstrucción (`/menus/{restaurantId}`)

### Contexto del Desafío
El menú sintetizado en `/menus/{restaurantId}` consolida todo el catálogo del comercio en un único documento para minimizar costos de lectura en Firestore. Se requiere especificar el manejo de fallos en Cloud Functions, consistencia eventual y reconstrucción automática.

### Decision Matrix 001

| Criterio de Evaluación | Opción A: Escrituras Directas Complejas desde Cliente | Opción B: Eventual Consistency vía Cloud Functions + Dead Letter Queue + Rebuild Manual |
| :--- | :--- | :--- |
| **Costo y Rendimiento de Lectura** | Ineficiente | **Óptimo** (1 lectura por menú público) |
| **Tolerancia a Fallos en Sintetizador**| Baja (Riesgo de corrupción local) | **Alta**. Si falla la Cloud Function, el evento se reintenta 3 veces con *Exponential Backoff*. Si persiste el fallo, se envía a DLQ (`/menu_sync_failures`) y se emite alerta |
| **Resiliencia & Recuperación** | Compleja | **Nativa**. Endpoint `/admin/rebuild_menu` fuerza la regeneración completa del menú en caso de inconsistencia |

### Decisión Seleccionada
**Opción B (Eventual Consistency vía Cloud Functions + Dead Letter Queue + Endpoint Rebuild)**.
- **Justificación**: Protege la integridad del menú. El cliente lee el documento sintetizado con latencia <100ms. Si una Cloud Function falla al recompilar el menú tras una edición del merchant, el reintento automático o la cola DLQ garantizan la autorecuperación sin perder datos.

---

## 2. ADR-002: Estrategia Offline First y Resolución de Conflictos

### Contexto del Desafío
Los comerciantes pueden editar el catálogo sin conexión a internet desde sus dispositivos móviles. Debe resolverse la concurrencia cuando dos usuarios editan el mismo producto.

### Decision Matrix 002

| Criterio de Evaluación | Opción A: Last Write Wins (LWW) Simple basado en Timestamp local | Opción B: Optimistic Locking (`versionNumber` + `updatedAt` determinista) |
| :--- | :--- | :--- |
| **Protección contra Pérdida de Datos** | Baja (Relojes locales desincronizados pueden sobrescribir datos nuevos) | **Alta**. Bloquea sobrescrituras si la versión local es inferior a la versión del servidor |
| **Resolución Merchant vs Merchant** | Silenciosa pero peligrosa | **Determinista**. El servidor rechaza la transacción y fuerza un Pull de actualización |
| **Experiencia Offline Cliente App** | Buena | **Excelente**. La App Cliente consume snapshots inmutables locales sin entrar en conflicto |

### Decisión Seleccionada
**Opción B (Optimistic Locking mediante `versionNumber` + `updatedAt` determinista)**.
- **Justificación**: Evita que ediciones offline obsoletas destruyan datos actualizados recientemente en el servidor. Si `localVersion < serverVersion`, la transacción falla con un error claro exigiendo sincronización.

---

## 3. ADR-003: Inventario Concurrente y Prevención de Stock Negativo

### Contexto del Desafío
Prevención de compras concurrentes cuando las existencias de un producto o ingrediente son limitadas (ej. `Stock = 1` y dos clientes intentan comprar simultáneamente).

### Decision Matrix 003

| Criterio de Evaluación | Opción A: Deducción Cliente Directa en Firestore | Opción B: Distributed Counters externos | Opción C: Transacciones Atómicas en Cloud Function Checkout |
| :--- | :--- | :--- | :--- |
| **Garantía Cero Stock Negativo** | Nula (Condiciones de carrera) | Alta | **Absoluta y Determinista** |
| **Complejidad de Infraestructura** | Baja | Alta (Requiere Redis o Memcached) | **Baja-Media** (Nativo en Firestore) |
| **Manejo de Rollback** | Complejo | Complejo | **Automático** en caso de fallo de transacción |

### Decisión Seleccionada
**Opción C (Transacciones Atómicas en Cloud Function Checkout)**.
- **Justificación**: Las transacciones de Firestore (`runTransaction`) garantizan que la verificación de existencias y el descuento se ejecuten de forma atómica. Si dos compras compiten por la última unidad, una transacción triunfa y la segunda es rechazada ordenadamente indicando "Producto Agotado".

---

## 4. ADR-004: Motor de Promociones y Descuentos (Promotion Engine)

### Contexto del Desafío
Evaluación de reglas de descuento, promociones apilables y cupones sobre el carrito de compras.

### Decision Matrix 004

| Criterio de Evaluación | Opción A: Reglas Hardcodeadas en el Cliente | Opción B: Rule Engine Basado en Prioridades y Matriz de Apilabilidad |
| :--- | :--- | :--- |
| **Mantenibilidad de Promociones** | Inflexible | **Extremadamente Alta**. Nuevas promociones se crean dinámicamente sin actualizar la app |
| **Prevención de Descuentos Excesivos** | Baja | **Total**. Matriz de exclusión impide sumar promociones incompatibles |
| **Soporte para 2x1 y Montos Mínimos** | Complejo | **Nativo y Estandarizado** |

### Decisión Seleccionada
**Opción B (Rule Engine Basado en Prioridades y Matriz de Apilabilidad)**.
- **Justificación**: Permite definir jerarquías de promociones (ej. Promoción directa de producto > Descuento por categoría > Cupón de envío gratis). La matriz de apilabilidad previene pérdidas financieras por descuentos duplicados.

---

## 5. ADR-005: Registro de Auditoría y Trazabilidad (`MenuAuditLog`)

### Contexto del Desafío
Registrar todos los cambios en precios, estado e inventario para auditoría financiera e interna.

### Decision Matrix 005

| Criterio de Evaluación | Opción A: Logs en Consola / Cloud Logging | Opción B: Colección Dedicada `/menu_audit_logs` Integrada con `AuditLogger` |
| :--- | :--- | :--- |
| **Consultas desde Dashboard Admin** | Imposible | **Inmediata**. Búsquedas por fecha, producto o usuario |
| **Inmutabilidad y Retención** | Limitada | **Alta**. Documentos protegidos contra modificación o borrado |
| **Integración con BlueSystem** | Desconectada | **Totalmente Integrada** con la clase `AuditLogger.kt` existente |

### Decisión Seleccionada
**Opción B (Colección Dedicada `/menu_audit_logs` Integrada con `AuditLogger`)**.
- **Justificación**: Garantiza la trazabilidad financiera del sistema. Toda modificación de precio o estado de producto genera un registro inmutable indicando el usuario, timestamp, valores previos y valores nuevos.

---

## 6. ADR-006: Sobrescritura por Sucursal (Multisucursal Override Engine)

### Contexto del Desafío
Soporte para cadenas con múltiples sucursales que requieren precios o disponibilidad diferenciados (ej. Sucursal A vende Pizza a C$250, Sucursal B a C$280).

### Decision Matrix 006

| Criterio de Evaluación | Opción A: Duplicar el Catálogo Entero por Sucursal | Opción B: Entidad `BranchOverride` Desacoplada |
| :--- | :--- | :--- |
| **Eficiencia de Almacenamiento** | Pésima (Duplicación masiva) | **Excelente**. Solo almacena los deltas de variación |
| **Mantenimiento del Menú Base** | Complejo (Editar 50 catálogos) | **Simple**. El producto base se edita en un solo lugar |
| **Flexibilidad de Precios/Stock** | Rígida | **Total**. Permite sobrescribir precio, estado o disponibilidad por sucursal |

### Decisión Seleccionada
**Opción B (Entidad `BranchOverride` Desacoplada)**.
- **Justificación**: Mantiene la limpieza del modelo principal. Los productos base se definen una sola vez a nivel de comercio y las sucursales solo registran anulaciones de precio o stock cuando difieren del estándar.

---

## 7. ADR-007: Estrategia de Identificadores Únicos (ULID vs. AutoID vs. UUID)

### Contexto del Desafío
Selección del estándar oficial para la generación de identificadores de entidades en el nuevo motor.

### Decision Matrix 007

| Criterio de Evaluación | Opción A: Firestore AutoID | Opción B: UUID v4 | Opción C: ULID (Universally Unique Lexicographically Sortable Identifier) |
| :--- | :--- | :--- | :--- |
| **Ordenamiento Cronológico Nativo**| No | No | **Sí** (Los IDs son ordenables por fecha de creación) |
| **Generación Client-Side Offline** | No conveniente | Sí | **Sí** (Sin colisiones y sin depender de red) |
| **Legibilidad y Depuración** | Media | Compleja | **Excelente** (Cadena uniforme de 26 caracteres) |

### Decisión Seleccionada
**Opción C (ULID - Universally Unique Lexicographically Sortable Identifier)**.
- **Justificación**: ULID permite generar IDs únicos de forma segura offline que preservan el orden cronológico de creación de forma intrínseca, simplificando las consultas de ordenamiento en Firestore sin necesidad de índices complejos adicionales.

---

## 8. ADR-008: Relación entre Producto y Categoría (Categoría Primaria + Etiquetas Secundarias)

### Contexto del Desafío
Determinación del modelo de categorización para optimizar consultas y simplicidad.

### Decision Matrix 008

| Criterio de Evaluación | Opción A: Producto en Múltiples Categorías (Relación N:M Relacional) | Opción B: Categoría Primaria (`primaryCategoryId`) + Tags Secundarios (`secondaryCollectionTags`) |
| :--- | :--- | :--- |
| **Simplicidad de Consultas Firestore**| Compleja (Requiere `array-contains` múltiple) | **Simple y Performante** |
| **Claridad de Navegación UI** | Confusa para el usuario | **Clara**. Cada producto posee un hogar principal en el menú |
| **Soporte para Colecciones Especiales**| Regular | **Excelente** via `secondaryCollectionTags` (ej. "destacados", "promos") |

### Decisión Seleccionada
**Opción B (Categoría Primaria `primaryCategoryId` + Tags Secundarios `secondaryCollectionTags`)**.
- **Justificación**: Proporciona la máxima velocidad de consulta e indexación limpia en Firestore manteniendo la flexibilidad de agrupar productos en secciones especiales como "Promociones de Verano" mediante etiquetas.
