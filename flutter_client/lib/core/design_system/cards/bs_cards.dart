/// BLUE SYSTEM DELIVERY ENTERPRISE — CARD SYSTEM
/// Canonical reusable cards (MerchantCard, ProductCard, OrderCard, KpiCard) with 1:1 Android Parity.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../dimensions/bs_dimensions.dart';
import '../elevation/bs_elevation.dart';
import '../radius/bs_radius.dart';
import '../spacing/bs_spacing.dart';
import '../typography/bs_typography.dart';
import '../badges/bs_badges.dart';

class BSCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;
  final Border? border;
  final List<BoxShadow>? boxShadow;
  final double? width;
  final double? height;

  const BSCard({
    super.key,
    required this.child,
    this.padding = BSSpacing.cardPadding,
    this.onTap,
    this.backgroundColor,
    this.borderRadius,
    this.border,
    this.boxShadow,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBorderRadius = borderRadius ?? BSRadius.borderCard;
    final effectiveShadow = boxShadow ?? BSElevation.cardShadow;
    final effectiveBg = backgroundColor ?? BSColors.surfaceLight;

    final cardBody = Container(
      width: width,
      height: height,
      padding: padding,
      decoration: BoxDecoration(
        color: effectiveBg,
        borderRadius: effectiveBorderRadius,
        border: border ?? Border.all(color: BSColors.outlineVariantLight, width: 1),
        boxShadow: effectiveShadow,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        borderRadius: effectiveBorderRadius,
        child: InkWell(
          onTap: onTap,
          borderRadius: effectiveBorderRadius,
          child: cardBody,
        ),
      );
    }
    return cardBody;
  }
}

/// Canonical 1:1 Android PublicBusinessCard.kt parity
/// Structure:
/// ┌──────────────────────────┐
/// │        IMAGEN            │
/// │                          │
/// │  ABIERTO          ❤️     │
/// ├──────────────────────────┤
/// │ Nombre             ⭐4.8 │
/// │ Categoría                │
/// │                          │
/// │ 📍 Dirección             │
/// │ 🚚 Envío C$ XX          │
/// └──────────────────────────┘
class BSMerchantCard extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final String category;
  final String address;
  final double rating;
  final bool isOpen;
  final double deliveryFee;
  final bool isFavorite;
  final VoidCallback onTap;
  final VoidCallback? onFavoriteToggle;
  final double width;

  const BSMerchantCard({
    super.key,
    required this.name,
    this.imageUrl,
    required this.category,
    required this.address,
    this.rating = 4.8,
    this.isOpen = true,
    this.deliveryFee = 35.0,
    this.isFavorite = false,
    required this.onTap,
    this.onFavoriteToggle,
    this.width = BSDimensions.merchantCardWidth,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BSRadius.borderCard,
        border: Border.all(color: BSColors.outlineVariantLight),
        boxShadow: BSElevation.cardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BSRadius.borderCard,
        child: InkWell(
          onTap: onTap,
          borderRadius: BSRadius.borderCard,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top: Image with Badges (Open/Closed + Favorite)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BSRadius.cardTop,
                    child: Container(
                      height: BSDimensions.merchantCardImageHeight,
                      width: double.infinity,
                      color: BSColors.surfaceContainerLowLight,
                      child: imageUrl != null && imageUrl!.isNotEmpty
                          ? Image.network(
                              imageUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _buildFallbackImage(),
                            )
                          : _buildFallbackImage(),
                    ),
                  ),
                  // Open / Closed Badge (Top-Left)
                  Positioned(
                    top: 10,
                    left: 10,
                    child: isOpen ? const OpenBadge() : const ClosedBadge(),
                  ),
                  // Favorite Heart Button (Top-Right)
                  if (onFavoriteToggle != null)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.9),
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          iconSize: 20,
                          padding: const EdgeInsets.all(6),
                          constraints: const BoxConstraints(),
                          icon: Icon(
                            isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            color: isFavorite ? BSColors.favorite : BSColors.textSecondaryLight,
                          ),
                          onPressed: onFavoriteToggle,
                        ),
                      ),
                    ),
                ],
              ),

              // Bottom: Info (Name, Rating, Category, Address, Delivery)
              Padding(
                padding: const EdgeInsets.all(BSSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Row: Name + Rating
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: BSTypography.titleSmall(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        RatingBadge(rating: rating),
                      ],
                    ),
                    const SizedBox(height: 3),
                    // Category
                    Text(
                      category,
                      style: BSTypography.bodySmall(color: BSColors.textSecondaryLight),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    // Address
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 13, color: BSColors.textSecondaryLight),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            address.isNotEmpty ? address : 'Zona Central',
                            style: BSTypography.caption(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Delivery fee
                    Row(
                      children: [
                        const Icon(Icons.delivery_dining_rounded, size: 14, color: BSColors.primary),
                        const SizedBox(width: 4),
                        Text(
                          'Envío C\$ ${deliveryFee.toInt()}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: BSColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFallbackImage() {
    return Center(
      child: Icon(
        Icons.storefront_rounded,
        size: 48,
        color: Colors.grey.shade400,
      ),
    );
  }
}

/// Canonical 1:1 Android StarProductCard.kt parity
class BSProductCard extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double price;
  final String businessName;
  final VoidCallback onAdd;
  final double width;

  const BSProductCard({
    super.key,
    required this.name,
    this.imageUrl,
    required this.price,
    required this.businessName,
    required this.onAdd,
    this.width = BSDimensions.productPromoCardWidth,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BSRadius.borderCard,
        border: Border.all(color: BSColors.outlineVariantLight),
        boxShadow: BSElevation.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          ClipRRect(
            borderRadius: BSRadius.cardTop,
            child: Container(
              height: BSDimensions.productPromoImageHeight,
              width: double.infinity,
              color: BSColors.surfaceContainerLowLight,
              child: imageUrl != null && imageUrl!.isNotEmpty
                  ? Image.network(
                      imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildFallbackImage(),
                    )
                  : _buildFallbackImage(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(BSSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: BSTypography.labelLarge(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  businessName,
                  style: BSTypography.caption(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'C\$ ${price.toInt()}',
                      style: BSTypography.priceMedium(),
                    ),
                    InkWell(
                      onTap: onAdd,
                      borderRadius: BSRadius.borderPill,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: BSColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.add, size: 16, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackImage() {
    return Center(
      child: Icon(Icons.fastfood_rounded, size: 36, color: Colors.grey.shade400),
    );
  }
}

/// Operational KPI Card for Merchant and Courier Dashboards
class BSKpiCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color iconColor;
  final String? subtitle;
  final bool isDark;

  const BSKpiCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.iconColor = BSColors.primary,
    this.subtitle,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDark ? BSColors.surfaceDark : Colors.white;
    final textColor = isDark ? BSColors.textPrimaryDark : BSColors.textPrimaryLight;
    final subColor = isDark ? BSColors.textSecondaryDark : BSColors.textSecondaryLight;
    final borderColor = isDark ? BSColors.surfaceContainerDark : BSColors.outlineVariantLight;

    return Container(
      padding: const EdgeInsets.all(BSSpacing.md),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BSRadius.borderMd,
        border: Border.all(color: borderColor),
        boxShadow: isDark ? null : BSElevation.subtleShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BSRadius.borderSm,
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: BSTypography.caption(color: subColor)),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: TextStyle(fontSize: 10, color: subColor)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
