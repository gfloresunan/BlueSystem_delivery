# Phase 2D.27 — Subscription & Entitlements Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `SubscriptionEntity, PlanTiers, Quotas & Client-Side Entitlement Checks`

---

## 1. Subscription & Plan Tier Mapping

In `flutter_client/lib/core/subscription/subscription_context.dart`:
- **Plan Tiers:** `starter`, `professional`, `enterprise`, `custom`.
- **Feature Check:** `isFeatureEnabled(String featureKey)` checks inclusion in `enabledFeatures` and exclusion from `disabledFeatures`.
- **Quotas:** Strongly typed `SubscriptionQuotas` model bounding max orders, branches, users, and API limits.

---

## 2. Invariant & Authority Verification

1. **Client is Not Authority:** The Flutter client uses subscription checks solely to adapt UI navigation. The backend Cloud Functions and Firestore Rules maintain authoritative enforcement.
2. **Fail-Closed on Inactive:** If status is `suspended`, `canceled`, or `pastDue`, all non-core features evaluate to disabled.
3. **Verdict:** 🟢 VERIFIED & CERTIFIED.
