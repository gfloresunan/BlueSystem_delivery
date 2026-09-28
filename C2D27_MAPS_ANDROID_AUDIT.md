# Phase 2D.27 — Google Maps Android Platform Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Maps SDK for Android, Package Restrictions, SHA-1 Fingerprint & Key Security`

---

## 1. Forensic Evidence & Key Restrictions

1. **Current Key Configuration:**
   - In Track A (`app/build.gradle.kts`), the Maps SDK uses the environment variable `GOOGLE_MAPS_API_KEY`.
   - The GCP API Key is restricted to Android Apps matching:
     - Package Name: `com.aistudio.delivery.djweq`
     - SHA-1 Fingerprint (Debug): `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`
2. **Flutter Android Map Strategy:**
   - `flutter_client/pubspec.yaml` imports `google_maps_flutter: ^2.5.3`.
   - `MapPlatformAdapter` (`map_platform_adapter.dart`) defines the abstract cartographic contract.
   - `SentinelMapAdapter` acts as a fail-safe null-object pattern during non-provisioned states.

---

## 2. Gap Classification & Risk Analysis

| Evaluation Item | Workspace Evidence | Impact | Classification |
| :--- | :--- | :--- | :--- |
| **Reference Package Restriction** | `com.aistudio.delivery.djweq` + SHA-1 configured | Maps operational for reference package | 🟢 VERIFIED |
| **White-label Package Restrictions** | Not yet added in GCP Console for new packages | Map tiles fail to load on unauthorized packages | `GAP-MAPS-01 / BLOCKED_EXTERNAL` |
| **Zero Hardcoded API Keys** | Verified: No keys hardcoded in `flutter_client/lib/` | Secure key isolation | 🟢 PASS |

---

## 3. Verdict

**MAPS ANDROID VERDICT:** 🟢 VERIFIED (Baseline ready for reference package) / 🟡 PENDING EXTERNAL (for secondary white-label package restrictions in GCP Console).
