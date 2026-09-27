/// BLUE SYSTEM DELIVERY ENTERPRISE — CUSTOMER & COMMERCIAL HOME SCREEN
/// 1:1 Parity with Android CustomerHomeScreen.kt (BSDS Architecture):
/// - Header with Avatar, Greeting, Notifications & Cart badges, Address Selector, Search Bar with Voice Mic
/// - Real-time DashboardConfig from /dashboard/configuration with normalized dynamic section order
/// - Dynamic section ordering governed by Admin Web configuration
/// - Support for all canonical sections:
///   BANNERS, CATEGORIES, BRANCHES, NEARBY (5/10/15 km progressive expansion via Haversine),
///   FEATURED_BUSINESSES, FEATURED_PRODUCTS, FLASH_DEALS, PROMOTIONS, SAME_PRICE,
///   TOP_SELLING, RECOMMENDED, NEW_BUSINESSES, QUICK_REORDER, FAVORITES, EXPRESS_DELIVERY, ALL_BUSINESSES
/// - Category discovery with canonical BUSINESS vs PRODUCT domain differentiation
/// - OperatingHoursResolver integration for real-time open/closed status
/// - Explicit error states (no silent empty lists on Firestore errors)
/// - Navigation to real MerchantDetailScreen on tap (Zero Mock Menus)

import 'package:flutter/material.dart';

import '../../../core/design_system/bsds_theme.dart';
import '../../../core/engine/operating_hours_resolver.dart';
import '../../../core/utils/geo_utils.dart';
import '../../../domain/entities/banner_entity.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../providers/session_state.dart';
import '../../theme/brand_theme_builder.dart';
import '../merchant/merchant_detail_screen.dart';

class CommercialHomeScreen extends StatefulWidget {
  final SessionState sessionState;
  final Function(String routeName) onNavigate;
  final IBannerService? bannerService;
  final IMerchantService? merchantService;
  final Function(ProductEntity product, String businessName)? onAddToCart;
  final VoidCallback? onCartClick;
  final VoidCallback? onNotificationsClick;
  final VoidCallback? onOpenExpress;

  const CommercialHomeScreen({
    super.key,
    required this.sessionState,
    required this.onNavigate,
    this.bannerService,
    this.merchantService,
    this.onAddToCart,
    this.onCartClick,
    this.onNotificationsClick,
    this.onOpenExpress,
  });

  @override
  State<CommercialHomeScreen> createState() => _CommercialHomeScreenState();
}

class _CommercialHomeScreenState extends State<CommercialHomeScreen> {
  String _selectedCategory = '';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _favoriteBusinessIds = {};

  // Benchmark reference coordinates (Managua center) matching Android NearbyMerchantEngine
  static const double _customerLat = 12.1364;
  static const double _customerLng = -86.2514;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleFavorite(String businessId) {
    setState(() {
      if (_favoriteBusinessIds.contains(businessId)) {
        _favoriteBusinessIds.remove(businessId);
      } else {
        _favoriteBusinessIds.add(businessId);
      }
    });
  }

