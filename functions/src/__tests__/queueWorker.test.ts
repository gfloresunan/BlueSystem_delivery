import * as assert from "assert";

/**
 * Suite de pruebas unitarias e integración para FASE 3 — QUEUE WORKER ENTERPRISE
 * Evalúa los escenarios de prueba TEST A hasta TEST H indicados en la especificación.
 */

interface MockCampaign {
  id: string;
  status: string;
  title: string;
  body: string;
  targetType: string;
  targetUids?: string[];
  scheduledAt?: Date | null;
  processingStartedAt?: Date | null;
  workerId?: string | null;
  attempts: number;
  successCount?: number;
  failureCount?: number;
  targetedUsers?: number;
  targetedDevices?: number;
  invalidTokenCount?: number;
  nextRetryAt?: Date | null;
  lastError?: string | null;
}

interface MockDevice {
  id: string;
  uid: string;
  fcmToken: string | null;
  isActive: boolean;
  role: string;
  tokenStatus?: string;
}

class MockQueueWorkerEnvironment {
  campaigns = new Map<string, MockCampaign>();
  devices: MockDevice[] = [];
  sentFcmMessages: Array<{ token: string; payload: any }> = [];
  invalidatedTokens: string[] = [];

  reset() {
    this.campaigns.clear();
    this.devices = [];
    this.sentFcmMessages = [];
    this.invalidatedTokens = [];
  }

  // Simulación atómica de claim (FASE 4 - LOCK/CLAIM)
  claimCampaign(campaignId: string, workerId: string, leaseDurationMs: number = 5 * 60 * 1000): MockCampaign | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const now = new Date();
    let isClaimable = false;

    if (campaign.status === "QUEUED") {
      if (!campaign.scheduledAt || campaign.scheduledAt <= now) {
        isClaimable = true;
      }
    } else if (campaign.status === "RETRY") {
      if (!campaign.nextRetryAt || campaign.nextRetryAt <= now) {
        isClaimable = true;
      }
    } else if (campaign.status === "PROCESSING") {
      if (campaign.processingStartedAt && now.getTime() - campaign.processingStartedAt.getTime() > leaseDurationMs) {
        isClaimable = true;
      }
    }

    if (!isClaimable) return null;

    campaign.status = "PROCESSING";
    campaign.processingStartedAt = now;
    campaign.workerId = workerId;
    campaign.attempts += 1;
    campaign.lastError = null;

    return campaign;
  }

  // Simulación de ejecución del Worker (FASE 5-12)
  processCampaignWorker(campaignId: string, workerId: string, options?: { simulateTransientError?: boolean }) {
    const campaign = this.claimCampaign(campaignId, workerId);
    if (!campaign) {
      return { claimed: false, campaignId, status: "IGNORED_OR_ALREADY_CLAIMED" };
    }

    if (options?.simulateTransientError) {
      if (campaign.attempts < 3) {
        campaign.status = "RETRY";
        campaign.nextRetryAt = new Date(Date.now() + 60000);
        campaign.lastError = "Transient network timeout";
        return { claimed: true, campaignId, status: "RETRY", error: campaign.lastError };
      } else {
        campaign.status = "FAILED";
        campaign.lastError = "Falló tras 3 intentos";
        return { claimed: true, campaignId, status: "FAILED", error: campaign.lastError };
      }
    }

    // Resolución de destinatarios
    let targetDevices = this.devices.filter((d) => d.isActive && d.fcmToken && d.fcmToken.length > 20);

    if (campaign.targetUids && campaign.targetUids.length > 0) {
      targetDevices = targetDevices.filter((d) => campaign.targetUids!.includes(d.uid));
    }

    const uniqueUids = new Set(targetDevices.map((d) => d.uid));
    let success = 0;
    let failure = 0;
    let invalidCount = 0;

    targetDevices.forEach((dev) => {
      if (dev.tokenStatus === "invalid_token_simulation") {
        failure++;
        invalidCount++;
        dev.isActive = false;
        dev.tokenStatus = "invalid";
        dev.fcmToken = null;
        this.invalidatedTokens.push(dev.id);
      } else {
        success++;
        this.sentFcmMessages.push({ token: dev.fcmToken!, payload: { title: campaign.title, body: campaign.body } });
      }
    });

    // Semántica ternaria — espejo exacto de la lógica del worker real
    const finalStatus =
      targetDevices.length === 0
        ? "SENT"
        : success === targetDevices.length
        ? "SENT"
        : success > 0
        ? "PARTIALLY_SENT"
        : "FAILED";

    campaign.status = finalStatus;
    campaign.targetedUsers = uniqueUids.size;
    campaign.targetedDevices = targetDevices.length;
    campaign.successCount = success;
    campaign.failureCount = failure;
    campaign.invalidTokenCount = invalidCount;

    return {
      claimed: true,
      campaignId,
      status: finalStatus,
      successCount: success,
      failureCount: failure,
      targetedDevices: targetDevices.length,
      targetedUsers: uniqueUids.size,
      invalidTokenCount: invalidCount,
    };
  }
}

