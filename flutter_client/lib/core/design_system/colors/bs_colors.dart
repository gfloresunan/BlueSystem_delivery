/// BLUE SYSTEM DELIVERY ENTERPRISE — DESIGN SYSTEM COLORS
/// 1:1 Parity with Android Canonical Tokens (app/src/main/java/com/example/ui/theme/Color.kt & BSDSTheme.kt).

import 'package:flutter/material.dart';

class BSColors {
  BSColors._();

  // ─── Canonical Brand Colors ──────────────────────────────────────────────
  static const Color primary = Color(0xFF0D47A1); // BluePrimary
  static const Color secondary = Color(0xFF0288D1); // BlueSecondary
  static const Color tertiary = Color(0xFF00B0FF); // BlueTertiary
  static const Color primaryLight = Color(0xFF60A5FA); // BlueLightPrimary
  static const Color primaryDarkContainer = Color(0xFF1E3A8A); // BlueDarkPrimaryContainer
  static const Color primaryContainerLight = Color(0xFFEFF6FF);

  // ─── Surfaces & Backgrounds - Light (Customer & Merchant) ─────────────────
  static const Color bgLight = Color(0xFFF4F7FA); // BgLightApp
  static const Color surfaceLight = Color(0xFFFFFFFF); // SurfaceLight
  static const Color surfaceContainerLight = Color(0xFFF8FAFC);
  static const Color surfaceContainerLowLight = Color(0xFFF1F5F9);
  static const Color surfaceContainerHighLight = Color(0xFFE2E8F0);

  // ─── Surfaces & Backgrounds - Dark (Courier Operational) ─────────────────
  static const Color bgDark = Color(0xFF020617); // BSDSBgDark / Courier Background
  static const Color surfaceDark = Color(0xFF0F172A); // BSDSSurfaceDark / Card
  static const Color surfaceContainerDark = Color(0xFF1E293B); // Border / SecSurface
  static const Color surfaceContainerLowDark = Color(0xFF111827); // Dark alternative
  static const Color surfaceContainerHighDark = Color(0xFF334155);

  // ─── Text / On Surfaces - Light ─────────────────────────────────────────
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);
  static const Color textTertiaryLight = Color(0xFF94A3B8);
  static const Color textDisabledLight = Color(0xFFCBD5E1);

  // ─── Text / On Surfaces - Dark ──────────────────────────────────────────
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color textTertiaryDark = Color(0xFF64748B);
  static const Color textDisabledDark = Color(0xFF475569);

  // ─── Outlines & Borders ──────────────────────────────────────────────────
  static const Color outlineLight = Color(0xFFCBD5E1);
  static const Color outlineVariantLight = Color(0xFFE2E8F0);
  static const Color outlineDark = Color(0xFF4B5563);
  static const Color outlineVariantDark = Color(0xFF1E293B);

  // ─── Accent / FAB ────────────────────────────────────────────────────────
  static const Color cartFabAccent = Color(0xFFFF2D55); // Central Floating Cart
  static const Color courierAccent = Color(0xFF6366F1); // Indigo Accent
  static const Color courierAccentLight = Color(0xFF818CF8); // Soft Indigo
  static const Color merchantBlue = Color(0xFF2563EB); // Merchant Action Blue

  // ─── Status Colors (Canonical Semantic) ──────────────────────────────────
  static const Color success = Color(0xFF10B981); // Emerald Green
  static const Color successDark = Color(0xFF059669);
  static const Color successLight = Color(0xFF34D399);
  static const Color successContainerLight = Color(0xFFD1FAE5);
  static const Color successContainerDark = Color(0x3310B981);

  static const Color warning = Color(0xFFF59E0B); // Amber Warning
  static const Color warningDark = Color(0xFFD97706);
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color warningContainerLight = Color(0xFFFEF3C7);
  static const Color warningContainerDark = Color(0x33F59E0B);

  static const Color error = Color(0xFFEF4444); // Red Error
  static const Color errorDark = Color(0xFFDC2626);
  static const Color errorLight = Color(0xFFF87171);
  static const Color errorContainerLight = Color(0xFFFEE2E2);
  static const Color errorContainerDark = Color(0x33EF4444);

  static const Color info = Color(0xFF3B82F6);
  static const Color infoContainerLight = Color(0xFFDBEAFE);

  // ─── Badges & Operational ────────────────────────────────────────────────
  static const Color favorite = Color(0xFFFF2D55);
  static const Color ratingStar = Color(0xFFFBBF24);
  static const Color flashDeal = Color(0xFFDC2626);
  static const Color verified = Color(0xFF2563EB);

  // ─── Gradients ───────────────────────────────────────────────────────────
  static const LinearGradient customerHeaderGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient courierHeaderGradient = LinearGradient(
    colors: [surfaceDark, surfaceContainerDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient primaryButtonGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cartBadgeGradient = LinearGradient(
    colors: [cartFabAccent, Color(0xFFFF5277)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Helper for Order Status colors
  static Color getOrderStatusColor(String status, {bool isDark = false}) {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'entregado':
      case 'completed':
      case 'completado':
        return isDark ? successLight : success;
      case 'cancelled':
      case 'cancelado':
        return isDark ? errorLight : error;
      default:
        return isDark ? warningLight : warning;
    }
  }

  static Color getOrderStatusContainerColor(String status, {bool isDark = false}) {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'entregado':
      case 'completed':
      case 'completado':
        return isDark ? successContainerDark : successContainerLight;
      case 'cancelled':
      case 'cancelado':
        return isDark ? errorContainerDark : errorContainerLight;
      default:
        return isDark ? warningContainerDark : warningContainerLight;
    }
  }
}
