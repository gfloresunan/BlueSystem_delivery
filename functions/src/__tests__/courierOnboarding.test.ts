import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveEiamRole } from "../triggers/auth";
import {
  NICARAGUA_DEPARTMENTS,
  getDepartment,
  getMunicipalities,
  isValidDepartment,
  isValidMunicipality,
  getDepartmentName,
  getMunicipalityName,
  normalizeGeoLocation,
} from "../domain/geo/geoCatalog";

describe("Courier Onboarding & Verification Enterprise Unit Tests", () => {
  describe("Canonical EIAM Role Resolution for Couriers", () => {
    it("should map courier, motorizado, driver, and repartidor to DRIVER", () => {
      assert.strictEqual(resolveEiamRole({ role: "courier" }), "DRIVER");
      assert.strictEqual(resolveEiamRole({ role: "motorizado" }), "DRIVER");
      assert.strictEqual(resolveEiamRole({ userType: "driver" }), "DRIVER");
      assert.strictEqual(resolveEiamRole({ rol: "repartidor" }), "DRIVER");
      assert.strictEqual(resolveEiamRole({ eiamRole: "DRIVER" }), "DRIVER");
    });
  });

  describe("Courier Plate and NationalId Canonical Normalization", () => {
    it("should normalize plates to uppercase without spaces", () => {
      const normalizePlate = (raw: string) => (raw ? raw.toUpperCase().replace(/\s+/g, "").trim() : "");
      assert.strictEqual(normalizePlate("m 123 456"), "M123456");
      assert.strictEqual(normalizePlate("m123456"), "M123456");
      assert.strictEqual(normalizePlate(" cz 9876 "), "CZ9876");
    });

    it("should normalize national IDs correctly", () => {
      const normalizeNationalId = (raw: string) => (raw ? raw.toUpperCase().replace(/\s+/g, "").trim() : "");
      assert.strictEqual(normalizeNationalId("001-120598-0001a"), "001-120598-0001A");
      assert.strictEqual(normalizeNationalId(" 0011205980001A "), "0011205980001A");
    });
  });

  describe("Courier Application Lifecycle State Machine", () => {
    it("should only trigger provisioning on transition from non-APPROVED to APPROVED", () => {
      const shouldTrigger = (beforeStatus: string, afterStatus: string, provisionedUid?: string) => {
        if (provisionedUid) return false;
        if (beforeStatus === "APPROVED") return false;
        if (afterStatus !== "APPROVED") return false;
        return true;
      };

      assert.strictEqual(shouldTrigger("PENDING_REVIEW", "APPROVED"), true);
      assert.strictEqual(shouldTrigger("UNDER_REVIEW", "APPROVED"), true);
      assert.strictEqual(shouldTrigger("APPROVED", "APPROVED"), false);
      assert.strictEqual(shouldTrigger("PENDING_REVIEW", "REJECTED"), false);
      assert.strictEqual(shouldTrigger("PENDING_REVIEW", "APPROVED", "uid_already_set"), false);
    });
  });

  describe("Canonical Nicaragua Geographic Catalog Integrity", () => {
    it("should contain exactly 17 departments and regions without duplicates", () => {
      assert.strictEqual(NICARAGUA_DEPARTMENTS.length, 17);

      const deptIds = new Set<string>();
      const deptNames = new Set<string>();

      for (const dept of NICARAGUA_DEPARTMENTS) {
        assert.ok(dept.id && dept.id.trim().length > 0, "Department ID must not be empty");
        assert.ok(dept.name && dept.name.trim().length > 0, "Department name must not be empty");
        assert.ok(!deptIds.has(dept.id), `Duplicate department ID: ${dept.id}`);
        assert.ok(!deptNames.has(dept.name), `Duplicate department Name: ${dept.name}`);
        deptIds.add(dept.id);
        deptNames.add(dept.name);
      }
    });

    it("should contain exactly 153 total official municipalities across Nicaragua", () => {
      let totalMunis = 0;
      for (const dept of NICARAGUA_DEPARTMENTS) {
        const muniIds = new Set<string>();
        for (const muni of dept.municipalities) {
          assert.ok(muni.id && muni.id.trim().length > 0, "Municipality ID must not be empty");
          assert.ok(muni.name && muni.name.trim().length > 0, "Municipality name must not be empty");
          assert.ok(!muniIds.has(muni.id), `Duplicate municipality ID ${muni.id} in department ${dept.id}`);
          muniIds.add(muni.id);
          totalMunis++;
        }
      }
      assert.strictEqual(totalMunis, 153, "Total municipalities in Nicaragua must equal 153");
    });

    it("should include all 13 municipalities for Matagalpa, specifically Ciudad Darío", () => {
      const matagalpa = getDepartment("MATAGALPA");
      assert.ok(matagalpa, "Matagalpa department must exist in catalog");
      assert.strictEqual(matagalpa?.municipalities.length, 13);

      const matagalpaMuniNames = matagalpa?.municipalities.map((m) => m.name);
      const expectedMatagalpa = [
        "Ciudad Darío",
        "Esquipulas",
        "Matagalpa",
        "Matiguás",
        "Muy Muy",
        "Rancho Grande",
        "Río Blanco",
        "San Dionisio",
        "San Isidro",
        "San Ramón",
        "Sébaco",
        "Terrabona",
        "El Tuma - La Dalia",
      ];

      for (const expected of expectedMatagalpa) {
        assert.ok(
          matagalpaMuniNames?.includes(expected),
          `Missing municipality in Matagalpa: ${expected}`
        );
      }

      // Check Ciudad Darío specifically
      assert.strictEqual(isValidMunicipality("MATAGALPA", "CIUDAD_DARIO"), true);
      assert.strictEqual(getMunicipalityName("MATAGALPA", "CIUDAD_DARIO"), "Ciudad Darío");
    });

    it("should validate and normalize geographic combinations correctly", () => {
      // Valid combinations
      assert.strictEqual(isValidDepartment("MATAGALPA"), true);
      assert.strictEqual(isValidDepartment("MANAGUA"), true);
      assert.strictEqual(isValidDepartment("INVALID_DEPT"), false);

      assert.strictEqual(isValidMunicipality("MATAGALPA", "SEBACO"), true);
      assert.strictEqual(isValidMunicipality("MATAGALPA", "MANAGUA"), false); // Managua is not in Matagalpa

      // Normalization
      const normalized = normalizeGeoLocation("MATAGALPA", "CIUDAD_DARIO");
      assert.strictEqual(normalized.departmentId, "MATAGALPA");
      assert.strictEqual(normalized.departmentName, "Matagalpa");
      assert.strictEqual(normalized.municipalityId, "CIUDAD_DARIO");
      assert.strictEqual(normalized.municipalityName, "Ciudad Darío");
    });
  });
});

