# ADR-024: Courier Real Road Routing, Road Distance & Navigation ETA Freeze

## Protocolo de Registro: `BSD-COURIER-REAL-ROAD-ROUTING-ETA-FREEZE-001`
- **Proyecto:** BlueSystem Delivery Enterprise
- **Plataforma:** Android Native — Kotlin / Jetpack Compose
- **Módulo:** Courier / Motorizado
- **Dominio:** Commerce Delivery — `/orders/{orderId}`
- **Protocolo Base Protegido:** `BSD-COURIER-REAL-ROAD-ROUTING-ETA-001`
- **Estado Oficial:** 🔒 **FROZEN / PROTECTED**
- **Modo:** **STRICT CODE FREEZE / ZERO UNAUTHORIZED MUTATION / ZERO REGRESSION**

---

## 1. OBJETIVO
Congelar y blindar formalmente todos los componentes, lógica, UX, contratos y comportamiento certificados mediante el protocolo de ingeniería:
`BSD-COURIER-REAL-ROAD-ROUTING-ETA-001`

La implementación queda declarada oficialmente:
🟢 **FULLY CERTIFIED / PRODUCTION-READY**

A partir de este momento, ningún agente, desarrollador, proceso automatizado, refactorización o nueva funcionalidad puede modificar, sustituir, simplificar, eliminar o alterar este subsistema sin una autorización explícita mediante un nuevo protocolo de intervención formal.

---

## 2. ALCANCE EXACTO DEL FREEZE
El freeze protege específicamente la navegación vial real:
- **Fase 1:** Courier Actual → Comercio
- **Fase 2:** Comercio → Cliente
ambas mediante geometría vial autoritativa que sigue las calles físicas de la ciudad.

### Componentes y Artefactos Blindados:
1. **Motores de Routing:**
   - `RealRoutingEngine.kt`: Google Routes API v2 REST con codificación JSON, header `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline`, polyline encoding y parseo de duraciones en segundos ISO.
   - `StreetRoutingEngine.kt`: Motor de contingencia vial OSRM (Open Source Routing Machine) vía endpoint `/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=polyline`.
   - `MapIntelligenceEngine.kt`: Orquestador de alta resiliencia y cálculo de desvíos espaciales.
   - `RouteQualityEngine.kt`: Validador de curvatura, continuidad geométrica y densidad de waypoints.
   - `MapCostOptimizationPolicy.kt`: Políticas de contención de costos de API.
2. **Modelos y Repositorios:**
   - `CourierRouteModels.kt`: `RoadRoute`, `RouteLocation`, `RouteStep`, `RouteStatus`, `RouteFailureReason`, `CoordinatesValidationResult`.
   - `CourierRoutingRepository.kt`: Repositorio con gestión de caché en memoria (`routeCache`), mitigación de fallos y emisión de flujos reactivos.
   - `CourierRouteViewModel.kt`: Estado reactivo Compose, debounce de recálculo y control de lifecycle.
3. **Superficies de Usuario (UI/UX):**
   - `RutaActivaScreen.kt`:
     - Header de navegación vial (`Fase 1: En Ruta al Comercio` / `Fase 2: En Ruta al Cliente`) con indicador en tiempo real de `operationalRouteDistanceKm` y `routeEtaMinutes`.
     - Integración cartográfica con Google Maps: Polyline vial real, cámara adaptativa con padding seguro y marcadores de origen/destino.
     - Botón flotante de recentrado de cámara: `[ ◎ ]`.
     - Tarjeta de recogida y tarjeta de entrega con comportamiento dinámico: colapsadas durante navegación (`[ ▴ Ver pedido ]` / `[ ▴ Ver entrega ]`) y auto-desplegadas al arribar dentro de geocerca (< 50m).
   - `PedidosEntrantesScreen.kt`: Integración y rendering de polylines viales reales para pedidos en fase de aceptación.
4. **Métricas Operacionales Blindadas:**
   - `operationalRouteDistanceKm`: Distancia vial real recorrida a través de la malla vial.
   - `routeEtaMinutes`: Tiempo estimado de llegada calculado dinámicamente por los motores viales.
