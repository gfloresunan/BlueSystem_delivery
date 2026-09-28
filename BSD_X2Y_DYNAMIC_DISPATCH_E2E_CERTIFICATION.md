# ACTA DE CERTIFICACIÓN FÍSICA E2E EN DISPOSITIVOS REALES
## BSD-X2Y-DYNAMIC-DISPATCH-RADIUS-001 — BlueSystem Delivery Enterprise
### Evaluación de Campo previa a BSD-X2Y-DYNAMIC-DISPATCH-FROZEN-CORE-001

**Fecha de Generación:** 21 de Septiembre de 2026  
**APK Compilada:** [`app/build/outputs/apk/core/debug/app-core-debug.apk`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/build/outputs/apk/core/debug/app-core-debug.apk) (41.38 MB)  
**Flavor:** `coreDebug` (`com.aistudio.delivery.djweq`)  
**Backend:** Cloud Functions `onXToYTripCreated` & `xToYDispatchCronScheduler`  
**Estatus de Código:** 🔒 **CÓDIGO CONGELADO (INMUTABLE)**  

---

## 1. GUÍA RÁPIDA DE INSTALACIÓN EN HARDWARE DE PRUEBA

Para instalar el APK compilado en el dispositivo o dispositivos conectados mediante ADB:
```bash
adb install -r "app/build/outputs/apk/core/debug/app-core-debug.apk"
```

---

## 2. HOJA DE VERIFICACIÓN DE LOS 8 TOUCHPOINTS EN CAMPO

### [ ] Touchpoint 1 — Courier Cercano Dentro de 5 km (Descubrimiento Inmediato)
- [ ] **Acción:** Cliente crea un viaje X→Y desde Managua. Motorizado A con turno activo y GPS fresco está a $\le 3.2\text{ km}$ del origen X.
- [ ] **Resultado Esperado:**
  - El array `eligibleCouriers` del documento `/deliveryTrips/{tripId}` incluye el UID de Motorizado A en $< 2\text{ s}$.
  - Motorizado A recibe la notificación push FCM y la encomienda aparece en su pestaña *"Disponibles"*.
- **Evidencia Recabada:**
  - `tripId`: `_________________________`
  - `distancia_origen`: `______ km`
  - `tiempo_recepcion_fcm`: `______ segundos`

---

### [ ] Touchpoint 2 — Courier Intermedio Entre 5 y 15 km (Escalación a 3 Minutos)
- [ ] **Acción:** Cliente crea viaje. Motorizado B está a $\sim 11.5\text{ km}$ del origen X.
- [ ] **Resultado Esperado:**
  - Entre el minuto 0:00 y 2:59, Motorizado B **NO** ve la orden ni su UID está en `eligibleCouriers`.
  - Al minuto 3:00, `xToYDispatchCronScheduler` ejecuta escalación a `EXPANDED_15KM`.
  - Motorizado B es agregado a `eligibleCouriers` y recibe notificación FCM.
  - La pantalla del Cliente cambia a *"Radio ampliado 15 km"* y el círculo del mapa se amplía a 15,000 m.
- **Evidencia Recabada:**
  - `tripId`: `_________________________`
  - `distancia_origen`: `______ km`
  - `hora_escalacion_15km`: `______ (MM:SS)`

---

### [ ] Touchpoint 3 — Courier Distante Entre 15 y 30 km (Escalación a 6 Minutos)
- [ ] **Acción:** Motorizado C está a $\sim 22.0\text{ km}$ del origen X.
- [ ] **Resultado Esperado:**
  - Entre el minuto 0:00 y 5:59, Motorizado C **NO** tiene visibilidad de la orden.
  - Al minuto 6:00, el scheduler escala el viaje a `EXPANDED_30KM`.
  - Motorizado C es incorporado a `eligibleCouriers` y recibe la alerta de viaje disponible.
  - La pantalla del Cliente muestra *"Radio extendido 30 km"* y el círculo del mapa alcanza los 30,000 m.
- **Evidencia Recabada:**
  - `tripId`: `_________________________`
  - `hora_escalacion_30km`: `______ (MM:SS)`

