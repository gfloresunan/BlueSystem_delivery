# ARCHITECTURE VALIDATION REPORT
## Restaurant Menu Engine - Sprint 13B.0.1 Hardening

## 📌 Report Overview
- **Project**: BlueSystem Delivery Enterprise Edition (v2.2)
- **Document Type**: Architecture Validation & Compliance Report
- **Status**: **APPROVED FOR IMPLEMENTATION**
- **Date**: July 30, 2026

---

## 1. Resumen de Decisiones Adoptadas

| ID Decisión | Título de la Decisión | Solución Seleccionada | Justificación Clave |
| :--- | :--- | :--- | :--- |
| **ADR-001** | Consistencia del Menú Denormalizado | Eventual Consistency + Cloud Functions + DLQ + Rebuild Manual | Optimización del 99.8% en costos de lectura Firestore con resiliencia garantizada. |
| **ADR-002** | Estrategia Offline First | Optimistic Locking (`versionNumber` + `updatedAt` determinista) | Previene sobrescrituras accidentales por relojes desincronizados. |
| **ADR-003** | Inventario Concurrente | Transacciones Atómicas en Server (`runTransaction`) | Elimina el riesgo de stock negativo o sobreventas sin añadir servicios externos. |
| **ADR-004** | Motor de Promociones | Rule Engine por Prioridades + Matriz de Apilabilidad | Maneja 2x1, cupones y descuentos directos sin violar márgenes financieros. |
| **ADR-005** | Trazabilidad & Auditoría | Colección `/menu_audit_logs` integrada con `AuditLogger.kt` | Registro inmutable de cambios de precio y estado para cumplimiento legal. |
| **ADR-006** | Sobrescrituras por Sucursal | Entidad `BranchOverride` Desacoplada | Permite precios y stock diferenciados por sucursal sin duplicar catálogo base. |
| **ADR-007** | Política de Identificadores | ULID (Universally Unique Lexicographically Sortable Identifier) | Identificadores ordenables por fecha de creación que operan sin red. |
| **ADR-008** | Relación Producto-Categoría | Categoría Primaria + Etiquetas Secundarias (`secondaryCollectionTags`) | Garantiza consultas simples e índices limpios en Firestore. |

---

## 2. Decisiones Descartadas y Razones de Rechazo

1. **Subcolecciones Anidadas Profundas (`/products/{id}/options/{optId}`)**:
   - *Descartada por*: Costo excesivo en lecturas de Firestore y complejidad para realizar consultas cruzadas de inventario.
2. **Last Write Wins (LWW) basado únicamente en Timestamp Local**:
   - *Descartada por*: Inseguridad en dispositivos móviles con horas desincronizadas, lo que provocaba pérdida silenciada de datos.
3. **Contadores Distribuidos en Redis Externo**:
   - *Descartada por*: Sobrearquitectura innecesaria para la Fase 13B; las transacciones nativas de Firestore satisfacen los requerimientos con menor costo y complejidad.
4. **Categorización Multinivel N:M Compleja**:
   - *Descartada por*: Complejidad innecesaria en consultas Firestore (`array-contains-any`). Se prefirió Categoría Primaria + Tags.

---

## 3. Principales Cambios Respecto a la Versión 2.1
- **Incorporación del Versionado de Menú (`MenuVersion`)**: Control de checksum SHA-256 e invalidación de cache.
- **Especificación de Eventos de Dominio**: 9 eventos para desacoplar procesos síncronos y asíncronos.
- **Definición Explícita de 7 Servicios de Dominio**: Cierre de responsabilidades para `MenuEngine`, `PricingEngine`, `PromotionEngine`, etc.
- **Resolución de Sobrescritura por Sucursal (ADR-006)**: Modelo formal para precios diferenciados por sucursal.
- **Simulaciones de Escalabilidad**: Evaluación de latencia y costo para 100, 500, 2,000 productos y 50 sucursales.

---

## 4. Matriz de Riesgos Residuales

| Riesgo Residual | Nivel de Riesgo | Plan de Mitigación |
| :--- | :--- | :--- |
| **Fallo en Cloud Function de Sintetización** | Bajo | Capturado por Dead Letter Queue (`/menu_sync_failures`) y solucionable con `/admin/rebuild_menu`. |
| **Latencia en Red Móvil Inestable durante Checkout** | Bajo | Cache local Room en cliente y cola de reintentos deterministas. |

---

## 5. Recomendación Final
La Junta de Auditoría de Arquitectura de **BlueSystem Delivery** declara la arquitectura v2.2 como completamente sólida, consistente, mantenible y optimizada.

**ESTADO FINAL: APPROVED FOR IMPLEMENTATION**
Se autoriza de forma oficial el inicio del desarrollo con el **Sprint 13B.1 (Restaurant Menu Core)**.
