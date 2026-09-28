# Implementation Plan - Fix App Crash on Startup (Firestore Deserialization)

The app crashes on startup because it attempts to deserialize Firestore documents into the `Pedido` class, but some documents have a `String` in the `origen` field while the class expects a `UbicacionPedido` object. This is caused by redundant and inconsistent writes in `SolicitarEnvioScreen.kt`.

## User Review Required

> [!IMPORTANT]
> The crash is caused by data inconsistency in Firestore. I will fix the code to prevent future inconsistent writes. You might need to manually delete or update old documents in the `orders` collection in the Firebase Console that have `origen` as a string to fully resolve the issue for existing data.

## Proposed Changes

### [Component Name]

#### [MODIFY] [SolicitarEnvioScreen.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/SolicitarEnvioScreen.kt)
- Remove the redundant `db.collection("orders").document(nuevoPedidoId).set(nuevaOrden)` call inside the `onClick` handler of the "Solicitar Envío Ahora" button.
- The `onGuardarPedidoFirestore` callback (implemented in `MainActivity.kt`) already handles saving the order with the correct `UbicacionPedido` structure.

#### [MODIFY] [FirebaseManager.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)
- Add a `try-catch` block around `snapshot.toObjects(Pedido::class.java)` to prevent the app from crashing if it encounters a malformed document. It will log the error and skip the problematic data.

## Verification Plan

### Automated Tests
- Run the app on the emulator and verify it no longer crashes on startup.
- Check Logcat for any "Deserialization error" logs to identify if there are still malformed documents in Firestore.

### Manual Verification
- Create a new "Solicitar Envío" and verify that it is correctly saved in Firestore as an object and that the tracking screen works.