5. **Estados de Control Operativo:**
   - `NO_ROUTE_AVAILABLE`: Estado controlado cuando falla el pipeline de routing.
   - `NO_VALID_COORDINATES`: Estado controlado cuando no se cuenta con coordenadas válidas.

---

## 3. PROHIBICIÓN ABSOLUTA DE VOLVER A LA POLYLINE LINEAL
Queda terminantemente prohibido volver al comportamiento rudimentario anterior:
```text
Origin ────────────────────────────────────── Destination (LÍNEA RECTA PROHIBIDA)
```
La ruta certificada debe transcurrir siempre a través de la infraestructura vial:
```text
Origin → calle → avenida → giro → calle → Destination
```
No se permite ninguna modificación que vuelva a utilizar una línea directa como ruta de navegación en el módulo de repartidor.

---

## 4. PROTECCIÓN DE COORDENADAS
Queda congelada la regla estricta de validación previa:
```text
Coordenadas Válidas (lat ≠ null, lng ≠ null, lat ≠ 0.0, lng ≠ 0.0)
       ↓
Solicitud de Routing Vial
```
Si las coordenadas son nulas, `0.0 / 0.0`, fuera de rango o inexistentes, el subsistema debe permanecer obligatoriamente en:
`NO_VALID_COORDINATES`
y mostrar el estado controlado correspondiente.

> [!CAUTION]
> **PROHIBICIÓN ESTRICTA:** Queda prohibido reintroducir fallbacks con coordenadas artificiales como "Managua Centro" (`12.1364, -86.2514`) o cualquier otra coordenada sintética. No se permite ningún fallback geográfico inventado.

---

## 5. PROTECCIÓN DEL PIPELINE DE FALLBACK RESILIENTE
El pipeline de resolución vial queda blindado en su orden canónico:
```text
NIVEL 1: RealRoutingEngine (Google Routes API v2)
           ↓ (si falla o timeout)
NIVEL 2: StreetRoutingEngine (OSRM Vial)
           ↓ (si falla o red degradada)
NIVEL 3: Última ruta vial válida en caché
           ↓ (si no existe previa)
NIVEL 4: Estado controlado NO_ROUTE_AVAILABLE
```
**PROHIBIDO:** Agregar líneas rectas como fallback de representación de ruta. Si no existe una ruta vial disponible, debe comunicarse explícitamente el estado degradado al motorizado.

---

## 6. PROTECCIÓN DE LA DISTANCIA OPERACIONAL
Queda congelado `operationalRouteDistanceKm` como la distancia operacional vial oficial mostrada al motorizado. Esta distancia representa los kilómetros reales estimados que recorrerá siguiendo la red vial.

> [!WARNING]
> **PROHIBIDO:** Utilizar la fórmula de Haversine como sustituto de la distancia vial mostrada al Courier en su navegación. Haversine podrá continuar existiendo para cálculos geográficos preliminares y filtros de proximidad, pero jamás podrá sustituir `operationalRouteDistanceKm` en la interfaz de navegación activa.

---

## 7. PROTECCIÓN DEL ESTIMATED TIME OF ARRIVAL (ETA)
Queda congelado `routeEtaMinutes` como indicador operacional de tiempo estimado de recorrido.
La interfaz de usuario no podrá sustituirlo arbitrariamente por:
- Estimaciones estáticas de `distancia / velocidad fija`.
- Valores hardcodeados ficticios (ej. `3 min`, `5 min`, `10 min`).

El ETA debe proceder obligatoriamente del cálculo autoritativo del motor de routing activo.

---

