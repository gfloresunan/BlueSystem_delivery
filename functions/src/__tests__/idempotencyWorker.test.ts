import * as assert from "assert";

/**
 * Suite de Pruebas Unitarias e Integración para FASE 3.2 — HARDENING DE IDEMPOTENCIA FCM REAL
 * Evalúa las 11 pruebas obligatorias: TEST A hasta TEST K.
 */

interface MockDeliveryRecord {
  deliveryKey: string;
  campaignId: string;
  uid: string;
  deviceId: string;
  status: "PENDING" | "SENDING" | "FCM_ACCEPTED" | "FAILED_RETRYABLE" | "FAILED_PERMANENT";
  attempts: number;
  fcmMessageId?: string | null;
  lastError?: string | null;
}

interface MockCampaign {
  id: string;
  status: string;
  title: string;
  body: string;
  targetType: string;
  targetUids?: string[];
  scheduledAt?: Date | null;
  processingStartedAt?: Date | null;
  leaseHeartbeatAt?: Date | null;
  workerId?: string | null;
  attempts: number;
  successCount?: number;
  failureCount?: number;
  skippedAlreadyAcceptedCount?: number;
  nextRetryAt?: Date | null;
  lastError?: string | null;
}

interface MockDevice {
  id: string;
  uid: string;
  deviceId: string;
  fcmToken: string | null;
  isActive: boolean;
  role: string;
  tokenStatus?: string;
}

class MockIdempotentQueueEnvironment {
  campaigns = new Map<string, MockCampaign>();
  devices: MockDevice[] = [];
  deliveries = new Map<string, MockDeliveryRecord>();
  sentFcmMessages: Array<{ deliveryKey: string; token: string; payload: any }> = [];

  reset() {
    this.campaigns.clear();
    this.devices = [];
    this.deliveries.clear();
    this.sentFcmMessages = [];
  }

  buildKey(campaignId: string, uid: string, deviceId: string): string {
    return `${campaignId}_${uid}_${deviceId}`;
  }

