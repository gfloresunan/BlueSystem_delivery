# Matriz de Sincronización Arquitectónica y Fuente Única de Verdad (SSOT)
**BlueSystem Delivery Enterprise v2.1 — Módulo Comercio & Panel Admin**

---

## 1. Contexto Arquitectónico y Problemática de Doble Estado

En el sistema existen dos colecciones en Firestore asociadas al mismo ID de comercio (`businessId` / `restaurantId`):
1. `/businesses/{businessId}`: Expediente Público / Marketplace (Consumido por App Cliente, AMI / Panel Admin y Motorizados).
2. `/restaurant_settings/{restaurantId}`: Configuración Operativa Privada (Consumido por la APK del Comercio: KDS, impresoras, tiempos de preparación).

Para evitar que Web escriba en `/businesses` y la APK escriba en `/restaurant_settings` generando estados divergentes ("dos verdades desalineadas"), se establece la siguiente directiva formal de **Fuente Única de Verdad (SSOT)** y **Matriz de Sincronización por Campo**.

---

## 2. Matriz de Campos, Listeners y Flujo de Transmisión

| Campo | Nombre en `restaurant_settings` | Nombre en `businesses` | Fuente de Verdad (SSOT) | APK → Firestore | Web → Firestore | Firestore → APK | App Cliente | AMI / Admin | Regla de Sincronización / Replicación |
|---|---|---|---|---|---|---|---|---|---|
| **Nombre Comercial** | `commercialName` | `name` / `comercioNombre` / `nombre` | `businesses` (Marketplace) | ✅ (`restaurant_settings` + `businesses`) | ✅ (Escribe `businesses`) | ✅ (Escucha dual `businesses` + `restaurant_settings`) | ✅ (Renderiza tienda) | ✅ (Renderiza lista) | **Sincronización Bidireccional**. Al editar en APK se escribe en ambos docs. Al editar en Web se actualiza `businesses` y la APK lo sincroniza en tiempo real. |
| **Razón Social / Tax ID** | `legalName` | N/A (o `legalName` en EIAM) | `restaurant_settings` (Operativo) | ✅ (Escribe `restaurant_settings`) | — | ✅ (Escucha `restaurant_settings`) | — | — | Campo estrictamente operativo del expediente fiscal del comercio. |
| **Estado Abierto/Cerrado** | `isOpen` | `isOpen` | `businesses` (Marketplace / Dispatch) | ✅ (`restaurant_settings` + `businesses`) | ✅ (Escribe `businesses`) | ✅ (Escucha dual en tiempo real) | ✅ (Filtra disponibilidad en marketplace) | ✅ (Monitorea en tiempo real) | **Crítico**: Toggle global instantáneo. Tanto APK como Web escriben en `businesses.isOpen` para que el App Cliente reaccione de inmediato. |
| **Tarifa de Envío Base** | `deliveryFee` | `deliveryFee` | `restaurant_settings` (Merchant Policy) | ✅ (`restaurant_settings` + `businesses`) | ✅ (Escribe `businesses`) | ✅ (Escucha dual en tiempo real) | ✅ (Calcula subtotal en checkout) | ✅ (Audita comisiones) | **Proyección Pública**. La APK es la SSOT operativa, pero proyecta el valor en `businesses` para que el cliente no lea `restaurant_settings`. |
| **Radio de Cobertura (km)** | `maxDeliveryRadiusKm` / `deliveryRadiusKm` | `deliveryRadiusKm` | `restaurant_settings` (Operativo) | ✅ (`restaurant_settings` + `businesses`) | ✅ (Verifica cobertura) | ✅ (Escucha dual) | — (Calculado por backend geo) | — | Sincronizado a `businesses` para filtrado espacial en App Cliente. |
| **Tiempo Estimado Envío** | N/A | `deliveryTime` (ej: "20-30 min") | `businesses` (Marketplace) | — | ✅ | ✅ (Lee `businesses`) | ✅ (Badge en card) | ✅ | Proyección de UI para el marketplace. |
| **Assets Gráficos (Logo/Banner)**| N/A | `logoUrl`, `bannerUrl` | `businesses` (Marketplace) | ✅ (Vía BusinessRepository) | ✅ | ✅ | ✅ (Banner y Avatar) | ✅ | Controlado en expediente comercial público. |
| **Bandera Destacado** | N/A | `isFeatured` | `businesses` (Governance Admin) | — | ✅ (Admin update) | ✅ (Lee `businesses`) | ✅ (Sección Destacados) | ✅ | Control exclusivo de administración de la plataforma. |
| **Estado Tenant / Lifecycle** | N/A | `isActive`, `lifecycleStatus` | `businesses` (EIAM Governance) | — | ✅ (EIAM Onboarding) | ✅ | ✅ (Filtro de seguridad) | ✅ | Estado de vigencia operacional e integración EIAM v2.2. |
| **Tiempo Prep. Cocina** | `kitchenPrepTimeMinutes` | N/A | `restaurant_settings` (KDS) | ✅ | — | ✅ | — | — | Lógica interna del KDS de la APK. |
| **Auto Aceptar Pedidos** | `autoAcceptOrders` | N/A | `restaurant_settings` (Auto Dispatch) | ✅ | — | ✅ | — | — | Regla operativa interna de la APK. |
| **Impresión Térmica** | `printReceiptOnOrder` | N/A | `restaurant_settings` (Hardware) | ✅ | — | ✅ | — | — | Preferencia de integración hardware local. |
| **Timestamp Actualización** | `updatedAt` | `updatedAt` | Servidor / Sistema | ✅ | ✅ | — | — | — | Sello de tiempo para resolución de conflictos offline/online. |
| **Checksum SHA-256** | `checksumSha256` | N/A | `restaurant_settings` (Engine Integrity) | ✅ | — | ✅ (Verifica hash) | — | ✅ (Auditoría) | Hash generado por `RestaurantSettingsEngine` para validar integridad de datos. |
| **Versión de Esquema** | `version` | N/A | `restaurant_settings` (Migration Engine) | ✅ | — | ✅ | — | — | Control de migraciones de esquema de configuración. |

