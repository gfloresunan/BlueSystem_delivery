/// BLUE SYSTEM DELIVERY ENTERPRISE — BADGES & STATUS SYSTEM
/// Canonical badges for commercial state, ratings, discounts, and order statuses.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../radius/bs_radius.dart';
import '../typography/bs_typography.dart';

class BSBadge extends StatelessWidget {
  final String label;
  final Color backgroundColor;
  final Color textColor;
  final IconData? icon;
  final double? fontSize;
  final EdgeInsets? padding;

  const BSBadge({
    super.key,
    required this.label,
    required this.backgroundColor,
    this.textColor = Colors.white,
    this.icon,
    this.fontSize,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BSRadius.borderPill,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: textColor),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: BSTypography.badge(color: textColor).copyWith(
              fontSize: fontSize,
            ),
          ),
        ],
      ),
    );
  }
}

class BSStatusBadge extends StatelessWidget {
  final String status;
  final bool isDark;

  const BSStatusBadge({
    super.key,
    required this.status,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    final textColor = BSColors.getOrderStatusColor(status, isDark: isDark);
    final bgColor = BSColors.getOrderStatusContainerColor(status, isDark: isDark);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BSRadius.borderMd,
        border: Border.all(color: textColor.withOpacity(0.3), width: 1),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w700,
          fontSize: 11,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class OpenBadge extends StatelessWidget {
  const OpenBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return const BSBadge(
      label: 'ABIERTO',
      backgroundColor: BSColors.success,
      icon: Icons.check_circle_outline_rounded,
    );
  }
}

class ClosedBadge extends StatelessWidget {
  const ClosedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return const BSBadge(
      label: 'CERRADO',
      backgroundColor: BSColors.error,
      icon: Icons.access_time_rounded,
    );
  }
}

class AvailableBadge extends StatelessWidget {
  const AvailableBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: const BoxDecoration(
        color: BSColors.successContainerLight,
        borderRadius: BSRadius.borderSm,
      ),
      child: const Text(
        'DISPONIBLE',
        style: TextStyle(
          color: BSColors.successDark,
          fontWeight: FontWeight.bold,
          fontSize: 10,
        ),
      ),
    );
  }
}

class SoldOutBadge extends StatelessWidget {
  const SoldOutBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: const BoxDecoration(
        color: BSColors.errorContainerLight,
        borderRadius: BSRadius.borderSm,
      ),
      child: const Text(
        'AGOTADO',
        style: TextStyle(
          color: BSColors.errorDark,
          fontWeight: FontWeight.bold,
          fontSize: 10,
        ),
      ),
    );
  }
}

class DiscountBadge extends StatelessWidget {
  final int percentage;

  const DiscountBadge({super.key, required this.percentage});

  @override
  Widget build(BuildContext context) {
    return BSBadge(
      label: '-$percentage%',
      backgroundColor: BSColors.cartFabAccent,
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
    );
  }
}

class FlashBadge extends StatelessWidget {
  const FlashBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return const BSBadge(
      label: 'FLASH 🔥',
      backgroundColor: BSColors.error,
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    );
  }
}

class FeaturedBadge extends StatelessWidget {
  const FeaturedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return const BSBadge(
      label: 'DESTACADO ⭐',
      backgroundColor: Color(0xFFD97706),
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    );
  }
}

class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return const Icon(
      Icons.verified_rounded,
      size: 16,
      color: BSColors.merchantBlue,
    );
  }
}

class RatingBadge extends StatelessWidget {
  final double rating;

  const RatingBadge({super.key, required this.rating});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: const BoxDecoration(
        color: Color(0xFFFEF3C7),
        borderRadius: BSRadius.borderSm,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star_rounded, size: 14, color: Color(0xFFD97706)),
          const SizedBox(width: 3),
          Text(
            rating.toStringAsFixed(1),
            style: const TextStyle(
              color: Color(0xFF92400E),
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class DistanceBadge extends StatelessWidget {
  final String distanceText;

  const DistanceBadge({super.key, required this.distanceText});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: const BoxDecoration(
        color: BSColors.surfaceContainerLowLight,
        borderRadius: BSRadius.borderSm,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on_outlined, size: 12, color: BSColors.textSecondaryLight),
          const SizedBox(width: 2),
          Text(
            distanceText,
            style: const TextStyle(
              color: BSColors.textSecondaryLight,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
