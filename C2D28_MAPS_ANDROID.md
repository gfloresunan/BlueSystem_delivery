# Phase C2D.28 — Google Maps Android Provisioning Audit (GAP-MAPS-01)
**Protocol ID:** `BSD-C2D28-CONTROLLED-MULTIPLATFORM-EXTERNAL-PROVISIONING-BUILD-READINESS-001`  
**Phase:** `C2D.28 — Controlled Multi-Platform External Provisioning & Build Readiness`  
**Subsystem:** `Google Maps SDK for Android & API Key Restriction Governance`  
**Gap Reference:** `GAP-MAPS-01`

---

## 1. Track A Baseline Inspection

Inspection of `app/src/main/AndroidManifest.xml` confirms:
- Meta-data key `com.google.android.geo.API_KEY` is bound to `@string/google_maps_key`.
- Key is isolated in Android string resources, never hardcoded in manifest or application code.
- GCP Console configuration for reference key:
  - **Package Name:** `com.aistudio.delivery.djweq`
  - **Certificate Fingerprint (SHA-1):** `e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f` (Debug Keystore)

---

## 2. Track B Flutter Client Architecture & Key Isolation

Inspection of `flutter_client/lib/platform/maps/`:
- Multi-platform operations are mediated through `MapPlatformAdapter`.
- **Zero Hardcoded Key Invariant:** Verified via `tools/c2d28_validation.js` (Test `C2D28-SEC-001`). No Google API keys exist anywhere in `flutter_client/lib/`.
- Dynamic key resolution occurs at runtime via `AppConfigEntity` and platform host metadata.

---

## 3. GCP Console Restriction Audit & Gap State

| Package Name | Certificate SHA-1 | Restriction Configured in GCP? | Status |
| :--- | :--- | :--- | :--- |
| `com.aistudio.delivery.djweq` | `e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f` | YES (Reference Key Active) | 🟢 **VERIFIED** |
| `com.bluesystem.delivery` | `e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f` | PENDING EXTERNAL UPDATE | 🟡 **BLOCKED_EXTERNAL** |
| `com.fitoni.delivery` | `e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f` | PENDING EXTERNAL UPDATE | 🟡 **BLOCKED_EXTERNAL** |

### Security Invariant
- Under NO circumstances shall the API key restrictions be removed.
- Unrestricted API keys are STRICTLY PROHIBITED.

---

## 4. Human Operator Execution Procedure for GAP-MAPS-01

To add the authorized secondary packages to the Google Cloud Console API Key:

1. Navigate to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials?project=bluesystem-7c9af).
2. Select the active Android Maps API Key.
3. Under **Set an application restriction**, ensure **Android apps** is selected.
4. Under **Restrict usage to your Android apps**:
   - Keep existing: `com.aistudio.delivery.djweq` (`e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f`)
   - Add new entry:
     - Package name: `com.bluesystem.delivery`
     - SHA-1 fingerprint: `e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f`
   - Add new entry:
     - Package name: `com.fitoni.delivery`
     - SHA-1 fingerprint: `e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f`
5. Under **API restrictions**, confirm that **Maps SDK for Android** is explicitly selected.
6. Click **Save**.

---

## 5. Gate D1 Verdict

**GAP-MAPS-01 VERDICT:** 🟡 **BLOCKED_EXTERNAL** (Reference client verified; secondary package restrictions pending GCP Console update by human operator).
