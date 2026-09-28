package com.example.domain.model.settings

data class BrandingConfig(
    val primaryColorHex: String = "#2563EB",
    val logoUrl: String = "",
    val bannerUrl: String = "",
    val customWelcomeMessage: String = "¡Bienvenidos a nuestro restaurante!",
    val facebookUrl: String = "",
    val instagramUrl: String = ""
)
