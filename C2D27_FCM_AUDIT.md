# Phase 2D.27 — Firebase Cloud Messaging (FCM) Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `FCM Push Notifications, Multi-Device Schema & Foreground Routing`

---

## 1. Forensic Implementation Review

In `flutter_client/lib/platform/notifications/notification_adapter.dart`:
1. **Token Retrieval:** Invokes `FirebaseMessaging.instance.getToken()`.
2. **Dual Registration Strategy (Hardened in C2D.27):**
   - **User Document:** Upserts `fcmToken`, `fcmTokens: FieldValue.arrayUnion([token])`, and `lastTokenUpdate` in `/users/{uid}`.
   - **Multi-Device Collection:** Upserts `{ uid, token, platform: 'flutter', updatedAt }` in `/user_devices/{uid}_flutter`.
3. **Foreground Notifications:**
   - Listens on `FirebaseMessaging.onMessage`.
   - Dispatches native local notification via `FlutterLocalNotificationsPlugin` on channel `bluesystem_channel`.
   - Streams event data into `onNotificationReceived` broadcast stream.

---

## 2. Backend Dispatch Alignment

- Backend Cloud Functions (`functions/src/triggers/orders.ts`, `functions/src/triggers/trips.ts`, and FCM Queue Workers) query `/user_devices` and `/users` to dispatch push payloads.
- The dual registration in Flutter guarantees compatibility with both single-device and multi-device backend notification dispatchers.

---

## 3. Verdict

**FCM VERDICT:** 🟢 VERIFIED (Architecture, registration schema, and local fallback fully aligned).
