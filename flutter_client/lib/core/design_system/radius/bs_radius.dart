/// BLUE SYSTEM DELIVERY ENTERPRISE — DESIGN SYSTEM CORNER RADIUS
/// 1:1 Parity with Android BSDSShapes (app/src/main/java/com/example/eiam/presentation/ui/bsds/theme/BSDSTheme.kt).

import 'package:flutter/material.dart';

class BSRadius {
  BSRadius._();

  // ─── Canonical DP Values ─────────────────────────────────────────────────
  static const double xxs = 4.0;
  static const double xs = 6.0;
  static const double sm = 8.0;   // BSDSShapes.extraSmall (8dp)
  static const double md = 12.0;  // BSDSShapes.small (12dp)
  static const double card = 16.0; // Standard Card
  static const double cardLg = 18.0; // BSDSShapes.medium (18dp)
  static const double lg = 20.0;
  static const double sheet = 24.0; // BSDSShapes.large (24dp)
  static const double floating = 28.0; // BSDSShapes.extraLarge (28dp)
  static const double pill = 999.0; // Circular / Capsule

  // ─── Radius Objects ──────────────────────────────────────────────────────
  static const Radius rXs = Radius.circular(xs);
  static const Radius rSm = Radius.circular(sm);
  static const Radius rMd = Radius.circular(md);
  static const Radius rCard = Radius.circular(card);
  static const Radius rCardLg = Radius.circular(cardLg);
  static const Radius rLg = Radius.circular(lg);
  static const Radius rSheet = Radius.circular(sheet);
  static const Radius rFloating = Radius.circular(floating);
  static const Radius rPill = Radius.circular(pill);

  // ─── BorderRadius Objects ────────────────────────────────────────────────
  static const BorderRadius borderXxs = BorderRadius.all(Radius.circular(xxs));
  static const BorderRadius borderXs = BorderRadius.all(Radius.circular(xs));
  static const BorderRadius borderSm = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius borderMd = BorderRadius.all(Radius.circular(md));
  static const BorderRadius borderCard = BorderRadius.all(Radius.circular(card));
  static const BorderRadius borderCardLg = BorderRadius.all(Radius.circular(cardLg));
  static const BorderRadius borderLg = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius borderSheet = BorderRadius.all(Radius.circular(sheet));
  static const BorderRadius borderFloating = BorderRadius.all(Radius.circular(floating));
  static const BorderRadius borderPill = BorderRadius.all(Radius.circular(pill));

  // Top Sheet Rounded Border (Bottom sheets & curved headers)
  static const BorderRadius sheetTop = BorderRadius.vertical(top: Radius.circular(sheet));
  static const BorderRadius sheetFloatingTop = BorderRadius.vertical(top: Radius.circular(floating));
  static const BorderRadius cardTop = BorderRadius.vertical(top: Radius.circular(card));
}
