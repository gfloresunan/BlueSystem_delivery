# AUDITORÍA FORENSE DE CAUSA RAÍZ
## BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001
### OBJETO 1: FALLO EN TRANSACCIÓN FIRESTORE AL ACEPTAR ENCOMIENDA X→Y

---

## 1. RESUMEN EJECUTIVO DEL INCIDENTE

- **Incidente:** `BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001`
- **Dominio:** BlueSystem Delivery — Delivery Express X→Y
- **Servicio Afectado:** `X_TO_Y_DELIVERY`
- **Plataforma:** Android Courier (`app`)
- **Síntoma Clínico:** Al recibir una encomienda X→Y y pulsar **"ACEPTAR ENCOMIENDA"**, la aplicación arroja la excepción:
  ```text
  java.lang.IllegalArgumentException / com.google.firebase.firestore.FirebaseFirestoreException:
  Firestore transactions require all reads to be executed before all writes.
  ```
  El Toast de la interfaz muestra: *"No se pudo aceptar el pedido. Intente nuevamente."* y la encomienda queda sin asignar.
- **Veredicto Forense:** 🔴 **CAUSA RAÍZ CONFIRMADA CON EVIDENCIA OBJETIVA**.
  Violación estructural del contrato transaccional de Google Cloud Firestore en dos funciones clave de `FirebaseManager.kt`:
  1. `aceptarPedido()`: Se ejecuta un `transaction.update(orderDocRef)` antes de un `transaction.get(tripDocRef)`.
  2. `claimTripAtomically()`: Se ejecuta un `transaction.update(tripRef)` antes de un `transaction.get(orderRef)`.

---

## 2. RECONSTRUCCIÓN DEL FLUJO OPERATIVO REAL

A continuación se detalla la traza completa desde la emisión del despacho hasta el fallo en el dispositivo:

```text
[Cliente crea envío X→Y]
          ↓
[Escritura Dual: /deliveryTrips/{id} (Dominio B) + /orders/{id} (Mirror Operativo)]
          ↓
[FCM Multicast a Couriers Elegibles / eligibleCouriers]
          ↓
[Courier Android recibe FCM & SnapshotListener poolTripsMap]
          ↓
[PedidosEntrantesScreen muestra Modal Oferta Encomienda X→Y]
          ↓
[Courier pulsa botón "Aceptar Encomienda 📦" (PedidosEntrantesScreen.kt:1409)]
          ↓
[Ejecución de onAceptarPedido(activePedido.id)]
          ↓
[CourierMainDashboardScreen.kt:449 invoca firebaseManager.aceptarPedido(pedidoId, motorizadoId)]
          ↓
[FirebaseManager.kt:930 inicia db.runTransaction]
          ↓
  Paso 1: transaction.get(balanceDocRef)      [READ 1]  ✅ Válido
  Paso 2: transaction.get(courierDocRef)      [READ 2]  ✅ Válido
  Paso 3: transaction.get(courierProfileRef)  [READ 3]  ✅ Válido
  Paso 4: transaction.get(orderDocRef)        [READ 4]  ✅ Válido
  Paso 5: transaction.update(orderDocRef, ...) [WRITE 1] ✅ Válido
  Paso 6: transaction.get(tripDocRef)         [READ 5]  ❌ ¡FATAL EXCEPTION!
          ↓
💥 FIRESTORE SDK ABORTA:
"Firestore transactions require all reads to be executed before all writes."
          ↓
[Catch en PedidosEntrantesScreen.kt:1413 captura Throwable]
          ↓
[Toast al Courier: "No se pudo aceptar el pedido. Intente nuevamente."]
```

---

## 3. AUDITORÍA ESPECÍFICA DE CÓDIGO Y EVIDENCIA FORENSE

### 3.1. Caso 1: `FirebaseManager.kt` — Función `aceptarPedido()`

Ubicación: [`FirebaseManager.kt:930-1018`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L930-L1018)

