"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Schemas Canónicos de Entidades Raíz Multi-Brand / White-Label
 *
 * Contratos puros de dominio (Strictly Isolated / Zero Operational Mutation).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESERVED_SUBDOMAINS = exports.DEFAULT_BRAND_CONFIG = void 0;
// ─── 11. DEFAULT BRAND CONSTANT (BACKWARD COMPATIBILITY INVARIANT) ───────────
exports.DEFAULT_BRAND_CONFIG = Object.freeze({
    logoUrl: 'https://storage.googleapis.com/bluesystem-assets/logo.png',
    iconUrl: 'https://storage.googleapis.com/bluesystem-assets/icon.png',
    splashUrl: 'https://storage.googleapis.com/bluesystem-assets/splash.png',
    faviconUrl: 'https://storage.googleapis.com/bluesystem-assets/favicon.ico',
    primaryColor: '#0284C7', // BluePrimary (Sky-600)
    secondaryColor: '#0EA5E9', // BlueSecondary (Sky-500)
    accentColor: '#38BDF8', // BlueTertiary (Sky-400)
    backgroundColor: '#0F172A', // BgDarkApp (Slate-900)
    textColor: '#F8FAFC', // TextPrimary (Slate-50)
    fontFamily: 'Inter, system-ui, sans-serif'
});
exports.RESERVED_SUBDOMAINS = Object.freeze([
    'admin',
    'api',
    'app',
    'login',
    'comercio',
    'registro',
    'onboarding',
    'merchant',
    'courier',
    'driver',
    'customer',
    'governance',
    'control-tower',
    'www',
    'mail',
    'support',
    'status',
    'portal',
    'auth',
    'static',
    'cdn'
]);
//# sourceMappingURL=models.js.map