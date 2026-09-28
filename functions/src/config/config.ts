/**
 * BlueSystem Delivery Enterprise — Unified App Config
 * Sprint 17.1 Infrastructure Foundation
 */

import { getEnvironment, EnvironmentConfig } from "./environment";
import { secretService, SecretKey } from "./secretManager";

export class AppConfig {
  public static get env(): EnvironmentConfig {
    return getEnvironment();
  }

  public static async getSecret(key: SecretKey): Promise<string> {
    return secretService.getSecret(key);
  }

  public static async getGoogleMapsKey(): Promise<string> {
    return this.getSecret("GOOGLE_MAPS_API_KEY");
  }

  public static async getFcmServerKey(): Promise<string> {
    return this.getSecret("FCM_SERVER_KEY");
  }

  public static async getJwtSigningSecret(): Promise<string> {
    return this.getSecret("JWT_SIGNING_SECRET");
  }
}
