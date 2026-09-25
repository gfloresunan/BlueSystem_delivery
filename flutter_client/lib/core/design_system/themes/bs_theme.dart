/// BLUE SYSTEM DELIVERY ENTERPRISE — THEME SYSTEM
/// Material 3 Themes matching Android Canonical Reference (Theme.kt, Color.kt, BSDSTheme.kt).

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../radius/bs_radius.dart';
import '../typography/bs_typography.dart';

class BSTheme {
  BSTheme._();

  /// Canonical Customer & Merchant Light Theme (Android 1:1 Parity)
  static ThemeData lightTheme({String? fontFamily}) {
    final font = fontFamily ?? BSTypography.fontFamily;

    const colorScheme = ColorScheme.light(
      primary: BSColors.primary,
      onPrimary: Colors.white,
      primaryContainer: BSColors.primaryContainerLight,
      onPrimaryContainer: BSColors.primaryDarkContainer,
      secondary: BSColors.secondary,
      onSecondary: Colors.white,
      secondaryContainer: Color(0xFFE0F2FE),
      onSecondaryContainer: Color(0xFF0369A1),
      tertiary: BSColors.tertiary,
      onTertiary: Colors.white,
      background: BSColors.bgLight,
      onBackground: BSColors.textPrimaryLight,
      surface: BSColors.surfaceLight,
      onSurface: BSColors.textPrimaryLight,
      surfaceVariant: BSColors.surfaceContainerLowLight,
      onSurfaceVariant: BSColors.textSecondaryLight,
      outline: BSColors.outlineLight,
      outlineVariant: BSColors.outlineVariantLight,
      error: BSColors.error,
      onError: Colors.white,
      errorContainer: BSColors.errorContainerLight,
      onErrorContainer: BSColors.error,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: font,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: BSColors.bgLight,
      appBarTheme: const AppBarTheme(
        backgroundColor: BSColors.surfaceLight,
        foregroundColor: BSColors.textPrimaryLight,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: BSColors.textPrimaryLight,
          fontSize: 18,
          fontWeight: FontWeight.bold,
          fontFamily: BSTypography.fontFamily,
        ),
      ),
      cardTheme: CardThemeData(
        color: BSColors.surfaceLight,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.06),
        shape: const RoundedRectangleBorder(
          borderRadius: BSRadius.borderCard,
          side: BorderSide(color: BSColors.outlineVariantLight, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: BSColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const RoundedRectangleBorder(
            borderRadius: BSRadius.borderMd,
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            fontFamily: BSTypography.fontFamily,
          ),
        ),
      ),
      dialogTheme: const DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BSRadius.borderLg),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
    );
  }

  /// Canonical Courier Operational Dark Theme (Android CourierMainDashboardScreen.kt Parity)
  static ThemeData courierDarkTheme({String? fontFamily}) {
    final font = fontFamily ?? BSTypography.fontFamily;

    const colorScheme = ColorScheme.dark(
      primary: BSColors.courierAccent,
      onPrimary: Colors.white,
      primaryContainer: BSColors.surfaceContainerDark,
      onPrimaryContainer: Colors.white,
      secondary: BSColors.courierAccentLight,
      onSecondary: Colors.black,
      tertiary: BSColors.tertiary,
      onTertiary: Colors.white,
      background: BSColors.bgDark,
      onBackground: BSColors.textPrimaryDark,
      surface: BSColors.surfaceDark,
      onSurface: BSColors.textPrimaryDark,
      surfaceVariant: BSColors.surfaceContainerDark,
      onSurfaceVariant: BSColors.textSecondaryDark,
      outline: BSColors.outlineDark,
      outlineVariant: BSColors.outlineVariantDark,
      error: BSColors.error,
      onError: Colors.white,
      errorContainer: Color(0xFF7F1D1D),
      onErrorContainer: Color(0xFFFEE2E2),
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: font,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: BSColors.bgDark,
      appBarTheme: const AppBarTheme(
        backgroundColor: BSColors.surfaceDark,
        foregroundColor: BSColors.textPrimaryDark,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: BSColors.textPrimaryDark,
          fontSize: 18,
          fontWeight: FontWeight.bold,
          fontFamily: BSTypography.fontFamily,
        ),
      ),
      cardTheme: CardThemeData(
        color: BSColors.surfaceDark,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.3),
        shape: const RoundedRectangleBorder(
          borderRadius: BSRadius.borderCard,
          side: BorderSide(color: BSColors.surfaceContainerDark, width: 1),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: BSColors.surfaceDark,
        selectedItemColor: BSColors.courierAccentLight,
        unselectedItemColor: BSColors.textSecondaryDark,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: BSColors.surfaceDark,
        indicatorColor: BSColors.courierAccent,
        labelTextStyle: MaterialStateProperty.all(
          const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: BSColors.textSecondaryDark,
          ),
        ),
      ),
    );
  }
}
