/// BLUE SYSTEM DELIVERY ENTERPRISE — ALL SERVICES SCREEN
/// 1:1 Parity with Android AllServicesScreen.kt (ADR-036 / BSD-CUSTOMER-HOME-CATEGORY-BLOCKS-ROOT-CAUSE-001).
/// Dual tab navigation: "Comercios y Servicios" vs "Comida y Antojos".

import 'package:flutter/material.dart';
import '../../../core/design_system/bsds_theme.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/entities/home_service_category_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../home/widgets/service_explorer_section.dart';
import 'category_landing_screen.dart';

class AllServicesScreen extends StatefulWidget {
  final int initialTab;
  final List<HomeServiceCategoryEntity> serviceCategories;
  final IMerchantService merchantService;
  final Function(ProductEntity product, String businessName)? onAddToCart;
  final VoidCallback onBack;

  const AllServicesScreen({
    super.key,
    this.initialTab = 0,
    this.serviceCategories = const [],
    required this.merchantService,
    this.onAddToCart,
    required this.onBack,
  });

  @override
  State<AllServicesScreen> createState() => _AllServicesScreenState();
}

class _AllServicesScreenState extends State<AllServicesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const List<HomeServiceCategoryEntity> _canonicalFoodCategories = [
    HomeServiceCategoryEntity(
      id: 'cat_fritanga',
      name: 'Fritanga NICA',
      slug: 'fritanga',
      icon: '🥩',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 1,
      position: 1,
    ),
    HomeServiceCategoryEntity(
      id: 'cat_hamburguesas',
      name: 'Hamburguesas & Sandwiches',
      slug: 'hamburguesas',
      icon: '🍔',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 1,
      position: 2,
    ),
    HomeServiceCategoryEntity(
      id: 'cat_pizza',
      name: 'Pizzas & Pastas',
      slug: 'pizzas',
      icon: '🍕',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 1,
      position: 3,
    ),
    HomeServiceCategoryEntity(
      id: 'cat_china',
      name: 'Comida China & Asiática',
      slug: 'comida-china',
      icon: '🥡',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 1,
      position: 4,
    ),
    HomeServiceCategoryEntity(
      id: 'cat_postres',
      name: 'Postres & Repostería',
      slug: 'postres',
      icon: '🍰',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 2,
      position: 1,
    ),
    HomeServiceCategoryEntity(
      id: 'cat_bebidas',
      name: 'Bebidas & Batidos',
      slug: 'bebidas',
      icon: '🥤',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 2,
      position: 2,
    ),
    HomeServiceCategoryEntity(
      id: 'cat_ensaladas',
      name: 'Ensaladas & Saludable',
      slug: 'ensaladas',
      icon: '🥗',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 2,
      position: 3,
    ),
    HomeServiceCategoryEntity(
      id: 'cat_antojitos',
      name: 'Antojos & Snacks',
      slug: 'antojitos',
      icon: '🌮',
      navigationType: 'CATEGORY_LANDING',
      isActive: true,
      row: 2,
      position: 4,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTab.clamp(0, 1),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  bool _isFoodSlug(String slug) {
    final s = slug.toLowerCase();
    return s.contains('comida') ||
        s.contains('fritanga') ||
        s.contains('ensalada') ||
        s.contains('postre') ||
        s.contains('carne') ||
        s.contains('antojo') ||
        s.contains('pizza') ||
        s.contains('hamburguesa') ||
        s.contains('snack') ||
        s.contains('bebida');
  }

  void _openCategory(HomeServiceCategoryEntity cat) {
    if (cat.navigationType.toUpperCase() == 'COMING_SOON') {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: BSColors.surfaceDark,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(cat.effectiveDisplayTitle, style: const TextStyle(color: Colors.white)),
          content: Text(
            cat.comingSoonMessage.isNotEmpty
                ? cat.comingSoonMessage
                : 'Este servicio estará disponible muy pronto.',
            style: const TextStyle(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Entendido', style: TextStyle(color: BSColors.primaryLight)),
            ),
          ],
        ),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CategoryLandingScreen(
          categoryId: cat.id,
          categoryName: cat.name,
          categorySlug: cat.slug,
          serviceCategory: cat,
          merchantService: widget.merchantService,
          onAddToCart: widget.onAddToCart,
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  Widget _buildCategoryGrid(List<HomeServiceCategoryEntity> items) {
    if (items.isEmpty) {
      return const Center(
        child: Text(
          'No hay categorías disponibles en esta sección.',
          style: TextStyle(color: Colors.white60),
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.9,
      ),
      itemCount: items.length,
      itemBuilder: (context, idx) {
        final cat = items[idx];
        return GestureDetector(
          onTap: () => _openCategory(cat),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: BSColors.surfaceDark,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: BSColors.surfaceContainerDark),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (cat.effectiveImageUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      cat.effectiveImageUrl,
                      width: 38,
                      height: 38,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Text(
                        cat.effectiveEmoji,
                        style: const TextStyle(fontSize: 28),
                      ),
                    ),
                  )
                else
                  Text(cat.effectiveEmoji, style: const TextStyle(fontSize: 28)),
                const SizedBox(height: 8),
                Text(
                  cat.effectiveDisplayTitle,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final allList = widget.serviceCategories.isNotEmpty
        ? widget.serviceCategories
        : ServiceExplorerSection.defaultCanonicalServices;

    final servicesList = allList.where((c) => !_isFoodSlug(c.slug)).toList();
    final foodList = [
      ...allList.where((c) => _isFoodSlug(c.slug)),
      ..._canonicalFoodCategories.where((fc) => !allList.any((c) => c.slug == fc.slug)),
    ];

    return Scaffold(
      backgroundColor: BSColors.bgDark,
      appBar: AppBar(
        backgroundColor: BSColors.surfaceDark,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: widget.onBack,
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Todos los Servicios',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              'Explora todas las opciones en TuaniGo',
              style: TextStyle(fontSize: 11, color: Colors.white60),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: BSColors.primaryLight,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: '🏢 Comercios y Servicios'),
            Tab(text: '🍔 Comida y Antojos'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCategoryGrid(servicesList),
          _buildCategoryGrid(foodList),
        ],
      ),
    );
  }
}
