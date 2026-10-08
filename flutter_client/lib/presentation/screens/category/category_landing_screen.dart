/// BLUE SYSTEM DELIVERY ENTERPRISE — CATEGORY LANDING SCREEN
/// 1:1 Parity with Android CategoryLandingScreen.kt (ADR-036).
/// Renderiza los comercios y productos de una categoría de servicio con Hero Banner, filtros y búsqueda.

import 'package:flutter/material.dart';
import '../../../core/design_system/bsds_theme.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../merchant/merchant_detail_screen.dart';

class CategoryLandingScreen extends StatefulWidget {
  final String categoryId;
  final String categoryName;
  final String? categorySlug;
  final HomeServiceCategoryEntity? serviceCategory;
  final IMerchantService merchantService;
  final Function(ProductEntity product, String businessName)? onAddToCart;
  final VoidCallback onBack;

  const CategoryLandingScreen({
    super.key,
    required this.categoryId,
    this.categoryName = '',
    this.categorySlug,
    this.serviceCategory,
    required this.merchantService,
    this.onAddToCart,
    required this.onBack,
  });

  @override
  State<CategoryLandingScreen> createState() => _CategoryLandingScreenState();
}

class _CategoryLandingScreenState extends State<CategoryLandingScreen> {
  List<BusinessEntity> _businesses = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCategoryData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategoryData() async {
    setState(() => _isLoading = true);
    try {
      final allBiz = await widget.merchantService.getActiveBusinesses();
      final targetSlug = (widget.serviceCategory?.merchantCategoryBinding.isNotEmpty ?? false)
          ? widget.serviceCategory!.merchantCategoryBinding.toLowerCase()
          : (widget.categorySlug ?? widget.categoryId).toLowerCase();
      final targetName = widget.categoryName.toLowerCase();

      final filtered = allBiz.where((b) {
        final bCat = b.category.toLowerCase();
        return bCat.contains(targetSlug) || (targetName.isNotEmpty && bCat.contains(targetName));
      }).toList();

      if (mounted) {
        setState(() {
          _businesses = filtered;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _openMerchant(BusinessEntity b) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MerchantDetailScreen(
          businessId: b.businessId,
          merchantService: widget.merchantService,
          onAddToCart: (p, biz) => widget.onAddToCart?.call(p, biz),
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.serviceCategory?.effectiveDisplayTitle ??
        (widget.categoryName.isNotEmpty ? widget.categoryName : 'Categoría');
    final emoji = widget.serviceCategory?.effectiveEmoji ?? '📁';

    final displayedBusinesses = _searchQuery.isEmpty
        ? _businesses
        : _businesses
            .where((b) =>
                b.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                b.description.toLowerCase().contains(_searchQuery.toLowerCase()))
            .toList();

    return Scaffold(
      backgroundColor: BSColors.bgDark,
      appBar: AppBar(
        backgroundColor: BSColors.surfaceDark,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: widget.onBack,
        ),
        title: Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Buscador
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar en $title...',
                prefixIcon: const Icon(Icons.search, color: Colors.white70),
                filled: true,
                fillColor: BSColors.surfaceDark,
                isDense: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: BSColors.surfaceContainerDark),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: BSColors.surfaceContainerDark),
                ),
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val);
              },
            ),
          ),

          // Lista de Comercios
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: BSColors.primaryLight))
                : displayedBusinesses.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(emoji, style: const TextStyle(fontSize: 48)),
                            const SizedBox(height: 12),
                            Text(
                              'No se encontraron comercios en $title',
                              style: const TextStyle(fontSize: 14, color: Colors.white70),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: displayedBusinesses.length,
                        itemBuilder: (context, idx) {
                          final b = displayedBusinesses[idx];
                          return Card(
                            color: BSColors.surfaceDark,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: BSColors.surfaceContainerDark),
                            ),
                            child: ListTile(
                              leading: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: b.logoUrl != null && b.logoUrl!.isNotEmpty
                                    ? Image.network(
                                        b.logoUrl!,
                                        width: 48,
                                        height: 48,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => Container(
                                          width: 48,
                                          height: 48,
                                          color: BSColors.surfaceContainerDark,
                                          child: const Icon(Icons.store, color: Colors.white70),
                                        ),
                                      )
                                    : Container(
                                        width: 48,
                                        height: 48,
                                        color: BSColors.surfaceContainerDark,
                                        child: const Icon(Icons.store, color: Colors.white70),
                                      ),
                              ),
                              title: Text(
                                b.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              subtitle: Text(
                                '${b.deliveryTime} • C\$${b.deliveryFee.toStringAsFixed(0)} envío',
                                style: const TextStyle(fontSize: 12, color: Colors.white70),
                              ),
                              trailing: const Icon(Icons.chevron_right, color: Colors.white70),
                              onTap: () => _openMerchant(b),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
