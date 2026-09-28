# CERTIFICACIÓN INTEGRAL: DELIVERY EXPRESS (PUNTO A → PUNTO B / X→Y)
## BlueSystem Delivery Enterprise v6.1.0
### Referencia: BSD-X2Y-EXPRESS-FINAL-CERTIFICATION
### Proyecto Firebase: bluesystem-7c9af

---

### 1. Veredicto Oficial Ajustado

- **Estatus de Ingeniería & Compilación**: 🟢 **IMPLEMENTATION CERTIFIED + BUILD VERIFIED**
- **Estatus Operativo en Dispositivos**: 🟡 **PENDING FINAL PHYSICAL E2E VALIDATION**

> [!NOTE]
> De conformidad con el principio de certificación en dos niveles (Nivel A Técnico vs Nivel B Usuario Real), la implementación técnica, integridad de tipos, reglas de seguridad y compilación de artefactos se encuentran 100% verificados. El estatus operativo final queda supeditado a la ejecución física del protocolo **BSD-X2Y-FINAL-PHYSICAL-E2E-VALIDATION-001** en dispositivos de campo.

---

### 2. Dictamen Forense sobre Observaciones Arquitectónicas

#### A. Resolución Canónica de Parámetros: `pricePerKm` vs `perKmRate`
- **Nombre Canónico Maestro**: `pricePerKm` (utilizado en el modelo TypeScript `XToYPricingConfig`, en la función de cálculo `buildPricingSnapshot` y en el snapshot del viaje).
- **Alias Legacy Retrocompatible**: `perKmRate` (mantenido explícitamente en el backend en `getXToYPricingConfig()` y sincronizado en `/system_config/global.xToYPricing`).
- **Demostración de Compatibilidad**:
  ```typescript
  // functions/src/services/routingService.ts
  pricePerKm: typeof cfg.pricePerKm === "number" 
    ? cfg.pricePerKm 
    : (typeof (cfg as any).perKmRate === "number" ? (cfg as any).perKmRate : COSTO_POR_KM_NIO)
  ```
  Al guardar desde Admin Web, se escriben simultáneamente `pricePerKm` y `perKmRate` con el mismo valor numérico, eliminando cualquier riesgo de divergencia silenciosa.

#### B. Modelo de Inmutabilidad de `pricingSnapshot`: IMMUTABLE BY DEFAULT + CONTROLLED SUPER ADMIN OVERRIDE
- **Definición Rigurosa**: Guardar un objeto en Firestore no confiere inmutabilidad por sí mismo. En `firestore.rules` dentro de `/deliveryTrips/{tripId}` se desplegó la siguiente protección estructural:
  ```javascript
  allow update: if isAuthenticated() && (
    (!request.resource.data.diff(resource.data).affectedKeys().hasAny([
      "pricingSnapshot", "pricing", "calculatedFee", "deliveryFee", 
      "costoEnvio", "costoTotal", "baseFee", "pricePerKm", 
      "routeDistanceKm", "routeDistanceMeters", "calculationPolicy", "configVersion"
    ]) || isSuperAdmin()) && ...
  ```
- **Matriz Canónica de Permisos Post-Creación**:
  - **Cliente (`customer`)**: ❌ **BLOQUEADO** (Cero modificación de snapshot, distancia o tarifa).
  - **Motorizado (`courier`)**: ❌ **BLOQUEADO** (Cero modificación de snapshot, distancia o tarifa).
  - **Admin Estándar / Operador**: ❌ **BLOQUEADO** (Cero modificación de snapshot, distancia o tarifa).
  - **Super Admin (`super_admin`)**: ✅ **OVERRIDE CONTROLADO** (Habilitado exclusivamente para rectificación de contingencias forenses o disputas contables extraordinarias, registrándose en `/audit_events`).
- **Dictamen**: El modelo implementado es formalmente **Inmutable por defecto para todos los actores operativos ordinarios, con salvaguarda de override administrativo extraordinario para Super Admin**.

#### C. Control de Acceso Basado en Roles (RBAC) para Tarifas
- **Lectura**: Autorizada para roles operativos (`super_admin`, `admin`, `auditor`, `supervisor`, `operator`).
- **Modificación**: Restringida en frontend (inputs bloqueados, botón de guardado deshabilitado, alerta informativa) y blindada en `firestore.rules` bajo `/system_config/{configId}` permitiendo escritura **únicamente a `SUPER_ADMIN` y `ADMIN`**.

#### D. Operaciones en Vivo vs KPIs Globales en Admin Web
- Se clarificó en la interfaz que los indicadores de tarjetas representan la **Muestra Activa en Vivo (últimos 50 documentos sincronizados en tiempo real)**.
- Los históricos consolidados de largo plazo corresponden a resúmenes agregados programados bajo `/delivery_express_summaries` de conformidad con **ADR-003** para evitar sobrecostos de lectura en Firestore.

