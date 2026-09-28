/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Schemas Canónicos de Entidades Raíz Multi-Brand / White-Label
 * 
 * Contratos puros de dominio (Strictly Isolated / Zero Operational Mutation).
 */

export type CommercialModel = 
  | 'MARKETPLACE'
  | 'AGENCY'
  | 'WHITE_LABEL_COMMERCE'
  | 'ENTERPRISE';

export type TenantStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'MIGRATION_PENDING'
  | 'ARCHIVED';

export type BrandStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'ARCHIVED';

export type SubscriptionStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'TRIAL'
  | 'SUSPENDED'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'ARCHIVED';

export type PlanTier = 
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'CUSTOM';

export type PlatformType = 
  | 'ANDROID'
  | 'IOS'
  | 'WEB';

export type EnvironmentType = 
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION';

export type AppConfigStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'ARCHIVED';

export type ReleaseStatus = 
  | 'DRAFT'
  | 'READY'
  | 'BUILDING'
  | 'BUILD_SUCCESS'
  | 'BUILD_FAILED'
  | 'RELEASED'
  | 'ROLLED_BACK'
  | 'ARCHIVED';

export type ArtifactType = 
  | 'APK'
  | 'AAB'
  | 'IPA'
  | 'WEB_BUNDLE';

export type CapabilityModule =
  | 'ORDERS'
  | 'CATALOG'
  | 'CUSTOMERS'
  | 'PROMOTIONS'
  | 'FINANCE'
  | 'REPORTS'
  | 'CONTROL_TOWER'
  | 'FLEET_CORE'
  | 'GPS_TRACKING'
  | 'X_TO_Y_DELIVERY'
  | 'KDS'
  | 'NOTIFICATIONS'
  | 'ANALYTICS'
  | 'GOVERNANCE'
  | 'MULTI_BRANCH'
  | 'MULTI_BRAND'
  | 'MULTI_MERCHANT'
  | 'API_ACCESS'
  | 'SETTINGS'
  | 'STAFF'
  | 'DASHBOARD'
  | 'ONBOARDING';

// ─── 1. ENTIDAD TENANT (/tenants/{tenantId}) ──────────────────────────────────
export interface TenantEntity {
  tenantId: string;                    // Inmutable. Identificador único canónico
  name: string;                        // Nombre descriptivo
  legalName: string;                   // Razón social legal
  slug: string;                        // Identificador alfanumérico único para URLs (ej: "fitoni-corp")
  type: CommercialModel;               // Modelo comercial
  status: TenantStatus;                // Estado de ciclo de vida
  primaryBrandId?: string | null;      // ID de la marca principal asociada
  subscriptionId?: string | null;      // ID del contrato/suscripción activo
  defaultAppConfigId?: string | null;  // ID de la app config por defecto
  metadata?: Record<string, any>;      // Metadatos adicionales extensibles
  schemaVersion: string;               // Versión de contrato (ej: "1.0")
  createdAt: number;                   // Timestamp epoch ms. Inmutable.
  updatedAt: number;                   // Timestamp epoch ms
  createdBy: string;                   // UID del creador. Inmutable.
  updatedBy: string;                   // UID del último editor
}

// ─── 2. ENTIDAD BRAND (/brands/{brandId}) ─────────────────────────────────────
export interface BrandVisualConfig {
  logoUrl: string;                     // URL Cloud Storage alta resolución
  iconUrl: string;                     // App Icon (1024x1024)
  splashUrl: string;                   // Imagen de Splash
  faviconUrl?: string;                 // Favicon Web
  primaryColor: string;                // HEX ej. "#FF6D00"
  secondaryColor: string;              // HEX ej. "#2979FF"
  accentColor: string;                 // HEX ej. "#00E676"
  backgroundColor: string;             // HEX ej. "#121212"
  textColor: string;                   // HEX ej. "#FFFFFF"
  fontFamily?: string;                 // Tipografía recomendada (ej: "Outfit", "Inter")
  themeConfig?: Record<string, any>;   // Parámetros de tema adicionales
}

export interface BrandMetadata {
  supportEmail: string;
  supportPhone: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
  termsUrl?: string;
  privacyUrl?: string;
}

export interface BrandEntity {
  brandId: string;                     // Inmutable. Identificador único de marca
  tenantId: string;                    // Inmutable. Tenant al que pertenece
  displayName: string;                 // Nombre visible para clientes ("Fitoni Express")
  legalName?: string;                  // Nombre legal de la marca
  shortName: string;                   // Nombre abreviado ("Fitoni")
  slug: string;                        // Slug único dentro del tenant ("fitoni-express")
  visual: BrandVisualConfig;           // Identidad visual
  metadata: BrandMetadata;             // Canales de contacto y soporte
  status: BrandStatus;                 // Estado de la marca
  schemaVersion: string;               // Versión de contrato ("1.0")
  createdAt: number;                   // Timestamp epoch ms. Inmutable.
  updatedAt: number;                   // Timestamp epoch ms
  createdBy: string;                   // Inmutable
  updatedBy: string;
}