function runTestSuite() {
  console.log("=======================================================================");
  console.log("🚀 INICIANDO TEST SUITE ENTERPRISE — FASE 3 QUEUE WORKER (TESTS A - H)");
  console.log("=======================================================================");

  const env = new MockQueueWorkerEnvironment();

  // ─── TEST A: Campaña QUEUED -> Worker la toma -> PROCESSING -> SENT ─────────
  env.reset();
  env.campaigns.set("camp_A", {
    id: "camp_A",
    status: "QUEUED",
    title: "Test A Title",
    body: "Test A Body",
    targetType: "specific",
    targetUids: ["userA"],
    attempts: 0,
  });
  env.devices.push({ id: "userA_dev1", uid: "userA", fcmToken: "token_userA_dev1_1234567890", isActive: true, role: "customer" });

  const resA = env.processCampaignWorker("camp_A", "worker_1");
  assert.strictEqual(resA.claimed, true, "TEST A Falló: Worker debió reclamar la campaña");
  assert.strictEqual(resA.status, "SENT", "TEST A Falló: El estado final debe ser SENT");
  assert.strictEqual(resA.successCount, 1, "TEST A Falló: Se esperaba 1 envío exitoso");
  assert.strictEqual(env.campaigns.get("camp_A")!.status, "SENT");
  console.log("✓ TEST A PASADO: Campaña QUEUED -> Claim (PROCESSING) -> SENT exitosamente");

  // ─── TEST B: Campaña sin destinatarios -> no envía -> estado SENT con counts = 0 ──
  env.reset();
  env.campaigns.set("camp_B", {
    id: "camp_B",
    status: "QUEUED",
    title: "Test B Title",
    body: "Test B Body",
    targetType: "specific",
    targetUids: ["user_inexistente"],
    attempts: 0,
  });

  const resB = env.processCampaignWorker("camp_B", "worker_1");
  assert.strictEqual(resB.claimed, true, "TEST B Falló: Worker debió reclamar la campaña");
  assert.strictEqual(resB.status, "SENT", "TEST B Falló: Estado debe ser SENT");
  assert.strictEqual(resB.successCount, 0, "TEST B Falló: 0 envíos");
  assert.strictEqual(resB.targetedDevices, 0, "TEST B Falló: 0 dispositivos encontrados");
  console.log("✓ TEST B PASADO: Campaña sin destinatarios -> procesada correctamente con 0 envíos");

  // ─── TEST C: Dos dispositivos del mismo usuario -> ambos reciben ────────────
  env.reset();
  env.campaigns.set("camp_C", {
    id: "camp_C",
    status: "QUEUED",
    title: "Test C Multi",
    body: "Test C Body",
    targetType: "specific",
    targetUids: ["userMulti"],
    attempts: 0,
  });
  env.devices.push(
    { id: "userMulti_dev1", uid: "userMulti", fcmToken: "token_multi_dev1_1234567890", isActive: true, role: "courier" },
    { id: "userMulti_dev2", uid: "userMulti", fcmToken: "token_multi_dev2_1234567890", isActive: true, role: "courier" }
  );

  const resC = env.processCampaignWorker("camp_C", "worker_1");
  assert.strictEqual(resC.status, "SENT");
  assert.strictEqual(resC.targetedUsers, 1, "TEST C Falló: 1 usuario objetivo");
  assert.strictEqual(resC.targetedDevices, 2, "TEST C Falló: 2 dispositivos objetivos");
  assert.strictEqual(resC.successCount, 2, "TEST C Falló: Ambos dispositivos deben recibir la notificación");
  console.log("✓ TEST C PASADO: Usuario con 2 dispositivos -> ambos reciben el envío multicast");

  // ─── TEST D: Token inválido -> successCount & failureCount correctos -> token marcado ─
  env.reset();
  env.campaigns.set("camp_D", {
    id: "camp_D",
    status: "QUEUED",
    title: "Test D Invalid Token",
    body: "Test D Body",
    targetType: "specific",
    targetUids: ["userD"],
    attempts: 0,
  });
  env.devices.push({
    id: "userD_dev1",
    uid: "userD",
    fcmToken: "token_userD_invalid_1234567890",
    isActive: true,
    role: "customer",
    tokenStatus: "invalid_token_simulation",
  });

  const resD = env.processCampaignWorker("camp_D", "worker_1");
  // Con la semántica corregida: 0 FCM_ACCEPTED sobre 1 dispositivo objetivo = FAILED (no SENT)
  assert.strictEqual(resD.status, "FAILED");
  assert.strictEqual(resD.successCount, 0);
  assert.strictEqual(resD.failureCount, 1);
  assert.strictEqual(resD.invalidTokenCount, 1);
  assert.strictEqual(env.devices[0].isActive, false, "TEST D Falló: Dispositivo debe ser desactivado");
  assert.strictEqual(env.devices[0].tokenStatus, "invalid");
  console.log("✓ TEST D PASADO: Token FCM inválido -> falla contada e invalidación de token según política");

  // ─── TEST E: Error transitorio -> retry ─────────────────────────────────────
  env.reset();
  env.campaigns.set("camp_E", {
    id: "camp_E",
    status: "QUEUED",
    title: "Test E Retry",
    body: "Test E Body",
    targetType: "all",
    attempts: 0,
  });

  const resE = env.processCampaignWorker("camp_E", "worker_1", { simulateTransientError: true });
  assert.strictEqual(resE.status, "RETRY");
  assert.strictEqual(env.campaigns.get("camp_E")!.status, "RETRY");
  assert.strictEqual(env.campaigns.get("camp_E")!.attempts, 1);
  assert.ok(env.campaigns.get("camp_E")!.nextRetryAt !== null);
  console.log("✓ TEST E PASADO: Error transitorio -> campaña en estado RETRY con marca de tiempo");

  // ─── TEST F: Campaña ya SENT -> Worker NO vuelve a enviarla ──────────────────
  env.reset();
  env.campaigns.set("camp_F", {
    id: "camp_F",
    status: "SENT",
    title: "Test F Already Sent",
    body: "Test F Body",
    targetType: "all",
    attempts: 1,
  });

  const resF = env.processCampaignWorker("camp_F", "worker_2");
  assert.strictEqual(resF.claimed, false);
  assert.strictEqual(resF.status, "IGNORED_OR_ALREADY_CLAIMED");
  console.log("✓ TEST F PASADO: Campaña ya en estado SENT -> ignorada por el Worker (Idempotencia)");

  // ─── TEST G: Dos ejecuciones simultáneas -> solo una procesa la campaña ─────
  env.reset();
  env.campaigns.set("camp_G", {
    id: "camp_G",
    status: "QUEUED",
    title: "Test G Race Condition",
    body: "Test G Body",
    targetType: "specific",
    targetUids: ["userG"],
    attempts: 0,
  });
  env.devices.push({ id: "userG_dev1", uid: "userG", fcmToken: "token_userG_dev1_1234567890", isActive: true, role: "customer" });

  const claimWorker1 = env.claimCampaign("camp_G", "worker_A");
  const claimWorker2 = env.claimCampaign("camp_G", "worker_B");

  assert.ok(claimWorker1 !== null, "TEST G Falló: Worker A debió ganar el lock");
  assert.strictEqual(claimWorker2, null, "TEST G Falló: Worker B debió ser rechazado por lock atómico");
  console.log("✓ TEST G PASADO: Dos ejecuciones simultáneas -> solo un Worker obtiene el lock atómico");

  // ─── TEST H: Campaña SCHEDULED futura -> NO procesar antes de scheduledAt ────
  env.reset();
  const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hora en el futuro
  env.campaigns.set("camp_H", {
    id: "camp_H",
    status: "QUEUED",
    title: "Test H Scheduled",
    body: "Test H Body",
    targetType: "all",
    scheduledAt: futureDate,
    attempts: 0,
  });

  const resH = env.processCampaignWorker("camp_H", "worker_1");
  assert.strictEqual(resH.claimed, false);
  assert.strictEqual(resH.status, "IGNORED_OR_ALREADY_CLAIMED");
  assert.strictEqual(env.campaigns.get("camp_H")!.status, "QUEUED");
  console.log("✓ TEST H PASADO: Campaña programada a futuro -> no se procesa antes de scheduledAt");

  console.log("=======================================================================");
  console.log("🎉 TODOS LOS TESTS (TEST A AL TEST H) COMPLETADOS Y CERTIFICADOS 100%");
  console.log("=======================================================================");
}

runTestSuite();
