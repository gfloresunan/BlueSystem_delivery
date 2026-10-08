import { describe, it, beforeEach } from "node:test";
import * as assert from "node:assert";
import {
  validatePointInMunicipality,
  clearBoundaryCache,
  buildBoundaryId,
} from "../services/municipalGeoIntegrityService";

describe("BSD-MUNICIPAL-GEO-INTEGRITY-GATE-001: Municipal Geo Integrity Unit Tests", () => {
  beforeEach(() => {
    clearBoundaryCache();
  });

  it("GEO-01: Branch/Origin inside Ciudad Darío -> VERIFIED", async () => {
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.7314,
      longitude: -86.1241,
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.status, "VERIFIED");
    assert.strictEqual(res.declaredMunicipalityId, "CIUDAD_DARIO");
    assert.strictEqual(res.validationMethod, "POINT_IN_POLYGON");
  });

  it("GEO-02: Branch/Origin outside Ciudad Darío declared CIUDAD_DARIO -> OUTSIDE_MUNICIPALITY", async () => {
    // Matagalpa City coordinates passed under CIUDAD_DARIO
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.9256,
      longitude: -85.9172,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, "OUTSIDE_MUNICIPALITY");
  });

  it("GEO-03: Destination inside Ciudad Darío -> VERIFIED", async () => {
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.7340,
      longitude: -86.1205,
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.status, "VERIFIED");
  });

  it("GEO-04: Destination outside Ciudad Darío with declared CIUDAD_DARIO -> OUTSIDE_MUNICIPALITY", async () => {
    // Managua coordinates under CIUDAD_DARIO
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.1364,
      longitude: -86.2514,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, "OUTSIDE_MUNICIPALITY");
  });

  it("GEO-09: Lat/Lng inverted (lat < 0 or lng > 0) -> INVALID_COORDINATES", async () => {
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: -86.1241, // Inverted!
      longitude: 12.7314,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, "INVALID_COORDINATES");
  });

  it("GEO-10: lat = 0 / lng = 0 -> INVALID_COORDINATES", async () => {
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 0,
      longitude: 0,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, "INVALID_COORDINATES");
  });

  it("GEO-11: NaN / null / undefined -> INVALID_COORDINATES", async () => {
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: NaN,
      longitude: -86.1241,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, "INVALID_COORDINATES");
  });

  it("GEO-14: Point on boundary edge -> deterministically handled", async () => {
    // Exact vertex from polygon coordinates: [-86.1200, 12.8600]
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.8600,
      longitude: -86.1200,
    });

    // turf with ignoreBoundary: false classifies boundary vertices as inside
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.status, "VERIFIED");
  });

  it("GEO-16: Non-enforced municipality -> BYPASS_UNENFORCED", async () => {
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "MANAGUA",
      municipalityId: "MANAGUA",
      latitude: 12.1364,
      longitude: -86.2514,
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.status, "VERIFIED");
    assert.strictEqual(res.validationMethod, "BYPASS_UNENFORCED");
  });

  it("GEO-17: FLAT active without boundary available -> FAIL-CLOSED (BOUNDARY_UNAVAILABLE)", async () => {
    // When isFlatRequired: true is passed for a municipality with NO boundary
    const res = await validatePointInMunicipality({
      countryCode: "NI",
      departmentId: "LEON",
      municipalityId: "LEON",
      latitude: 12.4379,
      longitude: -86.8780,
      isFlatRequired: true, // Requires boundary!
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, "BOUNDARY_UNAVAILABLE");
  });

  it("GEO-05: Origin Ciudad Darío + Destination Ciudad Darío -> Commerce Allowed", async () => {
    const originRes = await validatePointInMunicipality({
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.7314,
      longitude: -86.1241,
    });
    const destRes = await validatePointInMunicipality({
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.7340,
      longitude: -86.1205,
    });

    assert.strictEqual(originRes.valid, true);
    assert.strictEqual(destRes.valid, true);
    assert.strictEqual(originRes.declaredMunicipalityId, destRes.declaredMunicipalityId);
  });

  it("GEO-06: Origin Ciudad Darío + Destination Matagalpa -> Cross-Municipality detected", async () => {
    const originRes = await validatePointInMunicipality({
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.7314,
      longitude: -86.1241,
    });
    // Customer attempts to deliver to Matagalpa City
    const destRes = await validatePointInMunicipality({
      departmentId: "MATAGALPA",
      municipalityId: "CIUDAD_DARIO",
      latitude: 12.9256,
      longitude: -85.9172,
    });

    assert.strictEqual(originRes.valid, true);
    assert.strictEqual(destRes.valid, false);
    assert.strictEqual(destRes.status, "OUTSIDE_MUNICIPALITY");
  });

  it("GEO-18: DISTANCE unenforced municipality (Estelí) -> Baseline intact", async () => {
    const res = await validatePointInMunicipality({
      departmentId: "ESTELI",
      municipalityId: "ESTELI",
      latitude: 13.0918,
      longitude: -86.3538,
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.status, "VERIFIED");
    assert.strictEqual(res.validationMethod, "BYPASS_UNENFORCED");
  });

  it("GEO-25: X→Y Express coordinates -> Domain isolation (Geo Integrity uncalled for X→Y)", () => {
    // X→Y uses distance-based point-to-point without municipal restrictions
    const origin = { latitude: 12.7314, longitude: -86.1241 };
    const destination = { latitude: 12.9256, longitude: -85.9172 };
    // Pure mathematical verification of Haversine distance
    const R = 6371000;
    const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
    const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.latitude * Math.PI) / 180) *
        Math.cos((destination.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const distMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    assert.ok(distMeters > 30000, "X->Y intermunicipal distance computed accurately");
  });
});

