/// BLUE SYSTEM DELIVERY ENTERPRISE — SERVICE EXPLORER SECTION (WIDGET)
/// 1:1 Parity with Android ServiceExplorerSection.kt (Protocol BSD-CUSTOMER-SERVICE-CATEGORY-HUB-001 / ADR-036).
/// Renderiza la cuadrícula gobernable de 2 filas:
/// - Fila 1: 3 Columnas LARGE (Dominante visualmente).
/// - Fila 2: 4 Columnas COMPACT.

import 'package:flutter/material.dart';
import '../../../../core/design_system/bsds_theme.dart';
import '../../../../domain/entities/home_service_category_entity.dart';

class ServiceExplorerSection extends StatefulWidget {
  final bool showServiceExplorer;
  final List<HomeServiceCategoryEntity> serviceCategories;
  final String title;
  final String subtitle;
  final Function(HomeServiceCategoryEntity) onCategoryClick;
  final VoidCallback onViewAllClick;

  const ServiceExplorerSection({
    super.key,
    this.showServiceExplorer = true,
    this.serviceCategories = const [],
    this.title = 'Explora servicios',
    this.subtitle = 'Todo lo que necesitas, en un solo lugar',
    required this.onCategoryClick,
    required this.onViewAllClick,
  });

  static const List<HomeServiceCategoryEntity> defaultCanonicalServices = [
    HomeServiceCategoryEntity(
      id: 'cat_restaurantes',
      name: 'Comida & Restaurantes',
      slug: 'restaurantes',
      icon: '🍔',
      iconType: 'EMOJI',
      row: 1,
      position: 1,
      displaySize: 'LARGE',
      navigationType: 'CATEGORY_LANDING',
      merchantCategoryBinding: 'restaurantes',
      badgeText: 'Top',
    ),
    HomeServiceCategoryEntity(
      id: 'cat_envios_xy',
      name: 'Envíos Express X→Y',
      slug: 'envios',
      icon: '🛵',
      iconType: 'EMOJI',
      row: 1,
      position: 2,
      displaySize: 'LARGE',
      navigationType: 'X_TO_Y',
      merchantCategoryBinding: 'envios',
      badgeText: 'Flash',
    ),
    HomeServiceCategoryEntity(
      id: 'cat_farmacia',
      name: 'Farmacia & Salud',
      slug: 'farmacia',
      icon: '💊',
      iconType: 'EMOJI',
      row: 1,
      position: 3,
      displaySize: 'LARGE',
      navigationType: 'CATEGORY_LANDING',
      merchantCategoryBinding: 'farmacias',
    ),
    HomeServiceCategoryEntity(
      id: 'cat_fritangas',
      name: 'Fritangas',
      slug: 'fritangas',
      icon: '🥩',
      iconType: 'EMOJI',
      row: 2,
      position: 1,
      displaySize: 'COMPACT',
      navigationType: 'CATEGORY_LANDING',
      merchantCategoryBinding: 'fritangas',
    ),
    HomeServiceCategoryEntity(
      id: 'cat_supermercado',
      name: 'Supermercado',
      slug: 'supermercado',
      icon: '🛒',
      iconType: 'EMOJI',
      row: 2,
      position: 2,
      displaySize: 'COMPACT',
      navigationType: 'CATEGORY_LANDING',
      merchantCategoryBinding: 'supermercado',
    ),
    HomeServiceCategoryEntity(
      id: 'cat_tiendas',
      name: 'Tiendas & Variedades',
      slug: 'tiendas',
      icon: '🏪',
      iconType: 'EMOJI',
      row: 2,
      position: 3,
      displaySize: 'COMPACT',
      navigationType: 'CATEGORY_LANDING',
      merchantCategoryBinding: 'tiendas',
    ),
    HomeServiceCategoryEntity(
      id: 'cat_transporte',
      name: 'Transporte',
      slug: 'transporte',
      icon: '🚗',
      iconType: 'EMOJI',
      row: 2,
      position: 4,
      displaySize: 'COMPACT',
      navigationType: 'COMING_SOON',
      comingSoonMessage: 'El servicio de transporte de pasajeros estará disponible próximamente.',
      badgeText: 'Pronto',
    ),
  ];

