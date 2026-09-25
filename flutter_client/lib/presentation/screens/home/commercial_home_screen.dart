/// BLUE SYSTEM DELIVERY ENTERPRISE — CUSTOMER & COMMERCIAL HOME SCREEN
/// Parity with Android CustomerHomeScreen:
/// Real-time banners, delivery address selector, search, category chips,
/// public allied restaurants/businesses, and featured dishes with add-to-cart.

import 'package:flutter/material.dart';

import '../../../domain/entities/banner_entity.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../../data/services/banner_service.dart';
import '../../providers/session_state.dart';

class CommercialHomeScreen extends StatefulWidget {
  final SessionState sessionState;
  final Function(String routeName) onNavigate;
  final IBannerService? bannerService;
  final IMerchantService? merchantService;
  final Function(ProductEntity product, String businessName)? onAddToCart;

  const CommercialHomeScreen({
    super.key,
    required this.sessionState,
    required this.onNavigate,
    this.bannerService,
    this.merchantService,
    this.onAddToCart,
  });

  @override
  State<CommercialHomeScreen> createState() => _CommercialHomeScreenState();
}

class _CommercialHomeScreenState extends State<CommercialHomeScreen> {
  String _selectedCategory = 'Todos';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, dynamic>> _categories = const [
    {'name': 'Todos', 'icon': Icons.restaurant_menu_rounded},
    {'name': 'Comida', 'icon': Icons.lunch_dining_rounded},
    {'name': 'Restaurantes', 'icon': Icons.local_pizza_rounded},
    {'name': 'Farmacia', 'icon': Icons.local_pharmacy_rounded},
    {'name': 'Bebidas', 'icon': Icons.local_bar_rounded},
    {'name': 'Supermercado', 'icon': Icons.shopping_basket_rounded},
    {'name': 'Postres', 'icon': Icons.cake_rounded},
    {'name': 'Mandados', 'icon': Icons.local_shipping_rounded},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = widget.sessionState.currentUser;
    final isGuest = widget.sessionState.isGuestMode;
    final userName = user?.displayName ?? (isGuest ? 'Invitado' : 'Cliente');
    final tenantId = widget.sessionState.claims?.tenantId ?? 'ten_bluesystem_core';

    return RefreshIndicator(
      onRefresh: () async {
        setState(() {});
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── 1. TOP HEADER & DELIVERY ADDRESS ─────────────────────────────
            _buildDeliveryHeader(theme, userName),
            const SizedBox(height: 14),

            // ─── 2. SEARCH BAR ────────────────────────────────────────────────
            _buildSearchBar(theme),
            const SizedBox(height: 18),

            // ─── 3. PROMOTIONAL BANNERS CAROUSEL ──────────────────────────────
            _buildBannersSection(theme),
            const SizedBox(height: 20),

            // ─── 4. CATEGORY CHIPS SCROLL ─────────────────────────────────────
            _buildCategoriesSection(theme),
            const SizedBox(height: 24),

            // ─── 5. ALLIED BUSINESSES & RESTAURANTS ───────────────────────────
            _buildAlliedBusinessesSection(theme, tenantId),
            const SizedBox(height: 24),

            // ─── 6. FEATURED PRODUCTS SECTION ─────────────────────────────────
            _buildFeaturedProductsSection(theme),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  // ─── 1. HEADER: ADDRESS SELECTOR & GREETING ─────────────────────────────────
  Widget _buildDeliveryHeader(ThemeData theme, String userName) {
    return Row(
      children: [
        CircleAvatar(
          radius: 22,
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(Icons.person_rounded, color: theme.colorScheme.primary, size: 24),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.location_on_rounded, size: 16, color: theme.colorScheme.primary),
                  const SizedBox(width: 4),
                  Text(
                    'Entregar en:',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              InkWell(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('📍 Ubicación actual: Managua, Nicaragua'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        'Mi ubicación actual (Managua)',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const Icon(Icons.keyboard_arrow_down_rounded, size: 18),
                  ],
                ),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.notifications_none_rounded),
          tooltip: 'Notificaciones',
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('No tienes notificaciones pendientes.')),
            );
          },
        ),
      ],
    );
  }

  // ─── 2. SEARCH BAR ──────────────────────────────────────────────────────────
  Widget _buildSearchBar(ThemeData theme) {
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (val) {
          setState(() {
            _searchQuery = val.trim().toLowerCase();
          });
        },
        decoration: InputDecoration(
          hintText: '¿Qué deseas pedir hoy? (Ej. Pizza, Tacos, Farmacia)',
          hintStyle: TextStyle(fontSize: 13, color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7)),
          prefixIcon: Icon(Icons.search_rounded, color: theme.colorScheme.primary),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  // ─── 3. BANNERS SECTION ─────────────────────────────────────────────────────
  Widget _buildBannersSection(ThemeData theme) {
    if (widget.bannerService != null) {
      return StreamBuilder<List<BannerEntity>>(
        stream: widget.bannerService!.watchActiveBanners(),
        builder: (context, snapshot) {
          final banners = snapshot.data ?? [];
          if (banners.isNotEmpty) {
            return SizedBox(
              height: 145,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: banners.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final banner = banners[index];
                  return _buildBannerCard(theme, banner.effectiveTitle, banner.subtitle, banner.effectiveImageUrl);
                },
              ),
            );
          }
          return _buildDefaultBannersCarousel(theme);
        },
      );
    }
    return _buildDefaultBannersCarousel(theme);
  }

  Widget _buildDefaultBannersCarousel(ThemeData theme) {
    final defaultPromos = [
      {
        'title': '🎉 2x1 en Platillos Seleccionados',
        'subtitle': 'Aprovecha ofertas exclusivas hoy en Managua',
        'color1': const Color(0xFFE11D48),
        'color2': const Color(0xFFF43F5E),
      },
      {
        'title': '🛵 Envío Gratis en Comercios Aliados',
        'subtitle': 'En pedidos mayores a 300 Córdobas con entrega express',
        'color1': const Color(0xFF2563EB),
        'color2': const Color(0xFF3B82F6),
      },
      {
        'title': '🍔 Combos Familiares con 25% OFF',
        'subtitle': 'Las mejores hamburguesas y alitas de la ciudad',
        'color1': const Color(0xFF059669),
        'color2': const Color(0xFF10B981),
      },
    ];

    return SizedBox(
      height: 135,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: defaultPromos.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final p = defaultPromos[index];
          return Container(
            width: 290,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [p['color1'] as Color, p['color2'] as Color],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: (p['color1'] as Color).withOpacity(0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  p['title'] as String,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Text(
                  p['subtitle'] as String,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 12,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '¡Pedir Ahora!',
                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildBannerCard(ThemeData theme, String title, String subtitle, String? imageUrl) {
    return Container(
      width: 290,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        image: imageUrl != null && imageUrl.isNotEmpty
            ? DecorationImage(
                image: NetworkImage(imageUrl),
                fit: BoxFit.cover,
              )
            : null,
        gradient: imageUrl == null || imageUrl.isEmpty
            ? LinearGradient(
                colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
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
            colors: [Colors.black.withOpacity(0.7), Colors.transparent],
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Text(
              title,
              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // ─── 4. CATEGORIES SECTION ──────────────────────────────────────────────────
  Widget _buildCategoriesSection(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Categorías',
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 42,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _categories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final cat = _categories[index];
              final isSelected = cat['name'] == _selectedCategory;
              return ChoiceChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      cat['icon'] as IconData,
                      size: 16,
                      color: isSelected ? theme.colorScheme.onPrimary : theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 6),
                    Text(cat['name'] as String),
                  ],
                ),
                selected: isSelected,
                selectedColor: theme.colorScheme.primary,
                labelStyle: TextStyle(
                  color: isSelected ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12,
                ),
                onSelected: (val) {
                  setState(() {
                    _selectedCategory = cat['name'] as String;
                  });
                },
              );
            },
          ),
        ),
      ],
    );
  }

  // ─── 5. ALLIED BUSINESSES & RESTAURANTS ─────────────────────────────────────
  Widget _buildAlliedBusinessesSection(ThemeData theme, String tenantId) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Restaurantes y Comercios',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            Text(
              'Aliados Oficiales',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (widget.merchantService != null)
          StreamBuilder<List<BusinessEntity>>(
            stream: widget.merchantService!.watchBusinesses(tenantId: tenantId),
            builder: (context, snapshot) {
              final rawBusinesses = snapshot.data ?? [];
              final filtered = _filterBusinesses(rawBusinesses);

              if (filtered.isNotEmpty) {
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final business = filtered[index];
                    return _buildBusinessCard(theme, business);
                  },
                );
              }

              // Fallback with styled default restaurants if Firestore is initializing
              return _buildFallbackBusinesses(theme);
            },
          )
        else
          _buildFallbackBusinesses(theme),
      ],
    );
  }

  List<BusinessEntity> _filterBusinesses(List<BusinessEntity> list) {
    return list.where((b) {
      final matchesCategory = _selectedCategory == 'Todos' ||
          b.category.toLowerCase().contains(_selectedCategory.toLowerCase());
      final matchesSearch = _searchQuery.isEmpty ||
          b.name.toLowerCase().contains(_searchQuery) ||
          b.category.toLowerCase().contains(_searchQuery) ||
          b.description.toLowerCase().contains(_searchQuery);
      return matchesCategory && matchesSearch;
    }).toList();
  }

  Widget _buildBusinessCard(ThemeData theme, BusinessEntity business) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openBusinessMenu(context, business),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner or Logo Image
            Stack(
              children: [
                Container(
                  height: 120,
                  width: double.infinity,
                  color: theme.colorScheme.surfaceVariant,
                  child: business.bannerUrl != null && business.bannerUrl!.isNotEmpty
                      ? Image.network(
                          business.bannerUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildPlaceholderBanner(theme, business.name),
                        )
                      : (business.logoUrl != null && business.logoUrl!.isNotEmpty
                          ? Image.network(
                              business.logoUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _buildPlaceholderBanner(theme, business.name),
                            )
                          : _buildPlaceholderBanner(theme, business.name)),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: business.isOpen ? const Color(0xFF10B981) : Colors.black54,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      business.isOpen ? 'ABIERTO' : 'CERRADO',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          business.name,
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                          const SizedBox(width: 2),
                          Text(
                            business.rating.toStringAsFixed(1),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    business.category,
                    style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.access_time_rounded, size: 14, color: theme.colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(business.deliveryTime, style: const TextStyle(fontSize: 11)),
                      const SizedBox(width: 14),
                      Icon(Icons.two_wheeler_rounded, size: 14, color: theme.colorScheme.primary),
                      const SizedBox(width: 4),
                      Text('Envío C\$ ${business.deliveryFee.toInt()}', style: const TextStyle(fontSize: 11)),
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

  Widget _buildPlaceholderBanner(ThemeData theme, String name) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [theme.colorScheme.primary.withOpacity(0.8), theme.colorScheme.tertiary.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.restaurant_rounded, color: Colors.white, size: 28),
            const SizedBox(width: 8),
            Text(
              name,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackBusinesses(ThemeData theme) {
    const fallbacks = [
      BusinessEntity(
        businessId: 'biz_restaurante_el_portal',
        tenantId: 'ten_bluesystem_core',
        name: 'Restaurante El Portal',
        category: 'Comida Tradicional & Asados',
        address: 'Plaza Inter, Managua',
        phone: '+505 8888-1111',
        description: 'Especialidad en carnes asadas, gallo pinto y comida nica.',
        deliveryTime: '20-30 min',
        rating: 4.9,
        deliveryFee: 35.0,
      ),
      BusinessEntity(
        businessId: 'biz_burger_express',
        tenantId: 'ten_bluesystem_core',
        name: 'Burger Express Managua',
        category: 'Hamburguesas & Snacks',
        address: 'Colonia Centroamérica, Managua',
        phone: '+505 8888-2222',
        description: 'Hamburguesas artesanales, papas con queso y malteadas.',
        deliveryTime: '15-25 min',
        rating: 4.7,
        deliveryFee: 35.0,
      ),
      BusinessEntity(
        businessId: 'biz_pizzeria_napoles',
        tenantId: 'ten_bluesystem_core',
        name: 'Pizzería Nápoles',
        category: 'Pizzas & Pastas Italianas',
        address: 'Bello Horizonte, Managua',
        phone: '+505 8888-3333',
        description: 'Pizzas a la leña, lasagnas y bebidas refrescantes.',
        deliveryTime: '25-40 min',
        rating: 4.8,
        deliveryFee: 40.0,
      ),
      BusinessEntity(
        businessId: 'biz_farmacia_salud',
        tenantId: 'ten_bluesystem_core',
        name: 'Farmacia La Salud 24H',
        category: 'Farmacia & Medicamentos',
        address: 'Altamira, Managua',
        phone: '+505 8888-4444',
        description: 'Medicamentos, cuidado personal y primeros auxilios con entrega rápida.',
        deliveryTime: '15-20 min',
        rating: 5.0,
        deliveryFee: 30.0,
      ),
    ];

    final filtered = _filterBusinesses(fallbacks);

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 14),
      itemBuilder: (context, index) {
        return _buildBusinessCard(theme, filtered[index]);
      },
    );
  }

  // ─── 6. FEATURED PRODUCTS SECTION ───────────────────────────────────────────
  Widget _buildFeaturedProductsSection(ThemeData theme) {
    final featuredProducts = [
      {
        'id': 'feat_1',
        'name': 'Hamburguesa Doble Especial',
        'business': 'Burger Express',
        'price': 180.0,
        'category': 'Comida',
        'desc': 'Doble torta 100% res, queso cheddar fundido y tocino crujiente.',
        'icon': Icons.lunch_dining_rounded,
      },
      {
        'id': 'feat_2',
        'name': 'Pizza Pepperoni Familiar',
        'business': 'Pizzería Nápoles',
        'price': 320.0,
        'category': 'Restaurantes',
        'desc': 'Masa fina a la leña, salsa pomodoro y extra queso mozzarella.',
        'icon': Icons.local_pizza_rounded,
      },
      {
        'id': 'feat_3',
        'name': 'Combo Asado Típico Nica',
        'business': 'Restaurante El Portal',
        'price': 220.0,
        'category': 'Comida',
        'desc': 'Carne asada, gallo pinto, tajadas fritas y queso asado.',
        'icon': Icons.kebab_dining_rounded,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Platillos Populares',
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 200,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: featuredProducts.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final p = featuredProducts[index];
              return Container(
                width: 180,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 75,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Icon(
                          p['icon'] as IconData,
                          size: 38,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      p['name'] as String,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      p['business'] as String,
                      style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'C\$ ${(p['price'] as double).toInt()}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        IconButton.filled(
                          iconSize: 18,
                          style: IconButton.styleFrom(
                            padding: const EdgeInsets.all(6),
                            minimumSize: const Size(32, 32),
                          ),
                          icon: const Icon(Icons.add_shopping_cart_rounded),
                          onPressed: () {
                            final prod = ProductEntity(
                              productId: p['id'] as String,
                              tenantId: 'ten_bluesystem_core',
                              businessId: 'biz_general',
                              name: p['name'] as String,
                              description: p['desc'] as String,
                              price: p['price'] as double,
                              category: p['category'] as String,
                              createdAt: DateTime.now().millisecondsSinceEpoch,
                              updatedAt: DateTime.now().millisecondsSinceEpoch,
                            );
                            if (widget.onAddToCart != null) {
                              widget.onAddToCart!(prod, p['business'] as String);
                            }
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('¡${p['name']} agregado al carrito! 🛒'),
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
              );
            },
          ),
        ),
      ],
    );
  }

  // ─── MODAL DE DETALLE DEL COMERCIO Y SU MENÚ ────────────────────────────────
  void _openBusinessMenu(BuildContext context, BusinessEntity business) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, scrollController) {
          final theme = Theme.of(context);
          return Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade400,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: theme.colorScheme.primaryContainer,
                      child: const Icon(Icons.restaurant_rounded, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            business.name,
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            business.category,
                            style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                          ),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                              Text(' ${business.rating} • ${business.deliveryTime}'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (business.description.isNotEmpty)
                  Text(
                    business.description,
                    style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurfaceVariant),
                  ),
                const Divider(height: 28),
                Text(
                  'Menú y Especialidades',
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 14),
                // Simulated or real products for this business
                _buildMenuItem(
                  theme,
                  business.name,
                  'Platillo Especial del Día',
                  'Preparado al momento con ingredientes frescos de la más alta calidad.',
                  160.0,
                ),
                _buildMenuItem(
                  theme,
                  business.name,
                  'Combo Express + Bebida',
                  'Incluye porción personal con guarnición y bebida a elección.',
                  190.0,
                ),
                _buildMenuItem(
                  theme,
                  business.name,
                  'Porción Familiar Compartir',
                  'Ideal para 3-4 personas, incluye acompañamientos tradicionales.',
                  380.0,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMenuItem(ThemeData theme, String businessName, String title, String desc, double price) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.3),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text(desc, style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
                const SizedBox(height: 6),
                Text(
                  'C\$ ${price.toInt()}',
                  style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton(
            onPressed: () {
              final prod = ProductEntity(
                productId: 'menu_${title.hashCode}',
                tenantId: 'ten_bluesystem_core',
                businessId: businessName,
                name: title,
                description: desc,
                price: price,
                category: 'Menú',
                createdAt: DateTime.now().millisecondsSinceEpoch,
                updatedAt: DateTime.now().millisecondsSinceEpoch,
              );
              if (widget.onAddToCart != null) {
                widget.onAddToCart!(prod, businessName);
              }
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('¡$title agregado al carrito! 🛒'),
                  duration: const Duration(seconds: 2),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: const Size(60, 36),
            ),
            child: const Text('Agregar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
