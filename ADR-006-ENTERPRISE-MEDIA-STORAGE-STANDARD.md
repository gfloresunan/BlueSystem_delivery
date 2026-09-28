# ADR-006: Enterprise Media Storage Standard (EMSS) v1.0

**Estado:** `OFICIAL (DE CUMPLIMIENTO OBLIGATORIO)`  
**Versión:** `1.0.0`  
**Fecha:** `7 de Agosto de 2026`  
**Autores:** Equipo de Arquitectura, Integridad Financiera y Seguridad de BlueSystem Enterprise  
**Afecta a:** Todos los módulos del ecosistema (Productos, Comercios, Empresas, Motorizados, Usuarios, Promociones, Auditoría)

---

## 1. Contexto

A medida que **BlueSystem Enterprise v2.1** se expande para dar soporte a miles de comercios, usuarios y motorizados, el almacenamiento y la distribución de contenido multimedia (imágenes de catálogo, logotipos, comprobantes, fotos de perfil y portadas) representan un activo crítico que impacta directamente en:
1. **Consumo de Ancho de Banda y Almacenamiento:** Riesgo de redundancia masiva si múltiples entidades o productos suben fotos idénticas.
2. **Integridad de Datos:** Riesgo de corrupción silenciosa de archivos durante transmisiones móviles instables.
3. **Auditabilidad Comercial:** Necesidad de trazabilidad histórica (versiones v1, v2, v3) al modificar imágenes de productos o comercios.
4. **Desacoplamiento de Infraestructura:** Necesidad de abstracción CDN (Content Delivery Network) para no depender rígidamente de URLs estáticas de proveedores.

Este **ADR-006** establece el **Enterprise Media Storage Standard (EMSS) v1.0**, haciendo obligatorio un único pipeline centralizado y reutilizable en el módulo compartido `com.example.shared.media`.

---

## 2. Directivas Corporativas de Cumplimiento Obligatorio

### Directiva 1: Módulo Compartido Único (`com.example.shared.media`)
Queda estrictamente **prohibido** implementar lógica propia de compresión, subida o almacenamiento de imágenes dentro de repositorios o ViewModels específicos de módulo (ej. `ProductRepository`, `CommerceRepository`, `UserRepository`). Todo módulo debe consumir el motor centralizado `MediaUploadEngine`.

### Directiva 2: Pipeline Integrado de 7 Fases
Toda operación de carga de medios debe cumplir secuencialmente con el siguiente pipeline:

```
[Entrada Uri/Bytes]
        ↓
[Fase 1: ChecksumEngine (SHA-256)]
        ↓
[Fase 2: MediaDeduplicationEngine (Verificación de coincidencia en media_registry)]
        ↓
[Fase 3: ImageCompressionEngine (Variantes multi-res 100/300/600/1200px + Fallback WebP/JPEG)]
        ↓
[Fase 4: StorageService (Subida o Reutilización de referencias)]
        ↓
[Fase 5: MediaVersioningManager (Histórico v1, v2, v3)]
        ↓
[Fase 6: MediaResolver (Resolución CDN Ready)]
        ↓
[Fase 7: MediaMetricsManager (Métricas de observabilidad y rendimiento)]
```

### Directiva 3: Integridad Hashing SHA-256 & Metadatos
Cada archivo almacenado debe registrar de forma inmutable los siguientes atributos en Firestore (`media_registry`):
- `sha256Hash`: Cadena hexadecimal de 64 caracteres de hash cryptographic de 256 bits.
- `sizeBytes`: Tamaño exacto del contenido.
- `mimeType`: Tipo MIME validado (`image/webp` o `image/jpeg`).
- `width` y `height`: Dimensiones en píxeles.
- `createdAt`: Marca de tiempo atómica de servidor.

### Directiva 4: Deduplicación Automática por Hash SHA-256
Antes de iniciar la subida física de bytes a Firebase Storage, el motor debe consultar `media_registry` utilizando el `sha256Hash`. Si el hash ya existe en el sistema:
1. Se **omite** la subida a Storage (ahorro del 100% de ancho de banda).
2. Se **reutilizan** las URLs y metadatos existentes.
3. Se vincula la entidad con la referencia deduplicada.

### Directiva 5: Abstracción CDN Ready (`MediaResolver`)
Las aplicaciones cliente nunca deben acoplarse ni consumir directamente cadenas de URL de origen de Storage. Se exige el uso de `MediaResolver.resolveUrl(variantPath, targetWidthPx)` para permitir la conmutación transparente entre proveedores de CDN (`https://cdn.bluesystem.app/...`) y endpoints primarios.

### Directiva 6: Control de Versiones Histórico (v1, v2, v3)
Al reemplazar una imagen (ej. actualización de foto de producto o perfil de comercio), la imagen anterior no debe destruirse inmediatamente si tiene referencias activas en historial. El sistema registrará el cambio en la lista `versionHistory` etiquetando la nueva versión con `v{N+1}` para fines de auditoría y soporte de deshacer (rollback).

### Directiva 7: Observabilidad y Métricas de Rendimiento
El sistema debe registrar métricas operativas mediante `MediaMetricsManager`:
- `uploadTimeMs`: Tiempo total de subida a Storage.
- `compressionTimeMs`: Tiempo invertido en redimensionamiento y compresión.
- `cacheHitCount` / `cacheMissCount`: Efectividad de deduplicación y caché local.
- `averageUploadSizeKB`: Peso promedio de carga por transacción.

---

## 3. Consecuencias y Beneficios

* ✅ **Eficiencia Financiera:** Deduplicación por hash reduce costos de almacenamiento en Firebase Storage y ancho de banda en más de un 40%.
* ✅ **Integridad Garantizada:** Detección de corrupción mediante hashes SHA-256 previene errores silenciosos.
* ✅ **Cero Fragmentación:** Todos los desarrolladores y módulos reutilizan exactamente el mismo pipeline mantenido por el equipo core.
* ✅ **Preparado para Escala:** Preparación nativa para integración con CDN globales de baja latencia.