#### Código Original Problemático:
```kotlin
// FirebaseManager.kt
db.runTransaction { transaction ->
    // READS INICIALES
    val balanceSnap = transaction.get(balanceDocRef)       // LÍNEA 932 (READ)
    val courierSnap = transaction.get(courierDocRef)       // LÍNEA 949 (READ)
    val courierProfileSnap = transaction.get(courierProfileRef) // LÍNEA 951 (READ)
    val orderSnap = transaction.get(orderDocRef)           // LÍNEA 956 (READ)

    if (orderSnap.exists()) {
        // ... validaciones ...

        // PRIMERA ESCRITURA:
        transaction.update(orderDocRef, mapOf(             // LÍNEA 987 (WRITE 1)
            "status" to "courier_accepted",
            "estado" to "aceptado_por_courier",
            "courierPhase" to 1,
            "assignedCourierId" to resolvedMotorizadoId,
            "motorizadoId" to resolvedMotorizadoId,
            "acceptedAt" to now,
            "updatedAt" to now
        ))

        // DUAL SYNC ATÓMICO: INTENTO DE LECTURA POSTERIOR A ESCRITURA
        val tripSnap = transaction.get(tripDocRef)         // LÍNEA 998 (READ DESPUÉS DE WRITE) 🚨 RUPTURA
        if (tripSnap.exists()) {
            // ...
            transaction.update(tripDocRef, mapOf(          // LÍNEA 1008 (WRITE 2)
                "status" to "ASSIGNED",
                "assignedCourierId" to resolvedMotorizadoId,
                // ...
            ))
        }
    }
}
```

#### Análisis Forense:
- En la línea 987 se invoca `transaction.update(orderDocRef, ...)`. En este instante, el estado interno de la transacción en el SDK (`Transaction.java`) pasa a marcar escrituras pendientes (`hasMutations = true`).
- En la línea 998 se invoca `transaction.get(tripDocRef)`. El SDK de Firestore verifica:
  ```java
  if (!this.mutations.isEmpty()) {
      throw new FirebaseFirestoreException(
          "Firestore transactions require all reads to be executed before all writes.",
          Code.INVALID_ARGUMENT
      );
  }
  ```
- Dado que en envíos X→Y (`MainActivity.kt:829` y `MainActivity.kt:902`) se persisten tanto `/orders/{id}` como `/deliveryTrips/{id}`, la rama `orderSnap.exists()` **siempre es verdadera**. En consecuencia, la línea 998 se ejecuta invariablemente en cada aceptación de X→Y, detonando el cierre inmediato de la transacción.

---

### 3.2. Caso 2: `FirebaseManager.kt` — Función `claimTripAtomically()`

Ubicación: [`FirebaseManager.kt:135-180`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L135-L180)

#### Código Original Problemático:
```kotlin
// FirebaseManager.kt:135
suspend fun claimTripAtomically(tripId: String, courierId: String, courierName: String): Result<Boolean> {
    return try {
        val tripRef = db.collection("deliveryTrips").document(tripId)
        val orderRef = db.collection("orders").document(tripId)
        val success = db.runTransaction { transaction ->
            val snapshot = transaction.get(tripRef)         // LÍNEA 140 (READ 1)
            if (!snapshot.exists()) return@runTransaction false
            
            // ... validaciones ...

            // PRIMERA ESCRITURA:
            transaction.update(tripRef, mapOf(              // LÍNEA 154 (WRITE 1)
                "courierId" to courierId,
                "assignedCourierId" to courierId,
                "status" to "ASSIGNED",
                // ...
            ))

            // DUAL SYNC ATÓMICO: INTENTO DE LECTURA POSTERIOR A ESCRITURA
            val orderSnap = transaction.get(orderRef)       // LÍNEA 166 (READ DESPUÉS DE WRITE) 🚨 RUPTURA
            if (orderSnap.exists()) {
                transaction.update(orderRef, mapOf(         // LÍNEA 168 (WRITE 2)
                    "status" to "courier_accepted",
                    // ...
                ))
            }
            true
        }.await()
        Result.success(success)
    }
}
```

#### Análisis Forense:
- `claimTripAtomically` adolece exactamente del mismo error estructural simétrico: lee `tripRef`, escribe `tripRef`, y luego intenta leer `orderRef` en la línea 166. Si cualquier ruta de código o subflujo invoca este método, arrojará idéntico error de orden de transacciones de Firestore.

---

## 4. INVENTARIO DE OTRAS TRANSACCIONES EN EL PROYECTO