#### E. Diferenciación Visual de Fallback de Routing
- **Ruta Vial Autoritativa**: `🟢 X.XX km (Ruta vial calculada)`
- **Fallback Estimado**: `🟠 X.XX km (Distancia estimada sin red vial)`

#### F. Neutralidad en la Denominación Cartográfica
- Se descartó la aseveración financiera "$0 Maps Cost", documentándose con precisión técnica como: **"Visor Cartográfico Leaflet con proveedor de teselas CartoDB Voyager"**.

---

### 3. Evidencia Objetiva de Pruebas Unitarias (JUnit & Jest)

#### 1. Backend Cloud Functions (Jest)
- **Ejecución**: `npm --prefix functions test`
- **Resultado**:
  - Tests Suites: 1 passed
  - Tests: **66 passed**, 0 failed
  - Snapshot Tests: 0
  - Duration: 2.766 s

#### 2. Android App (JUnit Exact Report)
- **Suite**: `com.example.courier.CourierXToYDeliveryExperienceTest`
- **Ubicación del Reporte**: `app/build/reports/tests/testCoreDebugUnitTest/com.example.courier.CourierXToYDeliveryExperienceTest/index.html`
- **Métricas Forenses**:
  - Total Tests: **40**
  - Passed: **40**
  - Failures: **0**
  - Skipped: **0**
  - Duration: **0.150s**
  - Tasa de Éxito: **100%**
- **Cobertura de Casos**:
  - `testCOU01` a `testCOU05`: Decodificación y normalización de tipo `XTOY_DELIVERY`.
  - `testCOU06` a `testCOU15`: Extracción de origen (A), destino (B), snapshot financiero y polyline.
  - `testCOU16` a `testCOU25`: Transición atómica de estados `PENDING` $\to$ `ASSIGNED` $\to$ `EN_ROUTE_PICKUP` $\to$ `PICKED_UP` $\to$ `IN_TRANSIT` $\to$ `DELIVERED`.
  - `testCOU26` a `testCOU35`: Algoritmo `KM_BLOCK_2DEC` y validación de `pricingSnapshot.calculatedAmount`.
  - `testCOU36` a `testCOU40`: Resiliencia offline y descarte de identidades ficticias.

---

### 4. Protocolo Oficial de Validación en Campo: BSD-X2Y-FINAL-PHYSICAL-E2E-VALIDATION-001

Este protocolo de 12 pasos es la prueba definitiva requerida para transicionar de `🟡 PENDING FINAL PHYSICAL E2E VALIDATION` a `🟢 PRODUCTION CERTIFIED`:

| Paso | Escenario / Touchpoint | Comportamiento Esperado | Criterio de Aceptación |
|:---:|---|---|---|
| **01** | Cotización X→Y (15,532 m) | Cálculo en cliente con red vial real | Presenta 15.53 km y C$ 267.95 |
| **02** | Creación del Viaje | Escritura atómica en `/deliveryTrips/{tripId}` | Contiene `pricingSnapshot` inmutable |
| **03** | Trazo Vial Inicial | Renderizado en `EsperandoRepartidorScreen` | Polilínea azul sigue calles reales (no recta) |
| **04** | Aceptación por Repartidor | Transición de estado en Courier App | PENDING $\to$ ASSIGNED; Customer desbloquea tracking |
| **05** | Notificación Push (FCM) | Recepción con app abierta, segundo plano o cerrada | Al pulsar, abre directamente `ClienteTrackingMap` |
| **06** | Telemetría GPS en Vivo | Movimiento físico del motorizado en campo | Marcador de moto se desplaza suavemente en mapa |
| **07** | Llegada al Origen | Confirmación de recogida por el repartidor | EN_ROUTE_PICKUP $\to$ PICKED_UP |
| **08** | Tránsito al Destino | Navegación hacia Punto B | Polyline se contextualiza dinámicamente hacia B |
| **09** | Entrega Satisfactoria | Confirmación final en Courier App | IN_TRANSIT $\to$ DELIVERED; Customer y Admin actualizados |
| **10** | Cierre de Telemetría | Desconexión limpia del listener | Se cancela la escucha de `/ubicaciones_repartidores` |
| **11** | Trazabilidad en Admin Web | Módulo Delivery Express X→Y | El viaje aparece con origen, destino, tarifa y mapa |
| **12** | Inmutabilidad Financiera | Modificación de tarifa C$15 $\to$ C$20/km | Viajes nuevos usan C$20; el viaje previo conserva C$15 |

---

*Dictamen emitido por: Senior Developer & Auditor de BlueSystem Delivery Enterprise*
