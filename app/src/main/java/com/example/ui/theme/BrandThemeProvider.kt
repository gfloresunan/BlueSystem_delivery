package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import com.example.domain.model.branding.BrandDesignTokens
import com.example.domain.model.branding.DefaultBrandTokens

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — BRAND AWARE COMPOSE THEME (FASE 2D.2)
 * Inyector Dinámico de Tokens de Marca para Jetpack Compose con Fallback a BlueSystem Default.
 */

val LocalBrandTokens = staticCompositionLocalOf<BrandDesignTokens> {
    DefaultBrandTokens.getDefaultTokens()
}

fun BrandDesignTokens.toMaterialColorScheme(isDark: Boolean): ColorScheme {
    val tokens = if (isDark) this.colorsDark else this.colorsLight
    return if (isDark) {
        darkColorScheme(
            primary = tokens.primary,
            onPrimary = tokens.onPrimary,
            primaryContainer = tokens.primaryContainer,
            onPrimaryContainer = tokens.onPrimaryContainer,
            secondary = tokens.secondary,
            onSecondary = tokens.onSecondary,
            secondaryContainer = tokens.secondaryContainer,
            onSecondaryContainer = tokens.onSecondaryContainer,
            tertiary = tokens.tertiary,
            onTertiary = tokens.onTertiary,
            background = tokens.background,
            onBackground = tokens.onBackground,
            surface = tokens.surface,
            onSurface = tokens.onSurface,
            surfaceVariant = tokens.surfaceVariant,
            onSurfaceVariant = tokens.onSurfaceVariant,
            outline = tokens.outline,
            error = tokens.error,
            onError = tokens.onError
        )
    } else {
        lightColorScheme(
            primary = tokens.primary,
            onPrimary = tokens.onPrimary,
            primaryContainer = tokens.primaryContainer,
            onPrimaryContainer = tokens.onPrimaryContainer,
            secondary = tokens.secondary,
            onSecondary = tokens.onSecondary,
            secondaryContainer = tokens.secondaryContainer,
            onSecondaryContainer = tokens.onSecondaryContainer,
            tertiary = tokens.tertiary,
            onTertiary = tokens.onTertiary,
            background = tokens.background,
            onBackground = tokens.onBackground,
            surface = tokens.surface,
            onSurface = tokens.onSurface,
            surfaceVariant = tokens.surfaceVariant,
            onSurfaceVariant = tokens.onSurfaceVariant,
            outline = tokens.outline,
            error = tokens.error,
            onError = tokens.onError
        )
    }
}

@Composable
fun BrandAwareTheme(
    brandTokens: BrandDesignTokens = DefaultBrandTokens.getDefaultTokens(),
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = brandTokens.toMaterialColorScheme(darkTheme)

    CompositionLocalProvider(LocalBrandTokens provides brandTokens) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
