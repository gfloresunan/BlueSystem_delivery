# Phase C2D.28 — Apple Bundle ID Architecture & Provisioning
**Protocol ID:** `BSD-C2D28-CONTROLLED-MULTIPLATFORM-EXTERNAL-PROVISIONING-BUILD-READINESS-001`  
**Phase:** `C2D.28 — Controlled Multi-Platform External Provisioning & Build Readiness`  
**Subsystem:** `Apple Developer Identifiers & Bundle ID Governance`

---

## 1. Authorized Identifier Strategy

In accordance with Section 5 of the Master Governance Protocol, the authorized Apple Bundle IDs are:

| Platform | Tier / Flavor | Canonical Bundle Identifier | App ID Prefix (Team ID) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **iOS** | Commercial Client | `com.bluesystem.delivery.client` | Authorized Team ID | 🟡 **EXTERNAL REGISTRATION PENDING** |
| **iOS** | White-Label (Fitoni) | `com.fitoni.delivery.client` | Authorized Team ID | 🟡 **EXTERNAL REGISTRATION PENDING** |

### Prohibited Actions
- No random, arbitrary, or unregistered Bundle IDs shall be used in code.
- No wildcards (`*`) permitted in bundle identifier definitions.

---

## 2. Apple Developer Capabilities Matrix

The authorized Bundle IDs require the following entitlements in Apple Developer Member Center:

| Capability | Purpose | Configuration Requirement |
| :--- | :--- | :--- |
| **Push Notifications** | APNs push delivery via Firebase Cloud Messaging | Enabled on App ID |
| **Background Modes** | Location updates during active delivery & background fetch | `fetch`, `remote-notification` |
| **Associated Domains** | Deep linking & universal links (Future) | Optional / Staged |
| **Access WiFi Information** | Network resilience (Optional) | Disabled / Default |

---

## 3. Human Operator Execution Procedure in Apple Developer Portal

1. Log in to [Apple Developer Member Center](https://developer.apple.com/account/).
2. Navigate to **Certificates, Identifiers & Profiles** $\rightarrow$ **Identifiers**.
3. Click the **+** icon to register a new App ID.
4. Select **App IDs** $\rightarrow$ **App**.
5. Enter:
   - **Description:** `BlueSystem Delivery Commercial Client`
   - **Bundle ID:** Explicit $\rightarrow$ `com.bluesystem.delivery.client`
6. Under **Capabilities**, check **Push Notifications**.
7. Repeat for White-Label client `com.fitoni.delivery.client` if required.
8. Click **Continue** $\rightarrow$ **Register**.

---

## 4. Verdict

**BUNDLE ID VERDICT:** 🟢 **ARCHITECTURALLY DEFINED** / 🟡 **BLOCKED_EXTERNAL** (Pending human operator registration in Apple Developer Portal).
