package com.example.domain.model.catalog

/**
 * Flags de Funcionalidad para el Rediseño UX/UI Enterprise del Product Wizard
 */
data class ProductWizardFeatureState(
    val enableProductWizardV2: Boolean = true,
    val enableAdvancedGallery: Boolean = true,
    val enableVariantBuilder: Boolean = true,
    val enableImageCompression: Boolean = true,
    val enableDraftRecovery: Boolean = true
)
