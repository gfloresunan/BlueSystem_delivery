# C2D23 — CONTRACT AUDIT
## Auditoría de Contratos de Dominio y Validación Canónica
**Protocol ID:** `C2D.23`  

---

### 1. Contrato Canónico Reutilizado: `AppConfigEntity`

```typescript
export interface AppDistributionConfig {
  appName: string;                     // Nombre visible en el launcher OS
  shortName: string;
  applicationId: string;               // Android package (ej: "com.fitoni.express")
  bundleId?: string;                   // iOS bundle ID
  versionName: string;                 // "1.0.0"
  buildNumber: number;                 // 100
}

export interface AppProviderConfig {
  firebaseProjectId: string;           // ej: "bluesystem-7c9af"
  firebaseAppId: string;               // Mobile App ID de Firebase
  mapsApiKey: string;                  // Google Maps API Key
  notificationSenderId?: string;       // FCM Sender ID
  apnsKeyId?: string;                  // Apple Push Notification Key ID
}

export interface AppConfigEntity {
  configId: string;                    // Inmutable
  tenantId: string;                    // Inmutable
  brandId: string;                     // Inmutable
  platform: PlatformType;              // 'ANDROID' | 'IOS' | 'WEB'
  environment: EnvironmentType;        // 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'
  distribution: AppDistributionConfig; // Metadatos de binario
  providers: AppProviderConfig;        // Llaves y servicios
  featureFlags: Record<string, boolean>; // Flags en runtime
  runtimeThemeOverrides?: Record<string, any>; // Overrides dinámicos
  status: AppConfigStatus;             // 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED'
  schemaVersion: string;               // "1.0"
  createdAt: number;                   // Inmutable
  updatedAt: number;
  createdBy: string;                   // Inmutable
  updatedBy: string;
}
```

### 2. Conclusión de Auditoría
El contrato existente en `functions/src/domain/platform/models.ts` es **completo, robusto, extensible y no requiere modificaciones**. La fase C2D.23 se apoyará 100% sobre este contrato canónico.
