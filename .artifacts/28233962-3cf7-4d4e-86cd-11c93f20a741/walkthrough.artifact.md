# Walkthrough - Fixed App Crash on Startup

I have identified and fixed the issue causing the app to crash immediately after opening. The crash was due to inconsistent data in Firestore (some orders had a `String` in the `origen` field instead of an object) and the use of APIs not supported by your minimum Android version (API 24).

## Changes Made

### Robust Data Handling
- **[FirebaseManager.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)**: Wrapped all Firestore `toObjects(Pedido::class.java)` calls in `try-catch` blocks. If malformed data is encountered, the app will now log the error instead of crashing.
- **[BusinessDashboardScreen.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/business/BusinessDashboardScreen.kt)**: Applied the same robust deserialization to the business dashboard.

### Fixed Data Inconsistency
- **[SolicitarEnvioScreen.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/SolicitarEnvioScreen.kt)**: Removed an incorrect and redundant Firestore write that was saving the `origen` field as a `String`. This ensures all future orders follow the correct schema.

### Compatibility Fixes
- **[FirebaseManager.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)** and **[AuthManager.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/AuthManager.kt)**: Replaced `java.time.Instant.now()` with `System.currentTimeMillis().toString()`. `Instant` requires API level 26, but the project's minimum is API 24.

## Verification Results

### Automated Tests
- **Build**: Successfully completed `app:assembleDebug`.
- **Lint**: Fixed API compatibility warnings in the modified files.

> [!TIP]
> To fully clean up the issue, I recommend deleting any orders in your Firestore `orders` collection that might have been created with the old incorrect format (where `origen` is just a line of text).

## Next Steps
1. Restart your emulator (Cold Boot) to ensure a fresh connection.
2. Run the app again. It should no longer crash even if there is "bad" data in your database.
