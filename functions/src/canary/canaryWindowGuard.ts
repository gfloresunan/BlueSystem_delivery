/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY WINDOW GUARD (FASE 2C.13 CHECKPOINT #4)
 * Control de Ventana Temporal Estricta y Auto-Aborto por Timeout
 *
 * Microfase: C4-S (Time-Boxed Canary Window)
 */

import { CanaryKillSwitch } from './canaryKillSwitch';

export class CanaryWindowGuard {
  private static _startTime: number | null = null;
  private static _maxDurationMs: number = 10 * 60 * 1000; // 10 minutos por defecto
  private static _isWindowOpen: boolean = false;

  static startWindow(maxDurationMs: number = 10 * 60 * 1000): void {
    this._startTime = Date.now();
    this._maxDurationMs = maxDurationMs;
    this._isWindowOpen = true;
  }

  static isWindowOpen(): boolean {
    if (!this._isWindowOpen || this._startTime === null) {
      return false;
    }

    const elapsed = Date.now() - this._startTime;
    if (elapsed > this._maxDurationMs) {
      // Ventana expirada -> Auto Disable
      this.closeWindow('TIMEOUT_EXPIRED');
      return false;
    }

    return true;
  }

  static closeWindow(reason: string = 'WINDOW_CLOSED_NORMALLY'): void {
    this._isWindowOpen = false;
    this._startTime = null;
    CanaryKillSwitch.disableCanary(
      `CANARY_WINDOW_CLOSED: ${reason}`,
      'CanaryWindowGuard'
    );
  }

  static getRemainingTimeMs(): number {
    if (!this._isWindowOpen || this._startTime === null) {
      return 0;
    }
    const elapsed = Date.now() - this._startTime;
    return Math.max(0, this._maxDurationMs - elapsed);
  }

  static reset(): void {
    this._startTime = null;
    this._isWindowOpen = false;
    this._maxDurationMs = 10 * 60 * 1000;
  }
}
