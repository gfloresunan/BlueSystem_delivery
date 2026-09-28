# MER 18.2 — Certificación de Fuente Única de la Verdad (SSOT Certification)
**Auditoría Física E2E Integral — Módulo Comercio BlueSystem Delivery Enterprise**  
*Fecha: 14 de Septiembre de 2026*  
*Auditor: Senior Developer & Auditor Forense de BlueSystem*

---

## 1. El Conflicto Arquitectónico: `/businesses` vs `/restaurant_settings`

Durante la auditoría forense del módulo de comercios, se identificó una dualidad en la persistencia de configuración del comercio:
- **Colección A**: `/businesses/{businessId}` (Colección histórica y pública consultada por la App Cliente y Panel Admin).
- **Colección B**: `/restaurant_settings/{businessId}` (Colección operativa introducida para separar horarios granulares y preferencias internas).

Esta bifurcación introduce un riesgo potencial de pérdida de coherencia de datos (Split-Brain) si una pantalla actualiza la Colección A y otra la Colección B sin sincronización atómica garantizada.

---

## 2. Comparativa Campo por Campo

| Campo Conceptual | Colección Primaria | Colección Secundaria | Módulo que Escribe en Primaria | Módulo que Escribe en Secundaria | ¿Existe Sincronización Automática? | Veredicto Forense / Riesgo |
|---|---|---|---|---|:---:|:---:|
| **Estado Abierto/Cerrado (`isOpen`)** | `/businesses/{id}.isOpen` | `/restaurant_settings/{id}.isOpenOverride` | `MerchantOperationsDashboardScreen` (`toggleStoreStatus`) | `RestaurantSettingsCenterScreen` | ⚠️ Parcial | **Riesgo Medio (`GAP-010`)**: El toggle rápido del Dashboard solo escribe en `/businesses/{id}`, dejando `isOpenOverride` desfasado. |
| **Aceptación Automática (`autoAccept`)** | `/restaurant_settings/{id}.autoAcceptOrders` | `/businesses/{id}.autoAcceptOrders` | `RestaurantSettingsCenterScreen` | `panel-admin` | 🟢 Sí | Coherente vía batch en `RestaurantSettingsRepository`. |
| **Tiempo de Preparación Base** | `/restaurant_settings/{id}.estimatedPrepTimeMinutes` | `/businesses/{id}.averagePreparationMinutes` | `RestaurantSettingsCenterScreen` | `panel-admin` | 🟢 Sí | Coherente. `RestaurantSettingsRepository` sincroniza ambos campos. |
| **Radio de Entrega** | `/restaurant_settings/{id}.deliveryRadiusMeters` | `/businesses/{id}.deliveryRadiusKm` | `RestaurantSettingsCenterScreen` | `panel-admin` | 🟢 Sí (Conversión km $\leftrightarrow$ m) | Conversión correcta en repositorio (divide o multiplica por 1000). |
| **Horarios Semanales Detallados** | `/restaurant_settings/{id}.schedule` | Inexistente en `/businesses` | `RestaurantSettingsCenterScreen` | N/A | ⚪ Exclusivo | Correcto. La matriz completa reside únicamente en `restaurant_settings`. |
| **Alertas Sonoras y Comandas** | `/restaurant_settings/{id}.soundAlertsEnabled` | Inexistente en `/businesses` | `RestaurantSettingsCenterScreen` | N/A | ⚪ Exclusivo | Preferencia local del comercio; no requiere propagación pública. |
| **Logotipos y Banners** | `/businesses/{id}.logoUrl`, `bannerUrl` | Inexistente en `restaurant_settings` | `panel-admin` y `ProductWorkspaceScreen` | N/A | ⚪ Exclusivo | Respetado bajo ADR-020 (Sincronización atómica). |

---

## 3. Análisis de Puntos de Carrera y Divergencia

### Caso de Estudio 1: El Toggle Rápido del Dashboard (`GAP-010`)
1. En `MerchantOperationsDashboardScreen.kt`, el usuario presiona el switch "Abierto / Cerrado".
2. Se ejecuta `MerchantDashboardViewModel.toggleStoreStatus()`.
3. El ViewModel ejecuta:
   ```kotlin
   firestore.collection("businesses").document(businessId)
       .update("isOpen", newStatus, "updatedAt", FieldValue.serverTimestamp())
   ```
4. **Análisis del Fallo**: NO se actualiza `/restaurant_settings/{businessId}`.
5. **Impacto**: Si luego el comercio abre la pantalla de `RestaurantSettingsCenterScreen`, el repositorio lee `isOpenOverride` de `/restaurant_settings`, mostrando potencialmente un estado discordante con lo que ve el cliente en `/businesses`.

### Caso de Estudio 2: Consulta de la App Cliente
1. La App Cliente (`ComercioDetalleScreen.kt`) consulta **únicamente** `/businesses/{businessId}`.
2. Si el comercio modificó su horario en `/restaurant_settings` pero el proceso de sincronización en lote falló o no se ejecutó, el cliente evaluará la disponibilidad basándose únicamente en el flag `isOpen` de `/businesses`.

---

## 4. Dictamen de Integridad y Regla de Resolución

Para blindar la integridad del sistema (cumpliendo con la directiva de Gobernanza y ADR-003):

1. **Definición de Canonicidad**:
   - **`/businesses/{businessId}` es la Canónica Pública (SSOT Pública)** para: `isOpen`, `deliveryRadiusKm`, `averagePreparationMinutes`, `logoUrl`, `bannerUrl`.
   - **`/restaurant_settings/{businessId}` es la Canónica Operativa (SSOT Operativa)** para: `schedule` (matriz de días/horas), `soundAlertsEnabled`, `printerAutoPrint`.
2. **Recomendación para MER 18.3**:
   - Centralizar todas las mutaciones de estado de apertura (`isOpen`) a través de un único método en `RestaurantSettingsRepository` que realice un **WriteBatch** indivisible sobre ambos documentos (`/businesses/{id}` y `/restaurant_settings/{id}`), erradicando las escrituras atómicas aisladas que provocan `GAP-010`.
