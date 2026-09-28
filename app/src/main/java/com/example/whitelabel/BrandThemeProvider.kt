package com.example.whitelabel

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — ANDROID BRAND THEME PROVIDER (FASE 2D.5)
 * Dynamic Jetpack Compose MaterialTheme Wrapper & CompositionLocal for Brand Tokens
 */

val LocalBrandTokens = staticCompositionLocalOf<BrandDesignTokens> {
    BrandHydrationResolver.resolveTokens("default", null)
}

@Composable
fun BrandThemeProvider(
    tokens: BrandDesignTokens,
    content: @Composable () -> Unit
) {
    val dynamicColorScheme: ColorScheme = darkColorScheme(
        primary = tokens.colors.primary,
        onPrimary = tokens.colors.onPrimary,
        primaryContainer = tokens.colors.primaryContainer,
        onPrimaryContainer = tokens.colors.onPrimaryContainer,
        secondary = tokens.colors.secondary,
        onSecondary = tokens.colors.onSecondary,
        tertiary = tokens.colors.accent,
        onTertiary = tokens.colors.onAccent,
        background = tokens.colors.background,
        onBackground = tokens.colors.onBackground,
        surface = tokens.colors.surface,
        onSurface = tokens.colors.onSurface,
        surfaceVariant = tokens.colors.surfaceVariant,
        onSurfaceVariant = tokens.colors.onSurfaceVariant,
        outline = tokens.colors.outline,
        error = tokens.colors.error,
        onError = tokens.colors.onError
    )

    CompositionLocalProvider(LocalBrandTokens provides tokens) {
        MaterialTheme(
            colorScheme = dynamicColorScheme,
            content = content
        )
    }
}
