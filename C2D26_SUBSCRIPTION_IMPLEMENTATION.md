# C2D26 — SUBSCRIPTION ENTITLEMENT IMPLEMENTATION

**Module:** Subscription Entitlement & Quota Enforcement  
**Files:** `flutter_client/lib/core/subscription/subscription_context.dart`  

---

## 1. Capabilities

1. **Subscription Invariant:** `SubscriptionEntity` loaded from `/subscriptions/{tenantId}`.
2. **Feature Gating:** Evaluates `enabledFeatures` and `disabledFeatures` lists.
3. **Plan Tiers:** Supports `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE` tiers.
4. **Quota Limits:** Maps `SubscriptionQuotas` (maxBusinesses, maxBranches, maxUsers, maxCouriers, maxOrders).
5. **Fail-Closed on Expiry:** If `endDate < nowMs`, subscription is flagged expired and Gatekeeper denies access.
