/**
 * BlueSystem Delivery Enterprise — In-Memory Sliding Window Rate Limiter
 * Baseline: 60 solicitudes por minuto por UID autenticado.
 */

interface RateRecord {
  timestamps: number[];
}

export class RateLimiter {
  private records: Map<string, RateRecord> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public checkLimit(uid: string): { allowed: boolean; remaining: number; resetTimeMs: number } {
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

  public reset(uid?: string) {
    if (uid) {
      this.records.delete(uid);
    } else {
      this.records.clear();
    }
  }
}

export const defaultRateLimiter = new RateLimiter(60, 60000);
