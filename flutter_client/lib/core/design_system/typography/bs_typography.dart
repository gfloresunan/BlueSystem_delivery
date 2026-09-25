/// BLUE SYSTEM DELIVERY ENTERPRISE — DESIGN SYSTEM TYPOGRAPHY
/// Canonical Poppins typographic system matching Android Type.kt and BSDSTypography.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';

class BSTypography {
  BSTypography._();

  static const String fontFamily = 'Poppins';

  // ─── Display Styles ──────────────────────────────────────────────────────
  static TextStyle displayLarge({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 36,
        fontWeight: FontWeight.w700,
        height: 44 / 36,
        letterSpacing: -0.5,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle displayMedium({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 32,
        fontWeight: FontWeight.w600,
        height: 40 / 32,
        letterSpacing: -0.5,
        color: color ?? BSColors.textPrimaryLight,
      );

  // ─── Headline Styles ─────────────────────────────────────────────────────
  static TextStyle headlineLarge({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 28,
        fontWeight: FontWeight.w600,
        height: 36 / 28,
        letterSpacing: -0.25,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle headlineMedium({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 24,
        fontWeight: FontWeight.w600,
        height: 32 / 24,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle headlineSmall({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 20,
        fontWeight: FontWeight.w500,
        height: 28 / 20,
        color: color ?? BSColors.textPrimaryLight,
      );

  // ─── Title Styles ────────────────────────────────────────────────────────
  static TextStyle titleLarge({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 22,
        fontWeight: FontWeight.w600,
        height: 28 / 22,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle titleMedium({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        height: 24 / 18,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle titleSmall({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: FontWeight.w600,
        height: 22 / 16,
        color: color ?? BSColors.textPrimaryLight,
      );

  // ─── Body Styles ─────────────────────────────────────────────────────────
  static TextStyle bodyLarge({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 24 / 16,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle bodyMedium({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 20 / 14,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle bodySmall({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 16 / 12,
        color: color ?? BSColors.textSecondaryLight,
      );

  // ─── Label & Functional Styles ───────────────────────────────────────────
  static TextStyle labelLarge({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 15,
        fontWeight: FontWeight.w600,
        height: 20 / 15,
        letterSpacing: 0.1,
        color: color ?? BSColors.textPrimaryLight,
      );

  static TextStyle labelMedium({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 13,
        fontWeight: FontWeight.w500,
        height: 18 / 13,
        color: color ?? BSColors.textSecondaryLight,
      );

  static TextStyle labelSmall({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 11,
        fontWeight: FontWeight.w500,
        height: 16 / 11,
        color: color ?? BSColors.textSecondaryLight,
      );

  // ─── Specialized Commercial Tokens ───────────────────────────────────────
  static TextStyle priceLarge({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 20,
        fontWeight: FontWeight.w800,
        height: 24 / 20,
        color: color ?? BSColors.primary,
      );

  static TextStyle priceMedium({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: FontWeight.w700,
        height: 20 / 16,
        color: color ?? BSColors.primary,
      );

  static TextStyle priceSmall({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 13,
        fontWeight: FontWeight.w700,
        height: 16 / 13,
        color: color ?? BSColors.primary,
      );

  static TextStyle badge({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 10,
        fontWeight: FontWeight.w700,
        height: 14 / 10,
        letterSpacing: 0.3,
        color: color ?? Colors.white,
      );

  static TextStyle button({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 14,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.2,
        color: color ?? Colors.white,
      );

  static TextStyle navigation({Color? color, bool isSelected = false}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 10,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        height: 14 / 10,
        color: color ?? (isSelected ? BSColors.cartFabAccent : BSColors.textSecondaryLight),
      );

  static TextStyle caption({Color? color}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 11,
        fontWeight: FontWeight.w400,
        height: 14 / 11,
        color: color ?? BSColors.textSecondaryLight,
      );
}
