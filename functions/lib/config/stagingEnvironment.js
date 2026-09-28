"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 STAGING ENVIRONMENT (FASE 2C.12)
 * Declaración Determinística del Entorno de Staging
 *
 * MANDATE #1: Emulator Gate corre contra Firebase Emulator real.
 *
 * Este módulo declara los endpoints del Firebase Emulator Suite local,
 * separando físicamente el entorno de staging de producción.
 *
 * ════════════════════════════════════════════════════════════════════════
 * PRODUCCIÓN:   bluesystem-7c9af   (LOCKED - NO TOCAR)
 * STAGING:      EMULATOR_LOCAL     (Solo in-process via Firebase Emulator)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Referencia firebase.json para activar emuladores:
 * {
 *   "emulators": {
 *     "auth":      { "port": 9099 },
 *     "firestore": { "port": 8080 },
 *     "functions": { "port": 5001 },
 *     "ui":        { "enabled": true, "port": 4000 }
 *   }
 * }
 *
 * Para ejecutar: firebase emulators:start --only auth,firestore,functions
 * NOTA: firebase.json de producción no se modifica (MANDATE #2 / #4).
 *       La configuración del emulador se aplica por variables de entorno.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMULATOR_CONFIG = exports.PRODUCTION_PROJECT_ID = exports.STAGING_PROJECT_ID = void 0;
exports.initializeEmulatorEnvironment = initializeEmulatorEnvironment;
exports.cleanupEmulatorEnvironment = cleanupEmulatorEnvironment;
exports.isEmulatorEnvironmentActive = isEmulatorEnvironmentActive;
exports.generateEnvironmentSeparationReport = generateEnvironmentSeparationReport;
exports.STAGING_PROJECT_ID = 'EMULATOR_LOCAL';
exports.PRODUCTION_PROJECT_ID = 'bluesystem-7c9af';
/**
 * Endpoints del Firebase Emulator Suite (locales, sin acceso a internet).
 * MANDATE #1: Estas variables de entorno apuntan al emulador real.
 */
exports.EMULATOR_CONFIG = {
    projectId: exports.STAGING_PROJECT_ID,
    auth: {
        host: 'localhost',
        port: 9099,
        envVar: 'FIREBASE_AUTH_EMULATOR_HOST',
        value: 'localhost:9099'
    },
    firestore: {
        host: 'localhost',
        port: 8080,
        envVar: 'FIRESTORE_EMULATOR_HOST',
        value: 'localhost:8080'
    },
    functions: {
        host: 'localhost',
        port: 5001,
        envVar: 'FIREBASE_FUNCTIONS_EMULATOR_HOST',
        value: 'localhost:5001'
    }
};
/**
 * Inicializa las variables de entorno para apuntar al Emulador.
 * Debe llamarse ANTES de inicializar Firebase Admin o el SDK de cliente.
 * MANDATE #1: Configuración real del emulador, no mock.
 */
function initializeEmulatorEnvironment() {
    // Validación de seguridad: Nunca en producción
    const nodeEnv = process.env['NODE_ENV'];
    if (nodeEnv === 'production') {
        throw new Error('EMULATOR_ENVIRONMENT_BLOCKED: initializeEmulatorEnvironment() no puede ejecutarse en NODE_ENV=production. ' +
            'Esto es una violación de los Production Locks de 2C.12.');
    }
    // Configurar variables de entorno del emulador
    process.env['FIRESTORE_EMULATOR_HOST'] = exports.EMULATOR_CONFIG.firestore.value;
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = exports.EMULATOR_CONFIG.auth.value;
    process.env['FIREBASE_FUNCTIONS_EMULATOR_HOST'] = exports.EMULATOR_CONFIG.functions.value;
    process.env['GCLOUD_PROJECT'] = exports.STAGING_PROJECT_ID;
    process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: exports.STAGING_PROJECT_ID });
}
/**
 * Limpia las variables de entorno del emulador al finalizar el staging.
 */
function cleanupEmulatorEnvironment() {
    delete process.env['FIRESTORE_EMULATOR_HOST'];
    delete process.env['FIREBASE_AUTH_EMULATOR_HOST'];
    delete process.env['FIREBASE_FUNCTIONS_EMULATOR_HOST'];
    delete process.env['GCLOUD_PROJECT'];
    delete process.env['FIREBASE_CONFIG'];
}
/**
 * Verifica si los emuladores están configurados en el entorno actual.
 * MANDATE #1: Retorna true solo si las variables de emulador están activas.
 */
function isEmulatorEnvironmentActive() {
    return (process.env['FIRESTORE_EMULATOR_HOST'] === exports.EMULATOR_CONFIG.firestore.value &&
        process.env['FIREBASE_AUTH_EMULATOR_HOST'] === exports.EMULATOR_CONFIG.auth.value);
}
function generateEnvironmentSeparationReport() {
    const firestoreEmulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
    const authEmulatorHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
    const areDistinct = exports.PRODUCTION_PROJECT_ID !== exports.STAGING_PROJECT_ID;
    const emulatorActive = isEmulatorEnvironmentActive();
    return {
        productionProjectId: exports.PRODUCTION_PROJECT_ID,
        stagingProjectId: exports.STAGING_PROJECT_ID,
        areDistinct,
        firestoreEmulatorHost,
        authEmulatorHost,
        nodeEnv: process.env['NODE_ENV'],
        separationCertified: areDistinct && emulatorActive
    };
}
//# sourceMappingURL=stagingEnvironment.js.map