/// BLUE SYSTEM DELIVERY ENTERPRISE — BRAND THEME BUILDER
/// Translates BrandVisualConfig into Material 3 ThemeData with 1:1 Android Parity.

import 'package:flutter/material.dart';
import '../../core/brand/brand_context.dart';
import '../../core/design_system/colors/bs_colors.dart';

class BrandColors {
  // Brand / Primary
  static const Color bluePrimary = BSColors.primary;
  static const Color blueSecondary = BSColors.secondary;
  static const Color blueTertiary = BSColors.tertiary;
  static const Color blueDarkPrimaryContainer = BSColors.primaryDarkContainer;

  // Surfaces & Backgrounds - Light
  static const Color bgLightApp = BSColors.bgLight;
  static const Color surfaceLight = BSColors.surfaceLight;
  static const Color surfaceContainerLight = BSColors.surfaceContainerLight;
  static const Color surfaceContainerLowLight = BSColors.surfaceContainerLowLight;
  static const Color surfaceContainerHighLight = BSColors.surfaceContainerHighLight;

  // Text / On Surfaces - Light
  static const Color textPrimaryLight = BSColors.textPrimaryLight;
  static const Color textSecondaryLight = BSColors.textSecondaryLight;

  // Accent / Status
  static const Color fabAccent = BSColors.cartFabAccent; // Red/Pink Central Cart Button
  static const Color statusSuccess = BSColors.success;
  static const Color statusSuccessContainer = BSColors.successContainerLight;
  static const Color statusWarning = BSColors.warning;
  static const Color statusWarningContainer = BSColors.warningContainerLight;
  static const Color statusError = BSColors.error;
  static const Color statusErrorContainer = BSColors.errorContainerLight;

  // Outlines & Borders
  static const Color outlineLight = BSColors.outlineLight;
  static const Color outlineVariantLight = BSColors.outlineVariantLight;
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
      appBarTheme: const AppBarTheme(
        backgroundColor: BrandColors.surfaceLight,
        foregroundColor: BrandColors.textPrimaryLight,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
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