## 8. POLÍTICA DE CONTROL DE COSTOS DE MAPAS
Queda congelada la política de desacoplamiento de telemetría:
```text
GPS Telemetry ≈ cada 5 segundos
             ≠
Routing Calculation ≠ cada 5 segundos
```
El recálculo de rutas se encuentra estrictamente condicionado por:
- `MAX_ALLOWED_DEVIATION_METERS = 200m`: Solo se recalcula si el motorizado se aparta más de 200 metros del trazado vial proyectado.
- `RECALC_DEBOUNCE = 30 segundos`: Intervalo mínimo obligatorio entre solicitudes consecutivas de recálculo.
- Inicio formal de fase (Fase 1 al aceptar orden, Fase 2 al confirmar recolección).
- Recálculo manual solicitado explícitamente por el usuario.

**PROHIBIDO:** Convertir la telemetría GPS en solicitudes continuas de routing o implementar polling agresivo hacia las APIs de rutas.

---

## 9. PROTECCIÓN DE FASE 1: EN RUTA AL COMERCIO
Queda congelada la navegación de Fase 1:
- **Trayecto:** Posición actual del Courier → Localización del Comercio.
- **Semántica Visual:** Polyline en color **Violeta** (`#7C3AED` / `#8B5CF6`).
- **Comportamiento:** Ajuste automático de cámara a la geometría vial, marcador en origen y destino, botón de recentrado visible, tarjeta de pedido colapsada con toggle `[ ▴ Ver pedido ]` y sensor de geocerca (< 50m).

---

## 10. PROTECCIÓN DE FASE 2: EN RUTA AL CLIENTE
Queda congelada la navegación de Fase 2:
- **Trayecto:** Comercio → Domicilio del Cliente.
- **Semántica Visual:** Polyline en color **Verde** (`#059669` / `#10B981`).
- **Comportamiento:** Ajuste automático de cámara a la geometría vial, marcador en origen y destino, botón de recentrado visible, tracking activo, tarjeta de entrega colapsada con toggle `[ ▴ Ver entrega ]`, sensor de geocerca (< 50m), panel de cobro y confirmación final de entrega.

---

## 11. PROTECCIÓN DE LA SEMÁNTICA CROMÁTICA
- **Fase 1 (Comercio):** 🟣 **Violeta**
- **Fase 2 (Cliente):** 🟢 **Verde**

Queda prohibido alterar la semántica cromática de las rutas viales sin un protocolo específico de diseño UX.

---

## 12. PROTECCIÓN DEL HEADER DE NAVEGACIÓN
El encabezado operacional de navegación en `RutaActivaScreen.kt` queda congelado:
- Muestra el estado activo: `Fase 1: En Ruta al Comercio` o `Fase 2: En Ruta al Cliente`.
- Muestra dinámicamente `Distancia Real (km)` + `ETA (min)`.
- Queda prohibido eliminar estos indicadores o sustituirlos por información ajena al subsistema vial certificado.

---

## 13. PROTECCIÓN DEL BOTÓN DE RECENTRADO DE CÁMARA
El botón flotante `[ ◎ ]` queda congelado como control prioritario para recentrar instantáneamente el viewport de Google Maps sobre la posición GPS actual del repartidor.
Queda prohibido eliminarlo o bloquear el control manual de la cámara por parte del motorizado.

---

## 14. PROTECCIÓN DE LA TARJETA DE RECOGIDA (COMERCIO)
La tarjeta `PUNTO DE RECOGIDA (COMERCIO)` queda blindada:
- **Durante navegación:** Permanece colapsada/oculta para maximizar la visibilidad del mapa cartográfico vial, accesible mediante el botón expansor `[ ▴ Ver pedido ]`.
- **Al arribar al comercio:** La geocerca (< 50m) despliega automáticamente la tarjeta mostrando el botón de acción: `ESTOY EN EL COMERCIO / CONFIRMAR RECOGIDA`.
- **PROHIBICIÓN:** Prohibido eliminar la tarjeta del flujo de recolección.

---

## 15. PROTECCIÓN DE LA TARJETA DE ENTREGA (CLIENTE)
La tarjeta `HAS LLEGADO AL DESTINO (CLIENTE)` queda blindada:
- **Durante navegación:** Permanece colapsada/oculta para maximizar la visibilidad de la ruta, accesible mediante `[ ▴ Ver entrega ]`.
- **Al arribar al cliente:** La geocerca (< 50m) despliega automáticamente la tarjeta mostrando el desglose financiero, cobro en efectivo y confirmación de entrega.
- **PROHIBICIÓN:** Prohibido eliminar la tarjeta del flujo de entrega.

