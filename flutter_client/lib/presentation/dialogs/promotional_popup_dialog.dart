/// BLUE SYSTEM DELIVERY ENTERPRISE — PROMOTIONAL POPUP DIALOG (WIDGET)
/// 1:1 Parity with Android PromotionalPopupDialog.kt
/// Displays high-converting promotional campaigns with actions to merchants, products or categories.

import 'package:flutter/material.dart';
import '../../core/design_system/colors/bs_colors.dart';
import '../../domain/entities/promotional_popup_entity.dart';

class PromotionalPopupDialog extends StatelessWidget {
  final PromotionalPopupEntity popup;
  final VoidCallback onDismiss;
  final Function(String actionType, String actionTarget) onActionClick;

  const PromotionalPopupDialog({
    super.key,
    required this.popup,
    required this.onDismiss,
    required this.onActionClick,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Container(
        decoration: BoxDecoration(
          color: BSColors.surfaceDark,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: BSColors.outlineVariantDark),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.5),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Imagen de Portada con Botón Cerrar
            Stack(
              children: [
                if (popup.imageUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    child: Image.network(
                      popup.imageUrl,
                      width: double.infinity,
                      height: 180,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 140,
                        color: BSColors.surfaceContainerDark,
                        child: const Center(
                          child: Icon(Icons.campaign, size: 60, color: BSColors.primaryLight),
                        ),
                      ),
                    ),
                  )
                else
                  Container(
                    height: 120,
                    decoration: const BoxDecoration(
                      color: BSColors.primary,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    child: const Center(
                      child: Icon(Icons.campaign, size: 50, color: Colors.white),
                    ),
                  ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: onDismiss,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close, size: 18, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),

            // Contenido de Texto & CTA
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  if (popup.title.isNotEmpty)
                    Text(
                      popup.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  if (popup.description.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      popup.description,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Colors.white70,
                        height: 1.3,
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        if (popup.actionType.toUpperCase() != 'DISMISS') {
                          onActionClick(popup.actionType, popup.actionTarget);
                        }
                        onDismiss();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: BSColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        popup.actionType.toUpperCase() == 'DISMISS' ? 'Cerrar' : 'Aprovechar Oferta',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
