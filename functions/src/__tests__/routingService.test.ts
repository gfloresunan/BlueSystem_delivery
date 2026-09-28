import assert from "node:assert";
import test, { describe, it } from "node:test";
import {
  validateCoordinatesInNicaragua,
  calculateHaversineDistanceMeters,
  calculateAuthoritativeFee,
  calculateDeliveryRoute,
  TARIFA_BASE_NIO,
  COSTO_POR_KM_NIO,
} from "../services/routingService";

describe("RoutingService & Authoritative Fee Engine (Actividad #16)", () => {
  it("TC-ROUTING-01: Validates geographic coordinates strictly within Nicaragua bounds", () => {
    // Managua
    assert.strictEqual(validateCoordinatesInNicaragua(12.1364, -86.2514), true);
    // Ciudad Sandino
    assert.strictEqual(validateCoordinatesInNicaragua(12.158, -86.344), true);
    // Masaya
    assert.strictEqual(validateCoordinatesInNicaragua(11.9744, -86.0942), true);
    // León
    assert.strictEqual(validateCoordinatesInNicaragua(12.4379, -86.878), true);

    // Fuera de límites (ej. Costa Rica, Madrid, Coordenadas inválidas)
    assert.strictEqual(validateCoordinatesInNicaragua(9.9281, -84.0907), false); // San José CR
    assert.strictEqual(validateCoordinatesInNicaragua(40.4168, -3.7038), false); // Madrid
    assert.strictEqual(validateCoordinatesInNicaragua(NaN, -86.2514), false);
    assert.strictEqual(validateCoordinatesInNicaragua(12.1364, NaN), false);
  });

  it("TC-ROUTING-02: Calculates precise Haversine distance in meters", () => {
    // Metrocentro a Multicentro Las Américas
    const dist = calculateHaversineDistanceMeters(12.1285, -86.2655, 12.1432, -86.2234);
    assert.ok(dist > 4000 && dist < 6000, `Distancia esperada entre 4k y 6k metros, obtenida: ${dist}m`);
  });

  it("TC-ROUTING-03: Authoritative fee calculation applies $35 base + $15/km", () => {
    // 0 metros -> C$ 35.00
    assert.strictEqual(calculateAuthoritativeFee(0), 35.0);

    // 1,000 metros (1 km) -> C$ 50.00
    assert.strictEqual(calculateAuthoritativeFee(1000), 50.0);

    // 5,000 metros (5 km) -> C$ 110.00
    assert.strictEqual(calculateAuthoritativeFee(5000), 110.0);

    // 18,200 metros (18.2 km) -> 35 + (18.2 * 15) = 35 + 273 = C$ 308.00
    assert.strictEqual(calculateAuthoritativeFee(18200), 308.0);
  });

  it("TC-ROUTING-04: Resolves real route or resilient fallback for Managua points", async () => {
    const origin = { latitude: 12.1285, longitude: -86.2655 }; // Metrocentro
    const destination = { latitude: 12.1432, longitude: -86.2234 }; // Multicentro

    const result = await calculateDeliveryRoute({
      origin,
      destination,
      transportProfile: "TWO_WHEELER",
    });

    assert.ok(result.routeDistanceMeters > 0, "Debe tener una distancia de ruta mayor a cero");
    assert.ok(result.routeDurationSeconds > 0, "Debe tener una duración mayor a cero");
    assert.ok(result.calculatedFee >= TARIFA_BASE_NIO, "La tarifa debe ser >= tarifa base");
    assert.ok(
      result.routingProvider === "GOOGLE_ROUTES_V2" ||
        result.routingProvider === "OSRM_ENGINE" ||
        result.routingProvider === "FALLBACK_ESTIMATED",
      `Proveedor válido: ${result.routingProvider}`
    );
    assert.strictEqual(result.routingVersion, "v1.0");
    assert.ok(result.calculatedAt.length > 0);
  });

  it("TC-ROUTING-05: Rejects invalid coordinates with descriptive errors", async () => {
    const invalidOrigin = { latitude: 0, longitude: 0 };
    const validDest = { latitude: 12.1432, longitude: -86.2234 };

    await assert.rejects(
      async () => {
        await calculateDeliveryRoute({
          origin: invalidOrigin,
          destination: validDest,
        });
      },
      /INVALID_ORIGIN_COORDINATES/
    );
  });

  it("TC-ROUTING-06: Cache hit returns identical result without duplicate execution", async () => {
    const origin = { latitude: 12.1364, longitude: -86.2514 };
    const destination = { latitude: 12.158, longitude: -86.344 };

    const first = await calculateDeliveryRoute({ origin, destination });
    const second = await calculateDeliveryRoute({ origin, destination });

    assert.strictEqual(first.routeDistanceMeters, second.routeDistanceMeters);
    assert.strictEqual(first.calculatedFee, second.calculatedFee);
    assert.strictEqual(first.calculatedAt, second.calculatedAt);
  });
});
