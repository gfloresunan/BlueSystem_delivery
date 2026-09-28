# Informe Técnico de Cierre: Sub-Hito 13B.6 (Promociones Dinámicas, Descuentos & Cross-Selling Engine)

**Fecha:** 31 de Julio de 2026  
**Estado:** `COMPLETADO Y AUDITADO`  
**Arquitectura:** Enterprise v2.2 Hardened  

---

## 1. Resumen Ejecutivo

El **Sub-Hito 13B.6** ha introducido la motorización completa de **Promociones Dinámicas, Descuentos y Venta Cruzada (Cross-Selling Engine)** en el Restaurant Menu Engine de BlueSystem v2.1 Enterprise.

Esta implementación permite a los restaurantes configurar reglas de descuento flexibles (porcentuales, montos fijos, esquemas 2x1 `BUY_X_GET_Y` y envíos gratis), cupones promocionales con montos mínimos de compra, y sugerencias inteligentes de productos complementarios ordenadas por puntuación de relevancia para incrementar el valor promedio de la orden (AOV).

---

## 2. Componentes Implementados

### 2.1 Modelos de Dominio y Enums (`com.example.domain.model.menu`)
- `DiscountType`: Enum con los tipos de descuento soportados (`PERCENTAGE`, `FIXED_AMOUNT`, `BUY_X_GET_Y`, `FREE_SHIPPING`).
- `PromotionRule`: Reglas de elegibilidad (`minOrderAmount`, `applicableCategoryIds`, `applicableProductIds`, `buyQuantity`, `getQuantity`, `couponCode`).
- `MenuPromotion`: Entidad principal de promoción con métodos de validación temporal `isValidAt(timestamp)`.
- `ProductRecommendation`: Entidad de sugerencia de venta cruzada con atributo de puntuación (`score`) y motivo (`reason`).

### 2.2 Capa de Persistencia Firestore (`com.example.data`)
- `PromotionDto` & `RecommendationDto`: DTOs anotados con `@IgnoreExtraProperties`.
- `PromotionMapper` & `RecommendationMapper`: Mapeadores bidireccionales deterministas.
- `IMenuPromotionRepository` & `MenuPromotionRepositoryImpl`: Repositorio Firestore para consultar promociones activas y buscar por cupón.
- `IProductRecommendationRepository` & `ProductRecommendationRepositoryImpl`: Repositorio Firestore para consultar sugerencias de venta cruzada por producto base.

### 2.3 Motores de Negocio (`com.example.domain.engine.menu`)
- `PromotionEngineImpl` (`IPromotionEngine`): Evalúa el contexto del carrito (`subtotal`, `items`, `couponCode`, `timestamp`), filtra por validez y prioridad, y retorna `PromotionEvaluationResult` con el descuento exacto.
- `RecommendationEngineImpl` (`IRecommendationEngine`): Recupera y ordena recomendaciones de cross-selling asociadas a los productos del carrito, filtrando aquellos que ya están en la orden o que no están activos.
- Integración en `PriceBreakdown`: Extendido con el campo `promotionDiscount: Double = 0.0` manteniendo 100% de compatibilidad previa.

---

## 3. Pruebas y Validación E2E

### Pruebas Unitarias e Integración (`app/src/test/java/com/example/menu/`)
1. `MenuPromotionTest.kt`: Validación del método `isValidAt` considerando estado activo e intervalo de fechas.
2. `PromotionMapperTest.kt`: Conversión exacta DTO $\leftrightarrow$ Dominio.
3. `PromotionEngineTest.kt`: Evaluación de reglas de descuento porcentual, límite mínimo de orden y cupones.
4. `RecommendationEngineTest.kt`: Filtrado de productos en carrito, ordenamiento por scoring y descarte de productos archivados.
5. `PromotionsAndRecommendationsE2ETest.kt`: Simulación completa E2E desde la adición de items, sugerencia de venta cruzada, cálculo de subtotal con impuestos y aplicación de cupones de descuento.

---

## 4. Estado de los Componentes del Núcleo

Todos los componentes de sprints anteriores permanecen **congelados e inmutables**:
- `MenuEngine`, `ValidationEngine`, `MenuWriteCoordinator`, `LegacyMenuAdapter` (Sprint 13B.1)
- `OptionValidationEngine`, `OptionPricingCalculator` (Sprint 13B.2)
- `VariantMatrixEngine`, `VariantKeyGenerator`, `PricingEngine` (Sprint 13B.3)
- `ComboDAGValidationEngine`, `CartItemSignatureGenerator` (Sprint 13B.4)
- `AvailabilityEngine`, `CustomerAvailabilityFilter` (Sprint 13B.5)
- `PromotionEngine`, `RecommendationEngine` (Sprint 13B.6 - Reciente)

---

## 5. Próximo Sub-Hito: Sprint 13B.7 (Menu Versioning & Snapshot History)

El siguiente sub-hito cerrará la serie **13B** implementando:
1. Historial de versiones y snapshots inmutables del menú publicado.
2. Auditoría y capacidad de rollback a versiones anteriores.
3. Validación de integridad end-to-end de toda la arquitectura v2.2.
