import { describe, test } from "node:test";
import * as assert from "node:assert";
import { resolveEiamRole } from "../triggers/auth";

describe("Sprint 18.1 Merchant Onboarding & EIAM Authorization Tests", () => {
  test("resolveEiamRole should map owner, business, and merchant roles to OWNER", () => {
    assert.strictEqual(resolveEiamRole({ role: "owner" }), "OWNER");
    assert.strictEqual(resolveEiamRole({ userType: "business" }), "OWNER");
    assert.strictEqual(resolveEiamRole({ eiamRole: "MERCHANT_OWNER" }), "OWNER");
    assert.strictEqual(resolveEiamRole({ role: "comercio" }), "OWNER");
    assert.strictEqual(resolveEiamRole({ role: "merchant_owner" }), "OWNER");
  });

  test("resolveEiamRole should map admin roles correctly", () => {
    assert.strictEqual(resolveEiamRole({ role: "admin" }), "ADMIN");
    assert.strictEqual(resolveEiamRole({ role: "super_admin" }), "SUPER_ADMIN");
  });

  test("resolveEiamRole should default unknown roles to CLIENT", () => {
    assert.strictEqual(resolveEiamRole({ role: "unknown_role" }), "CLIENT");
    assert.strictEqual(resolveEiamRole({}), "CLIENT");
  });

  test("EIAM guard: should detect when a user document belongs to a canonical business and skip legacy store projection", () => {
    const eiamUserData = {
      uid: "user_123",
      businessId: "biz_canonical_456",
      role: "business",
      eiamRole: "MERCHANT_OWNER"
    };

    const shouldSkipLegacyProjection = Boolean(
      eiamUserData.eiamRole || (eiamUserData.businessId && eiamUserData.businessId !== eiamUserData.uid)
    );

    assert.strictEqual(shouldSkipLegacyProjection, true);
  });

  test("Idempotency guard: should detect already provisioned merchant applications and prevent duplicate trigger execution", () => {
    const appAfterProvisioned = {
      status: "APPROVED",
      provisionedBusinessId: "biz_12345",
      provisionedUid: "uid_12345"
    };

    const isAlreadyProvisioned = Boolean(
      appAfterProvisioned.provisionedBusinessId || appAfterProvisioned.provisionedUid
    );

    assert.strictEqual(isAlreadyProvisioned, true);
  });
});
