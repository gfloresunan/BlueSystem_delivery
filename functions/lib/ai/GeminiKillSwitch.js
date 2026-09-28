"use strict";
/**
 * BlueSystem Delivery Enterprise � Kill Switch Especifico de Gemini AI (C3-GR)
 * PROTOCOL ID: BSD-AI-C3GR-PRE-CANARY-GEMINI-REMEDIATION
 *
 * GAP-C3G-08: Kill switch independiente del EIAM para detener trafico Gemini
 * sin requerir un nuevo build o APK release.
 *
 * MECANISMO: Variable de entorno GEMINI_AI_ENABLED en Cloud Functions.
 *
 * DEFAULT: false (FAIL-CLOSED)
 *
 * Para activar: configurar GEMINI_AI_ENABLED=true en Firebase Console
 *   -> Functions -> [funcion] -> Configuracion de entorno de ejecucion
 *   o via Firebase CLI: firebase functions:config:set ai.gemini_enabled=true
 *
 * PROPAGACION ESPERADA: ~1-2 minutos
 * Durante la propagacion, instancias ya activas pueden completar requests en curso.
 * Ninguna nueva instancia activara Gemini mientras el estado sea false/ausente.
 *
 * VERIFICACION POST-CAMBIO: OBLIGATORIA
 * Validar en logs estructurados que provider_status="DISABLED" desaparece
 * y que no aparecen nuevos eventos GEMINI_DISABLED tras ~2 min de haber
 * habilitado el sistema.
 *
 * INVARIANTE:
 * - Independiente de EIAM_V3_CANARY_ENABLED
 * - Independiente de GEMINI_AI_CANARY_ENABLED
 * - No requiere Firestore mutation
 * - No requiere Auth mutation
 * - No requiere Firestore Rules mutation
 * - Solo afecta el trafico Gemini AI del cliente
 * - Preserva toda la funcionalidad existente de BlueSystem
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiKillSwitch = void 0;
class GeminiKillSwitch {
    /**
     * Determina si el sistema Gemini AI esta habilitado.
     *
     * FAIL-CLOSED: Solo retorna true si GEMINI_AI_ENABLED="true" explicitamente.
     * Cualquier valor ausente, invalido o distinto de "true" retorna false.
     * Ante cualquier error de evaluacion, retorna false (fail-closed).
     */
    static isGeminiEnabled() {
        var _a, _b;
        try {
            const val = (_b = (_a = process.env.GEMINI_AI_ENABLED) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.trim();
            // Conservador: SOLO el string "true" activa el sistema
            return val === "true";
        }
        catch (_c) {
            // Fail-closed ante cualquier error inesperado
            return false;
        }
    }
    /**
     * Verificacion rapida del estado del kill switch para healthchecks y tests.
     */
    static getStatus() {
        try {
            const val = process.env.GEMINI_AI_ENABLED;
            if (val === undefined || val === null || val.trim() === "") {
                return { enabled: false, reason: "ENV_VAR_ABSENT" };
            }
            if (val.toLowerCase().trim() === "true") {
                return { enabled: true, reason: "EXPLICITLY_ENABLED" };
            }
            if (val.toLowerCase().trim() === "false") {
                return { enabled: false, reason: "DEFAULT_DISABLED" };
            }
            return { enabled: false, reason: "INVALID_VALUE" };
        }
        catch (_a) {
            return { enabled: false, reason: "DEFAULT_DISABLED" };
        }
    }
}
exports.GeminiKillSwitch = GeminiKillSwitch;
//# sourceMappingURL=GeminiKillSwitch.js.map