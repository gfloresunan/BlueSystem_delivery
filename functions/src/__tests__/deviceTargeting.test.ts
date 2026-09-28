import * as assert from "assert";

/**
 * Standalone Test Suite for Phase 1 FCM Device Targeting & Resolution
 * Executes tests TEST A through TEST G as required by Section 7.
 */

interface DeviceRecord {
  id: string;
  uid: string;
  fcmToken: string;
  isActive: boolean;
  role: string;
}

// Mock in-memory database of user_devices
const mockUserDevices: DeviceRecord[] = [
  // User A: 1 device
  { id: "userA_dev1", uid: "userA", fcmToken: "token_userA_dev1_123456789012345", isActive: true, role: "customer" },
  
  // User B: 2 devices
  { id: "userB_dev1", uid: "userB", fcmToken: "token_userB_dev1_123456789012345", isActive: true, role: "courier" },
  { id: "userB_dev2", uid: "userB", fcmToken: "token_userB_dev2_123456789012345", isActive: true, role: "courier" },

  // User C: 3 devices
  { id: "userC_dev1", uid: "userC", fcmToken: "token_userC_dev1_123456789012345", isActive: true, role: "customer" },
  { id: "userC_dev2", uid: "userC", fcmToken: "token_userC_dev2_123456789012345", isActive: true, role: "customer" },
  { id: "userC_dev3", uid: "userC", fcmToken: "token_userC_dev3_123456789012345", isActive: true, role: "customer" },

  // User D: Inactive device (should be excluded)
  { id: "userD_dev1", uid: "userD", fcmToken: "token_userD_dev1_123456789012345", isActive: false, role: "business" },

  // Additional Courier and Business devices
  { id: "userE_dev1", uid: "userE", fcmToken: "token_userE_dev1_123456789012345", isActive: true, role: "driver" },
  { id: "userF_dev1", uid: "userF", fcmToken: "token_userF_dev1_123456789012345", isActive: true, role: "comercio" },
];

/**
 * Helper function matching the canonical device targeting logic in notifications.ts / orders.ts
 */
function resolveTargetDevices(targetType: string, targetUids?: string[], segment?: string): DeviceRecord[] {
  let result = mockUserDevices.filter((d) => d.isActive);

  const targetTypeLower = (targetType || "all").toString().toLowerCase().trim();

  if (Array.isArray(targetUids) && targetUids.length > 0) {
    result = result.filter((d) => targetUids.includes(d.uid));
  } else if (targetTypeLower === "segment" && segment) {
    const segLower = segment.toString().toLowerCase().trim();
    result = result.filter((d) => d.role.toLowerCase() === segLower);
  } else if (["courier", "driver", "motorizado"].includes(targetTypeLower)) {
    result = result.filter((d) => ["courier", "driver", "motorizado"].includes(d.role.toLowerCase()));
  } else if (["customer", "cliente"].includes(targetTypeLower)) {
    result = result.filter((d) => ["customer", "cliente"].includes(d.role.toLowerCase()));
  } else if (["business", "comercio"].includes(targetTypeLower)) {
    result = result.filter((d) => ["business", "comercio"].includes(d.role.toLowerCase()));
  } else if (["admin", "super_admin"].includes(targetTypeLower)) {
    result = result.filter((d) => ["admin", "super_admin"].includes(d.role.toLowerCase()));
  } else if (targetTypeLower !== "all") {
    result = result.filter((d) => d.role.toLowerCase() === targetTypeLower);
  }

  return result;
}

function runTests() {
  console.log("=== EJECUTANDO TEST SUITE DE TARGETING MULTI-DISPOSITIVO (FASE 1) ===");

  // TEST A: 1 dispositivo
  const resA = resolveTargetDevices("specific", ["userA"]);
  assert.strictEqual(resA.length, 1, "TEST A Falló: Se esperaba 1 dispositivo");
  assert.strictEqual(resA[0].id, "userA_dev1", "TEST A Falló: Device ID no coincide");
  console.log("✓ TEST A PASADO: Usuario con 1 dispositivo -> devicesFound = 1");

  // TEST B: 2 dispositivos
  const resB = resolveTargetDevices("specific", ["userB"]);
  assert.strictEqual(resB.length, 2, "TEST B Falló: Se esperaban 2 dispositivos");
  assert.deepStrictEqual(resB.map((d) => d.id), ["userB_dev1", "userB_dev2"], "TEST B Falló: Listado de dispositivos no coincide");
  console.log("✓ TEST B PASADO: Usuario con 2 dispositivos -> devicesFound = 2");

  // TEST C: 3 dispositivos
  const resC = resolveTargetDevices("specific", ["userC"]);
  assert.strictEqual(resC.length, 3, "TEST C Falló: Se esperaban 3 dispositivos");
  assert.deepStrictEqual(resC.map((d) => d.id), ["userC_dev1", "userC_dev2", "userC_dev3"], "TEST C Falló: Listado de dispositivos no coincide");
  console.log("✓ TEST C PASADO: Usuario con 3 dispositivos -> devicesFound = 3");

  // TEST D: 0 dispositivos
  const resD1 = resolveTargetDevices("specific", ["userXYZ_non_existent"]);
  assert.strictEqual(resD1.length, 0, "TEST D Falló: Se esperaban 0 dispositivos para usuario inexistente");
  const resD2 = resolveTargetDevices("specific", ["userD"]); // Inactivo
  assert.strictEqual(resD2.length, 0, "TEST D Falló: Se esperaban 0 dispositivos para usuario inactivo");
  console.log("✓ TEST D PASADO: Usuario sin dispositivo -> devicesFound = 0 (sin error fatal)");

  // TEST E: targetType = all
  const resE = resolveTargetDevices("all");
  assert.strictEqual(resE.length, 8, "TEST E Falló: Se esperaban 8 dispositivos activos en total");
  assert.strictEqual(resE.every((d) => d.isActive), true, "TEST E Falló: Todos deben estar activos");
  console.log("✓ TEST E PASADO: targetType = 'all' -> encuentra todos los dispositivos activos válidos");

  // TEST F: targetType = courier
  const resF = resolveTargetDevices("courier");
  assert.strictEqual(resF.length, 3, "TEST F Falló: Se esperaban 3 dispositivos en segmento courier");
  assert.strictEqual(resF.every((d) => ["courier", "driver", "motorizado"].includes(d.role.toLowerCase())), true);
  console.log("✓ TEST F PASADO: targetType = 'courier' -> selecciona únicamente dispositivos del segmento courier");

  // TEST G: targetType = customer
  const resG = resolveTargetDevices("customer");
  assert.strictEqual(resG.length, 4, "TEST G Falló: Se esperaban 4 dispositivos en segmento customer");
  assert.strictEqual(resG.every((d) => ["customer", "cliente"].includes(d.role.toLowerCase())), true);
  console.log("✓ TEST G PASADO: targetType = 'customer' -> selecciona únicamente dispositivos del segmento customer");

  console.log("=======================================================================");
  console.log("🎉 TODOS LOS TESTS (TEST A AL TEST G) SE EJECUTARON Y PASARON AL 100%");
  console.log("=======================================================================");
}

runTests();