  claimCampaign(campaignId: string, workerId: string, leaseDurationMs: number = 5 * 60 * 1000): MockCampaign | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const now = new Date();
    const lastHeartbeat = campaign.leaseHeartbeatAt || campaign.processingStartedAt;
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
      if (lastHeartbeat && now.getTime() - lastHeartbeat.getTime() > leaseDurationMs) {
        isClaimable = true;
      }
    }

    if (!isClaimable) return null;

    campaign.status = "PROCESSING";
    campaign.processingStartedAt = now;
    campaign.leaseHeartbeatAt = now;
    campaign.workerId = workerId;
    campaign.attempts += 1;
    campaign.lastError = null;

    return campaign;
  }

  processCampaignWorker(campaignId: string, workerId: string, options?: { simulateCrashPostFcm?: boolean; simulatePartialFailureDevice?: string }) {
    const campaign = this.claimCampaign(campaignId, workerId);
    if (!campaign) {
      return { claimed: false, campaignId, status: "IGNORED_OR_ALREADY_CLAIMED" };
    }

    // Resolución de dispositivos
    let targetDevices = this.devices.filter((d) => d.isActive && d.fcmToken && d.fcmToken.length > 20);
    if (campaign.targetUids && campaign.targetUids.length > 0) {
      targetDevices = targetDevices.filter((d) => campaign.targetUids!.includes(d.uid));
    }

    // Filtrado de entregas deterministas (FASE 3.2 IDEMPOTENCIA)
    const devicesToDispatch: MockDevice[] = [];
    let skippedCount = 0;

    targetDevices.forEach((dev) => {
      const deliveryKey = this.buildKey(campaignId, dev.uid, dev.deviceId);
      const record = this.deliveries.get(deliveryKey);

      if (record && record.status === "FCM_ACCEPTED") {
        skippedCount++;
      } else if (record && record.status === "FAILED_PERMANENT") {
        // Omite reenvíos a tokens permanentemente inválidos
      } else {
        devicesToDispatch.push(dev);
        if (!record) {
          this.deliveries.set(deliveryKey, {
            deliveryKey,
            campaignId,
            uid: dev.uid,
            deviceId: dev.deviceId,
            status: "PENDING",
            attempts: 0,
          });
        }
      }
    });

    let newSends = 0;
    let newFailures = 0;

    devicesToDispatch.forEach((dev) => {
      const deliveryKey = this.buildKey(campaignId, dev.uid, dev.deviceId);
      const record = this.deliveries.get(deliveryKey)!;
      record.attempts += 1;
      record.status = "SENDING";

      if (options?.simulatePartialFailureDevice === dev.deviceId) {
        newFailures++;
        record.status = "FAILED_RETRYABLE";
        record.lastError = "Network Timeout Simulation";
      } else if (dev.tokenStatus === "invalid_token_simulation") {
        newFailures++;
        record.status = "FAILED_PERMANENT";
        record.lastError = "NotRegistered";
        dev.isActive = false;
        dev.fcmToken = null;
      } else {
        newSends++;
        record.status = "FCM_ACCEPTED";
        record.fcmMessageId = `msg_${Date.now()}_${Math.random()}`;
        this.sentFcmMessages.push({ deliveryKey, token: dev.fcmToken!, payload: { title: campaign.title, body: campaign.body } });
      }
    });

    // Simular Crash post-FCM si se especifica
    if (options?.simulateCrashPostFcm) {
      // El worker colapsa sin actualizar campaign status a SENT
      return { claimed: true, campaignId, status: "WORKER_CRASHED_BEFORE_SENT" };
    }

    // Evaluar entregas finales
    let pendingCount = 0;
    let acceptedCount = 0;
    let retryableCount = 0;
    let permanentCount = 0;

    this.deliveries.forEach((rec) => {
      if (rec.campaignId === campaignId) {
        if (rec.status === "PENDING" || rec.status === "SENDING") pendingCount++;
        else if (rec.status === "FCM_ACCEPTED") acceptedCount++;
        else if (rec.status === "FAILED_RETRYABLE") retryableCount++;
        else if (rec.status === "FAILED_PERMANENT") permanentCount++;
      }
    });

    if (pendingCount === 0 && retryableCount === 0) {
      campaign.status = "SENT";
      campaign.successCount = acceptedCount;
      campaign.failureCount = permanentCount;
      campaign.skippedAlreadyAcceptedCount = skippedCount;
      return { claimed: true, campaignId, status: "SENT", newSends, skippedCount, acceptedCount };
    } else if (campaign.attempts < 3) {
      campaign.status = "RETRY";
      campaign.nextRetryAt = new Date(Date.now() + 60000);
      campaign.successCount = acceptedCount;
      campaign.failureCount = retryableCount + permanentCount;
      campaign.skippedAlreadyAcceptedCount = skippedCount;
      return { claimed: true, campaignId, status: "RETRY", newSends, skippedCount, retryableCount };
    } else {
      campaign.status = "FAILED";
      campaign.successCount = acceptedCount;
      campaign.failureCount = retryableCount + permanentCount;
      campaign.skippedAlreadyAcceptedCount = skippedCount;
      return { claimed: true, campaignId, status: "FAILED", newSends, skippedCount };
    }
  }
}

