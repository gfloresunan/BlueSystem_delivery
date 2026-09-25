/// BLUE SYSTEM DELIVERY ENTERPRISE — BRAND THEME BUILDER
/// Translates BrandVisualConfig into Material 3 ThemeData with zero code duplication.

import 'package:flutter/material.dart';
import '../../core/brand/brand_context.dart';

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

  /// Builds a dark Material 3 ThemeData — default shell for the commercial client.
  static ThemeData buildDarkTheme(BrandVisualConfig visual) => buildTheme(visual);

  static ThemeData buildTheme(BrandVisualConfig visual) {
    final primary = _hexToColor(visual.primaryColor, const Color(0xFF0284C7));
    final secondary = _hexToColor(visual.secondaryColor, const Color(0xFF0EA5E9));
    final accent = _hexToColor(visual.accentColor, const Color(0xFF10B981));
    final background = _hexToColor(visual.backgroundColor, const Color(0xFF0F172A));
    final text = _hexToColor(visual.textColor, const Color(0xFFF8FAFC));

    final colorScheme = ColorScheme.dark(
      primary: primary,
      secondary: secondary,
      tertiary: accent,
      surface: const Color(0xFF1E293B),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: text,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: visual.fontFamily,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: text,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: colorScheme.surface,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
    );
  }
}
