"use strict";
/**
 * BlueSystem Delivery Enterprise — Secret Manager Service
 * Sprint 17.1 Infrastructure Foundation
 *
 * Servicio Singleton para gestión centralizada de secretos desde Google Cloud Secret Manager.
 * PROHIBIDO el uso directo de process.env.API_KEY para claves sensibles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.secretService = exports.SecretService = void 0;
const secret_manager_1 = require("@google-cloud/secret-manager");
const environment_1 = require("./environment");
class SecretService {
    constructor() {
        this.client = null;
        this.cache = new Map();
        this.inFlightPromises = new Map();
        this.defaultTtlMs = 15 * 60 * 1000; // 15 minutos
        const env = (0, environment_1.getEnvironment)();
        // En producción o staging con credenciales inicializa el cliente GCP Secret Manager
        if (env.isProduction || env.isStaging) {
            try {
                this.client = new secret_manager_1.SecretManagerServiceClient();
            }
            catch (e) {
                console.warn("[SecretService] SecretManagerServiceClient initialized in fallback mode.");
            }
        }
    }
    static getInstance() {
        if (!SecretService.instance) {
            SecretService.instance = new SecretService();
        }
        return SecretService.instance;
    }
    /**
     * Obtiene un secreto por su clave con soporte de cache, deduplicación y fallback seguro en dev/staging.
     */
    async getSecret(key) {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && now < cached.expiresAt) {
            return cached.value;
        }
        // Evitar llamadas duplicadas concurrentes al servicio
        if (this.inFlightPromises.has(key)) {
            return this.inFlightPromises.get(key);
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
        }
        finally {
            this.inFlightPromises.delete(key);
        }
    }
    /**
     * Fuerza la invalidación y renovación de la caché para un secreto específico.
     */
    invalidateCache(key) {
        if (key) {
            this.cache.delete(key);
        }
        else {
            this.cache.clear();
        }
    }
    async fetchSecretFromSource(key) {
        const env = (0, environment_1.getEnvironment)();
        if (this.client && (env.isProduction || env.isStaging)) {
            try {
                const name = `projects/${env.projectId}/secrets/${key}/versions/latest`;
                const [version] = await this.client.accessSecretVersion({ name });
                const payload = version.payload?.data?.toString();
                if (payload)
                    return payload;
            }
            catch (err) {
                console.error(`[SecretService] Failed to fetch secret ${key} from GCP Secret Manager: ${err.message}`);
            }
        }
        // Fallback controlado para staging / dev local
        const fallbackEnv = process.env[key];
        if (fallbackEnv && fallbackEnv.trim().length > 0) {
            return fallbackEnv;
        }
        // Si es un secreto crítico y no existe en ninguna fuente, lanzar excepción estricta
        throw new Error(`[SecretService CRITICAL ERROR] Secret ${key} missing in Secret Manager and environment!`);
    }
}
exports.SecretService = SecretService;
exports.secretService = SecretService.getInstance();
