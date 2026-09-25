/// BLUE SYSTEM DELIVERY ENTERPRISE — MERCHANT DETAIL SCREEN (1:1 ANDROID PARITY)
/// Reconstructs ComercioDetalleScreen.kt from Android reference.
/// Real-time banner, floating commerce card, branches selector, Delivery/Pickup toggle,
/// category tabs, and real products streamed from SSOT.

import 'package:flutter/material.dart';

import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../theme/brand_theme_builder.dart';

class MerchantDetailScreen extends StatefulWidget {
  final String businessId;
  final String? initialProductId;
  final IMerchantService merchantService;
  final Function(ProductEntity product, String businessName) onAddToCart;
  final VoidCallback onBack;

  const MerchantDetailScreen({
    super.key,
    required this.businessId,
    this.initialProductId,
    required this.merchantService,
    required this.onAddToCart,
    required this.onBack,
  });

  @override
  State<MerchantDetailScreen> createState() => _MerchantDetailScreenState();
}

class _MerchantDetailScreenState extends State<MerchantDetailScreen> {
  String _selectedCategory = 'TODOS';
  String _activeQuickTab = 'MENU'; // MENU, DISCOUNTS, TOP_SELLING
  String _deliveryMode = 'DELIVERY'; // DELIVERY, PICKUP
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  BranchEntity? _selectedBranch;
  bool _isFavorite = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<BusinessEntity?>(
      stream: widget.merchantService.watchBusiness(widget.businessId),
      builder: (context, bizSnapshot) {
        final business = bizSnapshot.data;

        return StreamBuilder<List<BranchEntity>>(
          stream: widget.merchantService.watchBranches(widget.businessId, tenantId: 'ten_bluesystem_core'),
          builder: (context, branchSnapshot) {
            final branches = branchSnapshot.data ?? [];
            if (_selectedBranch == null && branches.isNotEmpty) {
              _selectedBranch = branches.first;
            }

            return StreamBuilder<List<ProductEntity>>(
              stream: widget.merchantService.watchProducts(widget.businessId, tenantId: 'ten_bluesystem_core'),
              builder: (context, prodSnapshot) {
                final allProducts = prodSnapshot.data ?? [];

                // Filter products
                final filtered = allProducts.where((p) {
                  // Branch match
                  if (_selectedBranch != null && p.branchId.isNotEmpty && p.branchId != _selectedBranch!.branchId) {
                    return false;
                  }
                  // Category match
                  if (_selectedCategory != 'TODOS') {
                    final catName = p.subCategoryName.isNotEmpty ? p.subCategoryName : p.categoryName;
                    if (!catName.toUpperCase().contains(_selectedCategory.toUpperCase()) &&
                        !p.category.toUpperCase().contains(_selectedCategory.toUpperCase())) {
                      return false;
                    }
                  }
                  // Search query
                  if (_searchQuery.isNotEmpty) {
                    final q = _searchQuery.toLowerCase();
                    if (!p.name.toLowerCase().contains(q) && !p.description.toLowerCase().contains(q)) {
                      return false;
                    }
                  }
                  // Quick tabs
                  if (_activeQuickTab == 'DISCOUNTS' && !p.hasDiscount) return false;
                  if (_activeQuickTab == 'TOP_SELLING' && !p.isTopSeller && !p.isPopular) return false;

                  return true;
                }).toList();

                // Extract unique categories
                final categorySet = <String>{'TODOS'};
                for (final p in allProducts) {
                  final c = p.subCategoryName.isNotEmpty ? p.subCategoryName : (p.categoryName.isNotEmpty ? p.categoryName : p.category);
                  if (c.isNotEmpty) categorySet.add(c.toUpperCase());
                }
                final categoriesList = categorySet.toList();

                // Group products by category
                final grouped = <String, List<ProductEntity>>{};
                for (final p in filtered) {
                  final catTitle = p.subCategoryName.isNotEmpty ? p.subCategoryName : (p.categoryName.isNotEmpty ? p.categoryName : p.category);
                  grouped.putIfAbsent(catTitle, () => []).add(p);
                }

                return Scaffold(
                  backgroundColor: BrandColors.bgLightApp,
                  body: CustomScrollView(
                    slivers: [
                      // 1. Full-width Banner & Top Bar
                      _buildSliverBanner(business),

                      // 2. Floating Info Card (overhang)
                      SliverToBoxAdapter(
                        child: Transform.translate(
                          offset: const Offset(0, -28),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0),
                            child: _buildBusinessInfoCard(business, branches),
                          ),
                        ),
                      ),

                      // 3. Search inside store
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: _buildSearchBox(business?.name ?? 'el comercio'),
                        ),
                      ),

                      // 4. Quick Filter Tabs [🍽 Menú, 🏷 Descuentos, 🔥 Más vendidos]
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          child: _buildQuickFilterChips(),
                        ),
                      ),

                      // 5. Category Horizontal Pills
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12.0),
                          child: _buildCategoryTabs(categoriesList),
                        ),
                      ),

