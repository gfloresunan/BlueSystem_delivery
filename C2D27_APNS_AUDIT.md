# Phase 2D.27 — Apple Push Notification Service (APNs) Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `APNs Integration, Darwin Notification Settings & Cloud Messaging Relay`

---

## 1. APNs Architectural Strategy

1. **Relay via FCM:**
   - Flutter iOS client uses `firebase_messaging` to bridge APNs device tokens to Firebase Cloud Messaging tokens.
   - iOS devices receive payloads formatted for Apple Push Notification service (`aps` dictionary: `alert`, `badge`, `sound`).
2. **Darwin Notification Settings:**
   - `DarwinInitializationSettings` in `PlatformNotificationAdapter` requests explicit user permissions for `alert`, `badge`, and `sound`.
3. **External Prerequisite:**
   - Apple Developer APNs Authentication Key (`.p8`) must be uploaded to Firebase Project Settings > Cloud Messaging.

---

## 2. Verdict

**APNS VERDICT:** 🟢 ARCHITECTURALLY VERIFIED / 🟡 PENDING EXTERNAL (APNs `.p8` key upload in Firebase Console).