---

## 16. PROTECCIÓN DEL COMPORTAMIENTO DE GEOCERCA (< 50M)
Queda congelado el radio de detección de geocerca a **50 metros**:
```text
Distancia al Destino < 50m
       ↓
Despliegue Automático de Tarjeta (Recogida o Entrega)
       ↓
Acción Humana Explícita del Motorizado
```
> [!IMPORTANT]
> La entrada en la geocerca **NUNCA** constituye una confirmación o cierre automático del pedido. Requiere obligatoriamente la confirmación física y explícita del motorizado presionando el botón correspondiente.

---

## 17. PROTECCIÓN DEL CONTRATO TELEMÉTRICO GPS
El contrato de telemetría en Firestore:
`/ubicaciones_repartidores/{courierId}`
funciona de forma continua e independiente de los motores de routing.
- **PROHIBIDO:** Modificar la frecuencia de emisión del GPS del motorizado (5s foreground, 60s background) para intentar resolver requerimientos de routing.
- **Principio Inviolable:** `GPS Telemetry ≠ Routing Requests`.

---

## 18. PROTECCIÓN DEL TRACKING DEL CLIENTE Y CONTROL TOWER
Las aplicaciones consumidoras (Customer App, Merchant Web y Control Tower en `/panel-admin`) deben continuar consumiendo la telemetría en tiempo real desde `/ubicaciones_repartidores/{courierId}` sin ninguna alteración ni disrupción en sus listeners.

---

## 19. PROTECCIÓN ABSOLUTA DE LA INTEGRIDAD FINANCIERA
Este freeze protege explícitamente la inmutabilidad de todas las magnitudes financieras:
- `total`, `subtotal`, `deliveryFee`
- `cashReceived`, `changeGiven`, `cashDiscrepancy`
- `courierEarnings`, `platformCommission`, `merchantPayout`
- Colección `/financial_events`

> [!CAUTION]
> **REGLA DE ORO DE INMUTABILIDAD FINANCIERA:**  
> La distancia vial jamás podrá recalcular ni mutar el `deliveryFee`, la comisión de plataforma ni los ingresos del repartidor:
> - `operationalRouteDistanceKm` ⇏ `deliveryFee`
> - `operationalRouteDistanceKm` ⇏ `courierEarnings`
> - `operationalRouteDistanceKm` ⇏ `commission`  
> 
> **Routing = Información Operacional de Asistencia Vial.**  
> **Finance = Dominio Financiero Inmutable gestionado por Cloud Functions.**

---

## 20. PROTECCIÓN DEL COBRO EN EFECTIVO
Queda completamente congelado el flujo de cobro en efectivo en `RutaActivaScreen.kt`:
```text
TOTAL A COBRAR
      ↓
EFECTIVO RECIBIDO (cashReceived)
      ↓
CÁLCULO REACTIVO DE CAMBIO / VUELTO
      ↓
VALIDACIÓN ESTRICTA (cashReceived >= total)
      ↓
CONFIRMACIÓN DE ENTREGA Y REGISTRO ATÓMICO
```
- Se bloquea la confirmación si `cashReceived < total`.
- No modificar el cálculo de cambio, insuficiencia, conciliación ni almacenamiento de comprobantes.

---

## 21. PROTECCIÓN DE LA MÁQUINA DE ESTADOS COMERCIAL
El subsistema de routing no puede crear ni registrar nuevos estados comerciales en la orden.
**Queda terminantemente prohibido** incorporar valores ficticios como:
`ROUTING`, `NAVIGATING`, `CALCULATING_ROUTE`, `ROUTE_READY`, `ROUTE_UPDATED`
dentro del campo `order.status`.
La navegación vial debe operar exclusivamente como una capa visual y operacional desacoplada.

---

