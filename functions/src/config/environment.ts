/**
 * BlueSystem Delivery Enterprise — Environment Configuration
 * Sprint 17.1 Infrastructure Foundation
 */

export interface EnvironmentConfig {
  env: "development" | "staging" | "production";
  projectId: string;
  region: string;
  isStaging: boolean;
  isProduction: boolean;
  logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT" | "SECURITY";
}

export const getEnvironment = (): EnvironmentConfig => {
  const env = (process.env.NODE_ENV || "development").toLowerCase() as EnvironmentConfig["env"];
  const projectId = process.env.GCP_PROJECT || process.env.FIREBASE_CONFIG
    ? JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId || "bluesystem-7c9af"
    : "bluesystem-7c9af";

  return {
    env,
    projectId,
    region: process.env.FUNCTION_REGION || "us-central1",
    isStaging: env === "staging" || projectId.includes("staging"),
    isProduction: env === "production" && !projectId.includes("staging"),
    logLevel: (process.env.LOG_LEVEL as EnvironmentConfig["logLevel"]) || "INFO",
  };
};
