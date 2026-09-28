# BLUE SYSTEM DELIVERY ENTERPRISE
# C2D — CUSTOMER DASHBOARD IMPLEMENTATION BASELINE REPORT
## PROTOCOLO TÉCNICO: BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001

**Documento:** `IMPLEMENTATION_BASELINE_REPORT.md`  
**Protocolo:** `BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001`  
**Fase:** `C2D — IMPLEMENTACIÓN CONTROLADA (PHASE 0: BASELINE)`  
**Modo de Ejecución:** `CONTROLLED IMPLEMENTATION / AUDIT-BEFORE-MUTATION / SCOPE-LOCKED / ZERO-UNAUTHORIZED-MUTATION`  
**Fecha:** 2026-09-07  
**Estado Previo:** 🟢 `IMPLEMENTATION READY = YES`  
**Predecesor Aprobado:** `BSD-C2D-CUSTOMER-DASHBOARD-CORRECTION-ADDENDUM-001`

---

## 01. Repository Baseline & Filesystem State

Se realizó una inspección completa del estado del repositorio antes de iniciar cualquier modificación en el código fuente:

- **Ecosistema:** BlueSystem Delivery Enterprise v2.1.
- **Track A (Android Nativo):** `app/` (8,171 archivos, baseline congelado, componentes MVVM + Jetpack Compose).
- **Track B (Flutter Comercial):** `flutter_client/` (separado y desacoplado, hosts no generados).
- **Backend Core:** `functions/` (Cloud Functions v1/v2, TypeScript) y `firestore.rules` (EIAM v2.1/v3).
- **Panel Administrativo:** `panel-admin/` (Web Vanilla JS + TailwindCSS).

---

## 02. Files in Scope (Archivos en Alcance de Modificación)

Los siguientes archivos forman parte del alcance autorizado de la actividad `BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001`:

1. `app/src/main/java/com/example/Models.kt`:
   - Adición de `showExpressDeliveryBanner: Boolean = false` y `xToYServiceEnabled: Boolean = false` a `DashboardConfig`.
   - Normalización del array canónico de 15 secciones (14 de comercio + 1 de servicio: `EXPRESS_DELIVERY`).
2. `app/src/main/java/com/example/data/repository/BusinessRepository.kt` (`BusinessInfo`):
   - Adición de atributos canónicos: `unitsSold30d`, `priceParityVerified`, `priceParityVerifiedAt`, `activatedAt`, `approvedAt`, `createdAt`.
3. `app/src/main/java/com/example/data/repository/DashboardAnalyticsTracker.kt`:
   - Refactorización para escribir eventos atómicos e inmutables a `/dashboard_events/{eventId}`.
   - Eliminación total de mutaciones de contadores de cliente sobre `revenue` u `orders`.
4. `app/src/main/java/com/example/FirebaseManager.kt`:
   - Soporte de resolución jerárquica de 2 niveles: `Tenant Override` (`/tenants/{tenantId}/dashboard/configuration`) $\rightarrow$ `Global Default` (`/dashboard/configuration`).
5. `app/src/main/java/com/example/domain/engine/dashboard/DashboardDeduplicationEngine.kt` [NUEVO]:
   - Motor formal de deduplicación con regla $M=2$ para secciones curadas dinámicas e inmunidad absoluta para `FAVORITES`, `NEARBY`, `BRANCHES` y `ALL_BUSINESSES`.
6. `app/src/main/java/com/example/presentation/customer/home/CuratedBusinessSections.kt`:
   - Implementación de reglas semánticas para `TopSellingSection` (`unitsSold30d`), `NewBusinessesSection` (`activatedAt >= now - 30d`), `SamePriceSection` (`priceParityVerified`), y `RecommendedSection` (Baseline técnico 40/25/20/15).
7. `app/src/main/java/com/example/presentation/customer/home/QuickReorderSection.kt` [NUEVO]:
   - Renderizador modular de reordenamiento con reconstrucción segura de 7 capas de carrito vivo.
8. `app/src/main/java/com/example/presentation/customer/home/CustomerHomeFeedSection.kt`:
   - Integración del bucle orquestador para soportar los 15 bloques (incluyendo `QUICK_REORDER` y `EXPRESS_DELIVERY` gobernado).
9. `panel-admin/public/js/dashboard/dashboardManager.js`:
   - Actualización de `allToggles` y `defaultSectionOrder` para sincronizar `EXPRESS_DELIVERY` y toggles de X→Y.