---

### [ ] Touchpoint 4 — Sin Courier Disponible (Timeout Atómico a 10 Minutos)
- [ ] **Acción:** Ningún motorizado acepta la orden transcurridos 10 minutos.
- [ ] **Resultado Esperado:**
  - Al minuto 10:00 exacto, el scheduler cancela la orden atómicamente.
  - `/deliveryTrips/{tripId}` pasa a `status: "CANCELLED"` con `cancelReason: "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT"`.
  - En la app del Cliente se despliega el modal informativo *"Sin repartidores disponibles"*.
  - El botón *"Solicitar nuevamente"* limpia el estado y regresa permitiendo solicitar con un nuevo `tripId`.
- **Evidencia Recabada:**
  - `tripId`: `_________________________`
  - `cancelReason_registrado`: `_________________________`

---

### [ ] Touchpoint 5 — Aceptación de Courier (Dual Sync Atómico)
- [ ] **Acción:** Un motorizado elegible presiona *"Aceptar"* en su teléfono.
- [ ] **Resultado Esperado:**
  - Se ejecuta la transacción atómica sin colisiones.
  - `/deliveryTrips/{tripId}` pasa a `status: "ASSIGNED"` con `assignedCourierId = UID`.
  - `/orders/{tripId}` pasa a `status: "courier_accepted"` con `courierId = UID`.
  - Cero discrepancia ni estados intermedios entre ambas colecciones.
- **Evidencia Recabada:**
  - `tripId`: `_________________________`
  - `assignedCourierId`: `_________________________`
  - `order_status`: `_________________________`

---

### [ ] Touchpoint 6 — Resiliencia UI (Anclaje Temporal a `trip.createdAt`)
- [ ] **Acción:** Cliente crea viaje, espera 1 minuto (etapa 5 km), cierra la aplicación por completo y la vuelve a abrir a los 4 minutos y 30 segundos.
- [ ] **Resultado Esperado:**
  - El temporizador **NO** vuelve a 0:00 ni se reinicia la búsqueda desde 5 km.
  - La app calcula `now - trip.createdAt = 4 min 30 s` y se sitúa directamente en la etapa `EXPANDED_15KM` con círculo de 15,000 m.
- **Evidencia Recabada:**
  - `tiempo_mostrado_reapertura`: `______ (MM:SS)`
  - `etapa_mostrada`: `_________________________`

---

### [ ] Touchpoint 7 — Privacidad y Aislamiento EIAM
- [ ] **Acción:** Motorizado D que **NO** está en `eligibleCouriers` (ni en zona geográfica) intenta consultar el documento `/deliveryTrips/{tripId}` o reclamarlo vía API/código con el ID conocido.
- [ ] **Resultado Esperado:**
  - Firestore Security Rules deniega la lectura con `PERMISSION_DENIED`.
  - No se exponen direcciones de recogida/entrega, teléfonos ni montos cotizados.
- **Evidencia Recabada:**
  - `error_recibido`: `PERMISSION_DENIED` [ ] Sí [ ] No

---

### [ ] Touchpoint 8 — Observabilidad y Evidencia del Servidor
- [ ] **Acción:** Inspeccionar la consola de Firebase / Firestore para verificar la correlación exacta entre lo visto en la pantalla y la base de datos:
  - `tripId`: `_________________________`
  - `createdAt`: `_________________________`
  - `dispatchStage`: `_________________________`
  - `dispatchRadiusKm`: `_________________________`
  - `candidateCouriersCount`: `______`
  - `eligibleCouriers`: `[ ... ]`
  - `status`: `_________________________`
  - `acceptedAt` / `assignedAt`: `_________________________`

---

## 3. VEREDICTO FINAL DE CIERRE

Una vez completada y firmada la tabla anterior con resultado satisfactorio en los 8 puntos, se procederá inmediatamente a la emisión del documento oficial:

$$\mathbf{BSD-X2Y-DYNAMIC-DISPATCH-FROZEN-CORE-001} \quad \text{🔒🟢}$$