---

## 3. Patrón de Implementación Técnico en APK (Dual Listener & Dual Write)

Para garantizar la paridad sin violar el presupuesto ADR-003 (Máximo 2 listeners activos por sesión en Firestore):

### 3.1 Dual Listener en `RestaurantSettingsRepository.kt`
- **Listener 1**: `/restaurant_settings/{restaurantId}` -> Carga atributos operativos internos.
- **Listener 2**: `/businesses/{restaurantId}` -> Carga atributos sincronizados (`comercioNombre`/`name`, `isOpen`, `deliveryFee`, `deliveryRadiusKm`).
- **Comportamiento**: Ambos listeners combinan sus updates sobre `cachedSettings` de forma reactiva y sinérgica. Si la Web cambia `isOpen` en `/businesses/{id}`, la APK recibe el cambio en el Listener 2 de forma inmediata.

### 3.2 Dual Write en `RestaurantSettingsRepository.saveRestaurantSettings()`
- Al guardar desde la APK, se realiza una escritura en `/restaurant_settings/{id}` con el payload completo.
- Simultáneamente, se realiza un `set(..., SetOptions.merge())` en `/businesses/{id}` actualizando:
  - `name`: `settings.commercialName`
  - `comercioNombre`: `settings.commercialName`
  - `deliveryFee`: `settings.deliveryFee`
  - `isOpen`: `settings.isOpen`
  - `deliveryRadiusKm`: `settings.maxDeliveryRadiusKm`
  - `updatedAt`: `Timestamp.now()`

---

## 4. Criterios de Aceptación y Certificación E2E
1. **Edición Web → Reflejo APK**: Un cambio en `isOpen` o `deliveryFee` desde Merchant Web o Panel Admin en `/businesses/{id}` debe actualizar el `UIState` en la APK en < 500ms.
2. **Edición APK → Reflejo Web & Cliente**: Un cambio en `isOpen` o `commercialName` desde la APK debe reflejarse atómicamente en `/businesses/{id}` y ser visible de inmediato en App Cliente y AMI.
3. **Respeto a Presupuesto ADR-003**: La APK utiliza exactamente **2 listeners activos** en Firestore (`restaurant_settings` + `businesses`).
