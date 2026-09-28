package com.example.domain.model.platform

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Modelos de Dominio Puros en Kotlin para Entidades Raíz Multi-Brand / White-Label.
 *
 * Totalmente aislados del flujo operacional existente de Courier, Orders y Fleet Core.
 */

enum class CommercialModel {
    MARKETPLACE,
    AGENCY,
    WHITE_LABEL_COMMERCE,
    ENTERPRISE
}

enum class TenantStatus {
    DRAFT,
    ACTIVE,
    SUSPENDED,
    MIGRATION_PENDING,
    ARCHIVED
}

enum class BrandStatus {
    DRAFT,
    ACTIVE,
    ARCHIVED
}

enum class SubscriptionStatus {
    DRAFT,
    ACTIVE,
    TRIAL,
    PAST_DUE,
    CANCELLED,
    ARCHIVED
}

enum class PlanTier {
    STARTER,
    PROFESSIONAL,
    ENTERPRISE,
    CUSTOM
}

enum class PlatformType {
    ANDROID,
    IOS,
    WEB
}

enum class EnvironmentType {
    DEVELOPMENT,
    STAGING,
    PRODUCTION
}

enum class AppConfigStatus {
    DRAFT,
    ACTIVE,
    DEPRECATED,
    ARCHIVED
}

enum class ReleaseStatus {
    DRAFT,
    READY,
    BUILDING,
    BUILD_SUCCESS,
    BUILD_FAILED,
    RELEASED,
    ROLLED_BACK,
    ARCHIVED
}

enum class ArtifactType {
    APK,
    AAB,
    IPA,
    WEB_BUNDLE
}

enum class CapabilityModule {
    ORDERS,
    CATALOG,
    CUSTOMERS,
    PROMOTIONS,
    FINANCE,
    REPORTS,
    CONTROL_TOWER,
    FLEET_CORE,
    GPS_TRACKING,
    X_TO_Y_DELIVERY,
    NOTIFICATIONS,
    ANALYTICS,
    GOVERNANCE,
    MULTI_BRANCH,
    MULTI_MERCHANT,
    API_ACCESS
}

// ─── 1. TENANT ENTITY ────────────────────────────────────────────────────────
data class Tenant(
    val tenantId: String,
    val name: String,
    val legalName: String,
    val slug: String,
    val type: CommercialModel,
    val status: TenantStatus = TenantStatus.DRAFT,
    val primaryBrandId: String? = null,
    val subscriptionId: String? = null,
    val defaultAppConfigId: String? = null,
    val metadata: Map<String, Any> = emptyMap(),
    val schemaVersion: String = "1.0",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val createdBy: String,
    val updatedBy: String = createdBy
)

// ─── 2. BRAND ENTITY ─────────────────────────────────────────────────────────
data class BrandVisual(
    val logoUrl: String = "",
    val iconUrl: String = "",
    val splashUrl: String = "",
    val faviconUrl: String? = null,
    val primaryColorHex: String = "#FF6D00",
    val secondaryColorHex: String = "#2979FF",
    val accentColorHex: String = "#00E676",
    val backgroundColorHex: String = "#121212",
    val textColorHex: String = "#FFFFFF",
    val fontFamily: String = "Inter",
    val themeConfig: Map<String, Any> = emptyMap()
)

data class BrandMetadata(
    val supportEmail: String = "",
    val supportPhone: String = "",
    val websiteUrl: String? = null,
    val socialLinks: Map<String, String> = emptyMap(),
    val termsUrl: String? = null,
    val privacyUrl: String? = null
)

data class Brand(
    val brandId: String,
    val tenantId: String,
    val displayName: String,
    val legalName: String? = null,
    val shortName: String,
    val slug: String,
    val visual: BrandVisual = BrandVisual(),
    val metadata: BrandMetadata = BrandMetadata(),
    val status: BrandStatus = BrandStatus.DRAFT,
    val schemaVersion: String = "1.0",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val createdBy: String,
    val updatedBy: String = createdBy
)

// ─── 3. SUBSCRIPTION ENTITY ──────────────────────────────────────────────────
data class SubscriptionLimits(
    val maxBusinesses: Int = -1,
    val maxBranches: Int = -1,
    val maxUsers: Int = -1,
    val maxCouriers: Int = -1,
    val maxOrders: Int = 10000,
    val maxStorageMb: Int = 5000,
    val maxApiRequests: Int = 100000
)

data class Subscription(
    val subscriptionId: String,
    val tenantId: String,
    val planId: String,
    val planName: String,
    val planTier: PlanTier = PlanTier.STARTER,
    val status: SubscriptionStatus = SubscriptionStatus.DRAFT,
    val startDate: Long = System.currentTimeMillis(),
    val endDate: Long? = null,
    val billingCycle: String = "MONTHLY",
    val enabledFeatures: List<CapabilityModule> = emptyList(),
    val disabledFeatures: List<CapabilityModule> = emptyList(),
    val featureOverrides: Map<String, Boolean> = emptyMap(),
    val limits: SubscriptionLimits = SubscriptionLimits(),
    val metadata: Map<String, Any> = emptyMap(),
    val schemaVersion: String = "1.0",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val createdBy: String,
    val updatedBy: String = createdBy
)

// ─── 4. APP CONFIG ENTITY ────────────────────────────────────────────────────
data class AppDistribution(
    val appName: String,
    val shortName: String,
    val applicationId: String,
    val bundleId: String? = null,
    val versionName: String = "1.0.0",
    val buildNumber: Int = 1
)

data class AppProviders(
    val firebaseProjectId: String = "bluesystem-7c9af",
    val firebaseAppId: String = "",
    val mapsApiKey: String = "",
    val notificationSenderId: String? = null,
    val apnsKeyId: String? = null
)

data class AppConfig(
    val configId: String,
    val tenantId: String,
    val brandId: String,
    val platform: PlatformType = PlatformType.ANDROID,
    val environment: EnvironmentType = EnvironmentType.DEVELOPMENT,
    val distribution: AppDistribution,
    val providers: AppProviders = AppProviders(),
    val featureFlags: Map<String, Boolean> = emptyMap(),
    val runtimeThemeOverrides: Map<String, Any> = emptyMap(),
    val status: AppConfigStatus = AppConfigStatus.DRAFT,
    val schemaVersion: String = "1.0",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val createdBy: String,
    val updatedBy: String = createdBy
)

// ─── 5. RELEASE ENTITY ───────────────────────────────────────────────────────
data class Release(
    val releaseId: String,
    val tenantId: String,
    val brandId: String,
    val configId: String,
    val platform: PlatformType = PlatformType.ANDROID,
    val version: String,
    val buildNumber: Int,
    val environment: EnvironmentType = EnvironmentType.DEVELOPMENT,
    val artifactType: ArtifactType = ArtifactType.APK,
    val status: ReleaseStatus = ReleaseStatus.DRAFT,
    val artifactUrl: String? = null,
    val checksum: String? = null,
    val gitCommitHash: String? = null,
    val releaseNotes: String? = null,
    val releasedAt: Long? = null,
    val releasedBy: String? = null,
    val schemaVersion: String = "1.0",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val createdBy: String
)
