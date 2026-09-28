package com.example.domain.model.platform

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Validadores Puros de Dominio en Kotlin para Entidades Raíz Multi-Brand.
 */

data class ValidationResult(
    val isValid: Boolean,
    val errors: List<String>
)

object PlatformTenantValidators {

    private val HEX_COLOR_REGEX = Regex("^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$")
    private val SLUG_REGEX = Regex("^[a-z0-9]+(?:-[a-z0-9]+)*$")
    private val APP_ID_REGEX = Regex("^[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)+$")
    private val SEMVER_REGEX = Regex("^\\d+\\.\\d+\\.\\d+$")

    fun validateTenant(tenant: Tenant): ValidationResult {
        val errors = mutableListOf<String>()

        if (tenant.tenantId.isBlank()) errors.add("tenantId no puede estar vacío.")
        if (tenant.name.trim().length < 2) errors.add("name debe tener al menos 2 caracteres.")
        if (tenant.legalName.trim().length < 2) errors.add("legalName debe tener al menos 2 caracteres.")
        if (!SLUG_REGEX.matches(tenant.slug)) errors.add("slug es inválido (formato requerido: 'tenant-slug').")
        if (tenant.schemaVersion != "1.0") errors.add("schemaVersion debe ser '1.0'.")
        if (tenant.createdBy.isBlank()) errors.add("createdBy no puede estar vacío.")

        return ValidationResult(errors.isEmpty(), errors)
    }

    fun validateBrand(brand: Brand): ValidationResult {
        val errors = mutableListOf<String>()

        if (brand.brandId.isBlank()) errors.add("brandId no puede estar vacío.")
        if (brand.tenantId.isBlank()) errors.add("tenantId no puede estar vacío.")
        if (brand.displayName.trim().length < 2) errors.add("displayName debe tener al menos 2 caracteres.")
        if (brand.shortName.trim().length < 2) errors.add("shortName debe tener al menos 2 caracteres.")
        if (!SLUG_REGEX.matches(brand.slug)) errors.add("slug de marca es inválido.")
        if (!HEX_COLOR_REGEX.matches(brand.visual.primaryColorHex)) errors.add("primaryColorHex debe ser un color HEX válido.")
        if (!HEX_COLOR_REGEX.matches(brand.visual.secondaryColorHex)) errors.add("secondaryColorHex debe ser un color HEX válido.")
        if (!HEX_COLOR_REGEX.matches(brand.visual.accentColorHex)) errors.add("accentColorHex debe ser un color HEX válido.")
        if (brand.metadata.supportEmail.isNotBlank() && !brand.metadata.supportEmail.contains("@")) {
            errors.add("supportEmail debe ser un correo válido.")
        }

        return ValidationResult(errors.isEmpty(), errors)
    }

    fun validateAppConfig(config: AppConfig): ValidationResult {
        val errors = mutableListOf<String>()

        if (config.configId.isBlank()) errors.add("configId no puede estar vacío.")
        if (config.tenantId.isBlank()) errors.add("tenantId no puede estar vacío.")
        if (config.brandId.isBlank()) errors.add("brandId no puede estar vacío.")
        if (config.distribution.appName.trim().length < 2) errors.add("appName debe tener al menos 2 caracteres.")
        if (config.platform == PlatformType.ANDROID) {
            if (!APP_ID_REGEX.matches(config.distribution.applicationId)) {
                errors.add("applicationId es inválido para Android (ej. 'com.example.app').")
            }
        }

        return ValidationResult(errors.isEmpty(), errors)
    }

    fun validateRelease(release: Release): ValidationResult {
        val errors = mutableListOf<String>()

        if (release.releaseId.isBlank()) errors.add("releaseId no puede estar vacío.")
        if (release.configId.isBlank()) errors.add("configId no puede estar vacío.")
        if (!SEMVER_REGEX.matches(release.version)) errors.add("version debe cumplir formato SemVer X.Y.Z.")
        if (release.buildNumber <= 0) errors.add("buildNumber debe ser mayor a 0.")

        return ValidationResult(errors.isEmpty(), errors)
    }
}
