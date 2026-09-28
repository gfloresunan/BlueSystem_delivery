"use strict";
/**
 * BlueSystem Delivery Enterprise — In-Memory Sliding Window Rate Limiter
 * Baseline: 60 solicitudes por minuto por UID autenticado.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRateLimiter = exports.RateLimiter = void 0;
class RateLimiter {
    constructor(maxRequests = 60, windowMs = 60000) {
        this.records = new Map();
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    checkLimit(uid) {
        if (!uid) {
            return { allowed: false, remaining: 0, resetTimeMs: Date.now() + this.windowMs };
        }
        const now = Date.now();
        const windowStart = now - this.windowMs;
        let record = this.records.get(uid);
        if (!record) {
            record = { timestamps: [] };
            this.records.set(uid, record);
        }
        // Filtrar timestamps fuera de la ventana
        record.timestamps = record.timestamps.filter((t) => t > windowStart);
        if (record.timestamps.length >= this.maxRequests) {
            const oldest = record.timestamps[0] || now;
            const resetTimeMs = oldest + this.windowMs;
            return { allowed: false, remaining: 0, resetTimeMs };
        }
        record.timestamps.push(now);
        return {
            allowed: true,
            remaining: this.maxRequests - record.timestamps.length,
            resetTimeMs: now + this.windowMs,
        };
    }
    reset(uid) {
        if (uid) {
            this.records.delete(uid);
        }
        else {
            this.records.clear();
        }
    }
}
exports.RateLimiter = RateLimiter;
exports.defaultRateLimiter = new RateLimiter(60, 60000);
