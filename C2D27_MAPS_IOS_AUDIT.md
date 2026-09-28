# Phase 2D.27 — Google Maps iOS Platform Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Maps SDK for iOS, Apple Bundle ID Restrictions & Sentinel Adapter State`

---

## 1. Forensic Inspection & Architecture

1. **Adapter Pattern:**
   - Map rendering is abstracted via `MapPlatformAdapter` (`flutter_client/lib/platform/maps/map_platform_adapter.dart`).
   - The active adapter in C2D.26/C2D.27 is `SentinelMapAdapter`, ensuring that zero unexpected API calls or rendering errors occur before formal key provisioning.
2. **GCP Maps SDK for iOS Requirement:**
   - iOS requires an API key authorized with the "Maps SDK for iOS" API enabled in Google Cloud Console.
   - Key restrictions must specify the Apple Bundle ID (e.g. `com.bluesystem.delivery.client`).

---

## 2. Gap Classification & Readiness State

| Evaluation Item | Current State | Target State | Classification |
| :--- | :--- | :--- | :--- |
| **Maps SDK for iOS API** | Not enabled / provisioned | Enabled in GCP project `bluesystem-7c9af` | `GAP-MAPS-02 / BLOCKED_EXTERNAL` |
| **iOS Key Restriction** | No Apple Bundle ID restriction registered | Key restricted to iOS Bundle ID | `GAP-MAPS-02 / BLOCKED_EXTERNAL` |
| **Sentinel Fallback** | `SentinelMapAdapter` returns safe nulls | Safe fallback operational | 🟢 VERIFIED |

---

## 3. Verdict

**MAPS IOS VERDICT:** 🟡 YELLOW (BLOCKED_EXTERNAL — Pending GCP Console configuration; code contract 100% prepared and protected by Sentinel).