## 22. PROTECCIÓN DEL FLEET CORE
Queda prohibido alterar los contratos de asignación de flota:
- `claimOrderAtomically` / `claimOrderCallable`
- Reglas de elegibilidad de flota (`FleetEligibilityEngine`)
- Despacho y asignación transaccional

El routing se activa únicamente después de que el pedido ha sido asignado válidamente al repartidor. La asignación es 100% independiente del subsistema visual de navegación.

---

## 23. PROTECCIÓN DE NOTIFICACIONES FCM
No modificar:
- Tokens de dispositivos (`/user_devices`)
- Dispatch de notificaciones push
- Listeners de mensajería en segundo plano
- Eventos de asignación y entrega

---

## 24. PROTECCIÓN DEL DOMINIO X→Y (DELIVERY 2.0)
Este freeze establece una barrera infranqueable entre dominios:
- `/deliveryTrips` queda 100% fuera de cualquier cambio.
- `SolicitarEnvioScreen.kt`, motor de cotización Haversine ($35 + km \times $15) y ciclo de vida de viajes quedan blindados e inalterados (ADR-015).

---

## 25. PROTECCIÓN DE DEPENDENCIAS Y MANIFIESTOS
Queda prohibido modificar:
- Archivos Gradle (`build.gradle.kts`, `settings.gradle.kts`)
- `AndroidManifest.xml`
- Versiones de Google Play Services Maps SDK u OkHttp

La certificación de este subsistema fue lograda exitosamente utilizando las dependencias nativas preexistentes sin agregar librerías de terceros adicionales.

---

## 26. REGLA DE NO REFACTORIZACIÓN
Aunque futuros agentes encuentren código que califiquen de duplicado, antiguo, poco elegante o mejorable:
**NO PODRÁN REFACTORIZARLO SI PERTENECE AL SUBSISTEMA CONGELADO.**

> **Principio Canónico:**  
> *Funciona + está certificado = NO TOCAR.*  
> No se acepta la premisa "ya que estamos aquí..." para introducir modificaciones adicionales.

---

## 27. PROTOCOLO OBLIGATORIO PARA CUALQUIER CAMBIO FUTURO
Cualquier propuesta de modificación sobre los componentes congelados requerirá la apertura de un nuevo protocolo de ingeniería formal (ej. `BSD-COURIER-REAL-ROAD-ROUTING-ETA-002`) con los siguientes 16 requisitos obligatorios:
1. Motivo técnico y justificación del cambio.
2. Componente exacto afectado.
3. Análisis formal de impacto.
4. Causa raíz comprobada con evidencia objetiva.
5. Lista de archivos específicos afectados.
6. Comportamiento actual documentado.
7. Comportamiento propuesto documentado.
8. Evaluación matricial de riesgos.
9. Impacto financiero comprobado (debe ser NULO).
10. Impacto en Fleet Core (debe ser NULO).
11. Impacto en Customer App (debe ser NULO).
12. Impacto en telemetría GPS (debe ser NULO).
13. Impacto en notificaciones FCM (debe ser NULO).
14. Estrategia de rollback paso a paso.
15. Suite de pruebas unitarias automatizadas.
16. Certificación en dispositivo físico real.

**Sin este protocolo completo y aprobado: PROHIBIDO MODIFICAR.**

---

## 28. REGLA DE AUTORIZACIÓN HUMANA
Ningún agente cuenta con autorización implícita o delegada para modificar el módulo congelado. Frases como *"es una pequeña mejora"*, *"es necesario para limpiar el código"* o *"no debería afectar nada"* son nulas y violan la gobernanza del proyecto. Se exige orden humana explícita, separada y documentada.

---