                      // 6. Grouped Products List
                      if (grouped.isEmpty)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(32.0),
                            child: Center(
                              child: Column(
                                children: [
                                  Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  Text(
                                    allProducts.isEmpty
                                        ? 'No hay productos disponibles en este momento.'
                                        : 'No se encontraron productos con estos filtros.',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      else
                        ...grouped.entries.expand((entry) => [
                              SliverToBoxAdapter(
                                child: Padding(
                                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                                  child: Row(
                                    children: [
                                      const Text('🏷 ', style: TextStyle(fontSize: 16)),
                                      Text(
                                        entry.key.toUpperCase(),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 15,
                                          color: BrandColors.textPrimaryLight,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              SliverPadding(
                                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                                sliver: SliverList(
                                  delegate: SliverChildBuilderDelegate(
                                    (context, index) {
                                      final product = entry.value[index];
                                      return _buildProductCard(product, business?.name ?? '');
                                    },
                                    childCount: entry.value.length,
                                  ),
                                ),
                              ),
                            ]),

                      const SliverToBoxAdapter(child: SizedBox(height: 60)),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  // ─── 1. SLIVER BANNER ───────────────────────────────────────────────────────
  Widget _buildSliverBanner(BusinessEntity? business) {
    final bannerUrl = business?.bannerUrl ?? '';

    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      backgroundColor: BrandColors.bluePrimary,
      leading: Padding(
        padding: const EdgeInsets.all(8.0),
        child: CircleAvatar(
          backgroundColor: Colors.white,
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: BrandColors.textPrimaryLight, size: 20),
            onPressed: widget.onBack,
          ),
        ),
      ),
      actions: [
        CircleAvatar(
          backgroundColor: Colors.white,
          child: IconButton(
            icon: const Icon(Icons.share_outlined, color: BrandColors.textPrimaryLight, size: 20),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Compartir ${business?.name ?? "comercio"}')),
              );
            },
          ),
        ),
        const SizedBox(width: 8),
        CircleAvatar(
          backgroundColor: Colors.white,
          child: IconButton(
            icon: Icon(
              _isFavorite ? Icons.favorite : Icons.favorite_border,
              color: _isFavorite ? BrandColors.fabAccent : BrandColors.textPrimaryLight,
              size: 20,
            ),
            onPressed: () {
              setState(() => _isFavorite = !_isFavorite);
            },
          ),
        ),
        const SizedBox(width: 14),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (bannerUrl.isNotEmpty)
              Image.network(
                bannerUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _buildFallbackBanner(),
              )
            else
              _buildFallbackBanner(),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.black.withOpacity(0.55),
                    Colors.transparent,
                    Colors.black.withOpacity(0.65),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackBanner() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [BrandColors.bluePrimary, BrandColors.blueSecondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
    );
  }

  // ─── 2. FLOATING COMMERCE INFO CARD ─────────────────────────────────────────
  Widget _buildBusinessInfoCard(BusinessEntity? business, List<BranchEntity> branches) {
    final name = business?.name ?? 'Cargando comercio...';
    final logoUrl = business?.logoUrl ?? '';
    final rating = business?.rating ?? 4.8;
    final ratingCount = business?.ratingCount ?? 18;
    final address = _selectedBranch?.address ?? business?.address ?? 'Managua, Nicaragua';
    final city = _selectedBranch?.name ?? business?.city ?? 'Managua';
    final isOpen = business?.isOpen ?? true;
    final deliveryFee = business?.deliveryFee ?? 45.0;
    final deliveryTime = business?.deliveryTime ?? '20-35 min';
    final description = business?.description ?? '';

    return Card(
      elevation: 6,
      shadowColor: Colors.black.withOpacity(0.12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Square Logo
                Container(
                  width: 74,
                  height: 74,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: BrandColors.bluePrimary.withOpacity(0.3), width: 2),
                    image: logoUrl.isNotEmpty
                        ? DecorationImage(image: NetworkImage(logoUrl), fit: BoxFit.cover)
                        : null,
                  ),
                  child: logoUrl.isEmpty
                      ? const Icon(Icons.storefront_rounded, color: BrandColors.bluePrimary, size: 36)
                      : null,
                ),
                const SizedBox(width: 14),

                // Name & Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 18,
                                color: BrandColors.textPrimaryLight,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (business?.isVerified ?? true)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: BrandColors.bluePrimary.withOpacity(0.3)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.verified, size: 13, color: BrandColors.bluePrimary),
                                  SizedBox(width: 3),
                                  Text(
                                    'Verificado',
                                    style: TextStyle(
                                      color: BrandColors.bluePrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Rating & Reviews
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                          const SizedBox(width: 3),
                          Text(
                            '$rating ($ratingCount)',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Opiniones verificadas de clientes')),
                              );
                            },
                            child: const Text(
                              'Leer opiniones',
                              style: TextStyle(
                                color: BrandColors.bluePrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Address
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: BrandColors.bluePrimary),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              address,
                              style: const TextStyle(fontSize: 11, color: BrandColors.textSecondaryLight),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.place, size: 13, color: Colors.grey),
                          const SizedBox(width: 3),
                          Text(
                            city,
                            style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Open/Closed Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isOpen ? BrandColors.statusSuccessContainer : BrandColors.statusErrorContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isOpen ? BrandColors.statusSuccess : BrandColors.statusError,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              isOpen ? 'ABIERTO' : 'CERRADO',
                              style: TextStyle(
                                color: isOpen ? const Color(0xFF166534) : const Color(0xFF991B1B),
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Branch selector dropdown if multiple branches
            if (branches.isNotEmpty) ...[
              const SizedBox(height: 12),
              InkWell(
                onTap: branches.length > 1
                    ? () {
                        _showBranchSelector(context, branches);
                      }
                    : null,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.store_rounded, size: 16, color: BrandColors.bluePrimary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Sucursal: ${_selectedBranch?.name ?? "Principal"}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E3A8A),
                          ),
                        ),
                      ),
                      if (branches.length > 1) ...[
                        const Text(
                          'Cambiar',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: BrandColors.bluePrimary),
                        ),
                        const Icon(Icons.arrow_drop_down, size: 18, color: BrandColors.bluePrimary),
                      ],
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 12),

            // Delivery vs Pickup toggle
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildModeToggleButton(
                      title: 'Delivery',
                      isSelected: _deliveryMode == 'DELIVERY',
                      onTap: () => setState(() => _deliveryMode = 'DELIVERY'),
                    ),
                  ),
                  Expanded(
                    child: _buildModeToggleButton(
                      title: 'Retiro en el local',
                      isSelected: _deliveryMode == 'PICKUP',
                      onTap: () => setState(() => _deliveryMode = 'PICKUP'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Delivery Details
            Row(
              children: [
                const Icon(Icons.access_time_rounded, size: 16, color: BrandColors.textPrimaryLight),
                const SizedBox(width: 6),
                Text('Recibís en $deliveryTime', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.two_wheeler_rounded, size: 16, color: BrandColors.textPrimaryLight),
                const SizedBox(width: 6),
                Text('Envío C\$ ${deliveryFee.toInt()}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded, size: 16, color: BrandColors.bluePrimary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Descripción del Negocio',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: BrandColors.bluePrimary),
                        ),
                        Text(
                          description,
                          style: const TextStyle(fontSize: 11, color: BrandColors.textSecondaryLight),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildModeToggleButton({
    required String title,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? BrandColors.bluePrimary : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Center(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : BrandColors.textSecondaryLight,
            ),
          ),
        ),
      ),
    );
  }

  // ─── 3. SEARCH BOX ──────────────────────────────────────────────────────────
  Widget _buildSearchBox(String storeName) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: BrandColors.outlineVariantLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (v) => setState(() => _searchQuery = v.trim()),
        decoration: InputDecoration(
          icon: const Icon(Icons.search_rounded, color: BrandColors.textSecondaryLight),
          hintText: 'Buscar en $storeName...',
          hintStyle: const TextStyle(fontSize: 13, color: BrandColors.textSecondaryLight),
          border: InputBorder.none,
        ),
      ),
    );
  }

  // ─── 4. QUICK FILTER CHIPS ──────────────────────────────────────────────────
  Widget _buildQuickFilterChips() {
    final chips = [
      {'id': 'MENU', 'label': '🍽 Menú'},
      {'id': 'DISCOUNTS', 'label': '🏷 Descuentos'},
      {'id': 'TOP_SELLING', 'label': '🔥 Más vendidos'},
    ];

    return Row(
      children: chips.map((c) {
        final isSelected = _activeQuickTab == c['id'];
        return Padding(
          padding: const EdgeInsets.only(right: 8.0),
          child: ChoiceChip(
            label: Text(c['label']!),
            selected: isSelected,
            selectedColor: BrandColors.bluePrimary,
            labelStyle: TextStyle(
              color: isSelected ? Colors.white : BrandColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
            onSelected: (_) => setState(() => _activeQuickTab = c['id']!),
          ),
        );
      }).toList(),
    );
  }

  // ─── 5. CATEGORY TABS ───────────────────────────────────────────────────────
  Widget _buildCategoryTabs(List<String> categories) {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = _selectedCategory == cat;
          return InkWell(
            onTap: () => setState(() => _selectedCategory = cat),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? BrandColors.blueDarkPrimaryContainer : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? BrandColors.blueDarkPrimaryContainer : BrandColors.outlineVariantLight,
                ),
              ),
              child: Center(
                child: Text(
                  cat,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: isSelected ? Colors.white : BrandColors.textSecondaryLight,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── 6. REAL PRODUCT CARD ───────────────────────────────────────────────────
  Widget _buildProductCard(ProductEntity product, String businessName) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image with optional discount badge
            Stack(
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                    image: product.imageUrl != null && product.imageUrl!.isNotEmpty
                        ? DecorationImage(
                            image: NetworkImage(product.imageUrl!),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: product.imageUrl == null || product.imageUrl!.isEmpty
                      ? const Icon(Icons.fastfood_rounded, color: Colors.grey, size: 36)
                      : null,
                ),
                if (product.hasDiscount)
                  Positioned(
                    top: 4,
                    left: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      decoration: BoxDecoration(
                        color: BrandColors.fabAccent,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '-${product.discountPercentage > 0 ? product.discountPercentage : 20}%',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),

            // Product Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: BrandColors.textPrimaryLight),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.description,
                    style: const TextStyle(fontSize: 11, color: BrandColors.textSecondaryLight),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            'C\$ ${product.price.toInt()}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              color: BrandColors.bluePrimary,
                            ),
                          ),
                          if (product.originalPrice != null && product.originalPrice! > product.price) ...[
                            const SizedBox(width: 6),
                            Text(
                              'C\$ ${product.originalPrice!.toInt()}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: BrandColors.textSecondaryLight,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ],
                      ),
                      IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: BrandColors.bluePrimary,
                          padding: const EdgeInsets.all(6),
                          minimumSize: const Size(32, 32),
                        ),
                        icon: const Icon(Icons.add, size: 18, color: Colors.white),
                        onPressed: () {
                          widget.onAddToCart(product, businessName);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('¡${product.name} agregado al carrito! 🛒'),
                              duration: const Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showBranchSelector(BuildContext context, List<BranchEntity> branches) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Seleccionar Sucursal',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),
            ...branches.map((b) => ListTile(
                  leading: const Icon(Icons.storefront_rounded, color: BrandColors.bluePrimary),
                  title: Text(b.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(b.address, style: const TextStyle(fontSize: 11)),
                  trailing: _selectedBranch?.branchId == b.branchId
                      ? const Icon(Icons.check_circle, color: BrandColors.bluePrimary)
                      : null,
                  onTap: () {
                    setState(() => _selectedBranch = b);
                    Navigator.pop(ctx);
                  },
                )),
          ],
        ),
      ),
    );
  }
}
