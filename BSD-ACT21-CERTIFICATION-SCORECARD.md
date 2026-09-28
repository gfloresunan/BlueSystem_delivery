# BSD-ACT21-CERTIFICATION-SCORECARD
## Tablero de Certificación E2E — Actividad #21
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Pruebas Funcionales y Unitarias (BM-01 a BM-17)

| Test ID | Descripción | Criterio | Resultado |
|---|---|---|---|
| BM-01 | Listado de marcas en Admin Web | Carga reactiva desde `/brands` | 🟢 PASS |
| BM-02 | Filtro por Tenant | Filtrado client-side reactivo | 🟢 PASS |
| BM-03 | Filtro por Estado (ACTIVE, DRAFT, ARCHIVED) | Filtrado client-side reactivo | 🟢 PASS |
| BM-04 | Búsqueda por texto (nombre, slug, ID) | Coincidencia en tiempo real | 🟢 PASS |
| BM-05 | Validación de campos obligatorios | Formulario bloquea submit sin ID/Tenant | 🟢 PASS |
| BM-06 | Validación de formato HEX de colores | Regex `^#([0-9A-Fa-f]{3}\|[0-9A-Fa-f]{6})$` | 🟢 PASS |
| BM-07 | Subida de logo a Cloud Storage | Valida MIME y tamaño <= 5MB | 🟢 PASS |
| BM-08 | Subida de icono/favicon a Cloud Storage | Valida MIME y tamaño <= 5MB | 🟢 PASS |
| BM-09 | Previsualizador en vivo (Live Preview) | Actualiza colores y texto en memoria sin mutar DB | 🟢 PASS |
| BM-10 | Simulador Mobile Standalone | Renderiza mockup con branding | 🟢 PASS |
| BM-11 | Creación de marca en Firestore | Escribe en `/brands/{brandId}` con schema 1.0 | 🟢 PASS |
| BM-12 | Edición de marca existente | Ejecuta merge con `updatedAt` / `updatedBy` | 🟢 PASS |
| BM-13 | Asociación Marca ↔ Tenant | Valida existencia de `tenantId` en lista | 🟢 PASS |
| BM-14 | Lectura de Suscripción vinculada | Muestra plan activo en modo lectura | 🟢 PASS |
| BM-15 | Registro de evento de auditoría | Crea documento en `/audit_events` | 🟢 PASS |
| BM-16 | Bloqueo de acceso a usuarios no-admin | `AuthReadyGate` y router bloquean render | 🟢 PASS |
| BM-17 | Comprobación de integridad de schema | Cumple con `BrandEntity` canónico | 🟢 PASS |

---

### 2. Pruebas de Runtime Android (AT-01 a AT-10)

| Test ID | Descripción | Criterio | Resultado |
|---|---|---|---|
| AT-01 | Enlace de `BrandThemeProvider` en `MainActivity` | Composable envuelve `MyApplicationTheme` | 🟢 PASS |
| AT-02 | Fallback a `DefaultBrandTokens` | No provoca crash ante ausencia de tokens | 🟢 PASS |
| AT-03 | Navegación de Splash Screen | Flujo hacia Auth/Guest/Courier intacto | 🟢 PASS |
| AT-04 | Pantalla de Autenticación | AuthScreen renderiza normalmente | 🟢 PASS |
| AT-05 | Pantalla de Motorizado (Courier) | CourierScreen renderiza normalmente | 🟢 PASS |
| AT-06 | Pantalla de Rastreo de Pedido | TrackingScreen opera con mapa y estado | 🟢 PASS |
| AT-07 | Soporte de Modo Oscuro / Claro / Sistema | ProfileThemeManager alterna sin conflicto | 🟢 PASS |
| AT-08 | Inmutabilidad de `build.gradle.kts` | Cero cambios en dependencias o plugins | 🟢 PASS |
| AT-09 | Inmutabilidad de Application ID | Namespace y package intactos | 🟢 PASS |
| AT-10 | Aislamiento de compilación | Sin generación de APKs de release no autorizadas | 🟢 PASS |

---

### 3. Veredicto Final de Certificación: 🟢 100% CERTIFIED
