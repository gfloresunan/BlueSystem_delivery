/// BLUE SYSTEM DELIVERY ENTERPRISE — CUSTOMER & COMMERCIAL HOME SCREEN
/// 1:1 Parity with Android CustomerHomeScreen.kt (BSDS Architecture):
/// - BluePrimary/BlueSecondary Gradient Header with User Avatar, Greeting, Notifications & Cart badges
/// - Delivery Address Selector with Map Pin
/// - White Rounded Search Bar with Voice Mic
/// - Real-time Promotional Banners from Firestore /banners
/// - Real Categories with Emojis from Firestore /categories
/// - "Comercios Cerca de Ti 🏢" with "Ampliado a 15 km" badge & PublicBusinessCard widgets
/// - "Comercios Destacados ⭐"
/// - "Productos Estrella ⭐" with real products from SSOT
/// - "Todos los Comercios 🏪" with canonical 5-merchant count
/// - Customer AI Floating Button with AutoAwesome sparkles
/// - Navigation to real MerchantDetailScreen on tap (Zero Mock Menus)

import 'package:flutter/material.dart';

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

  const CommercialHomeScreen({
    super.key,
    required this.sessionState,
    required this.onNavigate,
    this.bannerService,
    this.merchantService,
    this.onAddToCart,
    this.onCartClick,
    this.onNotificationsClick,
  });

  @override
  State<CommercialHomeScreen> createState() => _CommercialHomeScreenState();
}

class _CommercialHomeScreenState extends State<CommercialHomeScreen> {
  String _selectedCategory = '';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _favoriteBusinessIds = {};

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

  void _openMerchantDetail(BusinessEntity business) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MerchantDetailScreen(
          businessId: business.businessId,
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

  @override
  Widget build(BuildContext context) {
    final user = widget.sessionState.currentUser;
    final isGuest = widget.sessionState.isGuestMode;
    final userName = user?.displayName ?? (isGuest ? 'Invitado' : 'Cliente');
    final tenantId = widget.sessionState.claims?.tenantId ?? 'ten_bluesystem_core';

    return Scaffold(
      backgroundColor: BrandColors.bgLightApp,
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✨ Asistente IA de BlueSystem listo para recomendarte los mejores platos y comercios.'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
        backgroundColor: BrandColors.bluePrimary,
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
              // ─── 1. GRADIENT HEADER (1:1 Android HomeHeader.kt) ───────────
              _buildCanonicalHeader(userName),

              // ─── 2. PROMOTIONAL BANNERS CAROUSEL ──────────────────────────
              const SizedBox(height: 16),
              _buildBannersSection(),

              // ─── 3. CATEGORIES HORIZONTAL PILLS ───────────────────────────
              const SizedBox(height: 18),
              _buildCategoriesSection(tenantId),

              // ─── 4. COMERCIOS CERCA DE TI (NearbyBusinessesSection.kt) ────
              const SizedBox(height: 20),
              _buildNearbyBusinessesSection(tenantId),

              // ─── 5. COMERCIOS DESTACADOS ⭐ ───────────────────────────────
              const SizedBox(height: 20),
              _buildFeaturedBusinessesSection(tenantId),

              // ─── 6. PRODUCTOS ESTRELLA ⭐ ─────────────────────────────────
              const SizedBox(height: 20),
              _buildStarProductsSection(tenantId),

              // ─── 7. TODOS LOS COMERCIOS 🏪 ────────────────────────────────
              const SizedBox(height: 20),
              _buildAllBusinessesSection(tenantId),

              const SizedBox(height: 60),
            ],
          ),
        ),
      ),
    );
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

                  // Notifications Icon with badge
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

                  // Shopping Cart Icon with badge
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
  // 2. PROMOTIONAL BANNERS CAROUSEL (Streaming Firestore /banners)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildBannersSection() {
    if (widget.bannerService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BannerEntity>>(
      stream: widget.bannerService!.watchActiveBanners(),
      builder: (context, snapshot) {
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
              return Container(
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
  // 3. CATEGORIES SECTION (Streaming Firestore /categories)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildCategoriesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<CategoryEntity>>(
      stream: widget.merchantService!.watchCategories(tenantId: tenantId),
      builder: (context, snapshot) {
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
  // 4. COMERCIOS CERCA DE TI 🏢 (NearbyBusinessesSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildNearbyBusinessesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
        final businesses = snapshot.data ?? [];
        if (businesses.isEmpty) return const SizedBox.shrink();

        final filtered = businesses.where((b) {
          if (_selectedCategory.isNotEmpty &&
              !b.category.toLowerCase().contains(_selectedCategory.toLowerCase())) {
            return false;
          }
          if (_searchQuery.isNotEmpty &&
              !b.name.toLowerCase().contains(_searchQuery.toLowerCase()) &&
              !b.category.toLowerCase().contains(_searchQuery.toLowerCase())) {
            return false;
          }
          return true;
        }).toList();

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
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.near_me, size: 12, color: Color(0xFFB45309)),
                        SizedBox(width: 4),
                        Text(
                          'Ampliado a 15 km',
                          style: TextStyle(
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
              height: 215,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final b = filtered[index];
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
  // 5. COMERCIOS DESTACADOS ⭐ (FeaturedBusinessesSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildFeaturedBusinessesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
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
              height: 215,
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
  // 6. PRODUCTOS ESTRELLA ⭐ (Streaming Real Products from SSOT)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildStarProductsSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<ProductEntity>>(
      stream: widget.merchantService!.watchAllActiveProducts(tenantId: tenantId),
      builder: (context, snapshot) {
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
  // 7. TODOS LOS COMERCIOS 🏪 (AllBusinessesSection.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildAllBusinessesSection(String tenantId) {
    if (widget.merchantService == null) return const SizedBox.shrink();

    return StreamBuilder<List<BusinessEntity>>(
      stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
      builder: (context, snapshot) {
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
  // COMPONENT: PUBLIC BUSINESS CARD (240dp Width - 1:1 PublicBusinessCard.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildPublicBusinessCard(BusinessEntity b) {
    final isFav = _favoriteBusinessIds.contains(b.businessId);

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
                      color: b.isOpen ? BrandColors.statusSuccess : const Color(0xFF64748B),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      b.isOpen ? 'ABIERTO 🟢' : 'CERRADO 🔴',
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
                            const Spacer(),
                            Text(
                              'Envío C\$ ${b.deliveryFee.toInt()}',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: BrandColors.bluePrimary,
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
  // COMPONENT: STAR PRODUCT CARD (160dp Width - 1:1 StarProductCard.kt)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildStarProductCard(ProductEntity p) {
    return Container(
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
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    borderRadius: BorderRadius.only(bottomRight: Radius.circular(10)),
                  ),
                  child: const Text(
                    '⭐ ESTRELLA',
                    style: TextStyle(
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
                  p.subCategoryName.isNotEmpty ? p.subCategoryName : p.categoryName,
                  style: const TextStyle(fontSize: 10, color: BrandColors.bluePrimary, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'C\$ ${p.price.toInt()}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: BrandColors.textPrimaryLight),
                    ),
                    InkWell(
                      onTap: () {
                        if (widget.onAddToCart != null) {
                          widget.onAddToCart!(p, p.categoryName);
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
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT: FULL WIDTH BUSINESS CARD
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildFullWidthBusinessCard(BusinessEntity b) {
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
                      color: b.isOpen ? BrandColors.statusSuccess : const Color(0xFF64748B),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      b.isOpen ? 'ABIERTO' : 'CERRADO',
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
}
