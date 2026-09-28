package com.example.eiam.presentation.ui.bsds.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ==========================================
// 🎨 PALETA CORPORATIVA BSDS v1.0 (ADR-005)
// ==========================================
val BSDSBlue700 = Color(0xFF2563EB)
val BSDSBlue800 = Color(0xFF1E40AF)
val BSDSBlue900 = Color(0xFF1E3A8A)

val BSDSCyan = Color(0xFF06B6D4)
val BSDSSky = Color(0xFF0EA5E9)
val BSDSIndigo = Color(0xFF4F46E5)

val BSDSSuccess = Color(0xFF22C55E)
val BSDSWarning = Color(0xFFF59E0B)
val BSDSError = Color(0xFFEF4444)
val BSDSInfo = Color(0xFF3B82F6)
val BSDSOffline = Color(0xFF6B7280)

val BSDSBgLight = Color(0xFFF8FAFC)
val BSDSSurfaceLight = Color(0xFFFFFFFF)
val BSDSSecSurfaceLight = Color(0xFFF1F5F9)

val BSDSBgDark = Color(0xFF020617)
val BSDSSurfaceDark = Color(0xFF0F172A)
val BSDSSecSurfaceDark = Color(0xFF1E293B)

val BSDSTextPrimaryLight = Color(0xFF0F172A)
val BSDSTextPrimaryDark = Color(0xFFF8FAFC)
val BSDSTextSecondaryLight = Color(0xFF475569)
val BSDSTextSecondaryDark = Color(0xFF94A3B8)
val BSDSTextHint = Color(0xFF94A3B8)
val BSDSTextDisabled = Color(0xFFCBD5E1)

// ==========================================
// 🔤 SISTEMA TIPOGRÁFICO BSDS v1.0
// ==========================================
val BSDSTypography = Typography(
    displayLarge = TextStyle(
        fontSize = 36.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 44.sp
    ),
    displayMedium = TextStyle(
        fontSize = 32.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 40.sp
    ),
    headlineLarge = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 36.sp
    ),
    headlineMedium = TextStyle(
        fontSize = 24.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 32.sp
    ),
    headlineSmall = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = 28.sp
    ),
    titleMedium = TextStyle(
        fontSize = 18.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = 24.sp
    ),
    bodyLarge = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 24.sp
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 20.sp
    ),
    labelSmall = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 16.sp
    ),
    labelLarge = TextStyle(
        fontSize = 15.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 20.sp
    )
)

// ==========================================
// 🔳 RADIOS DE BORDE (BORDER RADIUS)
// ==========================================
val BSDSShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),   // Small: 8dp
    small = RoundedCornerShape(12.dp),       // Medium: 12dp
    medium = RoundedCornerShape(18.dp),      // Card: 18dp
    large = RoundedCornerShape(24.dp),       // Sheet/Dialog: 24dp
    extraLarge = RoundedCornerShape(28.dp)   // Floating Card: 28dp
)

private val LightColorScheme = lightColorScheme(
    primary = BSDSBlue700,
    onPrimary = Color.White,
    primaryContainer = BSDSSecSurfaceLight,
    onPrimaryContainer = BSDSBlue900,
    secondary = BSDSCyan,
    onSecondary = Color.White,
    background = BSDSBgLight,
    onBackground = BSDSTextPrimaryLight,
    surface = BSDSSurfaceLight,
    onSurface = BSDSTextPrimaryLight,
    surfaceVariant = BSDSSecSurfaceLight,
    onSurfaceVariant = BSDSTextSecondaryLight,
    error = BSDSError,
    onError = Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = BSDSBlue700,
    onPrimary = Color.White,
    primaryContainer = BSDSSecSurfaceDark,
    onPrimaryContainer = Color.White,
    secondary = BSDSCyan,
    onSecondary = Color.Black,
    background = BSDSBgDark,
    onBackground = BSDSTextPrimaryDark,
    surface = BSDSSurfaceDark,
    onSurface = BSDSTextPrimaryDark,
    surfaceVariant = BSDSSecSurfaceDark,
    onSurfaceVariant = BSDSTextSecondaryDark,
    error = BSDSError,
    onError = Color.White
)

@Composable
fun BSDSTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = BSDSTypography,
        shapes = BSDSShapes,
        content = content
    )
}