10. `firestore.rules`:
    - Adición de regla append-only fail-closed para `/dashboard_events/{eventId}` y acceso a configuración por tenant.
11. `functions/src/triggers/dashboardAggregation.ts` & `functions/src/callables/dashboardAggregation.ts` [NUEVO]:
    - Agregación autoritativa de `unitsSold30d` sobre órdenes completadas y script de backfill conservador.
12. `app/src/test/java/com/example/domain/dashboard/`:
    - Batería de pruebas unitarias cubriendo las reglas P0-01 a P0-08, deduplicación M=2, backward compatibility y safe defaults.

---

## 03. Files Out of Scope — FROZEN MODULES (Zero Touch 🔒)

Queda terminantemente prohibido tocar o alterar:

| Módulo Protegido | ADR Relacionado | Archivos / Colecciones Blindadas | Razón de Blindaje |
| :--- | :--- | :--- | :--- |
| **Fleet Core & Courier Pool** | ADR-013, ADR-016 | `FleetEligibilityEngine`, `/ubicaciones_repartidores` | Algoritmo de asignación certificado |
| **X→Y Courier Execution** | ADR-015, ADR-016 | `SolicitarEnvioScreen.kt`, `RutaActivaScreen.kt`, Haversine, `orders.ts` (despacho) | Contrato físico de encomiendas E2E |
| **Control Tower Enterprise** | ADR-013 | `DeliveryControlTowerModule.tsx`, CartoDB Voyager | Motor cartográfico inmutable v2.2 |
| **Courier Cash Closure & PDF**| ADR-018 | `CourierCashClosureScreen.kt`, Official Act PDF | Arqueo y cierre financiero inmutable |
| **Merchant Settlement** | ADR-019 | `merchantSettlement.ts`, `/merchant_settlements` | Ciclo de liquidación financiera |
| **Merchant Image Optimizer** | ADR-020 | Canvas compressor, precedencia canónica de URLs | Optimización anti-jank de imágenes |
| **Financial / Dispatch Engines**| Global | Pricing engine, commissions, `/deliveryTrips` | Lógica financiera SSOT |

---

## 04. Current Implementation vs. Expected Mutations

| Componente | Estado Actual | Mutación Requerida por C2D |
| :--- | :--- | :--- |
| `DashboardConfig` | 14 secciones en orden canónico; carece de toggles X→Y | 15 secciones canónicas; safe defaults `false` para X→Y |
| `BusinessInfo` | Carece de `unitsSold30d`, `priceParityVerified`, `activatedAt` | Incorporación limpia con valores por defecto seguros |
| `AnalyticsTracker` | Incrementa contadores directamente en `/dashboardAnalytics` | Ingesta de eventos inmutables en `/dashboard_events/{eventId}` |
| `FirebaseManager` | Lee únicamente `/dashboard/configuration` global | Jerarquía de 2 niveles: Tenant Override $\rightarrow$ Global Default |
| `CuratedSections` | Heurísticas locales de filtrado y ordenamiento | Cumplimiento estricto de contratos `unitsSold30d`, `activatedAt` |
| `QuickReorder` | Inexistente en UI; bloque huérfano | Componente dedicado con reconstrucción segura de carrito |
| `ExpressDelivery` | Hardcoded al pie del feed | Integrado al bucle dinámico bajo compuerta de visibilidad |
| `Deduplication` | Inexistente; comercios pueden repetirse indefinidamente | Motor `DashboardDeduplicationEngine` con regla formal $M=2$ |
| `DashboardCache` | 0 dependientes; memoria estática huérfana | Verificado sin dependencias; marcado como deprecado |

---

## 05. Verificación de Compatibilidad y Aislamiento de Módulos Congelados

Se ha verificado que ninguna de las mutaciones previstas:
- Importará ni modificará `SolicitarEnvioScreen.kt` o `RutaActivaScreen.kt`.
- Alterará el archivo de despacho de órdenes `orders.ts`.
- Manipulará colecciones de `/merchant_settlements` o `/deliveryTrips`.
- Impactará el renderizado de la Control Tower o el cierre de caja de motorizados.

---

## 06. Conclusión de Phase 0

El baseline está formalmente establecido, el alcance está estrictamente acotado y los módulos congelados están blindados. Se autoriza el inicio de la Fase 1 (Dashboard Configuration Contract).
