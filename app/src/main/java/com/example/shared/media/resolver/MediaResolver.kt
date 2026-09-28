package com.example.shared.media.resolver

/**
 * Servicio de Resolución Dinámica de URLs y Preparación para CDN (ADR-006 - Pilar 5)
 * Desacopla a las aplicaciones cliente de endpoints crudos de Firebase Storage.
 */
object MediaResolver {

    private var cdnDomain: String? = null // Ej: "https://cdn.bluesystem.app"
    private var enableCdn: Boolean = false

    fun configureCdn(domain: String, enabled: Boolean = true) {
        cdnDomain = domain.removeSuffix("/")
        enableCdn = enabled
    }

    /**
     * Resuelve la URL optimizada para el contenedor. Si existe un CDN configurado,
     * transforma la ruta en una URL servida por CDN; de lo contrario, utiliza la URL nativa.
     */
    fun resolveUrl(
        storagePath: String,
        fallbackUrl: String,
        variantKey: String = "600"
    ): String {
        if (fallbackUrl.isBlank() && storagePath.isBlank()) return ""

        if (enableCdn && !cdnDomain.isNullOrBlank() && storagePath.isNotBlank()) {
            val sanitizedPath = storagePath.removePrefix("/")
            return "$cdnDomain/$sanitizedPath?variant=$variantKey"
        }

        return fallbackUrl
    }
}
