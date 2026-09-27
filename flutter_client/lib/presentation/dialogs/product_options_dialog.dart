/// BLUE SYSTEM DELIVERY ENTERPRISE — PRODUCT OPTIONS & VARIANTS DIALOG
/// Reusable modal bottom sheet conforming 1:1 with Android ComercioDetalleScreen.kt.
/// Handles OptionGroup selection, single/multiple choice, required validation,
/// kitchen notes, dynamic price accumulation, and adding configured products to cart.

import 'package:flutter/material.dart';

import '../theme/brand_theme_builder.dart';
import '../../domain/entities/catalog_entity.dart';

/// Shows the bottom sheet for selecting product options/variants and kitchen notes.
Future<void> showProductOptionsBottomSheet({
  required BuildContext context,
  required ProductEntity product,
  required String businessName,
  required void Function(ProductEntity configuredProduct, String businessName) onAddToCart,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => ProductOptionsBottomSheet(
      product: product,
      businessName: businessName,
      onAddToCart: onAddToCart,
    ),
  );
}

class ProductOptionsBottomSheet extends StatefulWidget {
  final ProductEntity product;
  final String businessName;
  final void Function(ProductEntity configuredProduct, String businessName) onAddToCart;

  const ProductOptionsBottomSheet({
    super.key,
    required this.product,
    required this.businessName,
    required this.onAddToCart,
  });

  @override
  State<ProductOptionsBottomSheet> createState() => _ProductOptionsBottomSheetState();
}

class _ProductOptionsBottomSheetState extends State<ProductOptionsBottomSheet> {
  final Map<String, SelectedOptionEntity> _selectedOptionsMap = {};
  final TextEditingController _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Pre-populate with default options
    for (final group in widget.product.parsedOptionGroups) {
      for (final opt in group.options) {
        if (opt.isDefault) {
          _selectedOptionsMap[opt.id] = SelectedOptionEntity.fromOption(
            group: group,
            option: opt,
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  bool _isAllRequiredSatisfied() {
    for (final g in widget.product.parsedOptionGroups) {
      if (g.isRequired) {
        final countInGroup = _selectedOptionsMap.values
            .where((o) => o.optionGroupId == g.id)
            .length;
        if (countInGroup == 0 || (g.minSelection > 0 && countInGroup < g.minSelection)) {
          return false;
        }
      }
    }
    return true;
  }

  double _calculateCurrentTotal() {
    final optionsSum = _selectedOptionsMap.values.fold(0.0, (sum, o) => sum + o.finalPrice);
    return widget.product.price + optionsSum;
  }

  @override
  Widget build(BuildContext context) {
    final groups = widget.product.parsedOptionGroups;
    final allRequiredSatisfied = _isAllRequiredSatisfied();
    final currentTotal = _calculateCurrentTotal();

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Header with Product Info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.product.imageUrl != null && widget.product.imageUrl!.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      widget.product.imageUrl!,
                      width: 64,
                      height: 64,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 64,
                        height: 64,
                        color: const Color(0xFFEFF6FF),
                        child: const Icon(Icons.fastfood, color: BrandColors.bluePrimary),
                      ),
                    ),
                  )
                else
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.fastfood, color: BrandColors.bluePrimary, size: 28),
                  ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.product.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Precio Base: C\$ ${widget.product.price.toInt()}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: BrandColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),

          // Scrollable Options Groups + Kitchen Notes
          Flexible(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              shrinkWrap: true,
              children: [
                // Groups
                ...groups.map((group) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Group Header
                      Row(
                        children: [
                          Text(
                            group.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: group.isRequired ? const Color(0xFFFEE2E2) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              group.isRequired ? 'Obligatorio' : 'Opcional',
                              style: TextStyle(
                                color: group.isRequired ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (group.description.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          group.description,
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                      const SizedBox(height: 10),

                      // Group Option Items
                      ...group.options.map((opt) {
                        final isSelected = _selectedOptionsMap.containsKey(opt.id);

                        return InkWell(
                          key: Key('option_${opt.id}'),
                          onTap: () {
                            setState(() {
                              if (group.isSingleChoice) {
                                _selectedOptionsMap.removeWhere((_, v) => v.optionGroupId == group.id);
                                _selectedOptionsMap[opt.id] = SelectedOptionEntity.fromOption(
                                  group: group,
                                  option: opt,
                                );
                              } else {
                                if (isSelected) {
                                  _selectedOptionsMap.remove(opt.id);
                                } else {
                                  final currentInGroup = _selectedOptionsMap.values
                                      .where((o) => o.optionGroupId == group.id)
                                      .length;
                                  if (currentInGroup < group.maxSelection) {
                                    _selectedOptionsMap[opt.id] = SelectedOptionEntity.fromOption(
                                      group: group,
                                      option: opt,
                                    );
                                  }
                                }
                              }
                            });
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? BrandColors.bluePrimary : const Color(0xFFE2E8F0),
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      group.isSingleChoice
                                          ? (isSelected ? Icons.radio_button_checked : Icons.radio_button_off)
                                          : (isSelected ? Icons.check_box : Icons.check_box_outline_blank),
                                      size: 20,
                                      color: isSelected ? BrandColors.bluePrimary : Colors.grey,
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      opt.name,
                                      style: TextStyle(
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                        fontSize: 13,
                                        color: const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  opt.additionalPrice > 0 ? '+C\$ ${opt.additionalPrice.toInt()}' : 'Gratis',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: opt.additionalPrice > 0 ? BrandColors.bluePrimary : const Color(0xFF10B981),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 14),
                    ],
                  );
                }),

                // Special Kitchen Notes Section (1:1 Android ComercioDetalleScreen.kt)
                const SizedBox(height: 8),
                const Row(
                  children: [
                    Icon(Icons.edit_note, size: 18, color: BrandColors.bluePrimary),
                    SizedBox(width: 6),
                    Text(
                      'Notas para la cocina (opcional)',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                TextField(
                  key: const Key('product_options_notes_field'),
                  controller: _notesController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'Ej. Sin cebolla, aderezo aparte, bien tostado...',
                    hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: BrandColors.bluePrimary, width: 1.5),
                    ),
                  ),
                  style: const TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 10,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: SafeArea(
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  key: const Key('add_configured_product_button'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: allRequiredSatisfied ? BrandColors.bluePrimary : Colors.grey,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: allRequiredSatisfied
                      ? () {
                          final configuredProduct = widget.product.copyWith(
                            selectedOptions: _selectedOptionsMap.values.toList(),
                            description: _notesController.text.trim().isNotEmpty
                                ? '${widget.product.description} | Nota: ${_notesController.text.trim()}'
                                : widget.product.description,
                          );
                          widget.onAddToCart(configuredProduct, widget.businessName);
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('¡${widget.product.name} personalizado agregado al carrito! 🛒'),
                              duration: const Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      : null,
                  child: Text(
                    allRequiredSatisfied
                        ? 'Agregar al Carrito • C\$ ${currentTotal.toInt()}'
                        : 'Selecciona las opciones requeridas',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
