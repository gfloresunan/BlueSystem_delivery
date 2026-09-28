# Phase C2D.28 — APNs Provisioning & FCM Relay Audit (GAP-APNS-01)
**Protocol ID:** `BSD-C2D28-CONTROLLED-MULTIPLATFORM-EXTERNAL-PROVISIONING-BUILD-READINESS-001`  
**Phase:** `C2D.28 — Controlled Multi-Platform External Provisioning & Build Readiness`  
**Subsystem:** `Apple Push Notification Service (APNs) & Firebase Cloud Messaging Relay`  
**Gap Reference:** `GAP-APNS-01`

---

## 1. Notification Architecture & Multi-Platform Adapter

In `flutter_client/lib/platform/notifications/notification_adapter.dart`:
- `PlatformNotificationAdapter` establishes a unified bridge for push notifications.
- On iOS devices, the client initializes `DarwinInitializationSettings` requesting explicit user permissions for `alert`, `badge`, and `sound`.
- APNs device tokens are registered to Firebase Cloud Messaging (FCM), generating unified device tokens stored under canonical multi-device path:
  $$\text{Path: } \texttt{/user\_devices/\{uid\}\_flutter}$$

---

## 2. Secrets Protection & Security Invariant

In strict compliance with Rule 4 (Regla de Secrets):
- **Zero Private Key Exposure:** The `.p8` Auth Key is a high-security secret.
- **Scanning Audit:** Forensic analysis confirmed that no `.p8` files exist in the repository or git tracking.
- Under NO circumstances shall `.p8` file content, private keys, or passwords be stored in documentation or source files.

---

## 3. External Status of APNs in Firebase Console

Live inspection of Firebase project settings indicates:
- **APNs Authentication Key:** Not yet uploaded in Firebase Console Project Settings.
- **Target App ID:** iOS App `com.bluesystem.delivery.client` pending registration (GAP-02).
- **Classification:** `BLOCKED_EXTERNAL`.

---

## 4. Human Operator Execution Procedure for GAP-APNS-01

### Step 1: Generate APNs Key in Apple Developer Portal
1. Navigate to [Apple Developer Keys](https://developer.apple.com/account/resources/authkeys/list).
2. Click **+** to register a new Key.
3. Key Name: `BlueSystem APNs Auth Key`.
4. Check **Apple Push Notifications service (APNs)**.
5. Click **Continue** $\rightarrow$ **Register**.
6. Download the `.p8` file (Note: Apple allows downloading this file only once).
7. Record the **Key ID** (10 characters) and **Team ID** (found in top-right account details).

### Step 2: Configure APNs Key in Firebase Console
1. Navigate to [Firebase Project Settings > Cloud Messaging](https://console.firebase.google.com/project/bluesystem-7c9af/settings/cloudmessaging).
2. Scroll to **Apple app configuration** $\rightarrow$ Select `com.bluesystem.delivery.client`.
3. Under **APNs Authentication Key**, click **Upload**.
4. Browse and select the downloaded `.p8` file.
5. Enter the **Key ID** and **Team ID**.
6. Click **Upload**.

---

## 5. Gate E Verdict

| Dimension | Evaluation | Result |
| :--- | :--- | :--- |
| **Dart Notification Adapter Contract** | Implemented & verified | 🟢 **PASS** |
| **Workspace Secret Scans** | Zero `.p8` or credentials leaked | 🟢 **PASS** |
| **Firebase APNs Configuration** | Unuploaded in console | 🟡 **BLOCKED_EXTERNAL** |

**GATE E VERDICT:** 🟡 **BLOCKED_EXTERNAL** (GAP-APNS-01 remains fail-closed until human operator completes Apple Developer Key creation and Firebase Console upload).
