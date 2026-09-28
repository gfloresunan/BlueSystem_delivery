package com.example.platform

import com.example.domain.model.platform.*
import org.junit.Assert.*
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Pruebas Unitarias Automatizadas para Modelos y Validadores de Schemas Raíz.
 */
class PlatformTenantModelsTest {

    @Test
    fun `test valid tenant creation and validation passes`() {
        val tenant = Tenant(
            tenantId = "tenant_test_001",
            name = "Test Enterprise Tenant",
            legalName = "Test Enterprise Corporation S.A.",
            slug = "test-enterprise",
            type = CommercialModel.ENTERPRISE,
            status = TenantStatus.DRAFT,
            createdBy = "admin_super_user"
        )

        val result = PlatformTenantValidators.validateTenant(tenant)
        assertTrue("Tenant válido debería pasar la validación", result.isValid)
        assertEquals(0, result.errors.size)
    }

    @Test
    fun `test invalid tenant slug fails validation`() {
        val tenant = Tenant(
            tenantId = "tenant_test_002",
            name = "Invalid Slug Tenant",
            legalName = "Invalid Slug Corporation",
            slug = "INVALID SLUG WITH SPACES!",
            type = CommercialModel.WHITE_LABEL_COMMERCE,
            createdBy = "admin_super_user"
        )

        val result = PlatformTenantValidators.validateTenant(tenant)
        assertFalse("Tenant con slug inválido debe fallar", result.isValid)
        assertTrue(result.errors.any { it.contains("slug") })
    }

    @Test
    fun `test valid brand visual colors pass validation`() {
        val brand = Brand(
            brandId = "brand_test_001",
            tenantId = "tenant_test_001",
            displayName = "Brand Test Express",
            shortName = "BrandTest",
            slug = "brand-test-express",
            visual = BrandVisual(
                primaryColorHex = "#FF5722",
                secondaryColorHex = "#03A9F4",
                accentColorHex = "#4CAF50"
            ),
            metadata = BrandMetadata(
                supportEmail = "support@brandtest.com",
                supportPhone = "+50588889999"
            ),
            createdBy = "admin_super_user"
        )

        val result = PlatformTenantValidators.validateBrand(brand)
        assertTrue("Brand válida debe pasar la validación", result.isValid)
    }

    @Test
    fun `test invalid hex color in brand fails validation`() {
        val brand = Brand(
            brandId = "brand_test_002",
            tenantId = "tenant_test_001",
            displayName = "Brand Invalid Color",
            shortName = "BrandInv",
            slug = "brand-invalid",
            visual = BrandVisual(
                primaryColorHex = "NOT_A_COLOR",
                secondaryColorHex = "#03A9F4"
            ),
            createdBy = "admin_super_user"
        )

        val result = PlatformTenantValidators.validateBrand(brand)
        assertFalse("Color HEX inválido debe fallar", result.isValid)
        assertTrue(result.errors.any { it.contains("primaryColorHex") })
    }

    @Test
    fun `test valid app config for android passes validation`() {
        val config = AppConfig(
            configId = "appconfig_test_001",
            tenantId = "tenant_test_001",
            brandId = "brand_test_001",
            platform = PlatformType.ANDROID,
            environment = EnvironmentType.STAGING,
            distribution = AppDistribution(
                appName = "Brand Test Android",
                shortName = "BrandTest",
                applicationId = "com.brandtest.delivery.staging",
                versionName = "1.0.0",
                buildNumber = 100
            ),
            createdBy = "admin_super_user"
        )

        val result = PlatformTenantValidators.validateAppConfig(config)
        assertTrue("AppConfig válida de Android debe pasar", result.isValid)
    }

    @Test
    fun `test invalid android application id fails validation`() {
        val config = AppConfig(
            configId = "appconfig_test_002",
            tenantId = "tenant_test_001",
            brandId = "brand_test_001",
            platform = PlatformType.ANDROID,
            distribution = AppDistribution(
                appName = "Brand Test Android",
                shortName = "BrandTest",
                applicationId = "INVALID APPLICATION ID WITHOUT DOTS",
                versionName = "1.0.0",
                buildNumber = 100
            ),
            createdBy = "admin_super_user"
        )

        val result = PlatformTenantValidators.validateAppConfig(config)
        assertFalse("applicationId sin formato de paquete debe fallar", result.isValid)
        assertTrue(result.errors.any { it.contains("applicationId") })
    }

    @Test
    fun `test release semver validation`() {
        val validRelease = Release(
            releaseId = "release_test_001",
            tenantId = "tenant_test_001",
            brandId = "brand_test_001",
            configId = "appconfig_test_001",
            version = "1.2.3",
            buildNumber = 123,
            createdBy = "admin_super_user"
        )
        val validResult = PlatformTenantValidators.validateRelease(validRelease)
        assertTrue("Versión SemVer 1.2.3 debe ser válida", validResult.isValid)

        val invalidRelease = validRelease.copy(version = "v1-invalid-version")
        val invalidResult = PlatformTenantValidators.validateRelease(invalidRelease)
        assertFalse("Versión no-SemVer debe fallar", invalidResult.isValid)
    }
}