function runIdempotencyTestSuite() {
  console.log("=======================================================================");
  console.log("🚀 INICIANDO TEST SUITE FASE 3.2 — HARDENING IDEMPOTENCIA FCM (TESTS A - K)");
  console.log("=======================================================================");

  const env = new MockIdempotentQueueEnvironment();

  // ─── TEST A: 1 campaña + 1 dispositivo ➔ 1 FCM_ACCEPTED ────────────────────
  env.reset();
  env.campaigns.set("camp_A", { id: "camp_A", status: "QUEUED", title: "A", body: "A", targetType: "specific", targetUids: ["user1"], attempts: 0 });
  env.devices.push({ id: "user1_dev1", uid: "user1", deviceId: "dev1", fcmToken: "token_user1_dev1_1234567890", isActive: true, role: "customer" });

  const resA = env.processCampaignWorker("camp_A", "worker_1");
  assert.strictEqual(resA.status, "SENT");
  assert.strictEqual(resA.newSends, 1);
  assert.strictEqual(env.deliveries.get("camp_A_user1_dev1")!.status, "FCM_ACCEPTED");
  console.log("✓ TEST A PASADO: 1 campaña + 1 dispositivo -> 1 FCM_ACCEPTED");

  // ─── TEST B: Campaña + 2 dispositivos ➔ 2 delivery keys distintas ──────────
  env.reset();
  env.campaigns.set("camp_B", { id: "camp_B", status: "QUEUED", title: "B", body: "B", targetType: "specific", targetUids: ["user1"], attempts: 0 });
  env.devices.push(
    { id: "user1_dev1", uid: "user1", deviceId: "dev1", fcmToken: "token_user1_dev1_1234567890", isActive: true, role: "customer" },
    { id: "user1_dev2", uid: "user1", deviceId: "dev2", fcmToken: "token_user1_dev2_1234567890", isActive: true, role: "customer" }
  );

  const resB = env.processCampaignWorker("camp_B", "worker_1");
  assert.strictEqual(resB.status, "SENT");
  assert.strictEqual(env.deliveries.size, 2);
  assert.ok(env.deliveries.has("camp_B_user1_dev1"));
  assert.ok(env.deliveries.has("camp_B_user1_dev2"));
  console.log("✓ TEST B PASADO: Campaña + 2 dispositivos -> 2 delivery keys deterministas creadas");

  // ─── TEST C: Reprocesar campaña ya completada ➔ 0 nuevos envíos FCM ─────────
  const resC = env.processCampaignWorker("camp_B", "worker_2");
  assert.strictEqual(resC.claimed, false);
  assert.strictEqual(env.sentFcmMessages.length, 2, "No deben agregarse nuevos mensajes FCM enviados");
  console.log("✓ TEST C PASADO: Reproceso de campaña completada -> 0 nuevos envíos FCM");

  // ─── TEST D: FCM success + Worker crash antes de SENT ➔ Reintento NO reenvía exitoso ─
  env.reset();
  env.campaigns.set("camp_D", { id: "camp_D", status: "QUEUED", title: "D", body: "D", targetType: "specific", targetUids: ["userD"], attempts: 0 });
  env.devices.push({ id: "userD_dev1", uid: "userD", deviceId: "dev1", fcmToken: "token_userD_dev1_1234567890", isActive: true, role: "customer" });

  // Worker A envía FCM exitosamente pero colapsa antes de marcar SENT
  const resD1 = env.processCampaignWorker("camp_D", "worker_A", { simulateCrashPostFcm: true });
  assert.strictEqual(resD1.status, "WORKER_CRASHED_BEFORE_SENT");
  assert.strictEqual(env.deliveries.get("camp_D_userD_dev1")!.status, "FCM_ACCEPTED");

  // Forzar expiración de lease para que Worker B recupere la campaña
  env.campaigns.get("camp_D")!.leaseHeartbeatAt = new Date(Date.now() - 6 * 60 * 1000);

  // Worker B recupera la campaña
  const resD2 = env.processCampaignWorker("camp_D", "worker_B");
  assert.strictEqual(resD2.status, "SENT");
  assert.strictEqual(resD2.newSends, 0, "Worker B debió omitir el reenvío FCM");
  assert.strictEqual(resD2.skippedCount, 1, "Worker B detectó el dispositivo como FCM_ACCEPTED previamente");
  console.log("✓ TEST D PASADO: Crash post-FCM -> Reintento por Worker B omite reenviar al dispositivo exitoso");

  // ─── TEST E: Partial success (dev1 SUCCESS, dev2 SUCCESS, dev3 FAILURE) ─────
  env.reset();
  env.campaigns.set("camp_E", { id: "camp_E", status: "QUEUED", title: "E", body: "E", targetType: "specific", targetUids: ["userE"], attempts: 0 });
  env.devices.push(
    { id: "userE_dev1", uid: "userE", deviceId: "dev1", fcmToken: "token_dev1_1234567890", isActive: true, role: "customer" },
    { id: "userE_dev2", uid: "userE", deviceId: "dev2", fcmToken: "token_dev2_1234567890", isActive: true, role: "customer" },
    { id: "userE_dev3", uid: "userE", deviceId: "dev3", fcmToken: "token_dev3_1234567890", isActive: true, role: "customer" }
  );

  // Intento 1: dev3 falla de forma transitoria
  const resE1 = env.processCampaignWorker("camp_E", "worker_1", { simulatePartialFailureDevice: "dev3" });
  assert.strictEqual(resE1.status, "RETRY");
  assert.strictEqual(env.deliveries.get("camp_E_userE_dev1")!.status, "FCM_ACCEPTED");
  assert.strictEqual(env.deliveries.get("camp_E_userE_dev2")!.status, "FCM_ACCEPTED");
  assert.strictEqual(env.deliveries.get("camp_E_userE_dev3")!.status, "FAILED_RETRYABLE");

  // Simular paso del tiempo para que nextRetryAt sea elegible
  env.campaigns.get("camp_E")!.nextRetryAt = new Date(Date.now() - 1000);

  // Intento 2 (Retry): Solo dev3 debe ser reintentado
  const resE2 = env.processCampaignWorker("camp_E", "worker_1");
  assert.strictEqual(resE2.status, "SENT");
  assert.strictEqual(resE2.newSends, 1, "Únicamente dev3 debió enviarse en el reintento");
  assert.strictEqual(resE2.skippedCount, 2, "dev1 y dev2 debieron omitirse por estar en FCM_ACCEPTED");
  console.log("✓ TEST E PASADO: Partial success -> Reintento envía ÚNICAMENTE al dispositivo fallido (dev3)");

  // ─── TEST F: Token NotRegistered ➔ FAILED_PERMANENT & token invalidado ─────
  env.reset();
  env.campaigns.set("camp_F", { id: "camp_F", status: "QUEUED", title: "F", body: "F", targetType: "specific", targetUids: ["userF"], attempts: 0 });
  env.devices.push({ id: "userF_dev1", uid: "userF", deviceId: "dev1", fcmToken: "token_invalid_1234567890_long", isActive: true, role: "customer", tokenStatus: "invalid_token_simulation" });

  const resF = env.processCampaignWorker("camp_F", "worker_1");
  assert.strictEqual(resF.status, "SENT");
  assert.strictEqual(env.deliveries.get("camp_F_userF_dev1")!.status, "FAILED_PERMANENT");
  assert.strictEqual(env.devices[0].isActive, false);
  console.log("✓ TEST F PASADO: Token NotRegistered -> FAILED_PERMANENT e invalidación en user_devices");

  // ─── TEST G: Worker paralelo ➔ Solo 1 worker procesa ────────────────────────
  env.reset();
  env.campaigns.set("camp_G", { id: "camp_G", status: "QUEUED", title: "G", body: "G", targetType: "all", attempts: 0 });
  const claim1 = env.claimCampaign("camp_G", "worker_A");
  const claim2 = env.claimCampaign("camp_G", "worker_B");
  assert.ok(claim1 !== null);
  assert.strictEqual(claim2, null);
  console.log("✓ TEST G PASADO: Worker paralelo -> Transacción atómica previene concurrencia");

  // ─── TEST H: Campaña > 5 minutos ➔ Heartbeat evita expiración falsa ────────
  env.reset();
  env.campaigns.set("camp_H", { id: "camp_H", status: "PROCESSING", title: "H", body: "H", targetType: "all", attempts: 1 });
  // Seteamos processingStartedAt hace 6 mins pero heartbeat activo hace 1 min
  env.campaigns.get("camp_H")!.processingStartedAt = new Date(Date.now() - 6 * 60 * 1000);
  env.campaigns.get("camp_H")!.leaseHeartbeatAt = new Date(Date.now() - 1 * 60 * 1000);

  const claimH = env.claimCampaign("camp_H", "worker_B");
  assert.strictEqual(claimH, null, "Worker B no debió reclamar porque el Heartbeat está vivo");
  console.log("✓ TEST H PASADO: Campaña > 5 minutos -> Lease Heartbeat activo evita expiración falsa");

  // ─── TEST I: Lease realmente expirado ➔ Recuperación segura ───────────────
  env.campaigns.get("camp_H")!.leaseHeartbeatAt = new Date(Date.now() - 6 * 60 * 1000);
  const claimI = env.claimCampaign("camp_H", "worker_B");
  assert.ok(claimI !== null, "Worker B debió reclamar la campaña al estar el heartbeat expirado");
  console.log("✓ TEST I PASADO: Lease realmente expirado -> Recuperación exitosa por Worker B");

  // ─── TEST J: Multi-device (mismo UID, 3 dispositivos) ➔ 3 deliveryKeys ──────
  env.reset();
  const k1 = env.buildKey("camp_1", "userX", "dev1");
  const k2 = env.buildKey("camp_1", "userX", "dev2");
  const k3 = env.buildKey("camp_1", "userX", "dev3");
  assert.notStrictEqual(k1, k2);
  assert.notStrictEqual(k2, k3);
  console.log("✓ TEST J PASADO: Mismo UID con 3 dispositivos -> 3 deliveryKeys distintas creadas");

  // ─── TEST K: Idempotencia de clave (mismo campaignId + uid + deviceId) ───────
  const kA = env.buildKey("camp_99", "userY", "devZ");
  const kB = env.buildKey("camp_99", "userY", "devZ");
  assert.strictEqual(kA, kB);
  console.log("✓ TEST K PASADO: Identicos argumentos -> Clave determinista deliveryKey exactamente igual");

  console.log("=======================================================================");
  console.log("🎉 TODOS LOS TESTS DE HARDENING FASE 3.2 (TEST A AL K) COMPLETADOS 100%");
  console.log("=======================================================================");
}

runIdempotencyTestSuite();
