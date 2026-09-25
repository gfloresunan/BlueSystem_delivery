/// BLUE SYSTEM DELIVERY ENTERPRISE — DESIGN SYSTEM ELEVATION & SHADOWS
/// Canonical elevation hierarchy matching Android Material 3 and iOS Safe ergonomics.

import 'package:flutter/material.dart';

class BSElevation {
  BSElevation._();

  static const double none = 0.0;
  static const double low = 1.0;
  static const double card = 2.0;
  static const double menu = 4.0;
  static const double floating = 6.0;
  static const double modal = 8.0;
  static const double fab = 8.0;

  // ─── BoxShadow Presets ───────────────────────────────────────────────────
  static final List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.06),
      blurRadius: 10,
      offset: const Offset(0, 3),
    ),
  ];

  static final List<BoxShadow> subtleShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.04),
      blurRadius: 6,
      offset: const Offset(0, 2),
    ),
  ];

  static final List<BoxShadow> floatingShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.12),
      blurRadius: 16,
      offset: const Offset(0, 6),
    ),
  ];

  static final List<BoxShadow> bottomNavShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.08),
      blurRadius: 16,
      offset: const Offset(0, -4),
    ),
  ];

  static final List<BoxShadow> cartFabShadow = [
    BoxShadow(
      color: const Color(0xFFFF2D55).withOpacity(0.35),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];

  static final List<BoxShadow> primaryGlow = [
    BoxShadow(
      color: const Color(0xFF0D47A1).withOpacity(0.25),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];
}