// ─── 3. ENTIDAD SUBSCRIPTION (/subscriptions/{subscriptionId}) ───────────────
export interface SubscriptionQuotas {
  maxBusinesses: number;               // -1 = ilimitado
  maxBranches: number;                 // -1 = ilimitado
  maxUsers: number;                    // -1 = ilimitado
  maxCouriers: number;                 // -1 = ilimitado
  maxOrders: number;                   // Cuota mensual de pedidos
  maxStorageMb: number;                // Cuota en MB
  maxApiRequests: number;              // Peticiones/mes
}

export interface SubscriptionEntity {
  subscriptionId: string;              // Inmutable.
  tenantId: string;                    // Inmutable. Tenant propietario
  planId: string;                      // Identificador del plan
  planName: string;                    // Nombre legible ("Professional Plan")
  planTier: PlanTier;                  // Nivel
  status: SubscriptionStatus;          // Estado comercial
  startDate: number;                   // Timestamp inicio
  endDate?: number | null;             // Timestamp fin (null si recurrente)
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'CUSTOM';
  enabledFeatures: CapabilityModule[]; // Módulos activados
  disabledFeatures: CapabilityModule[];// Módulos explícitamente bloqueados
  featureOverrides?: Record<string, boolean>; // Feature flags específicos
  limits: SubscriptionQuotas;          // Cuotas operacionales
  metadata?: Record<string, any>;
  schemaVersion: string;               // "1.0"
  createdAt: number;                   // Inmutable
  updatedAt: number;
  createdBy: string;                   // Inmutable
  updatedBy: string;
}

// ─── 4. ENTIDAD APP CONFIG (/app_configs/{configId}) ──────────────────────────
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
  configId: string;                    // Inmutable.
  tenantId: string;                    // Inmutable.
  brandId: string;                     // Inmutable.
  platform: PlatformType;              // 'ANDROID' | 'IOS' | 'WEB'
  environment: EnvironmentType;        // 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'
  distribution: AppDistributionConfig; // Metadatos de binario
  providers: AppProviderConfig;        // Llaves y servicios
  featureFlags: Record<string, boolean>; // Flags en runtime
  runtimeThemeOverrides?: Record<string, any>; // Overrides dinámicos
  status: AppConfigStatus;
  schemaVersion: string;               // "1.0"
  createdAt: number;                   // Inmutable
  updatedAt: number;
  createdBy: string;                   // Inmutable
  updatedBy: string;
}

// ─── 5. ENTIDADES BUILD REQUEST & AUTHORIZATION (/build_requests/{requestId}) ──
export type BuildRequestStatus = 'DRAFT' | 'VALIDATING' | 'AUTHORIZED' | 'QUEUED' | 'BUILDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface BuildAuthorizationEntity {
  authorizationId: string;             // UUIDv4
  tenantId: string;                    // Scoped
  brandId: string;                     // Scoped
  appConfigId: string;                 // Scoped
  artifactType: ArtifactType;          // 'APK' | 'AAB'
  buildNumber: number;
  environment: EnvironmentType;
  expiresAt: number;                   // Timestamp de expiración temporal
  isSingleUse: boolean;                // Inmutable (true)
  isConsumed: boolean;                 // Marcado al ejecutar el build
  authorizedBy: string;                // UID del Platform Admin
  createdAt: number;
}

export interface BuildRequestEntity {
  requestId: string;                   // Inmutable UUIDv4
  tenantId: string;                    // Inmutable
  brandId: string;                     // Inmutable
  appConfigId: string;                 // Inmutable
  commercialProfile: 'core' | 'enterpriseFitoni' | 'whitelabel';
  platform: PlatformType;              // 'ANDROID'
  environment: EnvironmentType;
  artifactType: ArtifactType;          // 'APK' | 'AAB'
  distribution: AppDistributionConfig;
  authorizationId: string;             // Token de autorización asociado
  status: BuildRequestStatus;
  idempotencyKey: string;              // SHA-256(tenantId + appConfigId + buildNumber + environment)
  artifactUrl?: string | null;
  artifactChecksum?: string | null;    // SHA-256
  buildDurationMs?: number | null;
  gitCommitHash?: string | null;
  errorMessage?: string | null;
  schemaVersion: string;               // "1.0"
  createdAt: number;
  updatedAt: number;
  requestedBy: string;
}

