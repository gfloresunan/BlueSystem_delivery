# Phase 2D.27 — SHA-1 & Package Alignment Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Keystore Certificate Hashes, Application IDs & Package Alignment`

---

## 1. Forensic Hash & Package Mapping

| Client Target | Package Name | Keystore Type | SHA-1 Fingerprint | Alignment Status |
| :--- | :--- | :--- | :--- | :--- |
| **Track A (Native Android)** | `com.aistudio.delivery.djweq` | Debug Keystore | `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F` | 🟢 ALIGNED (`google-services.json`) |
| **Track B (Flutter Android Base)**| `com.aistudio.delivery.djweq` | Debug Keystore | `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F` | 🟢 ALIGNED (Matches Reference) |
| **Track B (White-label Tenant 01)**| `com.fitoni.delivery` | Target Release | TBD upon Release Provisioning | 🟡 PENDING FUTURE PROVISIONING |

---

## 2. Invariant & Security Verification

1. **Deterministic Resolution:** The SHA-1 debug hash in `app/google-services.json` is `e08ff88aa2de0c41eb8281fbad6b59c94d8cfd1f`, which corresponds to the standard Android debug keystore.
2. **Zero Keystore Mutation:** No modifications to debug/release keystores have occurred in this phase.
3. **Verdict:** 🟢 VERIFIED (Reference package aligned) / 🟡 PENDING (White-label packages).