Se ejecutó una inspección exhaustiva de todas las llamadas `runTransaction` en el código Kotlin y TypeScript del repositorio:

| Archivo | Función / Línea | Orden Reads / Writes | Estatus |
|---|---|---|:---:|
| `FirebaseManager.kt` | `assignOrder` (Línea 55) | 1 Read (`orders/{id}`), 3 Writes (`orders/{id}`) | 🟢 CONFORME |
| `FirebaseManager.kt` | `claimOrderAtomically` (Línea 110) | 1 Read (`orders/{id}`), 1 Write (`orders/{id}`) | 🟢 CONFORME |
| `FirebaseManager.kt` | `claimTripAtomically` (Línea 139) | Read 1 $\to$ **Write 1** $\to$ **Read 2** $\to$ Write 2 | 🔴 **NO CONFORME (BUG)** |
| `FirebaseManager.kt` | `updateOrderStatus` (Línea 224) | 1 Read (`orders/{id}`), 3 Writes (`orders/{id}`) | 🟢 CONFORME |
| `FirebaseManager.kt` | `aceptarPedido` (Línea 930) | Read 1-4 $\to$ **Write 1** $\to$ **Read 5** $\to$ Write 2 | 🔴 **NO CONFORME (BUG)** |
| `FirebaseManager.kt` | `rechazarPedido` (Línea 1067) | 1 Read (`orders/{id}`), 1 Write. Dual Sync fuera de tx | 🟢 CONFORME |
| `NotificationActionReceiver.kt` | `onReceive` (Línea 63) | 2 Reads (`users`, `orders`), luego Writes | 🟢 CONFORME |
| `OrganizationEngine.kt` | `addBusinessToOrg` (Línea 43) | 1 Read (`organizations`), luego Writes | 🟢 CONFORME |
| `trips.ts` | Triggers Cloud Function | `get()` previos fuera de transacción, Batch atómico | 🟢 CONFORME |
| `merchantSettlement.ts` | Callables Backend | Reads upfront, mutaciones batch al final | 🟢 CONFORME |

---

## 5. AUDITORÍA DE LECTURAS INDIRECTAS

Se verificaron exhaustivamente todas las sentencias ejecutadas dentro del bloque lambda de `runTransaction` en `aceptarPedido`:
- `balanceSnap.getBoolean(...)`, `.getString(...)`, `.getLong(...)` $\to$ **In-memory cache sobre el snapshot ya leído**. No genera I/O.
- `courierSnap.getString(...)` $\to$ **In-memory cache**.
- `courierProfileSnap.getString(...)` $\to$ **In-memory cache**.
- `orderSnap.getString(...)` $\to$ **In-memory cache**.
- No existen llamadas a repositorios, `db.collection().get()`, `FirebaseAuth`, ni llamadas suspendidas adicionales dentro de `db.runTransaction`.

---

## 6. AUDITORÍA DEL CLAIM ATÓMICO, ANTI-RACE Y DUAL-SYNC

### 6.1. Documentos Autoritativos y Estado de Transición
- **Dominio B (Canónico X→Y):** `/deliveryTrips/{tripId}`
  - Pre-claim: `status = "PENDING"`, `assignedCourierId = null` o `""`.
  - Post-claim: `status = "ASSIGNED"`, `assignedCourierId = courierUid`, `acceptedAt = serverTimestamp()`.
- **Dominio A (Mirror Operativo):** `/orders/{orderId}`
  - Pre-claim: `status = "ready"` o `"pending"`, `assignedCourierId = ""` o `null`.
  - Post-claim: `status = "courier_accepted"`, `assignedCourierId = courierUid`, `acceptedAt = serverTimestamp()`.

### 6.2. Protección Anti-Race Condition
Si el Courier A y el Courier B pulsan **"ACEPTAR ENCOMIENDA"** al mismo tiempo:
1. Firestore ejecuta las transacciones en serie optimista con bloqueo de lectura (read locks).
2. **Courier A gana el lock**:
   - `orderSnap.assignedCourierId` está vacío.
   - `tripSnap.assignedCourierId` está vacío.
   - Se ejecutan los updates en ambos documentos.
   - Transacción de Courier A hace commit $\to$ **SUCCESS**.