// ─── 6. ENTIDAD RELEASE (/releases/{releaseId}) ───────────────────────────────
export interface ReleaseEntity {
  releaseId: string;                   // Inmutable.
  tenantId: string;                    // Inmutable.
  brandId: string;                     // Inmutable.
  configId: string;                    // Inmutable. AppConfig asociada
  platform: PlatformType;              // Inmutable.
  version: string;                     // Inmutable una vez RELEASED (ej: "1.0.0")
  buildNumber: number;                 // Inmutable una vez RELEASED (ej: 101)
  environment: EnvironmentType;        // Inmutable.
  artifactType: ArtifactType;          // 'APK' | 'AAB' | 'IPA' | 'WEB_BUNDLE'
  status: ReleaseStatus;               // Ciclo de vida
  artifactUrl?: string | null;         // URL de descarga Storage protegida
  checksum?: string | null;            // SHA-256 del binario
  gitCommitHash?: string | null;       // Hash de Git auditable
  releaseNotes?: string | null;        // Notas de versión
  releasedAt?: number | null;          // Timestamp de publicación
  releasedBy?: string | null;          // UID del aprobador de release
  schemaVersion: string;               // "1.0"
  createdAt: number;                   // Inmutable
  updatedAt: number;
  createdBy: string;                   // Inmutable
}

// ─── 6. ENTIDAD ORGANIZATION (/organizations/{orgId}) ─────────────────────────
export interface OrganizationEntity {
  orgId: string;                       // Inmutable. Identificador único de Holding / Grupo
  tenantId: string;                    // Inmutable. Tenant propietario
  displayName: string;                 // Nombre del grupo corporativo
  legalName?: string;                  // Razón social del grupo
  slug: string;                        // Slug único
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  primaryBrandId?: string | null;      // Marca predeterminada
  businessIds: string[];               // Comercios pertenecientes al holding
  metadata?: Record<string, any>;
  schemaVersion: string;               // "1.0"
  createdAt: number;                   // Inmutable
  updatedAt: number;
  createdBy: string;                   // Inmutable
  updatedBy: string;
}

// ─── 7. ENTIDAD BUSINESS (/businesses/{businessId}) ───────────────────────────
export interface BusinessEntity {
  businessId: string;                  // Inmutable. Identificador único de comercio
  tenantId: string;                    // Inmutable. Tenant al que pertenece
  brandId?: string | null;             // Marca asociada
  orgId?: string | null;               // Holding asociado (opcional)
  name: string;                        // Nombre comercial del negocio
  legalName?: string;                  // Razón social
  slug: string;                        // Slug para URL y subdominio
  category: string;                    // Categoría principal (ej. "RESTAURANT")
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  settings?: {
    currency?: string;
    timezone?: string;
    locale?: string;
    autoAcceptOrders?: boolean;
    deliveryRadiusKm?: number;
  };
  metadata?: Record<string, any>;
  schemaVersion: string;               // "1.0"
  createdAt: number;                   // Inmutable
  updatedAt: number;
  createdBy: string;                   // Inmutable
  updatedBy: string;
}

// ─── 8. ENTIDAD BRANCH (/businesses/{businessId}/branches/{branchId}) ─────────
export interface BranchEntity {
  branchId: string;                    // Inmutable. Identificador de sucursal
  businessId: string;                  // Inmutable. Comercio propietario
  tenantId: string;                    // Inmutable. Tenant
  brandId?: string | null;             // Marca
  name: string;                        // Nombre de sucursal ("Sucursal Centro")
  address: string;                     // Dirección física
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  isMainBranch: boolean;               // Sucursal principal
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  schemaVersion: string;               // "1.0"
  createdAt: number;                   // Inmutable
  updatedAt: number;
  createdBy: string;                   // Inmutable
  updatedBy: string;
}

// ─── 9. ENTIDAD ENTITLEMENT (/entitlements/{entitlementId}) ───────────────────
export interface EntitlementEntity {
  entitlementId: string;               // Inmutable
  tenantId: string;                    // Inmutable
  subscriptionId: string;              // Inmutable. Suscripción de origen
  module: CapabilityModule;            // Módulo autorizado
  grantedCapabilities: string[];       // Acciones granulares (ej: ["EXPORT_CSV", "LIVE_GPS"])
  isCustomOverride: boolean;           // Si fue otorgado como override manual
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  schemaVersion: string;               // "1.0"
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// ─── 10. DESIGN TOKENS CONTRATO DE DOMINIO ───────────────────────────────────
export interface DesignTokens {
  brandId: string;
  colors: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    accent: string;
    onAccent: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    error: string;
    onError: string;
    success: string;
    onSuccess: string;
    warning: string;
    onWarning: string;
    outline: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    bodyFont: string;
    scale: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      h1: string;
      h2: string;
      h3: string;
    };
  };
  layout: {
    borderRadius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      full: string;
    };
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  assets: {
    logoUrl: string;
    iconUrl: string;
    splashUrl: string;
    faviconUrl?: string;
  };
}

