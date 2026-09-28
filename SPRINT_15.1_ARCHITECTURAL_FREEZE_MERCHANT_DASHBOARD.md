# SPRINT 15.1 — ARCHITECTURAL FREEZE CERTIFICATE
**BlueSystem Delivery Enterprise v2.1**
**Módulo: Merchant Operations Dashboard (Enterprise Operations Center - EOC)**

---

## 📌 Document Metadata
- **System**: BlueSystem Delivery Enterprise Edition
- **Version**: 2.1.0-FROZEN
- **Sprint**: Sprint 15.1
- **Module**: Merchant Operations Dashboard (EOC)
- **Author**: Senior Lead Software Architect & Systems Auditor
- **Status**: **FROZEN / CERTIFIED / IMMUTABLE CORE**
- **Effective Date**: 5 de Agosto de 2026

---

## 1. Declaración de Congelamiento Oficial (Architectural Freeze)

Por la presente se declara el **CONGELAMIENTO ARQUITECTÓNICO OFICIAL (FROZEN CORE)** del **Merchant Operations Dashboard (EOC)** en la versión **Sprint 15.1**.

```
================================================================================
STATUS DE COMPONENTE: MERCHANT OPERATIONS DASHBOARD (EOC)
================================================================================
- STATUS              : ❄️ FROZEN & CERTIFIED
- MODIFICACIONES      : PROHIBIDAS (NO NEW FEATURES)
- EXCEPCIONES         : EXCLUSIVAMENTE CORRECCIÓN DE BUGS CRÍTICOS
- REFACTORIZACIÓN     : BLOQUEADA
- ESTABILIDAD         : PIEZA NATIVA ESTABLE CERTIFICADA (10 MEJORAS + 7 ADICIONES)
- BUILD VERIFICATION  : BUILD SUCCESSFUL (23 PRUEBAS UNITARIAS COMPLETADAS 100%)
================================================================================
```

---

## 2. Componentes Congelados e Inmutables

### 1. Modelos de Dominio y DTOs
- `com.example.domain.model.dashboard.MerchantDashboardWidget`
- `com.example.domain.model.dashboard.IDashboardWidget`
- `com.example.domain.model.dashboard.MerchantAlert`
- `com.example.domain.model.dashboard.TimelineActivity`
- `com.example.domain.model.dashboard.DashboardProfile`
- `com.example.domain.model.dashboard.DashboardGoal`
- `com.example.domain.model.dashboard.DashboardSnapshot`
- `com.example.domain.model.dashboard.MerchantDashboardFeatureState`

### 2. Motores y Registros de Arquitectura
- `com.example.domain.engine.dashboard.AssistantPriorityEngine`
- `com.example.domain.registry.dashboard.WidgetRegistry`

### 3. Repositorios y Servicios de Datos
- `com.example.data.repository.MerchantDashboardRepository` (ADR-003: Máx 2 Listeners)
- `com.example.data.repository.MerchantDashboardPreferenceRepository`

### 4. Capa de Presentación e Interfaz de Usuario
- `com.example.presentation.business.dashboard.MerchantDashboardViewModel`
- `com.example.presentation.business.dashboard.MerchantOperationsDashboardScreen`
- `com.example.presentation.business.BusinessDashboardScreen`

### 5. Suite de Pruebas Unitarias Certificadas (23 Clases)
- Ubicadas en `app/src/test/java/com/example/dashboard/` y `com.example.catalog/`.

---

## 3. Matriz de Funcionalidades Certificadas

1. ⭐ **Dashboard Personalizable (Notion / Shopify Style)**: Reordenar, ocultar y fijar tarjetas favoritas (*Pin to Top*).
2. 📱 **Densidades de Widget**: Modos `COMPACT`, `MEDIUM` y `EXPANDED`.
3. 🎛️ **Dashboard Layout Profiles**: Perfiles `Operación`, `Cocina`, `Ventas`, `Inventario` y `Personalizado`.
4. 🧩 **Widget Marketplace (Registry & Factory Architecture)**: Extensibilidad desacoplada.
5. 🔍 **Quick Search Unificado (Omnibox)**: Buscador global para Productos, Pedidos, Clientes y Promociones.
6. 🎯 **Widget de Meta del Día**: Barra de progreso porcentual del objetivo diario de ventas.
7. 🟢 **Widget de Salud del Sistema**: Monitoreo operacional (Firestore, Sync, Offline, Notificaciones).
8. 📊 **KPIs Históricos Comparativos**: Badges Delta en tiempo real (`Hoy vs Ayer`, `Hoy vs Semana Pasada`).
9. 🛵 **Widget de Motorizados en Ruta**: Monitoreo de repartidores activos y ETA.
10. 👥 **Widget de Clientes**: Métricas de clientes nuevos, recurrentes, VIP y reseña.
11. ⚠️ **Banner Visual Offline**: Estado offline con contador de cambios pendientes.
12. 👤 **Dashboard Snapshots por Usuario**: Persistencia por `userId` + `businessId`.

---

## 4. Firma de Certificación

El módulo **Merchant Operations Dashboard (EOC)** ha superado con éxito las pruebas de compilación en Gradle (`BUILD SUCCESSFUL`), persistencia en Firestore respetando ADR-003, y certificación visual responsive, quedando clasificado como **PIEZA NATIVA ESTABLE DEL FROZEN CORE (Sprint 15.1)**.