3. **Courier B entra al bloque de transacción**:
   - Al detectar que los documentos cambiaron, Firestore reejecuta la transacción de B con los nuevos datos comprometidos.
   - En el nuevo ciclo, B lee `orderSnap` y `tripSnap`.
   - `orderSnap.assignedCourierId == Courier_A_UID` y `tripSnap.assignedCourierId == Courier_A_UID`.
   - La condición de guarda:
     ```kotlin
     if (!existingCourier.isNullOrEmpty() && existingCourier != resolvedMotorizadoId) {
         throw Exception("Lock Atómico: El pedido ya fue aceptado por otro motorizado.")
     }
     ```
     se dispara inmediatamente antes de cualquier escritura.
   - Transacción de Courier B aborta $\to$ **REJECTED / ALREADY_ASSIGNED**.
   - Garantía matemática: **Cero riesgo de doble asignación**.

---

## 7. AUDITORÍA DE REGLAS DE SEGURIDAD (FIRESTORE RULES)

Se auditaron las reglas en [`firestore.rules:821-855`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L821-L855) para `/deliveryTrips/{tripId}` y [`firestore.rules:750-769`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L750-L769) para `/orders/{orderId}`:

1. **Lectura de DeliveryTrip:** Permitida a usuarios autenticados (`allow read: if isAuthenticated()`).
2. **Reclamo de DeliveryTrip:**
   - La regla permite `update` al Courier si:
     ```text
     currentUid() == resource.data.get("assignedCourierId", "") ||
     resource.data.get("assignedCourierId", "") == ""
     ```
   - Campos autorizados en `affectedKeys().hasOnly([...])`:
     `status`, `estado`, `assignedCourierId`, `motorizadoId`, `driverName`, `motorizadoNombre`, `acceptedAt`, `updatedAt`, `courierPhase`.
3. **Reclamo de Order (Mirror):**
   - Permitido a couriers para estados `["ready", "assigned", "courier_accepted"]` y explícitamente cuando `resource.data.serviceType == "X_TO_Y_DELIVERY"`.
   - Campos autorizados en `hasOnly([...])`:
     `status`, `estado`, `assignedCourierId`, `motorizadoId`, `acceptedAt`, `updatedAt`, `courierPhase`.
4. **Conclusión de Seguridad:**
   Las Firestore Rules están correctamente blindadas. **NO SE REQUIERE MODIFICAR NI ABRIR PERMISOS EN FIRESTORE RULES**. El fallo es 100% de secuenciación lógica en el SDK cliente Android.

---

## 8. MAPA DE CAUSA RAÍZ DEFINITIVO

```text
========================================================================================
                                     ROOT CAUSE MAP
========================================================================================

    USUARIO MOTORIZADO (Courier)
               │
               ▼  Pulsa botón "Aceptar Encomienda 📦"
    PedidosEntrantesScreen.kt (Líneas 1409 / 1411)
               │
               ▼  Invoca callback onAceptarPedido(pedidoId)
    CourierMainDashboardScreen.kt (Línea 449)
               │
               ▼  Invoca firebaseManager.aceptarPedido(pedidoId, motorizadoId)
    FirebaseManager.kt (Línea 930)
               │
               ▼  db.runTransaction { transaction ->
               │
               ├─► [READ 1] transaction.get(balanceDocRef)       (Línea 932)  ✅ OK
               ├─► [READ 2] transaction.get(courierDocRef)       (Línea 949)  ✅ OK
               ├─► [READ 3] transaction.get(courierProfileRef)   (Línea 951)  ✅ OK
               ├─► [READ 4] transaction.get(orderDocRef)         (Línea 956)  ✅ OK
               │
               ├─► [WRITE 1] transaction.update(orderDocRef, ...) (Línea 987)  ✅ OK
               │
               └─► [READ 5] transaction.get(tripDocRef)          (Línea 998)  🚨
                                                                              │
                                                                              ▼
                                                    🔴 ROOT CAUSE CONFIRMADA:
                                                    Archivo: FirebaseManager.kt
                                                    Línea: 998 (y 166 en claimTripAtomically)
                                                    Operación: transaction.get() ejecutado
                                                    DESPUÉS de transaction.update().
                                                    Violación de contrato del SDK Firestore:
                                                    "Firestore transactions require all reads
                                                     to be executed before all writes."
========================================================================================
```