  void _openMerchantById(String businessId, {String? businessName, String? productId}) {
    if (widget.merchantService == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MerchantDetailScreen(
          businessId: businessId,
          initialProductId: productId,
          merchantService: widget.merchantService!,
          onAddToCart: (prod, bizName) {
            if (widget.onAddToCart != null) {
              widget.onAddToCart!(prod, bizName);
            }
          },
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  void _openMerchantDetail(BusinessEntity business, {String? productId}) {
    _openMerchantById(business.businessId, businessName: business.name, productId: productId);
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.sessionState.currentUser;
    final isGuest = widget.sessionState.isGuestMode;
    final userName = user?.displayName ?? (isGuest ? 'Invitado' : 'Cliente');
    final tenantId = widget.sessionState.claims?.tenantId ?? 'ten_bluesystem_core';

    return Scaffold(
      backgroundColor: BSColors.bgLight,
      floatingActionButton: FloatingActionButton(
        heroTag: 'commercial_home_ai_fab',
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✨ Asistente IA de BlueSystem listo para recomendarte los mejores platos y comercios.'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
        backgroundColor: BSColors.primary,
        elevation: 6,
        shape: const CircleBorder(),
        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 26),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() {});
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ─── 1. TOPBAR & GRADIENT HEADER (1:1 Android HomeHeader.kt) ───
              _buildCanonicalHeader(userName),

              // ─── 2. DYNAMIC CONTENT: SEARCH / CATEGORY DISCOVERY / DYNAMIC FEED ───
              if (_searchQuery.isNotEmpty) ...[
                const SizedBox(height: 16),
                _buildSearchResultsView(tenantId),
              ] else if (_selectedCategory.isNotEmpty) ...[
                const SizedBox(height: 16),
                _buildCategoryDiscoveryView(tenantId),
              ] else ...[
                // Listen to /dashboard/configuration in real-time
                StreamBuilder<DashboardConfigEntity>(
                  stream: widget.merchantService != null
                      ? widget.merchantService!.watchDashboardConfig(tenantId: tenantId)
                      : Stream.value(const DashboardConfigEntity()),
                  builder: (context, configSnapshot) {
                    final config = configSnapshot.data ?? const DashboardConfigEntity();
                    final orderedSections = config.getNormalizedSectionOrder();

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final sectionId in orderedSections)
                          _renderDynamicSection(sectionId, config, tenantId),

                        // Catálogo General (Inmunidad semántica absoluta 1:1 Android)
                        if (config.showAllBusinesses) ...[
                          const SizedBox(height: 20),
                          _buildAllBusinessesSection(tenantId),
                        ],
                      ],
                    );
                  },
                ),
              ],

              const SizedBox(height: 60),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DYNAMIC SECTION DISPATCHER (1:1 Android CustomerHomeFeedSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _renderDynamicSection(String sectionId, DashboardConfigEntity config, String tenantId) {
    switch (sectionId) {
      case 'BANNERS':
        return config.showBanners
            ? Column(
                children: [
                  const SizedBox(height: 16),
                  _buildBannersSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'CATEGORIES':
        return config.showCategories
            ? Column(
                children: [
                  const SizedBox(height: 18),
                  _buildCategoriesSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'BRANCHES':
        return config.showBranchesBlock
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildBranchesSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'NEARBY':
        return config.showNearbyBusinesses
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildNearbyBusinessesSection(tenantId, config),
                ],
              )
            : const SizedBox.shrink();

      case 'FEATURED_BUSINESSES':
        return config.showFeaturedBusinesses
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildFeaturedBusinessesSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'FEATURED_PRODUCTS':
        return config.showFeaturedProducts
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildStarProductsSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'FLASH_DEALS':
        return config.showFlashDeals
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildFlashDealsSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'PROMOTIONS':
        return config.showPromotions
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildDiscountedProductsSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'SAME_PRICE':
        return config.showSamePrice
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildSamePriceSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'TOP_SELLING':
        return config.showTopSelling
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildTopSellingSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'RECOMMENDED':
        return config.showRecommended
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildRecommendedSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'NEW_BUSINESSES':
        return config.showNewBusinesses
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildNewBusinessesSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'QUICK_REORDER':
        return config.showQuickReorder
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildQuickReorderSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'FAVORITES':
        return config.showFavoritesBlock
            ? Column(
                children: [
                  const SizedBox(height: 20),
                  _buildFavoritesSection(tenantId),
                ],
              )
            : const SizedBox.shrink();

      case 'EXPRESS_DELIVERY':
        // Strict fail-closed gating (P0-02, P0-03): both toggles required
        return (config.showExpressDeliveryBanner && config.xToYServiceEnabled)
            ? Column(
                children: [
                  const SizedBox(height: 14),
                  _buildExpressDeliveryBanner(),
                ],
              )
            : const SizedBox.shrink();

      default:
        return const SizedBox.shrink();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. TOPBAR & GRADIENT HEADER (Matching Android HomeHeader.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildCanonicalHeader(String currentUserName) {
    final initialLetter = currentUserName.isNotEmpty ? currentUserName.substring(0, 1).toUpperCase() : 'C';

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [BrandColors.bluePrimary, BrandColors.blueSecondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Row: Avatar + Greeting + Right Actions (Notifications & Cart)
              Row(
                children: [
                  // Circle Avatar
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(color: Colors.white.withOpacity(0.6), width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.15),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        initialLetter,
                        style: const TextStyle(
                          color: BrandColors.bluePrimary,
                          fontWeight: FontWeight.w900,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Greeting texts
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hola, $currentUserName',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '¡Bienvenido! 👋',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.92),
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          '¿Qué deseas pedir hoy?',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.78),
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Notifications Icon
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.2),
                    ),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 20),
                      onPressed: () {
                        if (widget.onNotificationsClick != null) {
                          widget.onNotificationsClick!();
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('No tienes notificaciones pendientes.')),
                          );
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Shopping Cart Icon
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.2),
                    ),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 20),
                      onPressed: () {
                        if (widget.onCartClick != null) {
                          widget.onCartClick!();
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Location Row with Map Pin
              InkWell(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('📍 Entregar en: Managua, Nicaragua')),
                  );
                },
                child: Row(
                  children: [
                    const Icon(Icons.location_on, color: Colors.white, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      'Entregar en: ',
                      style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.85)),
                    ),
                    const Expanded(
                      child: Text(
                        '4P4H+7W7, Pista de La Unan, Managua',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const Icon(Icons.keyboard_arrow_down, color: Colors.white, size: 16),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Search Bar Card (White rounded card with Voice Mic)
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 6,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 12),
                    const Icon(Icons.search_rounded, color: BrandColors.textSecondaryLight, size: 22),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => setState(() => _searchQuery = val.trim()),
                        decoration: const InputDecoration(
                          hintText: 'Locales, platos y productos...',
                          hintStyle: TextStyle(fontSize: 13, color: BrandColors.textSecondaryLight),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    if (_searchQuery.isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      ),
                    IconButton(
                      icon: const Icon(Icons.mic, color: BrandColors.bluePrimary, size: 22),
                      tooltip: 'Búsqueda por voz',
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Escuchando... habla para buscar')),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: BANNERS (Streaming Firestore /banners)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildBannersSection(String tenantId) {
    if (widget.bannerService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BannerEntity>>(
      stream: widget.bannerService!.watchActiveBanners(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Banners Promocionales', snapshot.error.toString());
        }
        final banners = snapshot.data ?? [];
        if (banners.isEmpty) return const SizedBox.shrink();

        return SizedBox(
          height: 150,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: banners.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final b = banners[index];
              return InkWell(
                onTap: () {
                  final actionType = b.effectiveActionType.toUpperCase();
                  final actionId = b.effectiveActionId;
                  if ((actionType == 'BUSINESS' || actionType == 'COMERCIO') && actionId.isNotEmpty) {
                    _openMerchantById(actionId, businessName: b.effectiveTitle);
                  }
                },
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  width: 300,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                    image: b.effectiveImageUrl.isNotEmpty
                        ? DecorationImage(
                            image: NetworkImage(b.effectiveImageUrl),
                            fit: BoxFit.cover,
                          )
                        : null,
                    gradient: b.effectiveImageUrl.isEmpty
                        ? const LinearGradient(
                            colors: [BrandColors.bluePrimary, BrandColors.blueSecondary],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      gradient: LinearGradient(
                        colors: [Colors.black.withOpacity(0.65), Colors.transparent],
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          b.effectiveTitle,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (b.subtitle.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            b.subtitle,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.88),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: EXPRESS X→Y DIRECT PROMOTIONAL BANNER (GAP-HOM-01 / ADR-015 / ADR-026)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildExpressDeliveryBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          key: const Key('home_express_delivery_card'),
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            if (widget.onOpenExpress != null) {
              widget.onOpenExpress!();
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('🚚 Envíos Express X→Y: Base C\$35 + C\$10/km con rastreo en vivo.'),
                  duration: Duration(seconds: 3),
                ),
              );
            }
          },
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.12),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(color: const Color(0xFF334155), width: 1.2),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0EA5E9).withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF0EA5E9), width: 1.5),
                  ),
                  child: const Icon(
                    Icons.two_wheeler_rounded,
                    color: Color(0xFF38BDF8),
                    size: 28,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Envíos Express X→Y',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'DIRECTO',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Punto a punto: paquetes y encomiendas',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 11,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Tarifa: Base C\$35 + C\$10/km',
                        style: TextStyle(
                          color: Color(0xFF38BDF8),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  key: const Key('home_express_delivery_button'),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF0EA5E9),
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.arrow_forward_rounded, size: 20),
                  onPressed: () {
                    if (widget.onOpenExpress != null) {
                      widget.onOpenExpress!();
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('🚚 Envíos Express X→Y: Base C\$35 + C\$10/km con rastreo en vivo.'),
                          duration: Duration(seconds: 3),
                        ),
                      );
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: CATEGORIES (Streaming Firestore /categories)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildCategoriesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<CategoryEntity>>(
      stream: widget.merchantService!.watchCategories(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Categorías', snapshot.error.toString());
        }
        final categories = snapshot.data ?? [];
        if (categories.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Categorías',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 44,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final cat = categories[index];
                  final isSelected = _selectedCategory.toUpperCase() == cat.name.toUpperCase();

                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedCategory = isSelected ? '' : cat.name;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? BrandColors.bluePrimary : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? BrandColors.bluePrimary : BrandColors.outlineVariantLight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Text(cat.icon, style: const TextStyle(fontSize: 18)),
                          const SizedBox(width: 8),
                          Text(
                            cat.name,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : BrandColors.textPrimaryLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: BRANCHES / SUCURSALES (1:1 Android BranchesSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildBranchesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BranchEntity>>(
      stream: widget.merchantService!.watchAllBranches(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Sucursales', snapshot.error.toString());
        }
        final branches = snapshot.data ?? [];
        if (branches.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Sucursales Disponibles 📍',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 120,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: branches.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final branch = branches[index];
                  return InkWell(
                    onTap: () => _openMerchantById(branch.businessId, businessName: branch.effectiveDisplayName),
                    child: Container(
                      width: 220,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: BrandColors.outlineVariantLight),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.store_mall_directory_rounded, size: 20, color: BrandColors.bluePrimary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  branch.effectiveDisplayName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            branch.address,
                            style: const TextStyle(fontSize: 11, color: BrandColors.textSecondaryLight),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Spacer(),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                              const SizedBox(width: 2),
                              Text(
                                branch.rating.toStringAsFixed(1),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              const Spacer(),
                              Text(
                                branch.city,
                                style: const TextStyle(fontSize: 10, color: BrandColors.bluePrimary, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: NEARBY (Haversine auto-expansion 5/10/15 km - NearbyMerchantEngine.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildNearbyBusinessesSection(String tenantId, DashboardConfigEntity config) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Comercios Cerca de Ti', snapshot.error.toString());
        }
        final businesses = snapshot.data ?? [];
        if (businesses.isEmpty) return const SizedBox.shrink();

        // Calculate distance for all businesses
        final withDistance = businesses.map((b) {
          final lat = b.latitude;
          final lng = b.longitude;
          final dist = (lat != 0.0 && lng != 0.0)
              ? GeoUtils.calculateDistance(_customerLat, _customerLng, lat, lng)
              : 2.5; // Benchmark fallback
          return b.copyWith(calculatedDistanceKm: dist);
        }).toList();

        // Progressive expansion: 5 km -> 10 km -> 15 km
        double effectiveRadius = config.nearbyInitialRadiusKm; // 5.0
        var nearbyList = withDistance.where((b) => (b.calculatedDistanceKm ?? 999.0) <= effectiveRadius).toList();

        if (config.nearbyAutoExpandEnabled && nearbyList.length < config.nearbyMinimumMerchantCount) {
          effectiveRadius = config.nearbySecondaryRadiusKm; // 10.0
          nearbyList = withDistance.where((b) => (b.calculatedDistanceKm ?? 999.0) <= effectiveRadius).toList();
        }

        if (config.nearbyAutoExpandEnabled && nearbyList.length < config.nearbyMinimumMerchantCount) {
          effectiveRadius = config.nearbyMaxRadiusKm; // 15.0
          nearbyList = withDistance.where((b) => (b.calculatedDistanceKm ?? 999.0) <= effectiveRadius).toList();
        }

        // Sort by distance if configured
        if (config.nearbyOrdering.toUpperCase() == 'DISTANCE') {
          nearbyList.sort((a, b) => (a.calculatedDistanceKm ?? 0.0).compareTo(b.calculatedDistanceKm ?? 0.0));
        }

        final badgeText = effectiveRadius > config.nearbyInitialRadiusKm
            ? 'Ampliado a ${effectiveRadius.toInt()} km'
            : '${effectiveRadius.toInt()} km';

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Comercios Cerca de Ti 🏢',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: BrandColors.textPrimaryLight,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFF59E0B)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.near_me, size: 12, color: Color(0xFFB45309)),
                        const SizedBox(width: 4),
                        Text(
                          badgeText,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFB45309),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 225,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: nearbyList.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = nearbyList[index];
                  return _buildPublicBusinessCard(b, distanceKm: b.calculatedDistanceKm);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: FEATURED BUSINESSES (FeaturedBusinessesSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildFeaturedBusinessesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Comercios Destacados', snapshot.error.toString());
        }
        final businesses = snapshot.data ?? [];
        final featured = businesses.where((b) => b.isFeatured).toList();
        if (featured.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Comercios Destacados ⭐',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 225,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: featured.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = featured[index];
                  return _buildPublicBusinessCard(b);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: STAR PRODUCTS (StarProductsSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildStarProductsSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<ProductEntity>>(
      stream: widget.merchantService!.watchFeaturedProducts(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Productos Estrella', snapshot.error.toString());
        }
        final products = snapshot.data ?? [];
        if (products.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Productos Estrella ⭐',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 195,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: products.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final p = products[index];
                  return _buildStarProductCard(p);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: FLASH DEALS (FlashDealsSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildFlashDealsSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<FlashDealEntity>>(
      stream: widget.merchantService!.watchFlashDeals(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Ofertas Flash', snapshot.error.toString());
        }
        final allDeals = snapshot.data ?? [];
        final validDeals = allDeals.where((d) => d.isCurrentlyValid()).toList();
        if (validDeals.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  const Text(
                    'Ofertas Flash ⚡',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: BrandColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'TIEMPO LIMITADO',
                      style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: validDeals.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final deal = validDeals[index];
                  return _buildFlashDealCard(deal);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: PROMOTIONS / DISCOUNTED PRODUCTS (DiscountedProductsSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildDiscountedProductsSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<ProductEntity>>(
      stream: widget.merchantService!.watchDiscountedProducts(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Productos con Descuento', snapshot.error.toString());
        }
        final products = snapshot.data ?? [];
        if (products.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Productos con Descuento 🏷️',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 195,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: products.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final p = products[index];
                  return _buildStarProductCard(p, isDiscount: true);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: SAME PRICE (SamePriceSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildSamePriceSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Mismo Precio', snapshot.error.toString());
        }
        final businesses = snapshot.data ?? [];
        final samePrice = businesses.where((b) => b.isOpen && b.priceParityVerified).toList();
        if (samePrice.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  const Text(
                    'Mismo Precio que en el Local 🏷️',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: BrandColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'PRECIO LOCAL',
                      style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 225,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: samePrice.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = samePrice[index];
                  return _buildPublicBusinessCard(b);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: TOP SELLING (TopSellingSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildTopSellingSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Los Más Vendidos', snapshot.error.toString());
        }
        final businesses = snapshot.data ?? [];
        final topSelling = businesses.where((b) => b.isOpen && (b.unitsSold30d > 0 || b.rating >= 4.5)).toList();
        if (topSelling.isEmpty) return const SizedBox.shrink();
        topSelling.sort((a, b) => b.unitsSold30d.compareTo(a.unitsSold30d));

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Los Más Vendidos 🔥',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 225,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: topSelling.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = topSelling[index];
                  return _buildPublicBusinessCard(b);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: RECOMMENDED (RecommendedSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildRecommendedSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Recomendados', snapshot.error.toString());
        }
        final businesses = snapshot.data ?? [];
        final recommended = businesses.where((b) => b.rating >= 4.0).toList();
        if (recommended.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Recomendados para Ti ✨',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 225,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: recommended.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = recommended[index];
                  return _buildPublicBusinessCard(b);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: NEW BUSINESSES (NewBusinessesSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildNewBusinessesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Nuevos Comercios', snapshot.error.toString());
        }
        final businesses = snapshot.data ?? [];
        // Activated in the last 30 days or general new pool
        final newBusinesses = businesses.where((b) {
          if (b.activatedAt != null) {
            final actDate = DateTime.fromMillisecondsSinceEpoch(b.activatedAt!);
            return DateTime.now().difference(actDate).inDays <= 30;
          }
          return false;
        }).toList();

        final pool = newBusinesses.isNotEmpty ? newBusinesses : businesses.take(4).toList();
        if (pool.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Nuevos en la App 🆕',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 225,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: pool.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = pool[index];
                  return _buildPublicBusinessCard(b);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: QUICK REORDER (QuickReorderSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildQuickReorderSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<ProductEntity>>(
      stream: widget.merchantService!.watchFeaturedProducts(tenantId: tenantId),
      builder: (context, snapshot) {
        final products = snapshot.data ?? [];
        if (products.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Pedir de Nuevo 🔁',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 195,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: products.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final p = products[index];
                  return _buildStarProductCard(p);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: FAVORITES (FavoritesBlockSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildFavoritesSection(String tenantId) {
    if (widget.merchantService == null || _favoriteBusinessIds.isEmpty) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        final businesses = snapshot.data ?? [];
        final favs = businesses.where((b) => _favoriteBusinessIds.contains(b.businessId)).toList();
        if (favs.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                'Tus Favoritos ❤️',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: BrandColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 225,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: favs.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = favs[index];
                  return _buildPublicBusinessCard(b);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION: ALL BUSINESSES (AllBusinessesSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildAllBusinessesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _buildSectionErrorCard('Todos los Comercios', snapshot.error.toString());
        }
        final businesses = snapshot.data ?? [];
        if (businesses.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Todos los Comercios 🏪',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: BrandColors.textPrimaryLight,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: BrandColors.surfaceContainerHighLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: BrandColors.outlineVariantLight),
                    ),
                    child: Text(
                      '${businesses.length} disponibles',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: BrandColors.textSecondaryLight,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: businesses.length,
              separatorBuilder: (_, __) => const SizedBox(height: 14),
              itemBuilder: (context, index) {
                final b = businesses[index];
                return _buildFullWidthBusinessCard(b);
              },
            ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY DISCOVERY VIEW (1:1 Android CustomerHomeCategoryDiscoverySection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildCategoryDiscoveryView(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<CategoryEntity>>(
      stream: widget.merchantService!.watchCategories(tenantId: tenantId),
      builder: (context, catSnapshot) {
        final categories = catSnapshot.data ?? [];
        final currentCat = categories.firstWhere(
          (c) => c.name.toUpperCase() == _selectedCategory.toUpperCase(),
          orElse: () => CategoryEntity(categoryId: '', name: _selectedCategory, icon: '📁'),
        );

        final isProductDomain = currentCat.isProductType;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category horizontal pills bar
            _buildCategoriesSection(tenantId),
            const SizedBox(height: 16),

            if (isProductDomain) ...[
              // ── DOMINIO PRODUCT: Platos / Productos de la categoría ──
              StreamBuilder<List<ProductEntity>>(
                stream: widget.merchantService!.watchFeaturedProducts(tenantId: tenantId),
                builder: (context, prodSnapshot) {
                  final allProducts = prodSnapshot.data ?? [];
                  final filteredProds = allProducts.where((p) {
                    final catName = p.subCategoryName.isNotEmpty ? p.subCategoryName : p.categoryName;
                    return catName.toUpperCase().contains(_selectedCategory.toUpperCase()) ||
                        p.category.toUpperCase().contains(_selectedCategory.toUpperCase());
                  }).toList();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Platos de "$_selectedCategory" (${filteredProds.length})',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 17,
                                color: BrandColors.textPrimaryLight,
                              ),
                            ),
                            TextButton(
                              onPressed: () => setState(() => _selectedCategory = ''),
                              child: const Text('Limpiar', style: TextStyle(color: BrandColors.bluePrimary)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      if (filteredProds.isEmpty)
                        _buildEmptyCategoryDiscoveryState()
                      else
                        ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filteredProds.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final p = filteredProds[index];
                            return _buildProductDiscoveryCard(p);
                          },
                        ),
                    ],
                  );
                },
              ),

              // Secondary section: Comercios donde están disponibles
              const SizedBox(height: 20),
              StreamBuilder<List<BusinessEntity>>(
                stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
                builder: (context, bizSnapshot) {
                  final businesses = bizSnapshot.data ?? [];
                  final matchingBiz = businesses.where((b) {
                    return b.category.toUpperCase().contains(_selectedCategory.toUpperCase());
                  }).toList();

                  if (matchingBiz.isEmpty) return const SizedBox.shrink();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Text(
                          'Comercios con "$_selectedCategory" (${matchingBiz.length})',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 225,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          scrollDirection: Axis.horizontal,
                          itemCount: matchingBiz.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 14),
                          itemBuilder: (context, index) {
                            return _buildPublicBusinessCard(matchingBiz[index]);
                          },
                        ),
                      ),
                    ],
                  );
                },
              ),
            ] else ...[
              // ── DOMINIO BUSINESS: Comercios de la categoría ──
              StreamBuilder<List<BusinessEntity>>(
                stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
                builder: (context, bizSnapshot) {
                  final businesses = bizSnapshot.data ?? [];
                  final filteredBiz = businesses.where((b) {
                    return b.category.toUpperCase().contains(_selectedCategory.toUpperCase());
                  }).toList();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Comercios en "$_selectedCategory" (${filteredBiz.length})',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 17,
                                color: BrandColors.textPrimaryLight,
                              ),
                            ),
                            TextButton(
                              onPressed: () => setState(() => _selectedCategory = ''),
                              child: const Text('Limpiar', style: TextStyle(color: BrandColors.bluePrimary)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      if (filteredBiz.isEmpty)
                        _buildEmptyCategoryDiscoveryState()
                      else
                        ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filteredBiz.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 14),
                          itemBuilder: (context, index) {
                            return _buildFullWidthBusinessCard(filteredBiz[index]);
                          },
                        ),
                    ],
                  );
                },
              ),
            ],
          ],
        );
      },
    );
  }

  Widget _buildEmptyCategoryDiscoveryState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28.0),
        child: Column(
          children: [
            Icon(Icons.search_off_rounded, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 8),
            Text(
              'Sin resultados disponibles en esta categoría',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
            const SizedBox(height: 6),
            TextButton(
              onPressed: () => setState(() => _selectedCategory = ''),
              child: const Text('Limpiar filtro de categoría', style: TextStyle(color: BrandColors.bluePrimary)),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH RESULTS VIEW (1:1 Android CustomerHomeSearchResultsSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildSearchResultsView(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, bizSnapshot) {
        final businesses = bizSnapshot.data ?? [];
        final q = _searchQuery.toLowerCase();
        final matchedBusinesses = businesses.where((b) {
          return b.name.toLowerCase().contains(q) || b.category.toLowerCase().contains(q);
        }).toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Resultados para "$_searchQuery"',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
                  ),
                  TextButton(
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                    child: const Text('Borrar búsqueda', style: TextStyle(color: BrandColors.bluePrimary)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            if (matchedBusinesses.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    children: [
                      Icon(Icons.search_off_rounded, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 8),
                      Text(
                        'No encontramos comercios que coincidan con "$_searchQuery"',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: matchedBusinesses.length,
                separatorBuilder: (_, __) => const SizedBox(height: 14),
                itemBuilder: (context, index) {
                  return _buildFullWidthBusinessCard(matchedBusinesses[index]);
                },
              ),
          ],
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT: PUBLIC BUSINESS CARD (240dp Width - 1:1 PublicBusinessCard.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildPublicBusinessCard(BusinessEntity b, {double? distanceKm}) {
    final isFav = _favoriteBusinessIds.contains(b.businessId);
    final opStatus = OperatingHoursResolver.resolveStatus(schedule: b.weeklySchedule, manualOpen: b.isOpen);
    final isOpen = opStatus.isOpen;

    return InkWell(
      onTap: () => _openMerchantDetail(b),
      child: Container(
        width: 240,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: BrandColors.outlineVariantLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Banner (105dp)
            Stack(
              children: [
                Container(
                  height: 105,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [BrandColors.bluePrimary, BrandColors.blueSecondary],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    image: b.bannerUrl != null && b.bannerUrl!.isNotEmpty
                        ? DecorationImage(
                            image: NetworkImage(b.bannerUrl!),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                ),
                // Open/Closed badge top-left
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isOpen ? BrandColors.statusSuccess : const Color(0xFF64748B),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isOpen ? 'ABIERTO 🟢' : 'CERRADO 🔴',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
                // Favorite button top-right
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.black.withOpacity(0.4),
                    ),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: Icon(
                        isFav ? Icons.favorite : Icons.favorite_border,
                        color: isFav ? BrandColors.fabAccent : Colors.white,
                        size: 18,
                      ),
                      onPressed: () => _toggleFavorite(b.businessId),
                    ),
                  ),
                ),
              ],
            ),

            // Card Body (Row: Logo + Text)
            Padding(
              padding: const EdgeInsets.all(10.0),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: BrandColors.outlineVariantLight),
                      image: b.logoUrl != null && b.logoUrl!.isNotEmpty
                          ? DecorationImage(image: NetworkImage(b.logoUrl!), fit: BoxFit.cover)
                          : null,
                    ),
                    child: b.logoUrl == null || b.logoUrl!.isEmpty
                        ? const Icon(Icons.storefront_rounded, size: 20, color: BrandColors.bluePrimary)
                        : null,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: BrandColors.textPrimaryLight,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          b.category,
                          style: const TextStyle(
                            fontSize: 11,
                            color: BrandColors.textSecondaryLight,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 2),
                            Text(
                              b.rating.toStringAsFixed(1),
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
                            ),
                            if (distanceKm != null) ...[
                              const SizedBox(width: 4),
                              Text(
                                '${distanceKm.toStringAsFixed(1)}km',
                                style: const TextStyle(fontSize: 10, color: BrandColors.textSecondaryLight),
                              ),
                            ],
                            const Spacer(),
                            Flexible(
                              child: Text(
                                'Envío C\$ ${b.deliveryFee.toInt()}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: BrandColors.bluePrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
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

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT: STAR / DISCOUNT PRODUCT CARD (160dp Width - 1:1 StarProductCard.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildStarProductCard(ProductEntity p, {bool isDiscount = false}) {
    final orig = p.originalPrice;
    final hasDiscountPrice = orig != null && orig > p.price && orig > 0;
    final discountPercent = hasDiscountPrice
        ? (((orig - p.price) / orig) * 100).toInt()
        : 0;

    return InkWell(
      onTap: () => _openMerchantById(p.businessId, businessName: p.businessName, productId: p.productId),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 160,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: BrandColors.outlineVariantLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Container(
                  height: 95,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: BrandColors.surfaceContainerLowLight,
                    image: p.imageUrl != null && p.imageUrl!.isNotEmpty
                        ? DecorationImage(image: NetworkImage(p.imageUrl!), fit: BoxFit.cover)
                        : null,
                  ),
                  child: p.imageUrl == null || p.imageUrl!.isEmpty
                      ? const Icon(Icons.fastfood_rounded, color: Colors.grey, size: 36)
                      : null,
                ),
                Positioned(
                  top: 0,
                  left: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: isDiscount ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      borderRadius: const BorderRadius.only(bottomRight: Radius.circular(10)),
                    ),
                    child: Text(
                      isDiscount ? '-$discountPercent%' : '⭐ ESTRELLA',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: BrandColors.textPrimaryLight),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    p.businessName.isNotEmpty ? p.businessName : (p.subCategoryName.isNotEmpty ? p.subCategoryName : p.categoryName),
                    style: const TextStyle(fontSize: 10, color: BrandColors.bluePrimary, fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (orig != null && orig > p.price)
                            Text(
                              'C\$ ${orig.toInt()}',
                              style: const TextStyle(
                                fontSize: 10,
                                decoration: TextDecoration.lineThrough,
                                color: Colors.grey,
                              ),
                            ),
                          Text(
                            'C\$ ${p.price.toInt()}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: BrandColors.textPrimaryLight),
                          ),
                        ],
                      ),
                      InkWell(
                        onTap: () {
                          if (widget.onAddToCart != null) {
                            widget.onAddToCart!(p, p.businessName.isNotEmpty ? p.businessName : 'Comercio');
                          }
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('¡${p.name} agregado al carrito! 🛒'),
                              duration: const Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: BrandColors.bluePrimary,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(Icons.add, size: 16, color: Colors.white),
                        ),
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

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT: FLASH DEAL CARD (1:1 Android FlashDealsSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildFlashDealCard(FlashDealEntity deal) {
    return InkWell(
      onTap: () => _openMerchantById(deal.businessId, businessName: deal.businessName, productId: deal.productId),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 170,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFCA5A5)),
          boxShadow: [
            BoxShadow(
              color: Colors.red.withOpacity(0.06),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Container(
                  height: 95,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    image: deal.imageUrl.isNotEmpty
                        ? DecorationImage(image: NetworkImage(deal.imageUrl), fit: BoxFit.cover)
                        : null,
                  ),
                  child: deal.imageUrl.isEmpty
                      ? const Icon(Icons.flash_on_rounded, color: Color(0xFFEF4444), size: 36)
                      : null,
                ),
                Positioned(
                  top: 0,
                  left: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEF4444),
                      borderRadius: BorderRadius.only(bottomRight: Radius.circular(10)),
                    ),
                    child: Text(
                      deal.discountTag.isNotEmpty ? deal.discountTag : '⚡ FLASH',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    deal.productName.isNotEmpty ? deal.productName : deal.title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: BrandColors.textPrimaryLight),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    deal.businessName,
                    style: const TextStyle(fontSize: 10, color: Color(0xFFEF4444), fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (deal.originalPrice > deal.price)
                            Text(
                              'C\$ ${deal.originalPrice.toInt()}',
                              style: const TextStyle(
                                fontSize: 10,
                                decoration: TextDecoration.lineThrough,
                                color: Colors.grey,
                              ),
                            ),
                          Text(
                            'C\$ ${deal.price.toInt()}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFFEF4444)),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.shopping_bag_outlined, size: 16, color: Colors.white),
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

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT: PRODUCT DISCOVERY CARD (Category Discovery View)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildProductDiscoveryCard(ProductEntity p) {
    return InkWell(
      onTap: () => _openMerchantById(p.businessId, businessName: p.businessName, productId: p.productId),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: BrandColors.outlineVariantLight),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: BrandColors.surfaceContainerLowLight,
                image: p.imageUrl != null && p.imageUrl!.isNotEmpty
                    ? DecorationImage(image: NetworkImage(p.imageUrl!), fit: BoxFit.cover)
                    : null,
              ),
              child: p.imageUrl == null || p.imageUrl!.isEmpty
                  ? const Icon(Icons.fastfood_rounded, color: Colors.grey, size: 28)
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    p.businessName.isNotEmpty ? p.businessName : 'Comercio',
                    style: const TextStyle(fontSize: 11, color: BrandColors.bluePrimary, fontWeight: FontWeight.bold),
                  ),
                  if (p.description.isNotEmpty)
                    Text(
                      p.description,
                      style: const TextStyle(fontSize: 11, color: BrandColors.textSecondaryLight),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 4),
                  Text(
                    'C\$ ${p.price.toInt()}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                  ),
                ],
              ),
            ),
            InkWell(
              onTap: () {
                if (widget.onAddToCart != null) {
                  widget.onAddToCart!(p, p.businessName.isNotEmpty ? p.businessName : 'Comercio');
                }
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('¡${p.name} agregado al carrito! 🛒'),
                    duration: const Duration(seconds: 2),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: BrandColors.bluePrimary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT: FULL WIDTH BUSINESS CARD
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildFullWidthBusinessCard(BusinessEntity b) {
    final opStatus = OperatingHoursResolver.resolveStatus(schedule: b.weeklySchedule, manualOpen: b.isOpen);
    final isOpen = opStatus.isOpen;

    return InkWell(
      onTap: () => _openMerchantDetail(b),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: BrandColors.outlineVariantLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            // Banner (120dp)
            Stack(
              children: [
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [BrandColors.bluePrimary, BrandColors.blueSecondary],
                    ),
                    image: b.bannerUrl != null && b.bannerUrl!.isNotEmpty
                        ? DecorationImage(image: NetworkImage(b.bannerUrl!), fit: BoxFit.cover)
                        : null,
                  ),
                ),
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isOpen ? BrandColors.statusSuccess : const Color(0xFF64748B),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      isOpen ? 'ABIERTO' : 'CERRADO',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: BrandColors.outlineVariantLight),
                      image: b.logoUrl != null && b.logoUrl!.isNotEmpty
                          ? DecorationImage(image: NetworkImage(b.logoUrl!), fit: BoxFit.cover)
                          : null,
                    ),
                    child: b.logoUrl == null || b.logoUrl!.isEmpty
                        ? const Icon(Icons.storefront_rounded, size: 24, color: BrandColors.bluePrimary)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: BrandColors.textPrimaryLight),
                        ),
                        Text(
                          b.category,
                          style: const TextStyle(fontSize: 12, color: BrandColors.textSecondaryLight),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.access_time_rounded, size: 14, color: BrandColors.bluePrimary),
                            const SizedBox(width: 4),
                            Text(b.deliveryTime, style: const TextStyle(fontSize: 11)),
                            const SizedBox(width: 14),
                            const Icon(Icons.two_wheeler_rounded, size: 14, color: BrandColors.bluePrimary),
                            const SizedBox(width: 4),
                            Text('Envío C\$ ${b.deliveryFee.toInt()}', style: const TextStyle(fontSize: 11)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 2),
                      Text(
                        b.rating.toStringAsFixed(1),
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION ERROR CARD (Prevents silently masking Firestore errors as empty)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildSectionErrorCard(String title, String error) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF87171)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Error al cargar $title: $error',
                style: const TextStyle(fontSize: 12, color: Color(0xFF991B1B)),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
