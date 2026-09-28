package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color

// Brand / Primary
val BluePrimary = Color(0xFF0D47A1)
val BlueSecondary = Color(0xFF0288D1)
val BlueTertiary = Color(0xFF00B0FF)
val BlueLightPrimary = Color(0xFF60A5FA)
val BlueDarkPrimaryContainer = Color(0xFF1E3A8A)

// Surfaces & Backgrounds - Light
val BgLightApp = Color(0xFFF4F7FA)
val SurfaceLight = Color(0xFFFFFFFF)
val SurfaceContainerLight = Color(0xFFF8FAFC)
val SurfaceContainerLowLight = Color(0xFFF1F5F9)
val SurfaceContainerHighLight = Color(0xFFE2E8F0)

// Surfaces & Backgrounds - Dark
val BgDarkApp = Color(0xFF111827)
val SurfaceDark = Color(0xFF1F2937)
val SurfaceContainerDark = Color(0xFF374151)
val SurfaceContainerLowDark = Color(0xFF1E2430)
val SurfaceContainerHighDark = Color(0xFF4B5563)

// Text / On Surfaces - Light
val TextPrimaryLight = Color(0xFF0F172A)
val TextSecondaryLight = Color(0xFF64748B)

// Text / On Surfaces - Dark
val TextPrimaryDark = Color(0xFFF9FAFB)
val TextSecondaryDark = Color(0xFF9CA3AF)

// Outlines & Borders
val OutlineLight = Color(0xFFCBD5E1)
val OutlineVariantLight = Color(0xFFE2E8F0)
val OutlineDark = Color(0xFF4B5563)
val OutlineVariantDark = Color(0xFF374151)

// Accent / Status
val FabAccent = Color(0xFFFF2D55)
val StatusSuccess = Color(0xFF10B981)
val StatusSuccessLightContainer = Color(0xFFD1FAE5)
val StatusSuccessDarkContainer = Color(0x3310B981)

val StatusWarning = Color(0xFFD97706)
val StatusWarningLightContainer = Color(0xFFFEF3C7)
val StatusWarningDarkContainer = Color(0x33F59E0B)

val StatusError = Color(0xFFDC2626)
val StatusErrorLightContainer = Color(0xFFFEE2E2)
val StatusErrorDarkContainer = Color(0x33EF4444)

val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)
val Pink80 = Color(0xFFEFB8C8)

val Purple40 = Color(0xFF6650a4)
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)

object OrderStatusTheme {
    @Composable
    @ReadOnlyComposable
    fun contentColor(status: String): Color {
        val isDark = MaterialTheme.colorScheme.background == BgDarkApp
        return when (status.lowercase()) {
            "delivered", "entregado", "completed", "completado" -> if (isDark) Color(0xFF34D399) else StatusSuccess
            "cancelled", "cancelado" -> if (isDark) Color(0xFFF87171) else StatusError
            else -> if (isDark) Color(0xFFFBBF24) else StatusWarning
        }
    }

    @Composable
    @ReadOnlyComposable
    fun containerColor(status: String): Color {
        val isDark = MaterialTheme.colorScheme.background == BgDarkApp
        return when (status.lowercase()) {
            "delivered", "entregado", "completed", "completado" -> if (isDark) StatusSuccessDarkContainer else StatusSuccessLightContainer
            "cancelled", "cancelado" -> if (isDark) StatusErrorDarkContainer else StatusErrorLightContainer
            else -> if (isDark) StatusWarningDarkContainer else StatusWarningLightContainer
        }
    }
}