## 29. DETECCIÓN DE INTEGRIDAD DE COMPONENTES CONGELADOS
Los siguientes archivos forman el inventario blindado auditado:
- `app/src/main/java/com/example/RutaActivaScreen.kt`
- `app/src/main/java/com/example/domain/model/courier/CourierRouteModels.kt`
- `app/src/main/java/com/example/domain/model/courier/MapCostOptimizationPolicy.kt`
- `app/src/main/java/com/example/data/repository/courier/CourierRoutingRepository.kt`
- `app/src/main/java/com/example/presentation/courier/CourierRouteViewModel.kt`
- `app/src/main/java/com/example/domain/engine/RealRoutingEngine.kt`
- `app/src/main/java/com/example/domain/engine/navigation/StreetRoutingEngine.kt`
- `app/src/main/java/com/example/domain/engine/courier/MapIntelligenceEngine.kt`
- `app/src/main/java/com/example/domain/engine/courier/RouteQualityEngine.kt`
- `app/src/test/java/com/example/location/CourierRoutingRepositoryTest.kt`
- `app/src/test/java/com/example/location/RealRoutingEngineTest.kt`
- `app/src/test/java/com/example/courier/MapIntelligenceEngineTest.kt`

Cualquier mutación no autorizada sobre estos archivos constituye una **VIOLACIÓN CRÍTICA DE CODE FREEZE (`🔴 FROZEN VIOLATION`)** y debe ser revertida de forma inmediata.

---

## 30. CERTIFICACIÓN Y EVIDENCIA TÉCNICA
Resultados de la suite de pruebas unitarias ejecutadas:
- **`MapIntelligenceEngineTest`:** 3/3 tests PASSED (0 failures, 0 errors, 0.092s)
- **`CourierRoutingRepositoryTest`:** 4/4 tests PASSED (0 failures, 0 errors, 0.014s)
- **`RealRoutingEngineTest`:** 6/6 tests PASSED (0 failures, 0 errors, 0.026s)
- **Total Suite:** 13/13 tests PASSED (100% éxito)
- **Gradle Build Task:** `:app:testCoreDebugUnitTest` 🟢 SUCCESSFUL

---

## 31. DECLARACIÓN FORMAL DE FREEZE

```text
========================================================
BSD-COURIER-REAL-ROAD-ROUTING-ETA-FREEZE-001
========================================================

STATUS:
🔒 FROZEN / PROTECTED

BASE PROTOCOL:
BSD-COURIER-REAL-ROAD-ROUTING-ETA-001

CERTIFICATION:
🟢 FULLY CERTIFIED

BUILD:
🟢 SUCCESSFUL

UNIT TESTS:
🟢 100% (13/13 PASSED)

ROUTING:
🔒 FROZEN

ROAD DISTANCE:
🔒 FROZEN

ETA:
🔒 FROZEN

PHASE 1:
🔒 FROZEN

PHASE 2:
🔒 FROZEN

CARD UX:
🔒 FROZEN

GEOFENCE:
🔒 FROZEN

GPS CONTRACT:
🔒 PROTECTED

CUSTOMER TRACKING:
🔒 PROTECTED

FINANCE:
🔒 PROTECTED

FLEET CORE:
🔒 PROTECTED

FCM:
🔒 PROTECTED

X→Y:
🔒 PROTECTED

ORDER STATE MACHINE:
🔒 PROTECTED

STATUS:
🟢 PRODUCTION-READY / FROZEN
========================================================
```

---

## 32. MANDATO FINAL PARA AGENTES FUTUROS
Antes de considerar cualquier modificación que involucre navegación o pantallas de repartidores, el agente debe ejecutar mentalmente esta compuerta de decisión:

```text
¿El cambio propuesto pertenece al subsistema BSD-COURIER-REAL-ROAD-ROUTING-ETA-001?
                              │
                  ┌───────────┴───────────┐
                  │                       │
                 SÍ                      NO
                  │                       │
                  ↓                       ↓
               🔒 STOP               Continuar análisis
                  │
                  ↓
       ¿Existe nuevo protocolo
        formal y autorizado?
                  │
            ┌─────┴─────┐
            │           │
           NO          SÍ
            │           │
            ↓           ↓
         ABORTAR     Proceder bajo nuevo protocolo
```

El subsistema certificado por **BSD-COURIER-REAL-ROAD-ROUTING-ETA-001** queda oficialmente **FROZEN / PROTECTED 🔒**.
