/// BLUE SYSTEM DELIVERY ENTERPRISE — BRAND THEME BUILDER
/// Translates BrandVisualConfig into Material 3 ThemeData with 1:1 Android Parity.

import 'package:flutter/material.dart';
import '../../core/brand/brand_context.dart';

class BrandColors {
  // Brand / Primary
  static const Color bluePrimary = Color(0xFF0D47A1);
  static const Color blueSecondary = Color(0xFF0288D1);
  static const Color blueTertiary = Color(0xFF00B0FF);
  static const Color blueDarkPrimaryContainer = Color(0xFF1E3A8A);

  // Surfaces & Backgrounds - Light
  static const Color bgLightApp = Color(0xFFF4F7FA);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceContainerLight = Color(0xFFF8FAFC);
  static const Color surfaceContainerLowLight = Color(0xFFF1F5F9);
  static const Color surfaceContainerHighLight = Color(0xFFE2E8F0);

  // Text / On Surfaces - Light
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);

  // Accent / Status
  static const Color fabAccent = Color(0xFFFF2D55); // Red/Pink Central Cart Button
  static const Color statusSuccess = Color(0xFF10B981);
  static const Color statusSuccessContainer = Color(0xFFD1FAE5);
  static const Color statusWarning = Color(0xFFD97706);
  static const Color statusWarningContainer = Color(0xFFFEF3C7);
  static const Color statusError = Color(0xFFDC2626);
  static const Color statusErrorContainer = Color(0xFFFEE2E2);

  // Outlines & Borders
  static const Color outlineLight = Color(0xFFCBD5E1);
  static const Color outlineVariantLight = Color(0xFFE2E8F0);
}

class BrandThemeBuilder {
  static Color _hexToColor(String hex, Color fallback) {
    try {
      final clean = hex.replaceAll('#', '').trim();
      if (clean.length == 6) {
        return Color(int.parse('0xFF$clean'));
      } else if (clean.length == 8) {
        return Color(int.parse('0x$clean'));
      }
      return fallback;
    } catch (_) {
      return fallback;
    }
  }

  /// Builds the canonical Material 3 Light Theme matching Android Compose
  static ThemeData buildTheme(BrandVisualConfig visual) {
    final primary = _hexToColor(visual.primaryColor, BrandColors.bluePrimary);
    final secondary = _hexToColor(visual.secondaryColor, BrandColors.blueSecondary);

    final colorScheme = ColorScheme.light(
      primary: primary,
      secondary: secondary,
      tertiary: BrandColors.blueTertiary,
      surface: BrandColors.surfaceLight,
      surfaceVariant: BrandColors.surfaceContainerLowLight,
      background: BrandColors.bgLightApp,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: BrandColors.textPrimaryLight,
      onSurfaceVariant: BrandColors.textSecondaryLight,
      outline: BrandColors.outlineLight,
      outlineVariant: BrandColors.outlineVariantLight,
      error: BrandColors.statusError,
      onError: Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: visual.fontFamily,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: BrandColors.bgLightApp,
      appBarTheme: AppBarTheme(
        backgroundColor: BrandColors.surfaceLight,
        foregroundColor: BrandColors.textPrimaryLight,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: const TextStyle(
          color: BrandColors.textPrimaryLight,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardThemeData(
        color: BrandColors.surfaceLight,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.06),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: BrandColors.outlineVariantLight, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ),
    );
  }

  /// Builds a dark Material 3 ThemeData when dark mode is explicitly desired
  static ThemeData buildDarkTheme(BrandVisualConfig visual) {
    final primary = _hexToColor(visual.primaryColor, const Color(0xFF60A5FA));
    final secondary = _hexToColor(visual.secondaryColor, const Color(0xFF38BDF8));

    final colorScheme = ColorScheme.dark(
      primary: primary,
      secondary: secondary,
      tertiary: const Color(0xFF00B0FF),
      surface: const Color(0xFF1F2937),
      surfaceVariant: const Color(0xFF374151),
      background: const Color(0xFF111827),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: const Color(0xFFF9FAFB),
      onSurfaceVariant: const Color(0xFF9CA3AF),
      outline: const Color(0xFF4B5563),
      outlineVariant: const Color(0xFF374151),
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: visual.fontFamily,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: const Color(0xFF111827),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1F2937),
        foregroundColor: Color(0xFFF9FAFB),
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF1F2937),
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