  @override
  State<ServiceExplorerSection> createState() => _ServiceExplorerSectionState();
}

class _ServiceExplorerSectionState extends State<ServiceExplorerSection> {
  void _showComingSoonDialog(HomeServiceCategoryEntity cat) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: BSColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Text(cat.effectiveEmoji, style: const TextStyle(fontSize: 24)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                cat.effectiveDisplayTitle,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ],
        ),
        content: Text(
          cat.comingSoonMessage.isNotEmpty
              ? cat.comingSoonMessage
              : 'Este servicio estará disponible muy pronto en tu zona.',
          style: const TextStyle(fontSize: 13, color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Entendido', style: TextStyle(color: BSColors.primaryLight, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.showServiceExplorer) return const SizedBox.shrink();

    final effectiveList = widget.serviceCategories.isNotEmpty
        ? widget.serviceCategories.where((c) => c.isActive).toList()
        : ServiceExplorerSection.defaultCanonicalServices;

    final row1Items = effectiveList.where((c) => c.row == 1).toList()
      ..sort((a, b) => a.position.compareTo(b.position));
    final row2Items = effectiveList.where((c) => c.row == 2).toList()
      ..sort((a, b) => a.position.compareTo(b.position));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Encabezado
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Icon(Icons.shopping_bag, color: Colors.white, size: 19),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  widget.title.isNotEmpty ? widget.title : 'Explora servicios',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                    letterSpacing: -0.3,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDBEAFE),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'Servicios',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF1D4ED8),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            widget.subtitle.isNotEmpty
                                ? widget.subtitle
                                : 'Todo lo que necesitas, en un solo lugar',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.white.withValues(alpha: 0.7),
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: widget.onViewAllClick,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                ),
                child: const Text(
                  'Ver todos ›',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: BSColors.primaryLight),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 8),

        // Fila 1: 3 Columnas LARGE
        if (row1Items.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: row1Items.map((cat) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: _buildCategoryCard(
                      cat: cat,
                      isLarge: true,
                      onTap: () {
                        if (cat.navigationType.toUpperCase() == 'COMING_SOON') {
                          _showComingSoonDialog(cat);
                        } else {
                          widget.onCategoryClick(cat);
                        }
                      },
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

        const SizedBox(height: 8),

        // Fila 2: 4 Columnas COMPACT
        if (row2Items.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: row2Items.map((cat) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: _buildCategoryCard(
                      cat: cat,
                      isLarge: false,
                      onTap: () {
                        if (cat.navigationType.toUpperCase() == 'COMING_SOON') {
                          _showComingSoonDialog(cat);
                        } else {
                          widget.onCategoryClick(cat);
                        }
                      },
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildCategoryCard({
    required HomeServiceCategoryEntity cat,
    required bool isLarge,
    required VoidCallback onTap,
  }) {
    final hasImg = cat.effectiveImageUrl.isNotEmpty;
    final emoji = cat.effectiveEmoji;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: isLarge ? 88 : 74,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: BSColors.surfaceDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: BSColors.surfaceContainerDark),
        ),
        child: Stack(
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (hasImg)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      cat.effectiveImageUrl,
                      width: isLarge ? 32 : 24,
                      height: isLarge ? 32 : 24,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Text(
                        emoji,
                        style: TextStyle(fontSize: isLarge ? 24 : 18),
                      ),
                    ),
                  )
                else
                  Text(
                    emoji,
                    style: TextStyle(fontSize: isLarge ? 24 : 18),
                  ),
                const SizedBox(height: 4),
                Text(
                  cat.effectiveDisplayTitle,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: isLarge ? 11 : 9.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    height: 1.1,
                  ),
                ),
              ],
            ),
            if (cat.badgeText.isNotEmpty)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: BSColors.cartFabAccent,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    cat.badgeText,
                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
