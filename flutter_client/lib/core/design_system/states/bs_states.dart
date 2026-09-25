/// BLUE SYSTEM DELIVERY ENTERPRISE — UI STATES SYSTEM
/// Canonical UI states (Loading, Empty, Error, Offline) matching Android presentation.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../dimensions/bs_dimensions.dart';
import '../spacing/bs_spacing.dart';
import '../typography/bs_typography.dart';
import '../buttons/bs_buttons.dart';

class BSLoading extends StatelessWidget {
  final String? message;
  final Color? color;
  final bool isFullScreen;

  const BSLoading({
    super.key,
    this.message,
    this.color,
    this.isFullScreen = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(color ?? BSColors.primary),
            strokeWidth: 3,
          ),
          if (message != null) ...[
            BSSpacing.vGapMd,
            Text(
              message!,
              style: BSTypography.bodyMedium(color: BSColors.textSecondaryLight),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );

    if (isFullScreen) {
      return Scaffold(
        backgroundColor: BSColors.bgLight,
        body: content,
      );
    }
    return content;
  }
}

class BSEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color? iconColor;

  const BSEmptyState({
    super.key,
    this.icon = Icons.inbox_rounded,
    required this.title,
    required this.description,
    this.actionLabel,
    this.onAction,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(BSSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(BSSpacing.xl),
              decoration: BoxDecoration(
                color: (iconColor ?? BSColors.textSecondaryLight).withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: BSDimensions.iconGiant,
                color: iconColor ?? Colors.grey.shade400,
              ),
            ),
            BSSpacing.vGapLg,
            Text(
              title,
              style: BSTypography.titleMedium(),
              textAlign: TextAlign.center,
            ),
            BSSpacing.vGapSm,
            Text(
              description,
              style: BSTypography.bodyMedium(color: BSColors.textSecondaryLight),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              BSSpacing.vGapLg,
              BSButton.primary(
                label: actionLabel!,
                onPressed: onAction,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class BSErrorState extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  const BSErrorState({
    super.key,
    this.title = 'Ha ocurrido un error',
    required this.message,
    this.onRetry,
    this.retryLabel = 'Reintentar',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(BSSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(BSSpacing.lg),
              decoration: const BoxDecoration(
                color: BSColors.errorContainerLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                size: 56,
                color: BSColors.error,
              ),
            ),
            BSSpacing.vGapLg,
            Text(
              title,
              style: BSTypography.titleMedium(),
              textAlign: TextAlign.center,
            ),
            BSSpacing.vGapSm,
            Text(
              message,
              style: BSTypography.bodyMedium(color: BSColors.textSecondaryLight),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              BSSpacing.vGapLg,
              BSButton.primary(
                label: retryLabel,
                leadingIcon: Icons.refresh_rounded,
                onPressed: onRetry,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class BSOfflineBanner extends StatelessWidget {
  const BSOfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      color: const Color(0xFFFEF3C7),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off_rounded, size: 16, color: Color(0xFFD97706)),
          SizedBox(width: 8),
          Text(
            'Modo sin conexión activo — Los cambios se sincronizarán al reconectar',
            style: TextStyle(
              color: Color(0xFF92400E),
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
