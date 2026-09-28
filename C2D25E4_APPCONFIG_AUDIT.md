# C2D25E.4 — APP CONFIGURATION AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Auditoría del Contrato Actual de AppConfig

En `functions/src/domain/platform/models.ts`, la entidad `AppConfigEntity` ya incluye de forma nativa la discriminación de plataformas y servicios:

```typescript
export type PlatformType = 'ANDROID' | 'IOS' | 'WEB';
export type EnvironmentType = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';

export interface AppDistributionConfig {
  appName: string;
  shortName: string;
  applicationId: string;   // Android Package (ej. com.fitoni.express)
  bundleId?: string;       // iOS Bundle ID (ej. com.fitoni.express)
  versionName: string;     // 1.0.0
  buildNumber: number;     // 100
}

export interface AppProviderConfig {
  firebaseProjectId: string;
  firebaseAppId: string;
  mapsApiKey: string;
  notificationSenderId?: string;
  apnsKeyId?: string;      // Identificador de llave Apple APNs
}
```

---

### 2. Propuesta de Evolución No-Rupturista (Non-Breaking)

Para distinguir con precisión las compilaciones de **Android Nativo** de las de **Flutter Android** y **Flutter iOS**, se propone la siguiente evolución aditiva de cara a fases futuras:

```typescript
// Contrato Futuro Aditivo (Backward Compatible)
export type PlatformClientType = 
  | 'ANDROID_NATIVE'      // Cliente Kotlin de Referencia
  | 'FLUTTER_ANDROID'     // Nuevo Cliente Flutter Android
  | 'FLUTTER_IOS'         // Nuevo Cliente Flutter iOS
  | 'WEB_PORTAL';         // Portales Web
```

---

### 3. Evaluación de Riesgo de Ruptura
- **Riesgo:** 🟢 **ZERO RISK (Sin impacto en Android actual)**.
- El contrato actual ya contiene los campos `bundleId` y `apnsKeyId` para iOS, demostrando previsión arquitectónica en fases previas.
