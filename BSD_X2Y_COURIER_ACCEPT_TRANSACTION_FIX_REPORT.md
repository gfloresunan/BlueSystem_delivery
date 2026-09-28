# REPORTE DE CORRECCIÓN QUIRÚRGICA: TRANSACCIÓN FIRESTORE X→Y
## BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001
### OBJETO 1: REORDENAMIENTO TRANSACCIONAL DE LECTURAS Y ESCRITURAS (READS UPFRONT)

---

## 1. RESUMEN DE LA INTERVENCIÓN

- **Incidente:** `BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001`
- **Dominio:** BlueSystem Delivery — Delivery Express X→Y
- **Servicio:** `X_TO_Y_DELIVERY`
- **Plataforma:** Android Courier (`app`)
- **Archivo Modificado:** [`app/src/main/java/com/example/FirebaseManager.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)
- **Funciones Intervenidas:**
  1. `aceptarPedido(pedidoId: String, motorizadoId: String)` ([Líneas 935–1020](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L935-L1020))
  2. `claimTripAtomically(tripId: String, courierId: String, courierName: String)` ([Líneas 135–182](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L135-L182))
- **Estatus:** 🟢 **CORREGIDO, COMPILADO Y CERTIFICADO**.

---

## 2. DETALLE DE LOS CAMBIOS QUIRÚRGICOS APLICADOS

### 2.1. Corrección en `aceptarPedido()`

Se reestructuró la transacción `db.runTransaction` en 3 fases secuenciales estrictas:

```kotlin
db.runTransaction { transaction ->
    // --- FASE 1: TODAS LAS LECTURAS (READS UPFRONT) ---
    val balanceSnap = transaction.get(balanceDocRef)
    val courierSnap = transaction.get(courierDocRef)
    val courierProfileSnap = transaction.get(courierProfileRef)
    val orderSnap = transaction.get(orderDocRef)
    val tripSnap = transaction.get(tripDocRef) // ⬅️ Movido antes de cualquier write

    // --- FASE 2: VALIDACIONES IN-MEMORY ---
    if (!orderSnap.exists() && !tripSnap.exists()) {
        throw Exception("El pedido o encomienda $pedidoId no fue encontrado.")
    }
    // Validaciones de balance financiero...
    // Validaciones de tenant y municipio...
    // Validaciones de status y lock anti-race...

    // --- FASE 3: TODAS LAS ESCRITURAS (WRITES) ---
    val now = com.google.firebase.Timestamp.now()
    if (orderSnap.exists()) {
        transaction.update(orderDocRef, mapOf(
            "status" to "courier_accepted",
            "estado" to "aceptado_por_courier",
            "courierPhase" to 1,
            "assignedCourierId" to resolvedMotorizadoId,
            "motorizadoId" to resolvedMotorizadoId,
            "acceptedAt" to now,
            "updatedAt" to now
        ))
    }

    if (tripSnap.exists()) {
        transaction.update(tripDocRef, mapOf(
            "status" to "ASSIGNED",
            "estado" to "asignado",
            "assignedCourierId" to resolvedMotorizadoId,
            "courierId" to resolvedMotorizadoId,
            "motorizadoId" to resolvedMotorizadoId,
            "acceptedAt" to now,
            "updatedAt" to now
        ))
    }
}.await()
```

### 2.2. Corrección en `claimTripAtomically()`

Se eliminó la lectura tardía de `orderRef` en la línea 166 y se agrupó al inicio:

```kotlin
db.runTransaction { transaction ->
    // --- FASE 1: TODAS LAS LECTURAS (READS UPFRONT) ---
    val snapshot = transaction.get(tripRef)
    val orderSnap = transaction.get(orderRef) // ⬅️ Movido antes de la primera mutación

    // --- FASE 2: VALIDACIONES IN-MEMORY ---
    if (!snapshot.exists()) return@runTransaction false
    // Lock contra cancelación/timeout...
    // Lock contra segundo motorizado...

    // --- FASE 3: TODAS LAS ESCRITURAS (WRITES) ---
    val now = com.google.firebase.Timestamp.now()
    transaction.update(tripRef, mapOf(
        "courierId" to courierId,
        "assignedCourierId" to courierId,
        "courierName" to courierName,
        "status" to "ASSIGNED",
        "estado" to "asignado",
        "assignedAt" to now,
        "acceptedAt" to now,
        "updatedAt" to now
    ))

    if (orderSnap.exists()) {
        transaction.update(orderRef, mapOf(
            "courierId" to courierId,
            "assignedCourierId" to courierId,
            "motorizadoId" to courierId,
            "driverName" to courierName,
            "motorizadoNombre" to courierName,
            "status" to "courier_accepted",
            "estado" to "aceptado_por_courier",
            "acceptedAt" to now,
            "updatedAt" to now
        ))
    }
    true
}.await()
```

---

## 3. GARANTÍAS TÉCNICAS VERIFICADAS

1. **Cumplimiento de Contrato Firestore:** 100% de los `transaction.get()` se ejecutan antes del primer `transaction.update()`. Cero excepciones `Firestore transactions require all reads to be executed before all writes`.
2. **Atomicidad Dual Sync:** Cuando existe `/orders/{id}` como mirror de `/deliveryTrips/{id}`, ambos se actualizan de forma indivisible.
3. **Anti-Race Concurrency Lock:** Verificación in-memory de `assignedCourierId` previa a mutación. Si dos Couriers intentan reclamar simultáneamente, el segundo es rechazado de inmediato.
4. **Cero Mutaciones Externas:** No se tocaron `firestore.rules`, ni el Dispatch Engine, ni Cloud Functions.
