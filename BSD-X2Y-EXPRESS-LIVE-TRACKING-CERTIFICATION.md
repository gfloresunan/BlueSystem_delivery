# CERTIFICACIÓN DE RASTREO EN VIVO Y MÁQUINA DE ESTADOS X→Y
## BlueSystem Delivery Enterprise v6.1.0
### Referencia: BSD-X2Y-EXPRESS-LIVE-TRACKING-CERTIFICATION

---

### 1. Resumen Ejecutivo
Se certifica la resolución del ciclo completo de asignación, navegación y seguimiento en tiempo real para el servicio **Delivery Express (X→Y)**.
Se eliminaron las fallas de navegación circular en backstack, la inyección de identificadores artificiales (`courierId = "assigned"`), y la dependencia cruzada en la colección de `/orders`.

---

### 2. Cumplimiento de Directivas Arquitectónicas

#### A. Aislamiento Estricto de Dominio (/deliveryTrips SSOT)
- `/deliveryTrips/{tripId}` es la **ÚNICA fuente de verdad** del ciclo de vida de la encomienda.
- `FirebaseManager.obtenerFlujoMotorizadoAsignado(pedidoId)` y `FirebaseManager.listenToDeliveryTrip(tripId)` escuchan de forma nativa e inmediata en `/deliveryTrips`.
- Se eliminó completamente cualquier consulta o fallback a `/orders` en el flujo del cliente X→Y.

#### B. Eliminación de Identificadores Artificiales (Zero Mock IDs)
- **Corrección en `MainActivity.kt`**: La navegación desde `EsperandoRepartidorScreen` ejecuta `popUpTo(Screen.EsperandoRepartidor.route) { inclusive = true }`, evitando que la tecla Atrás devuelva al cliente al radar de espera cuando el motorizado ya aceptó.
- **Corrección en `NotificationRouter.kt`**: Las notificaciones con `action == "COURIER_ASSIGNED"` o con `tripId` navegan a `Screen.TrackingPedido.createRoute(targetTripId, "")`.
- **Descubrimiento Reactivo**: `TrackingScreen` observa el documento canónico en `/deliveryTrips` para resolver reactivamente el UID real del motorizado (`assignedCourierId`). Nunca se inyecta `"assigned"` ni cadenas simuladas.

#### C. Telemetría GPS en Vivo y Desconexión Controlada
- `TrackingScreen` y `ClienteTrackingMap` se suscriben a `/ubicaciones_repartidores/{resolvedCourierId}` con animación suave mediante `MarkerAnimationUtils.animarMarcador`.
- Se implementó la regla de desconexión de telemetría: al alcanzar el estado `DELIVERED`, `COMPLETED` o `CANCELLED`, la suscripción a GPS se apaga automáticamente, evitando consumo innecesario de batería y lecturas de Firestore.

---

### 3. Máquina Canónica de Estados X→Y (Progreso Visual)

```
[ PENDING ]
   └── Cliente esperando motorizado (Radar en EsperandoRepartidorScreen)
[ ASSIGNED ]
   └── Motorizado asignado (Transición automática a TrackingScreen)
[ EN_ROUTE_PICKUP ]
   └── Motorizado en camino al Origen (Punto A) -> Marcador azul cielo
[ PICKED_UP ]
   └── Paquete recolectado -> Indicador de progreso al 70%
[ IN_TRANSIT ]
   └── Motorizado en camino al Destino (Punto B) -> Marcador rojo
[ DELIVERED ]
   └── Entrega confirmada -> Desconexión de GPS y finalización exitosa
```

---

### 4. Veredicto Técnico
🟢 **CERTIFIED LIVE TRACKING**: El flujo de cliente y motorizado opera de forma fluida, atómica y reactiva sin regresiones en el ecosistema.
