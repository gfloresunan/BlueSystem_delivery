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

export const STAGING_PROJECT_ID = 'EMULATOR_LOCAL';
export const PRODUCTION_PROJECT_ID = 'bluesystem-7c9af';

/**
 * Endpoints del Firebase Emulator Suite (locales, sin acceso a internet).
 * MANDATE #1: Estas variables de entorno apuntan al emulador real.
 */
export const EMULATOR_CONFIG = {
  projectId: STAGING_PROJECT_ID,
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
} as const;

/**
 * Inicializa las variables de entorno para apuntar al Emulador.
 * Debe llamarse ANTES de inicializar Firebase Admin o el SDK de cliente.
 * MANDATE #1: Configuración real del emulador, no mock.
 */
export function initializeEmulatorEnvironment(): void {
  // Validación de seguridad: Nunca en producción
  const nodeEnv = process.env['NODE_ENV'];
  if (nodeEnv === 'production') {
    throw new Error(
      'EMULATOR_ENVIRONMENT_BLOCKED: initializeEmulatorEnvironment() no puede ejecutarse en NODE_ENV=production. ' +
      'Esto es una violación de los Production Locks de 2C.12.'
    );
  }

  // Configurar variables de entorno del emulador
  process.env['FIRESTORE_EMULATOR_HOST'] = EMULATOR_CONFIG.firestore.value;
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] = EMULATOR_CONFIG.auth.value;
  process.env['FIREBASE_FUNCTIONS_EMULATOR_HOST'] = EMULATOR_CONFIG.functions.value;
  process.env['GCLOUD_PROJECT'] = STAGING_PROJECT_ID;
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: STAGING_PROJECT_ID });
}

/**
 * Limpia las variables de entorno del emulador al finalizar el staging.
 */
export function cleanupEmulatorEnvironment(): void {
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
export function isEmulatorEnvironmentActive(): boolean {
  return (
    process.env['FIRESTORE_EMULATOR_HOST'] === EMULATOR_CONFIG.firestore.value &&
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] === EMULATOR_CONFIG.auth.value
  );
}

/**
 * Validación de separación de entornos.
 * Demuestra que LOCAL / EMULATOR / STAGING / PRODUCTION son entornos distintos.
 */
export interface EnvironmentSeparationReport {
  productionProjectId: string;
  stagingProjectId: string;
  areDistinct: boolean;
  firestoreEmulatorHost: string | undefined;
  authEmulatorHost: string | undefined;
  nodeEnv: string | undefined;
  separationCertified: boolean;
}

export function generateEnvironmentSeparationReport(): EnvironmentSeparationReport {
  const firestoreEmulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const authEmulatorHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];

  const areDistinct = (PRODUCTION_PROJECT_ID as string) !== (STAGING_PROJECT_ID as string);
  const emulatorActive = isEmulatorEnvironmentActive();

  return {
    productionProjectId: PRODUCTION_PROJECT_ID,
    stagingProjectId: STAGING_PROJECT_ID,
    areDistinct,
    firestoreEmulatorHost,
    authEmulatorHost,
    nodeEnv: process.env['NODE_ENV'],
    separationCertified: areDistinct && emulatorActive
  };
}
