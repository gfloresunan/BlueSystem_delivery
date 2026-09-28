# Phase C2D.28 — External Provisioning Inventory & Matrix
**Protocol ID:** `BSD-C2D28-CONTROLLED-MULTIPLATFORM-EXTERNAL-PROVISIONING-BUILD-READINESS-001`  
**Phase:** `C2D.28 — Controlled Multi-Platform External Provisioning & Build Readiness`  
**Classification:** `PROVISIONING INVENTORY / AUDIT-FIRST`

---

## 1. Target Identity Matrix

The following official application targets have been formally recognized for multi-platform delivery:

| Target ID | Platform | Role | Identifier / Package / Bundle ID | Project ID | External Registration Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TRG-AND-REF** | Android | Reference Client | `com.aistudio.delivery.djweq` | `bluesystem-7c9af` | 🟢 **PHYSICALLY VERIFIED** |
| **TRG-AND-COMM**| Android | Commercial Platform | `com.bluesystem.delivery` | `bluesystem-7c9af` | 🟡 **BLOCKED_EXTERNAL** |
| **TRG-AND-WL01**| Android | White-Label (Fitoni) | `com.fitoni.delivery` | `bluesystem-7c9af` | 🟡 **BLOCKED_EXTERNAL** |
| **TRG-IOS-COMM**| iOS | Commercial Platform | `com.bluesystem.delivery.client` | `bluesystem-7c9af` | 🟡 **BLOCKED_EXTERNAL** |
| **TRG-IOS-WL01**| iOS | White-Label (Fitoni) | `com.fitoni.delivery.client` | `bluesystem-7c9af` | 🟡 **BLOCKED_EXTERNAL** |

---

## 2. Master External Provisioning Matrix

| Gap ID | Subsystem | Target Platform | Required External Action | Current Forensic State | Fail-Closed Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Firebase Android | Android | Register secondary packages (`com.bluesystem.delivery`, `com.fitoni.delivery`) in Firebase Console `bluesystem-7c9af` | Only reference package exists in console (`1:514416631826:android:788b99430f87324e88b8cb`) | 🟡 `BLOCKED_EXTERNAL` |
| **GAP-02** | Firebase iOS | iOS | Register iOS client App (`com.bluesystem.delivery.client`) & download `GoogleService-Info.plist` | 0 iOS apps registered in `bluesystem-7c9af`; 0 plists exist | 🟡 `BLOCKED_EXTERNAL` |
| **GAP-MAPS-01** | Google Maps SDK | Android | Add secondary package names and SHA-1 certs to GCP API Key restrictions | Only reference package `com.aistudio.delivery.djweq` and debug SHA-1 active | 🟡 `BLOCKED_EXTERNAL` |
| **GAP-MAPS-02** | Google Maps SDK | iOS | Enable Maps SDK for iOS & provision API key restricted to Bundle ID | Unprovisioned in GCP; `SentinelMapAdapter` acts as zero-cost fail-safe | 🟡 `BLOCKED_EXTERNAL` |
| **GAP-APNS-01** | APNs / FCM | iOS | Upload Apple APNs Authentication Key (`.p8`) to Firebase Project Settings > Cloud Messaging | Unuploaded; no `.p8` key present in console | 🟡 `BLOCKED_EXTERNAL` |
| **GAP-SG-01** | Release Signing | Android / iOS | Provision production release keystore & distribution certificates | Deferred by governance policy; debug keystore verified | 🟡 `DEFERRED` |

---

## 3. Physical Inspection Telemetry (Firebase CLI)

Physical execution of `firebase apps:list --project bluesystem-7c9af` on 2026-09-07 yielded:

```
┌─────────────────────────┬───────────────────────────────────────────────┬──────────┐
│ App Display Name        │ App ID                                        │ Platform │
├─────────────────────────┼───────────────────────────────────────────────┼──────────┤
│ BlueSystem Delivery     │ 1:514416631826:android:788b99430f87324e88b8cb │ ANDROID  │
├─────────────────────────┼───────────────────────────────────────────────┼──────────┤
│ ai-studio-applet-webapp │ 1:514416631826:web:58e784a0e8e4867e88b8cb     │ WEB      │
├─────────────────────────┼───────────────────────────────────────────────┼──────────┤
│ BlueSystem Web          │ 1:514416631826:web:ceff16519cecd24088b8cb     │ WEB      │
└─────────────────────────┴───────────────────────────────────────────────┴──────────┘
Total Registered Apps: 3
Total iOS Apps: 0
Total Secondary Android Packages: 0
```

---

## 4. Inventory Synthesis

The physical evidence confirms that no secondary Android apps, no iOS apps, and no external keys have been fabricated or falsely simulated in the workspace. All requirements are rigorously categorized under fail-closed governance.
