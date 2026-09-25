/// BLUE SYSTEM DELIVERY ENTERPRISE — BOTTOM SHEET SYSTEM
/// Canonical sheets with 24dp top radius, iOS Safe Area insets, and drag handles.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../radius/bs_radius.dart';

class BSBottomSheet {
  BSBottomSheet._();

  static Future<T?> show<T>({
    required BuildContext context,
    required Widget Function(BuildContext) builder,
    bool isScrollControlled = true,
    bool isDismissible = true,
    bool enableDrag = true,
    Color? backgroundColor,
    double? maxHeightFactor = 0.85,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      isDismissible: isDismissible,
      enableDrag: enableDrag,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: maxHeightFactor != null
                ? MediaQuery.of(ctx).size.height * maxHeightFactor
                : double.infinity,
          ),
          decoration: BoxDecoration(
            color: backgroundColor ?? Colors.white,
            borderRadius: BSRadius.sheetTop,
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Canonical Top Handle Bar
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 44,
                    height: 5,
                    decoration: const BoxDecoration(
                      color: BSColors.outlineLight,
                      borderRadius: BSRadius.borderPill,
                    ),
                  ),
                ),
                Flexible(
                  child: builder(ctx),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
