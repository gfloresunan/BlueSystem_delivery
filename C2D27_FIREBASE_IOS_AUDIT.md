# Phase 2D.27 — Firebase iOS Platform Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Firebase iOS Configuration, Bundle ID & Plist Provisioning Strategy`

---

## 1. Forensic Inspection & Repository Evidence

1. **`GoogleService-Info.plist` Presence:**
   - Forensic search across the entire workspace confirms that `GoogleService-Info.plist` is **NOT PRESENT**.
   - No mock or placeholder plist has been artificially injected into the repository.
2. **iOS Bundle ID Strategy:**
   - Standard Commercial Bundle ID: `com.bluesystem.delivery.client`
   - Tenant White-label Bundle ID: `com.fitoni.delivery.client`
3. **Flutter Multiplatform Firebase Initialization:**
   - In `flutter_client/lib/main.dart`, `Firebase.initializeApp()` is utilized.
   - For iOS execution, Firebase Core expects `GoogleService-Info.plist` located within the runner configuration or supplied via `FirebaseOptions`.

---

## 2. Gap Classification & Risk Analysis

| Evaluation Item | Workspace Evidence | Operational Impact | Classification |
| :--- | :--- | :--- | :--- |
| **iOS Firebase App Registration** | Not registered in Firebase Console | iOS client cannot initialize Firebase services | `GAP-02 / BLOCKED_EXTERNAL` |
| **`GoogleService-Info.plist`** | Absent in workspace | Required for future physical iOS compilation | `GAP-02 / BLOCKED_EXTERNAL` |
| **APNs Key (.p8) Upload** | Not uploaded to Firebase Cloud Messaging console | iOS push notifications will not deliver to APNs | `GAP-APNS-01 / BLOCKED_EXTERNAL` |

---

## 3. Recommended Provisioning Procedure (Human Operator)

When physical iOS builds are formally authorized in a subsequent phase:
1. Access Firebase Console (`bluesystem-7c9af`).
2. Add an Apple iOS Application with Bundle ID `com.bluesystem.delivery.client` (or tenant-specific ID).
3. Download the generated `GoogleService-Info.plist`.
4. Place the file into `flutter_client/ios/Runner/GoogleService-Info.plist` (or pass via multiplatform flavor config).
5. In Project Settings > Cloud Messaging, upload the Apple APNs Auth Key (`.p8`) with Key ID and Team ID.

---

## 4. Final Verdict

**FIREBASE IOS VERDICT:** 🟡 YELLOW (BLOCKED_EXTERNAL — Pending human operator console provisioning; Dart architecture is 100% prepared).
