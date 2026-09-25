/// BLUE SYSTEM DELIVERY ENTERPRISE — BUTTON SYSTEM
/// Canonical reusable button suite with state handling (normal, disabled, loading, success, error).

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../dimensions/bs_dimensions.dart';
import '../elevation/bs_elevation.dart';
import '../radius/bs_radius.dart';
import '../spacing/bs_spacing.dart';
import '../typography/bs_typography.dart';

enum BSButtonVariant { primary, secondary, outlined, danger, success, text }
enum BSButtonSize { small, medium, large }

class BSButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final BSButtonVariant variant;
  final BSButtonSize size;
  final IconData? leadingIcon;
  final IconData? trailingIcon;
  final bool isLoading;
  final bool isFullWidth;
  final double? width;

  const BSButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = BSButtonVariant.primary,
    this.size = BSButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.width,
  });

  const BSButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = BSButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.width,
  }) : variant = BSButtonVariant.primary;

  const BSButton.secondary({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = BSButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.width,
  }) : variant = BSButtonVariant.secondary;

  const BSButton.outlined({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = BSButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.width,
  }) : variant = BSButtonVariant.outlined;

  const BSButton.danger({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = BSButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.width,
  }) : variant = BSButtonVariant.danger;

  const BSButton.success({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = BSButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.width,
  }) : variant = BSButtonVariant.success;

  const BSButton.text({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = BSButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.width,
  }) : variant = BSButtonVariant.text;

  @override
  Widget build(BuildContext context) {
    final effectiveHeight = _getHeight();
    final effectivePadding = _getPadding();

    final buttonContent = Row(
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading) ...[
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              valueColor: AlwaysStoppedAnimation<Color>(_getTextColor()),
            ),
          ),
          BSSpacing.hGapSm,
        ] else if (leadingIcon != null) ...[
          Icon(leadingIcon, size: 18, color: _getTextColor()),
          BSSpacing.hGapSm,
        ],
        Text(
          label,
          style: BSTypography.button(color: _getTextColor()),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        if (!isLoading && trailingIcon != null) ...[
          BSSpacing.hGapSm,
          Icon(trailingIcon, size: 18, color: _getTextColor()),
        ],
      ],
    );

    final Widget rawButton;
    final isEnabled = onPressed != null && !isLoading;

    switch (variant) {
      case BSButtonVariant.primary:
        rawButton = ElevatedButton(
          onPressed: isEnabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: BSColors.primary,
            foregroundColor: Colors.white,
            disabledBackgroundColor: BSColors.outlineLight,
            disabledForegroundColor: BSColors.textDisabledLight,
            elevation: isEnabled ? BSElevation.card : 0,
            padding: effectivePadding,
            shape: const RoundedRectangleBorder(borderRadius: BSRadius.borderMd),
          ),
          child: buttonContent,
        );
        break;

      case BSButtonVariant.secondary:
        rawButton = ElevatedButton(
          onPressed: isEnabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: BSColors.secondary,
            foregroundColor: Colors.white,
            disabledBackgroundColor: BSColors.outlineLight,
            elevation: isEnabled ? BSElevation.card : 0,
            padding: effectivePadding,
            shape: const RoundedRectangleBorder(borderRadius: BSRadius.borderMd),
          ),
          child: buttonContent,
        );
        break;

      case BSButtonVariant.outlined:
        rawButton = OutlinedButton(
          onPressed: isEnabled ? onPressed : null,
          style: OutlinedButton.styleFrom(
            foregroundColor: BSColors.primary,
            side: BorderSide(
              color: isEnabled ? BSColors.primary : BSColors.outlineLight,
              width: 1.5,
            ),
            padding: effectivePadding,
            shape: const RoundedRectangleBorder(borderRadius: BSRadius.borderMd),
          ),
          child: buttonContent,
        );
        break;

      case BSButtonVariant.danger:
        rawButton = ElevatedButton(
          onPressed: isEnabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: BSColors.error,
            foregroundColor: Colors.white,
            disabledBackgroundColor: BSColors.outlineLight,
            elevation: isEnabled ? BSElevation.card : 0,
            padding: effectivePadding,
            shape: const RoundedRectangleBorder(borderRadius: BSRadius.borderMd),
          ),
          child: buttonContent,
        );
        break;

      case BSButtonVariant.success:
        rawButton = ElevatedButton(
          onPressed: isEnabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: BSColors.success,
            foregroundColor: Colors.white,
            disabledBackgroundColor: BSColors.outlineLight,
            elevation: isEnabled ? BSElevation.card : 0,
            padding: effectivePadding,
            shape: const RoundedRectangleBorder(borderRadius: BSRadius.borderMd),
          ),
          child: buttonContent,
        );
        break;

      case BSButtonVariant.text:
        rawButton = TextButton(
          onPressed: isEnabled ? onPressed : null,
          style: TextButton.styleFrom(
            foregroundColor: BSColors.primary,
            padding: effectivePadding,
            shape: const RoundedRectangleBorder(borderRadius: BSRadius.borderMd),
          ),
          child: buttonContent,
        );
        break;
    }

    return SizedBox(
      height: effectiveHeight,
      width: isFullWidth ? double.infinity : width,
      child: rawButton,
    );
  }

  double _getHeight() {
    switch (size) {
      case BSButtonSize.small:
        return BSDimensions.buttonHeightSm;
      case BSButtonSize.medium:
        return BSDimensions.buttonHeightMd;
      case BSButtonSize.large:
        return BSDimensions.buttonHeightLg;
    }
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case BSButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: BSSpacing.md, vertical: BSSpacing.xs);
      case BSButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: BSSpacing.lg, vertical: BSSpacing.sm);
      case BSButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: BSSpacing.xl, vertical: BSSpacing.md);
    }
  }

  Color _getTextColor() {
    if (onPressed == null && !isLoading) {
      return BSColors.textDisabledLight;
    }
    switch (variant) {
      case BSButtonVariant.primary:
      case BSButtonVariant.secondary:
      case BSButtonVariant.danger:
      case BSButtonVariant.success:
        return Colors.white;
      case BSButtonVariant.outlined:
        return BSColors.primary;
      case BSButtonVariant.text:
        return BSColors.primary;
    }
  }
}

class BSIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? color;
  final Color? backgroundColor;
  final double size;
  final String? tooltip;
  final bool hasBorder;

  const BSIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.color,
    this.backgroundColor,
    this.size = BSDimensions.iconMd,
    this.tooltip,
    this.hasBorder = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? BSColors.textPrimaryLight;
    final button = InkWell(
      onTap: onPressed,
      borderRadius: BSRadius.borderPill,
      child: Container(
        constraints: const BoxConstraints(
          minWidth: BSDimensions.minTouchTarget,
          minHeight: BSDimensions.minTouchTarget,
        ),
        padding: const EdgeInsets.all(BSSpacing.sm),
        decoration: BoxDecoration(
          color: backgroundColor ?? Colors.transparent,
          shape: BoxShape.circle,
          border: hasBorder ? Border.all(color: BSColors.outlineVariantLight) : null,
        ),
        child: Center(
          child: Icon(icon, color: effectiveColor, size: size),
        ),
      ),
    );

    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: button);
    }
    return button;
  }
}

class BSCartButton extends StatelessWidget {
  final int itemCount;
  final VoidCallback onPressed;

  const BSCartButton({
    super.key,
    required this.itemCount,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: BSDimensions.centralCartFabSize,
      width: BSDimensions.centralCartFabSize,
      margin: const EdgeInsets.only(top: 24),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: BSElevation.cartFabShadow,
      ),
      child: FloatingActionButton(
        onPressed: onPressed,
        backgroundColor: BSColors.cartFabAccent,
        foregroundColor: Colors.white,
        elevation: BSElevation.fab,
        shape: const CircleBorder(),
        child: Badge(
          isLabelVisible: itemCount > 0,
          backgroundColor: BSColors.primary,
          label: Text(
            '$itemCount',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          ),
          child: const Icon(
            Icons.shopping_cart_rounded,
            size: BSDimensions.centralCartIconSize,
          ),
        ),
      ),
    );
  }
}
