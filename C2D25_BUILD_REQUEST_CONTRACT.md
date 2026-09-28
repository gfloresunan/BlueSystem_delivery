# C2D25 — BUILD REQUEST CONTRACT
## Especificación de Esquema Canónico `BuildRequest`
**Protocol ID:** `C2D.25`  

---

### 1. Modelo TypeScript / Firestore Contract

```typescript
export type ArtifactType = 'APK' | 'AAB';
export type BuildRequestStatus = 'DRAFT' | 'VALIDATING' | 'AUTHORIZED' | 'QUEUED' | 'BUILDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface BuildRequestEntity {
  requestId: string;                    // Inmutable. UUIDv4
  tenantId: string;                     // Inmutable.
  brandId: string;                      // Inmutable.
  appConfigId: string;                  // Inmutable.
  commercialProfile: 'core' | 'enterpriseFitoni' | 'whitelabel';
  platform: 'ANDROID';
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  artifactType: ArtifactType;           // APK o AAB
  distribution: {
    appName: string;
    applicationId: string;
    versionName: string;
    buildNumber: number;
  };
  authorizationId: string;              // Token temporal de un solo uso
  status: BuildRequestStatus;
  idempotencyKey: string;               // SHA-256(tenantId + appConfigId + buildNumber + environment)
  artifactUrl?: string;                 // URL Storage privada
  artifactChecksum?: string;            // SHA-256 del APK/AAB
  buildDurationMs?: number;
  gitCommitHash?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  requestedBy: string;                  // UID del Platform Admin
}
```
