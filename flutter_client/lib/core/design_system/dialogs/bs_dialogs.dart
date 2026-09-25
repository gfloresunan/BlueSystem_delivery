/// BLUE SYSTEM DELIVERY ENTERPRISE — DIALOG SYSTEM
/// Canonical dialog wrappers with BSDS tokens, 20dp corners, and action styles.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../radius/bs_radius.dart';
import '../typography/bs_typography.dart';
import '../buttons/bs_buttons.dart';

class BSDialog extends StatelessWidget {
  final String title;
  final Widget content;
  final IconData? icon;
  final Color? iconColor;
  final String? primaryActionText;
  final VoidCallback? onPrimaryAction;
  final String? secondaryActionText;
  final VoidCallback? onSecondaryAction;
  final bool isDestructive;

  const BSDialog({
    super.key,
    required this.title,
    required this.content,
    this.icon,
    this.iconColor,
    this.primaryActionText,
    this.onPrimaryAction,
    this.secondaryActionText,
    this.onSecondaryAction,
    this.isDestructive = false,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required Widget content,
    IconData? icon,
    Color? iconColor,
    String? primaryActionText,
    VoidCallback? onPrimaryAction,
    String? secondaryActionText,
    VoidCallback? onSecondaryAction,
    bool isDestructive = false,
  }) {
    return showDialog<T>(
      context: context,
      builder: (ctx) => BSDialog(
        title: title,
        content: content,
        icon: icon,
        iconColor: iconColor,
        primaryActionText: primaryActionText,
        onPrimaryAction: onPrimaryAction,
        secondaryActionText: secondaryActionText,
        onSecondaryAction: onSecondaryAction,
        isDestructive: isDestructive,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: BSRadius.borderLg),
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      actionsPadding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      title: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (iconColor ?? BSColors.primary).withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor ?? BSColors.primary, size: 22),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Text(
              title,
              style: BSTypography.titleMedium(),
            ),
          ),
        ],
      ),
      content: content,
      actions: [
        if (secondaryActionText != null)
          BSButton.text(
            label: secondaryActionText!,
            onPressed: onSecondaryAction ?? () => Navigator.of(context).pop(),
          ),
        if (primaryActionText != null)
          isDestructive
              ? BSButton.danger(
                  label: primaryActionText!,
                  onPressed: onPrimaryAction,
                )
              : BSButton.primary(
                  label: primaryActionText!,
                  onPressed: onPrimaryAction,
                ),
      ],
    );
  }
}
