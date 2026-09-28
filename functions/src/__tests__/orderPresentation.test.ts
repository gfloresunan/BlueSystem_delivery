import { describe, it } from "node:test";
import * as assert from "node:assert";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "bluesystem-test" });
}

import { resolveMerchantIsRestaurant } from "../triggers/orders";

describe("BSD-CUSTOMER-ORDER-LIFECYCLE-UX-NOTIFICATIONS-SPANISH-001 — Order Presentation & Notifications", () => {
  it("TEST 01 — Restaurant detection with explicit isRestaurant: true", async () => {
    const isRest = await resolveMerchantIsRestaurant({
      isRestaurant: true,
      businessName: "El Chanchito",
      category: "Restaurante",
    });
    assert.strictEqual(isRest, true);
  });

  it("TEST 02 — Technology store detection (TECNOSTORE) resolves to false", async () => {
    const isRest = await resolveMerchantIsRestaurant({
      isRestaurant: false,
      businessName: "TECNOSTORE",
      category: "Tecnología",
      businessType: "TECHNOLOGY",
    });
    assert.strictEqual(isRest, false);
  });

  it("TEST 03 — Category-based gastronomy detection (Comida Rápida / Cafetería)", async () => {
    const isGastro1 = await resolveMerchantIsRestaurant({
      category: "Comida Rápida",
      businessName: "Burger Express",
    });
    assert.strictEqual(isGastro1, true);

    const isGastro2 = await resolveMerchantIsRestaurant({
      category: "Cafetería & Panadería",
      businessName: "Café París",
    });
    assert.strictEqual(isGastro2, true);
  });

  it("TEST 04 — Non-gastronomy categories (Supermercado, Farmacia, Ropa)", async () => {
    const isGastro1 = await resolveMerchantIsRestaurant({
      category: "Supermercado",
      businessName: "Súper Central",
    });
    assert.strictEqual(isGastro1, false);

    const isGastro2 = await resolveMerchantIsRestaurant({
      category: "Farmacia",
      businessName: "FarmaSalud",
    });
    assert.strictEqual(isGastro2, false);

    const isGastro3 = await resolveMerchantIsRestaurant({
      category: "Ropa & Calzado",
      businessName: "Boutique Bella",
    });
    assert.strictEqual(isGastro3, false);
  });

  it("TEST 05 — Safe fallback on null or unknown category -> false", async () => {
    const isGastroNull = await resolveMerchantIsRestaurant(null);
    assert.strictEqual(isGastroNull, false);

    const isGastroEmpty = await resolveMerchantIsRestaurant({
      businessName: "Comercio Desconocido",
      category: "",
    });
    assert.strictEqual(isGastroEmpty, false);
  });
});
