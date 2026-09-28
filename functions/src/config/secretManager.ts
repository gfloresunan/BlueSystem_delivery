/**
 * BlueSystem Delivery Enterprise — Secret Manager Service
 * Sprint 17.1 Infrastructure Foundation
 *
 * Servicio Singleton para gestión centralizada de secretos desde Google Cloud Secret Manager.
 * PROHIBIDO el uso directo de process.env.API_KEY para claves sensibles.
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getEnvironment } from "./environment";

export type SecretKey =
  | "GOOGLE_MAPS_API_KEY"
  | "FCM_SERVER_KEY"
  | "TWILIO_ACCOUNT_SID"
  | "TWILIO_AUTH_TOKEN"
  | "SMTP_API_KEY"
  | "SMTP_PASSWORD"
  | "SMTP_USER"
  | "SMTP_HOST"
  | "SMTP_PORT"
  | "SENDGRID_API_KEY"
  | "JWT_SIGNING_SECRET"
  | "PAYMENT_SECRET"
  | "APP_SIGNATURE";

interface CachedSecret {
  value: string;
  fetchedAt: number;
  expiresAt: number;
}

export class SecretService {
  private static instance: SecretService;
  private client: SecretManagerServiceClient | null = null;
  private cache = new Map<SecretKey, CachedSecret>();
  private inFlightPromises = new Map<SecretKey, Promise<string>>();
  private readonly defaultTtlMs = 15 * 60 * 1000; // 15 minutos

  private constructor() {
    const env = getEnvironment();
    // En producción o staging con credenciales inicializa el cliente GCP Secret Manager
    if (env.isProduction || env.isStaging) {
      try {
        this.client = new SecretManagerServiceClient();
      } catch (e) {
        console.warn("[SecretService] SecretManagerServiceClient initialized in fallback mode.");
      }
    }
  }

  public static getInstance(): SecretService {
    if (!SecretService.instance) {
      SecretService.instance = new SecretService();
    }
    return SecretService.instance;
  }

  /**
   * Obtiene un secreto por su clave con soporte de cache, deduplicación y fallback seguro en dev/staging.
   */
  public async getSecret(key: SecretKey): Promise<string> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && now < cached.expiresAt) {
      return cached.value;
    }

    // Evitar llamadas duplicadas concurrentes al servicio
    if (this.inFlightPromises.has(key)) {
      return this.inFlightPromises.get(key)!;
    }

    const fetchPromise = this.fetchSecretFromSource(key);
    this.inFlightPromises.set(key, fetchPromise);

    try {
      const secretValue = await fetchPromise;
      this.cache.set(key, {
        value: secretValue,
        fetchedAt: now,
        expiresAt: now + this.defaultTtlMs,
      });
      return secretValue;
    } finally {
      this.inFlightPromises.delete(key);
    }
  }

  /**
   * Fuerza la invalidación y renovación de la caché para un secreto específico.
   */
  public invalidateCache(key?: SecretKey): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  private async fetchSecretFromSource(key: SecretKey): Promise<string> {
    const env = getEnvironment();

    if (this.client && (env.isProduction || env.isStaging)) {
      try {
        const name = `projects/${env.projectId}/secrets/${key}/versions/latest`;
        const [version] = await this.client.accessSecretVersion({ name });
        const payload = version.payload?.data?.toString();
        if (payload) return payload;
      } catch (err: any) {
        console.error(`[SecretService] Failed to fetch secret ${key} from GCP Secret Manager: ${err.message}`);
      }
    }

    // Fallback controlado para staging / dev local
    const fallbackEnv = process.env[key];
    if (fallbackEnv && fallbackEnv.trim().length > 0) {
      return fallbackEnv;
    }

    // Si es un secreto crítico y no existe en ninguna fuente, lanzar excepción estricta
    throw new Error(
      `[SecretService CRITICAL ERROR] Secret ${key} missing in Secret Manager and environment!`
    );
  }
}

export const secretService = SecretService.getInstance();