// ─── 11. DEFAULT BRAND CONSTANT (BACKWARD COMPATIBILITY INVARIANT) ───────────
export const DEFAULT_BRAND_CONFIG: BrandVisualConfig = Object.freeze({
  logoUrl: 'https://storage.googleapis.com/bluesystem-assets/logo.png',
  iconUrl: 'https://storage.googleapis.com/bluesystem-assets/icon.png',
  splashUrl: 'https://storage.googleapis.com/bluesystem-assets/splash.png',
  faviconUrl: 'https://storage.googleapis.com/bluesystem-assets/favicon.ico',
  primaryColor: '#0284C7',    // BluePrimary (Sky-600)
  secondaryColor: '#0EA5E9',  // BlueSecondary (Sky-500)
  accentColor: '#38BDF8',     // BlueTertiary (Sky-400)
  backgroundColor: '#0F172A', // BgDarkApp (Slate-900)
  textColor: '#F8FAFC',       // TextPrimary (Slate-50)
  fontFamily: 'Inter, system-ui, sans-serif'
});

// ─── 12. TENANT DOMAIN CONTRACTS (FASE 2E) ───────────────────────────────────
export type DomainType = 
  | 'PLATFORM'           // Dominio raíz o compartido de plataforma (ej. "bluesystem.com", "app.bluesystem.com")
  | 'TENANT_SUBDOMAIN'   // Subdominio administrado por BlueSystem (ej. "volados.bluesystem.com")
  | 'CUSTOM_DOMAIN';     // Dominio propio del cliente (ej. "volados.com", "delivery.volados.com")

export type DomainStatus = 
  | 'PENDING'            // Registrado, en espera de configuración DNS
  | 'VERIFYING'          // Verificación de propiedad en progreso
  | 'VERIFIED'           // Verificado en DNS, listo para activación SSL
  | 'ACTIVE'             // Activo y enrutando tráfico
  | 'DISABLED'           // Desactivado temporalmente
  | 'ERROR';             // Error de resolución o configuración

export type DnsRecordType = 'CNAME' | 'A' | 'TXT';

export interface DnsInstruction {
  type: DnsRecordType;
  host: string;          // Subdominio o @ (ej. "delivery", "@")
  targetValue: string;   // Valor esperado (ej. "hosting.bluesystem.io.", token TXT)
  description: string;
  isVerified: boolean;
}

export type SslStatus = 
  | 'PENDING'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'ERROR'
  | 'EXPIRED';

export interface TenantDomainEntity {
  domainId: string;                    // Inmutable. Identificador único (slug o hash)
  tenantId: string;                    // Inmutable. Tenant al que pertenece
  brandId?: string | null;             // Marca asociada opcional
  domain: string;                      // Hostname normalizado en minúsculas (ej: "delivery.volados.com")
  domainType: DomainType;              // Tipo de dominio
  status: DomainStatus;                // Estado de ciclo de vida
  isPrimary: boolean;                  // Si es el dominio primario del tenant
  isCustom: boolean;                   // true si es CUSTOM_DOMAIN
  isSubdomain: boolean;                // true si es TENANT_SUBDOMAIN
  dnsStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  sslStatus: SslStatus;                // Estado del certificado SSL
  verificationToken?: string;          // Token aleatorio para validación TXT
  dnsInstructions: DnsInstruction[];   // Instrucciones DNS a presentar al usuario
  metadata?: Record<string, any>;
  schemaVersion: '1.0';
  createdAt: number;                   // Timestamp ms
  updatedAt: number;                   // Timestamp ms
  verifiedAt?: number | null;          // Timestamp ms cuando fue verificado
  activatedAt?: number | null;         // Timestamp ms cuando fue activado
  createdBy: string;                   // UID
  updatedBy: string;                   // UID
}

export interface TenantFeatureConfig {
  customDomainAllowed: boolean;
  customSubdomainAllowed: boolean;
  customBrandingAllowed: boolean;
  customEmailPrepared: boolean;
  advancedControlTower: boolean;
  advancedReports: boolean;
  maxCustomDomains: number;
}

export const RESERVED_SUBDOMAINS = Object.freeze([
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


