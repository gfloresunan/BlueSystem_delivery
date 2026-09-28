# Phase 2D.27 — Forensic Gap Analysis & Provisioning Backlog

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Catalog of External Provisioning Gaps & Human Operator Prerequisites`

---

## 1. External Provisioning Gap Inventory

| Gap ID | Description | Severity | Target Platform | Current State | Required Human Operator Action | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Firebase Multi-Client Registration for White-Label Android Packages | `P2 MEDIUM` | Android | Reference package registered; secondary packages pending | Add secondary Android app packages in Firebase Console when tenant expansion is authorized | `OPEN / BLOCKED_EXTERNAL` |
| **GAP-02** | Firebase iOS Client Registration & `GoogleService-Info.plist` | `P2 MEDIUM` | iOS | Plist absent in workspace | Register iOS App in Firebase Console (`bluesystem-7c9af`), download plist to `ios/Runner/` | `OPEN / BLOCKED_EXTERNAL` |
| **GAP-MAPS-01** | Google Cloud Console Maps SDK Android Key Restrictions | `P2 MEDIUM` | Android | Key restricted to `com.aistudio.delivery.djweq` | Add additional package names & SHA-1 hashes to API key restrictions in Google Cloud Console | `OPEN / BLOCKED_EXTERNAL` |
| **GAP-MAPS-02** | Google Cloud Console Maps SDK for iOS Enablement & Restrictions | `P2 MEDIUM` | iOS | API key not yet restricted for iOS Bundle ID | Enable Maps SDK for iOS in GCP and restrict key to iOS Bundle ID | `OPEN / BLOCKED_EXTERNAL` |
| **GAP-APNS-01** | Apple APNs Auth Key (`.p8`) Upload in Firebase Console | `P3 LOW` | iOS | Key not uploaded | Upload APNs Auth Key (.p8) in Firebase Project Settings > Cloud Messaging | `OPEN / BLOCKED_EXTERNAL` |

---

## 2. Governance Statement

No external provisioning gaps are concealed or marked as CLOSED without objective physical evidence. All listed gaps pertain strictly to external third-party developer portals (Firebase Console, Google Cloud Console, Apple Developer) and will be fulfilled during formal provisioning authorization.
