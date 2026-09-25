/// BLUE SYSTEM DELIVERY ENTERPRISE — NAVIGATION & COMPONENT SYSTEM
/// Canonical navigation bar, curved bottom shell, gradient header, and location selector.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../dimensions/bs_dimensions.dart';
import '../elevation/bs_elevation.dart';
import '../radius/bs_radius.dart';
import '../spacing/bs_spacing.dart';
import '../typography/bs_typography.dart';

class BSBottomNavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const BSBottomNavItem({
    super.key,
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected ? BSColors.cartFabAccent : BSColors.textSecondaryLight;
    return InkWell(
      onTap: onTap,
      borderRadius: BSRadius.borderMd,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 3),
            Text(
              label,
              style: BSTypography.navigation(isSelected: isSelected),
            ),
          ],
        ),
      ),
    );
  }
}

/// Curved Bottom Navigation container matching Android CustomerBottomNavigationBar
class BSBottomNavigation extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onItemSelected;
  final VoidCallback onCartTap;
  final int cartItemCount;

  const BSBottomNavigation({
    super.key,
    required this.selectedIndex,
    required this.onItemSelected,
    required this.onCartTap,
    this.cartItemCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BSRadius.sheetTop,
        boxShadow: BSElevation.bottomNavShadow,
      ),
      child: SafeArea(
        child: SizedBox(
          height: BSDimensions.bottomNavHeight,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              BSBottomNavItem(
                icon: Icons.home_rounded,
                label: 'Inicio',
                isSelected: selectedIndex == 0,
                onTap: () => onItemSelected(0),
              ),
              BSBottomNavItem(
                icon: Icons.favorite_border_rounded,
                label: 'Favorito',
                isSelected: selectedIndex == 1,
                onTap: () => onItemSelected(1),
              ),
              // Spacer for the center FAB
              const SizedBox(width: BSDimensions.centralCartFabSize),
              BSBottomNavItem(
                icon: Icons.receipt_long_rounded,
                label: 'Pedidos',
                isSelected: selectedIndex == 2,
                onTap: () => onItemSelected(2),
              ),
              BSBottomNavItem(
                icon: Icons.person_rounded,
                label: 'Mi Perfil',
                isSelected: selectedIndex == 3,
                onTap: () => onItemSelected(3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Canonical 1:1 Android HomeHeader.kt Gradient Header
class BSHeader extends StatelessWidget {
  final String userName;
  final Widget? bottomChild;
  final VoidCallback? onCartClick;
  final VoidCallback? onNotificationsClick;
  final int cartItemCount;
  final int unreadNotificationsCount;

  const BSHeader({
    super.key,
    required this.userName,
    this.bottomChild,
    this.onCartClick,
    this.onNotificationsClick,
    this.cartItemCount = 0,
    this.unreadNotificationsCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final initialLetter = userName.isNotEmpty ? userName.substring(0, 1).toUpperCase() : 'C';

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: BSColors.customerHeaderGradient,
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(BSSpacing.lg, BSSpacing.md, BSSpacing.lg, BSSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // User Avatar
                  Container(
                    width: BSDimensions.avatarMd,
                    height: BSDimensions.avatarMd,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(color: Colors.white.withOpacity(0.6), width: 2),
                      boxShadow: BSElevation.subtleShadow,
                    ),
                    child: Center(
                      child: Text(
                        initialLetter,
                        style: const TextStyle(
                          color: BSColors.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  BSSpacing.hGapMd,

                  // Greeting texts
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hola, $userName',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '¡Bienvenido! 👋',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.92),
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          '¿Qué deseas pedir hoy?',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.78),
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Notifications & Cart Badges
                  if (onNotificationsClick != null) ...[
                    IconButton(
                      icon: Badge(
                        isLabelVisible: unreadNotificationsCount > 0,
                        backgroundColor: BSColors.cartFabAccent,
                        label: Text('$unreadNotificationsCount', style: const TextStyle(fontSize: 10)),
                        child: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 24),
                      ),
                      onPressed: onNotificationsClick,
                    ),
                  ],
                ],
              ),
              if (bottomChild != null) ...[
                BSSpacing.vGapMd,
                bottomChild!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Canonical Section Header with Title and "Ver todos" action
class BSSectionHeader extends StatelessWidget {
  final String title;
  final String? actionText;
  final VoidCallback? onAction;
  final Widget? trailing;

  const BSSectionHeader({
    super.key,
    required this.title,
    this.actionText,
    this.onAction,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: BSSpacing.lg),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              title,
              style: BSTypography.titleMedium(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (trailing != null) trailing!,
          if (actionText != null && onAction != null && trailing == null)
            InkWell(
              onTap: onAction,
              borderRadius: BSRadius.borderSm,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Text(
                  actionText!,
                  style: const TextStyle(
                    color: BSColors.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Location Selector Pill in Home
class BSLocationSelector extends StatelessWidget {
  final String currentAddress;
  final VoidCallback onTap;

  const BSLocationSelector({
    super.key,
    required this.currentAddress,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BSRadius.borderPill,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.18),
          borderRadius: BSRadius.borderPill,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.location_on, color: Colors.white, size: 16),
            const SizedBox(width: 4),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 220),
              child: Text(
                currentAddress.isNotEmpty ? currentAddress : 'Ubicación actual',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down, color: Colors.white, size: 16),
          ],
        ),
      ),
    );
  }
}

/// User Avatar with Initials fallback
class BSAvatar extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double size;
  final Color? backgroundColor;

  const BSAvatar({
    super.key,
    this.imageUrl,
    required this.name,
    this.size = BSDimensions.avatarMd,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'U';

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return ClipOval(
        child: Image.network(
          imageUrl!,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallback(initial),
        ),
      );
    }
    return _buildFallback(initial);
  }

  Widget _buildFallback(String initial) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: backgroundColor ?? BSColors.primary,
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: size * 0.45,
          ),
        ),
      ),
    );
  }
}
