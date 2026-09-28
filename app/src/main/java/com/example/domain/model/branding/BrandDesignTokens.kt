package com.example.domain.model.branding

import androidx.compose.ui.graphics.Color

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — BRAND DESIGN TOKENS (FASE 2D.2)
 * Contrato Canónico de Tokens de Diseño para Android Jetpack Compose.
 */
data class BrandVisualModel(
    val brandId: String,
    val displayName: String,
    val primaryColorHex: String,
    val secondaryColorHex: String,
    val accentColorHex: String,
    val backgroundColorHex: String,
    val textColorHex: String,
    val logoUrl: String? = null,
    val iconUrl: String? = null,
    val splashUrl: String? = null
)

data class BrandColorTokens(
    val primary: Color,
    val onPrimary: Color,
    val primaryContainer: Color,
    val onPrimaryContainer: Color,
    val secondary: Color,
    val onSecondary: Color,
    val secondaryContainer: Color,
    val onSecondaryContainer: Color,
    val tertiary: Color,
    val onTertiary: Color,
    val background: Color,
    val onBackground: Color,
    val surface: Color,
    val onSurface: Color,
    val surfaceVariant: Color,
    val onSurfaceVariant: Color,
    val outline: Color,
    val error: Color,
    val onError: Color
)

data class BrandDesignTokens(
    val brandId: String,
    val colorsLight: BrandColorTokens,
    val colorsDark: BrandColorTokens,
    val logoUrl: String? = null,
    val iconUrl: String? = null,
    val splashUrl: String? = null
)

object DefaultBrandTokens {
    const val DEFAULT_BRAND_ID = "bluesystem_delivery_default"
    const val DEFAULT_BRAND_NAME = "BlueSystem Delivery"

    // Colores Oficiales BlueSystem (Carril A Invariante)
    val PrimaryBlue = Color(0xFF0284C7)
    val SecondaryBlue = Color(0xFF0EA5E9)
    val TertiaryBlue = Color(0xFF38BDF8)
    val DarkAppBg = Color(0xFF0F172A)
    val LightAppBg = Color(0xFFF8FAFC)
    val DarkSurface = Color(0xFF1E293B)
    val LightSurface = Color(0xFFFFFFFF)

    fun parseHexColor(hex: String?, fallback: Color): Color {
        if (hex.isNullOrBlank()) return fallback
        return try {
            val clean = hex.removePrefix("#")
            val colorLong = if (clean.length == 6) {
                ("FF$clean").toLong(16)
            } else if (clean.length == 8) {
                clean.toLong(16)
            } else {
                return fallback
            }
            Color(colorLong)
        } catch (_: Exception) {
            fallback
        }
    }

    fun isDarkColor(color: Color): Boolean {
        val yiq = (color.red * 255 * 299 + color.green * 255 * 587 + color.blue * 255 * 114) / 1000
        return yiq < 128
    }

    fun getContrastColor(backgroundColor: Color): Color {
        return if (isDarkColor(backgroundColor)) Color.White else Color(0xFF0F172A)
    }

    fun resolveFromModel(model: BrandVisualModel?): BrandDesignTokens {
        if (model == null) return getDefaultTokens()

        val primary = parseHexColor(model.primaryColorHex, PrimaryBlue)
        val secondary = parseHexColor(model.secondaryColorHex, SecondaryBlue)
        val tertiary = parseHexColor(model.accentColorHex, TertiaryBlue)
        val bgDark = parseHexColor(model.backgroundColorHex, DarkAppBg)
        val textDark = parseHexColor(model.textColorHex, LightAppBg)

        val lightTokens = BrandColorTokens(
            primary = primary,
            onPrimary = getContrastColor(primary),
            primaryContainer = Color(0xFFE0F2FE),
            onPrimaryContainer = primary,
            secondary = secondary,
            onSecondary = getContrastColor(secondary),
            secondaryContainer = Color(0xFFE0F2FE),
            onSecondaryContainer = Color(0xFF0369A1),
            tertiary = tertiary,
            onTertiary = Color.White,
            background = LightAppBg,
            onBackground = Color(0xFF0F172A),
            surface = LightSurface,
            onSurface = Color(0xFF0F172A),
            surfaceVariant = Color(0xFFF1F5F9),
            onSurfaceVariant = Color(0xFF64748B),
            outline = Color(0xFFCBD5E1),
            error = Color(0xFFEF4444),
            onError = Color.White
        )

        val darkTokens = BrandColorTokens(
            primary = tertiary, // High contrast for dark mode
            onPrimary = Color(0xFF0F172A),
            primaryContainer = Color(0xFF0369A1),
            onPrimaryContainer = Color(0xFFE0F2FE),
            secondary = secondary,
            onSecondary = Color(0xFF0F172A),
            secondaryContainer = Color(0xFF0284C7),
            onSecondaryContainer = Color(0xFFE0F2FE),
            tertiary = primary,
            onTertiary = Color.White,
            background = bgDark,
            onBackground = textDark,
            surface = DarkSurface,
            onSurface = textDark,
            surfaceVariant = Color(0xFF334155),
            onSurfaceVariant = Color(0xFF94A3B8),
            outline = Color(0xFF475569),
            error = Color(0xFFF87171),
            onError = Color(0xFF450A0A)
        )

        return BrandDesignTokens(
            brandId = model.brandId,
            colorsLight = lightTokens,
            colorsDark = darkTokens,
            logoUrl = model.logoUrl,
            iconUrl = model.iconUrl,
            splashUrl = model.splashUrl
        )
    }

    fun getDefaultTokens(): BrandDesignTokens {
        return resolveFromModel(
            BrandVisualModel(
                brandId = DEFAULT_BRAND_ID,
                displayName = DEFAULT_BRAND_NAME,
                primaryColorHex = "#0284C7",
                secondaryColorHex = "#0EA5E9",
                accentColorHex = "#38BDF8",
                backgroundColorHex = "#0F172A",
                textColorHex = "#F8FAFC"
            )
        )
    }
}
