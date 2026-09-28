# Phase C2D.28 — Google Maps iOS Provisioning Audit (GAP-MAPS-02)
**Protocol ID:** `BSD-C2D28-CONTROLLED-MULTIPLATFORM-EXTERNAL-PROVISIONING-BUILD-READINESS-001`  
**Phase:** `C2D.28 — Controlled Multi-Platform External Provisioning & Build Readiness`  
**Subsystem:** `Google Maps SDK for iOS & API Key Restriction Governance`  
**Gap Reference:** `GAP-MAPS-02`

---

## 1. Multi-Platform Map Adapter & Sentinel Pattern

In `flutter_client/lib/platform/maps/map_platform_adapter.dart`:
- The client encapsulates map interaction behind the abstract `MapPlatformAdapter` interface.
- **Sentinel Implementation:** `SentinelMapAdapter` acts as an active, zero-cost, fail-safe null-object when Google Maps iOS native key is unprovisioned:
  - `getMapCenter()` safely returns `null` without throwing unhandled exceptions.
  - `moveCameraTo()` completes cleanly as a no-op.
  - `addMarker()` returns a synthetic marker handle.
  - `drawRoute()` and `clearRoute()` safely execute as no-ops.
- **Fail-Safe Benefit:** The application can run in non-map view modes without crashing due to missing native iOS Maps keys.

---

## 2. External iOS Maps Key Audit

Forensic inspection confirms:
- **API Enablement:** Maps SDK for iOS is not yet confirmed enabled in GCP project `bluesystem-7c9af`.
- **iOS Key:** No dedicated iOS Maps API key has been provisioned.
- **Bundle ID Restriction:** Requires explicit restriction to `com.bluesystem.delivery.client`.

---

## 3. Human Operator Execution Procedure for GAP-MAPS-02

1. Navigate to [Google Cloud Console APIs & Services](https://console.cloud.google.com/apis/library?project=bluesystem-7c9af).
2. Search for **Maps SDK for iOS** and click **Enable**.
3. Navigate to **APIs & Services** $\rightarrow$ **Credentials**.
4. Click **Create Credentials** $\rightarrow$ **API Key**.
5. Edit the newly created key:
   - **Name:** `BlueSystem iOS Maps Key`
   - **Application restrictions:** Select **iOS apps**.
   - **Restrict usage to your iOS apps:**
     - Click **Add an item**.
     - Bundle ID: `com.bluesystem.delivery.client`
     - (Optional secondary: `com.fitoni.delivery.client`)
   - **API restrictions:** Select **Restrict key** $\rightarrow$ Check **Maps SDK for iOS**.
6. Click **Save**.
7. Store key in Enterprise secrets vault; do NOT commit to code repository.

---

## 4. Gate D2 Verdict

**GAP-MAPS-02 VERDICT:** 🟡 **BLOCKED_EXTERNAL** (Sentinel adapter is fully operational; external key creation and restriction deferred to human operator).
