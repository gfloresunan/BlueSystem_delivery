package com.example.whitelabel

import androidx.compose.ui.graphics.Color

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — ANDROID BRAND DESIGN TOKENS (FASE 2D.5)
 * Dynamic Design Tokens for Jetpack Compose Theming & White-Label Hydration
 * 
 * STRICT ONE CORE / ZERO FORKS
 */

data class BrandVisualConfig(
    val logoUrl: String,
    val iconUrl: String,
    val splashUrl: String,
    val faviconUrl: String? = null,
    val primaryColor: String,
    val secondaryColor: String,
    val accentColor: String,
    val backgroundColor: String,
    val textColor: String,
    val fontFamily: String? = null
)

data class BrandColorTokens(
    val primary: Color,
    val onPrimary: Color,
    val primaryContainer: Color,
    val onPrimaryContainer: Color,
    val secondary: Color,
    val onSecondary: Color,
    val accent: Color,
    val onAccent: Color,
    val background: Color,
    val onBackground: Color,
    val surface: Color,
    val onSurface: Color,
    val surfaceVariant: Color,
    val onSurfaceVariant: Color,
    val error: Color = Color(0xFFEF4444),
    val onError: Color = Color(0xFFFFFFFF),
    val success: Color = Color(0xFF10B981),
    val onSuccess: Color = Color(0xFFFFFFFF),
    val warning: Color = Color(0xFFF59E0B),
    val onWarning: Color = Color(0xFF0F172A),
    val outline: Color
)

data class BrandAssetTokens(
    val logoUrl: String,
    val iconUrl: String,
    val splashUrl: String,
    val faviconUrl: String? = null
)

data class BrandDesignTokens(
    val brandId: String,
    val colors: BrandColorTokens,
    val assets: BrandAssetTokens,
    val isFallback: Boolean = false
)

object DefaultBrandTokens {
    val Config = BrandVisualConfig(
        logoUrl = "https://storage.googleapis.com/bluesystem-assets/logo.png",
        iconUrl = "https://storage.googleapis.com/bluesystem-assets/icon.png",
        splashUrl = "https://storage.googleapis.com/bluesystem-assets/splash.png",
        faviconUrl = "https://storage.googleapis.com/bluesystem-assets/favicon.ico",
        primaryColor = "#0284C7",
        secondaryColor = "#0EA5E9",
        accentColor = "#38BDF8",
        backgroundColor = "#0F172A",
        textColor = "#F8FAFC",
        fontFamily = "Inter, sans-serif"
    )
}
