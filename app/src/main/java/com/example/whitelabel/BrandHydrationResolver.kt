package com.example.whitelabel

import androidx.compose.ui.graphics.Color

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — ANDROID BRAND HYDRATION RESOLVER (FASE 2D.5)
 * Resolves Dynamic Compose ColorSchemes and Design Tokens from Brand Visual Config
 */

object BrandHydrationResolver {
    private val HEX_COLOR_REGEX = Regex("^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$")

    fun parseColor(hex: String?, fallback: Color): Color {
        if (hex.isNullOrBlank() || !HEX_COLOR_REGEX.matches(hex)) {
            return fallback
        }
        return try {
            val clean = hex.removePrefix("#")
            val fullHex = if (clean.length == 3) {
                clean.map { "$it$it" }.joinToString("")
            } else {
                clean
            }
            val colorInt = fullHex.toLong(16) or 0x00000000FF000000L
            Color(colorInt.toInt())
        } catch (e: Exception) {
            fallback
        }
    }

    fun isDarkColor(color: Color): Boolean {
        val yiq = (color.red * 255 * 299 + color.green * 255 * 587 + color.blue * 255 * 114) / 1000
        return yiq < 128
    }

    fun getContrastText(background: Color): Color {
        return if (isDarkColor(background)) Color.White else Color(0xFF0F172A)
    }

    fun resolveTokens(
        brandId: String,
        config: BrandVisualConfig?
    ): BrandDesignTokens {
        val defaultConfig = DefaultBrandTokens.Config
        val isFallback = config == null

        val primary = parseColor(config?.primaryColor, Color(0xFF0284C7))
        val secondary = parseColor(config?.secondaryColor, Color(0xFF0EA5E9))
        val accent = parseColor(config?.accentColor, Color(0xFF38BDF8))
        val background = parseColor(config?.backgroundColor, Color(0xFF0F172A))
        val surface = if (isDarkColor(background)) Color(0xFF1E293B) else Color.White
        val surfaceVariant = if (isDarkColor(background)) Color(0xFF334155) else Color(0xFFF1F5F9)

        val colors = BrandColorTokens(
            primary = primary,
            onPrimary = getContrastText(primary),
            primaryContainer = if (isDarkColor(primary)) Color(0xFF0369A1) else Color(0xFFE0F2FE),
            onPrimaryContainer = if (isDarkColor(primary)) Color(0xFFE0F2FE) else Color(0xFF0369A1),
            secondary = secondary,
            onSecondary = getContrastText(secondary),
            accent = accent,
            onAccent = getContrastText(accent),
            background = background,
            onBackground = getContrastText(background),
            surface = surface,
            onSurface = getContrastText(surface),
            surfaceVariant = surfaceVariant,
            onSurfaceVariant = getContrastText(surfaceVariant),
            outline = if (isDarkColor(background)) Color(0xFF475569) else Color(0xFFCBD5E1)
        )

        val assets = BrandAssetTokens(
            logoUrl = config?.logoUrl ?: defaultConfig.logoUrl,
            iconUrl = config?.iconUrl ?: defaultConfig.iconUrl,
            splashUrl = config?.splashUrl ?: defaultConfig.splashUrl,
            faviconUrl = config?.faviconUrl ?: defaultConfig.faviconUrl
        )

        return BrandDesignTokens(
            brandId = brandId,
            colors = colors,
            assets = assets,
            isFallback = isFallback
        )
    }
}
