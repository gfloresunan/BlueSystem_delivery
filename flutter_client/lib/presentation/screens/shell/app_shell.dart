/// BLUE SYSTEM DELIVERY ENTERPRISE — APPLICATION SHELL
/// Parity with Android BlueSystem Architecture:
/// Dynamic role switching (Customer/Guest, Courier, Merchant).
/// Android-aligned Curved Bottom Bar with Central Floating Cart Button for Customers.
/// Dark-mode Operational Panel for Motorizados, Merchant Center for Comercios.

import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/auth/auth_context.dart';
import '../../../core/design_system/bsds_theme.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../../data/services/courier_cash_closure_service.dart';
import '../../../data/services/user_firestore_service.dart';
import '../../../domain/entities/saved_address_entity.dart';
import '../../../domain/entities/user_profile_entity.dart';
import '../../providers/cart_provider.dart';
import '../../providers/session_state.dart';
import '../../theme/brand_theme_builder.dart';
import '../../widgets/state_views.dart';
import '../address/address_manager_screen.dart';
import '../auth/login_screen.dart';
import '../courier/courier_dashboard_screen.dart';
import '../fleet/fleet_map_screen.dart';
import '../home/commercial_home_screen.dart';
import '../merchant/merchant_dashboard_screen.dart';
import '../orders/orders_screen.dart';
import '../trips/trips_screen.dart';
import '../trips/solicitar_envio_screen.dart';
import '../trips/trip_live_tracking_screen.dart';

class AppShell extends StatefulWidget {
  final SessionState sessionState;
  final IOrderService orderService;
  final ITripService tripService;
  final IFleetService fleetService;
  final IMerchantService merchantService;
  final IBannerService? bannerService;
  final ICourierCashClosureService? cashClosureService;
  final IUserService? userService;
  final CartProvider? cartProvider;
  final INotificationService? notificationService;

  const AppShell({
    super.key,
    required this.sessionState,
    required this.orderService,
    required this.tripService,
    required this.fleetService,
    required this.merchantService,
    this.bannerService,
    this.cashClosureService,
    this.userService,
    this.cartProvider,
    this.notificationService,
  });

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _selectedIndex = 0;
  late final CartProvider _internalCartProvider;
  CartProvider get _cart => widget.cartProvider ?? _internalCartProvider;
  StreamSubscription<Map<String, dynamic>>? _deepLinkSub;

  List<Map<String, dynamic>> get _cartItems => _cart.items.map((i) => i.toMap()).toList();
  double get _cartTotal => _cart.subtotal;

  IUserService get _effectiveUserService => widget.userService ?? UserFirestoreService();

  @override
  void initState() {
    super.initState();
    _internalCartProvider = CartProvider();
    _cart.addListener(_onCartChanged);
    _deepLinkSub = widget.notificationService?.onDeepLinkOpened.listen(_handleDeepLinkNotification);
  }

  @override
  void dispose() {
    _deepLinkSub?.cancel();
    _cart.removeListener(_onCartChanged);
    _internalCartProvider.dispose();
    super.dispose();
  }

  void _handleDeepLinkNotification(Map<String, dynamic> data) {
    if (!mounted) return;
    final action = (data['action'] ?? '').toString();
    final orderId = (data['orderId'] ?? '').toString();
    final tripId = (data['tripId'] ?? '').toString();
    final screen = (data['screen'] ?? data['destinationRoute'] ?? data['deepLink'] ?? '').toString().toLowerCase();

    // 1:1 Android NotificationRouter Parity:
    // Route to appropriate tab based on payload
    if (orderId.isNotEmpty || screen.contains('order') || action.contains('ORDER')) {
      setState(() {
        _selectedIndex = 2; // Pedidos
      });
    } else if (screen.contains('profile') || screen.contains('address')) {
      setState(() {
        _selectedIndex = 3; // Mi Perfil
      });
    } else if (tripId.isNotEmpty || screen.contains('trip') || screen.contains('favorito')) {
      setState(() {
        _selectedIndex = 1; // Favorito / Envíos
      });
    } else if (screen.contains('home') || screen.contains('catalog')) {
      setState(() {
        _selectedIndex = 0; // Inicio / Catálogo
      });
    }
  }

  void _onCartChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _addToCart(ProductEntity product, String businessName) {
    final effectiveBusinessName = businessName.isNotEmpty
        ? businessName
        : (product.businessName.isNotEmpty ? product.businessName : 'Comercio');
    final options = product.selectedOptions;

    _cart.addItem(
      id: product.productId,
      name: product.name,
      price: product.calculatedTotalPrice,
      basePrice: product.price,
      imageUrl: product.imageUrl,
      businessId: product.businessId,
      businessName: effectiveBusinessName,
      tenantId: product.tenantId.isNotEmpty ? product.tenantId : 'default',
      branchId: product.branchId,
      selectedOptions: options.map((o) => o.toMap()).toList(),
    );
  }

  void addToCart(ProductEntity product, String businessName) {
    _addToCart(product, businessName);
  }

  void _clearCart() {
    _cart.clearCart();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.sessionState,
      builder: (context, _) {
        final status = widget.sessionState.status;

        // ─── 1. Initializing ─────────────────────────────────────────────────
        if (status == AuthStatus.uninitialized) {
          return const Scaffold(body: LoadingView(message: 'Iniciando BlueSystem Delivery...'));
        }

        // ─── 2. Evaluate Roles ───────────────────────────────────────────────
        final claims = widget.sessionState.claims;
        final user = widget.sessionState.currentUser;

        final isCourier = claims?.role == EiamRole.driver || user?.role == EiamRole.driver;
        final isMerchant = claims?.role == EiamRole.owner ||
            claims?.role == EiamRole.manager ||
            user?.role == EiamRole.owner;
        final isGuestMode = widget.sessionState.isGuestMode;

        // ─── 3. Unified Authentication Gate (1:1 Android Parity) ────────────
        // If unauthenticated and NOT explicitly exploring as guest, show Android LoginScreen
        if (status == AuthStatus.unauthenticated && !isGuestMode) {
          return LoginScreen(
            sessionState: widget.sessionState,
            onLoginSuccess: () {
              setState(() {});
            },
          );
        }

        // Reset selected index if exceeding tab bounds
        final maxTabs = isCourier ? 4 : (isMerchant ? 5 : 4);
        if (_selectedIndex >= maxTabs) {
          _selectedIndex = 0;
        }

        // ─── 4. Render Appropriate Shell Based on Role ───────────────────────
        if (isCourier) {
          return _buildCourierShell();
        } else if (isMerchant) {
          return _buildMerchantShell();
        } else {
          return _buildCustomerShell(isGuestMode);
        }
      },
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // A. CUSTOMER & GUEST SHELL (Android CustomerBottomNavigationBar Parity)
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildCustomerShell(bool isGuestMode) {
    return Scaffold(
      backgroundColor: BrandColors.bgLightApp,
      appBar: _selectedIndex == 0
          ? null // Home has its own gradient header
          : AppBar(
              backgroundColor: BrandColors.surfaceLight,
              foregroundColor: BrandColors.textPrimaryLight,
              elevation: 1,
              title: Text(
                _selectedIndex == 1
                    ? 'Favoritos'
                    : (_selectedIndex == 2 ? 'Mis Pedidos' : 'Mi Perfil'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              actions: [
                if (widget.sessionState.isOffline) const OfflineBanner(),
              ],
            ),
      body: _buildCustomerScreen(isGuestMode),
      floatingActionButton: BSCartButton(
        itemCount: _cartItems.length,
        onPressed: _openCartDialog,
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            height: 64,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                // Item 1: Inicio
                _buildBottomNavItem(
                  icon: Icons.home_rounded,
                  label: 'Inicio',
                  isSelected: _selectedIndex == 0,
                  onTap: () => setState(() => _selectedIndex = 0),
                ),
                // Item 2: Favorito
                _buildBottomNavItem(
                  icon: Icons.favorite_border_rounded,
                  label: 'Favorito',
                  isSelected: _selectedIndex == 1,
                  onTap: () => setState(() => _selectedIndex = 1),
                ),
                // Spacer for the center FAB
                const SizedBox(width: 64),
                // Item 4: Pedidos
                _buildBottomNavItem(
                  icon: Icons.receipt_long_rounded,
                  label: 'Pedidos',
                  isSelected: _selectedIndex == 2,
                  onTap: () {
                    if (isGuestMode) {
                      setState(() => _selectedIndex = 3);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Inicia sesión para consultar tus pedidos en curso.')),
                      );
                    } else {
                      setState(() => _selectedIndex = 2);
                    }
                  },
                ),
                // Item 5: Mi Perfil
                _buildBottomNavItem(
                  icon: Icons.person_rounded,
                  label: 'Mi Perfil',
                  isSelected: _selectedIndex == 3,
                  onTap: () => setState(() => _selectedIndex = 3),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNavItem({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final color = isSelected ? BrandColors.fabAccent : BrandColors.textSecondaryLight;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerScreen(bool isGuestMode) {
    switch (_selectedIndex) {
      case 0:
        return CommercialHomeScreen(
          sessionState: widget.sessionState,
          onNavigate: _handleNavigation,
          bannerService: widget.bannerService,
          merchantService: widget.merchantService,
          onAddToCart: _addToCart,
          onCartClick: _openCartDialog,
          onOpenExpress: () {
            final user = widget.sessionState.currentUser ??
                const UserProfileEntity(
                  uid: 'guest_user',
                  email: 'invitado@bluesystemdelivery.com',
                  displayName: 'Cliente Invitado',
                  role: EiamRole.client,
                  isVerified: false,
                  createdAt: 0,
                  updatedAt: 0,
                );
            final userSvc = widget.userService ?? UserFirestoreService();
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (ctx) => SolicitarEnvioScreen(
                  tripService: widget.tripService,
                  userService: userSvc,
                  currentUser: user,
                  tenantId: widget.sessionState.claims?.tenantId ?? 'default',
                  onBack: () => Navigator.pop(ctx),
                  onTripCreated: (tripId) {
                    Navigator.pop(ctx);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (trackCtx) => TripLiveTrackingScreen(
                          tripId: tripId,
                          tripService: widget.tripService,
                          fleetService: widget.fleetService,
                          onBack: () => Navigator.pop(trackCtx),
                        ),
                      ),
                    );
                  },
                ),
              ),
            );
          },
        );
      case 1:
        return _buildFavoritesView();
      case 2:
        return OrdersScreen(
          sessionState: widget.sessionState,
          orderService: widget.orderService,
          fleetService: widget.fleetService,
        );
      case 3:
        if (isGuestMode) {
          return LoginScreen(
            sessionState: widget.sessionState,
            onLoginSuccess: () {
              setState(() => _selectedIndex = 0);
            },
          );
        }
        return _buildUserProfileView();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildFavoritesView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_border_rounded, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text(
              'Aún no tienes favoritos',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Guarda tus restaurantes y platillos preferidos pulsando el corazón.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: BrandColors.bluePrimary,
                foregroundColor: Colors.white,
              ),
              onPressed: () => setState(() => _selectedIndex = 0),
              child: const Text('Explorar Restaurantes'),
            ),
          ],
        ),
      ),
    );
  }

  // 1:1 Android ProfileScreen.kt implementation
  Widget _buildUserProfileView() {
    final user = widget.sessionState.currentUser;
    final claims = widget.sessionState.claims;
    final displayName = user?.displayName ?? '';
    final initialLetter = displayName.isNotEmpty
        ? displayName.substring(0, 1).toUpperCase()
        : 'C';

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card with Avatar & Account Info
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [BrandColors.bluePrimary, BrandColors.blueSecondary],
                      ),
                    ),
                    child: Center(
                      child: Text(
                        initialLetter,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 24,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.displayName ?? 'Cliente BlueSystem',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: BrandColors.textPrimaryLight,
                          ),
                        ),
                        Text(
                          user?.email ?? '',
                          style: const TextStyle(fontSize: 12, color: BrandColors.textSecondaryLight),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Text(
                            'ROL: ${claims?.role.name.toUpperCase() ?? "CLIENT"}',
                            style: const TextStyle(
                              color: BrandColors.bluePrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Menu Section 1: Core Navigation
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Column(
              children: [
                _buildProfileListTile(
                  tileKey: const Key('profile_tile_my_profile'),
                  icon: Icons.person_outline,
                  iconColor: BrandColors.bluePrimary,
                  title: 'Mi Perfil',
                  subtitle: 'Datos personales y contacto',
                  onTap: () => _openEditProfileDialog(context),
                ),
                const Divider(height: 1),
                _buildProfileListTile(
                  icon: Icons.favorite_border_rounded,
                  iconColor: BrandColors.fabAccent,
                  title: 'Favoritos',
                  subtitle: 'Comercios y platos guardados',
                  onTap: () => setState(() => _selectedIndex = 1),
                ),
                const Divider(height: 1),
                _buildProfileListTile(
                  tileKey: const Key('profile_tile_saved_addresses'),
                  icon: Icons.location_on_outlined,
                  iconColor: BrandColors.statusSuccess,
                  title: 'Mis direcciones',
                  subtitle: 'Gestionar puntos de entrega',
                  onTap: () => _openSavedAddressesModal(context),
                ),
                const Divider(height: 1),
                _buildProfileListTile(
                  icon: Icons.local_shipping_outlined,
                  iconColor: BrandColors.blueSecondary,
                  title: 'Envío A → B (Express X→Y)',
                  subtitle: 'Solicitar mensajería punto a punto',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('🚚 Módulo de Envíos Express X→Y listo para cotizar.')),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Menu Section 2: Loyalty & Rewards
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Column(
              children: [
                _buildProfileListTile(
                  icon: Icons.card_giftcard_rounded,
                  iconColor: const Color(0xFFF59E0B),
                  title: 'Fidelidad: Puntos & Nivel Cliente',
                  subtitle: 'Puntos acumulados y recompensas',
                  onTap: () {},
                ),
                const Divider(height: 1),
                _buildProfileListTile(
                  icon: Icons.confirmation_number_outlined,
                  iconColor: const Color(0xFF8B5CF6),
                  title: 'Mis cupones',
                  subtitle: 'Descuentos exclusivos y promociones',
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Menu Section 3: Settings & Support
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Column(
              children: [
                _buildProfileListTile(
                  icon: Icons.security_rounded,
                  iconColor: const Color(0xFF6366F1),
                  title: 'Seguridad & Contraseña',
                  subtitle: 'PIN y autenticación',
                  onTap: () {},
                ),
                const Divider(height: 1),
                _buildProfileListTile(
                  icon: Icons.settings_outlined,
                  iconColor: BrandColors.bluePrimary,
                  title: 'Configuración & Preferencias',
                  subtitle: 'Notificaciones y temas',
                  onTap: () {},
                ),
                const Divider(height: 1),
                _buildProfileListTile(
                  icon: Icons.help_outline_rounded,
                  iconColor: BrandColors.textSecondaryLight,
                  title: 'Ayuda & Soporte',
                  subtitle: 'Centro de atención al cliente',
                  onTap: () {},
                ),
                const Divider(height: 1),
                _buildProfileListTile(
                  icon: Icons.chat_rounded,
                  iconColor: const Color(0xFF25D366),
                  title: 'Únete al canal WhatsApp',
                  subtitle: 'Ofertas exclusivas y soporte directo',
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Sign Out / Sign In Button
          SizedBox(
            width: double.infinity,
            child: widget.sessionState.isGuestMode
                ? ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: BrandColors.bluePrimary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {
                      widget.sessionState.requireLogin();
                    },
                    icon: const Icon(Icons.login_rounded),
                    label: const Text('Iniciar Sesión / Registrarme', style: TextStyle(fontWeight: FontWeight.bold)),
                  )
                : OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: BrandColors.statusError,
                      side: const BorderSide(color: BrandColors.statusError),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () async {
                      await widget.sessionState.signOut();
                      setState(() => _selectedIndex = 0);
                    },
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Cerrar Sesión', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileListTile({
    Key? tileKey,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      key: tileKey,
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: BrandColors.textPrimaryLight),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: BrandColors.textSecondaryLight),
      ),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: BrandColors.textSecondaryLight),
      onTap: onTap,
    );
  }

  void _openEditProfileDialog(BuildContext context) {
    final user = widget.sessionState.currentUser;
    if (user == null || widget.sessionState.isGuestMode) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Inicia sesión para editar tu perfil'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final nameController = TextEditingController(text: user.displayName);
    final phoneController = TextEditingController(text: user.phoneNumber ?? '');
    final formKey = GlobalKey<FormState>();
    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.person, color: BrandColors.bluePrimary),
              SizedBox(width: 8),
              Text('Editar Perfil', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Actualiza tus datos de contacto para entregas y notificaciones.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    key: const Key('edit_profile_name_field'),
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nombre Completo *',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'El nombre es obligatorio';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('edit_profile_phone_field'),
                    controller: phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Número de Teléfono',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.phone_outlined, size: 20),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSaving ? null : () => Navigator.pop(dialogCtx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              key: const Key('edit_profile_save_btn'),
              style: ElevatedButton.styleFrom(
                backgroundColor: BrandColors.bluePrimary,
                foregroundColor: Colors.white,
              ),
              onPressed: isSaving
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDialogState(() => isSaving = true);
                      final newName = nameController.text.trim();
                      final newPhone = phoneController.text.trim();

                      try {
                        await _effectiveUserService.updateProfile(
                          user.uid,
                          displayName: newName,
                          phoneNumber: newPhone.isNotEmpty ? newPhone : null,
                        );
                        widget.sessionState.updateCurrentUser(
                          user.copyWith(
                            displayName: newName,
                            phoneNumber: newPhone.isNotEmpty ? newPhone : null,
                          ),
                        );
                        if (mounted) {
                          Navigator.pop(dialogCtx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('✅ Perfil actualizado correctamente'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSaving = false);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('❌ Error al actualizar: $e'),
                              backgroundColor: Colors.red,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
              child: isSaving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }

  void _openSavedAddressesModal(BuildContext context) {
    final user = widget.sessionState.currentUser;
    if (user == null || widget.sessionState.isGuestMode) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Inicia sesión para gestionar tus direcciones'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        height: MediaQuery.of(sheetCtx).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.location_on, color: BrandColors.statusSuccess),
                      SizedBox(width: 8),
                      Text(
                        'Mis Direcciones Guardadas',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        key: const Key('open_fullscreen_addresses_btn'),
                        icon: const Icon(Icons.open_in_new_rounded, size: 18, color: BrandColors.bluePrimary),
                        tooltip: 'Ver en pantalla completa',
                        visualDensity: VisualDensity.compact,
                        onPressed: () {
                          Navigator.pop(sheetCtx);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => AddressManagerScreen(
                                userId: user.uid,
                                userService: _effectiveUserService,
                                onBack: () => Navigator.of(context).pop(),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 4),
                      ElevatedButton.icon(
                        key: const Key('add_address_btn'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: BrandColors.bluePrimary,
                          foregroundColor: Colors.white,
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        ),
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Nueva', style: TextStyle(fontSize: 12)),
                        onPressed: () => _openAddAddressDialog(sheetCtx, user.uid),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: StreamBuilder<List<SavedAddressEntity>>(
                stream: _effectiveUserService.watchAddresses(user.uid),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final addresses = snapshot.data ?? [];
                  if (addresses.isEmpty) {
                    return const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.location_off_outlined, size: 48, color: Colors.grey),
                          SizedBox(height: 8),
                          Text('No tienes direcciones guardadas'),
                          Text(
                            'Agrega una dirección para pedir más rápido',
                            style: TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: addresses.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final addr = addresses[i];
                      return Container(
                        key: Key('address_tile_${addr.id}'),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: addr.isDefault ? BrandColors.statusSuccess : Colors.grey.shade300,
                            width: addr.isDefault ? 1.5 : 1.0,
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: addr.isDefault
                                  ? BrandColors.statusSuccess.withOpacity(0.15)
                                  : Colors.grey.shade100,
                              child: Icon(
                                addr.label.toLowerCase().contains('trabajo') ||
                                        addr.label.toLowerCase().contains('oficina')
                                    ? Icons.work_outline
                                    : Icons.home_outlined,
                                color: addr.isDefault ? BrandColors.statusSuccess : Colors.grey.shade700,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        addr.label,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      if (addr.isDefault) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: Colors.green.shade50,
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(color: Colors.green.shade200),
                                          ),
                                          child: const Text(
                                            'PREDETERMINADA',
                                            style: TextStyle(
                                              color: Colors.green,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    addr.fullAddress,
                                    style: const TextStyle(fontSize: 13, color: Colors.black87),
                                  ),
                                  if (addr.instructions.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      'Ref: ${addr.instructions}',
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            Column(
                              children: [
                                if (!addr.isDefault)
                                  IconButton(
                                    key: Key('set_default_btn_${addr.id}'),
                                    icon: const Icon(Icons.star_border, size: 20, color: Colors.amber),
                                    tooltip: 'Marcar como predeterminada',
                                    onPressed: () async {
                                      await _effectiveUserService.setDefaultAddress(user.uid, addr.id);
                                    },
                                  ),
                                IconButton(
                                  key: Key('delete_address_btn_${addr.id}'),
                                  icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
                                  tooltip: 'Eliminar dirección',
                                  onPressed: () async {
                                    await _effectiveUserService.deleteAddress(user.uid, addr.id);
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openAddAddressDialog(BuildContext sheetCtx, String uid) {
    final labelController = TextEditingController(text: 'Casa');
    final addressController = TextEditingController();
    final instructionsController = TextEditingController();
    bool isDefault = false;
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: sheetCtx,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Nueva Dirección', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    key: const Key('address_label_field'),
                    controller: labelController,
                    decoration: const InputDecoration(
                      labelText: 'Etiqueta (ej. Casa, Trabajo) *',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    key: const Key('address_full_field'),
                    controller: addressController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Dirección Completa *',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    key: const Key('address_instructions_field'),
                    controller: instructionsController,
                    decoration: const InputDecoration(
                      labelText: 'Punto de referencia o instrucciones',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    key: const Key('address_default_switch'),
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Establecer como predeterminada', style: TextStyle(fontSize: 12)),
                    value: isDefault,
                    onChanged: (val) => setDialogState(() => isDefault = val),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              key: const Key('save_address_btn'),
              style: ElevatedButton.styleFrom(
                backgroundColor: BrandColors.bluePrimary,
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final newAddress = SavedAddressEntity(
                  id: '',
                  userId: uid,
                  label: labelController.text.trim(),
                  fullAddress: addressController.text.trim(),
                  instructions: instructionsController.text.trim(),
                  isDefault: isDefault,
                  createdAt: DateTime.now().millisecondsSinceEpoch,
                  updatedAt: DateTime.now().millisecondsSinceEpoch,
                );
                await _effectiveUserService.saveAddress(uid, newAddress);
                if (mounted) {
                  Navigator.pop(dialogCtx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('✅ Dirección guardada exitosamente'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // B. MOTORIZADO / COURIER SHELL (Dark Operational Mode)
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildCourierShell() {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: const Row(
          children: [
            Icon(Icons.two_wheeler_rounded, color: Color(0xFF818CF8)),
            SizedBox(width: 8),
            Text(
              'BlueSystem Courier',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
            tooltip: 'Cerrar Turno / Salir',
            onPressed: () async {
              await widget.sessionState.signOut();
              setState(() => _selectedIndex = 0);
            },
          ),
        ],
      ),
      body: _buildCourierScreen(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        backgroundColor: BSColors.surfaceDark,
        indicatorColor: BSColors.courierAccent,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.two_wheeler_outlined, color: BSColors.textSecondaryDark),
            selectedIcon: Icon(Icons.two_wheeler, color: Colors.white),
            label: 'Pedidos',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined, color: BSColors.textSecondaryDark),
            selectedIcon: Icon(Icons.local_shipping, color: Colors.white),
            label: 'Envíos',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined, color: BSColors.textSecondaryDark),
            selectedIcon: Icon(Icons.map, color: Colors.white),
            label: 'Flota / GPS',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline, color: BSColors.textSecondaryDark),
            selectedIcon: Icon(Icons.person, color: Colors.white),
            label: 'Mi Perfil',
          ),
        ],
      ),
    );
  }

  Widget _buildCourierScreen() {
    switch (_selectedIndex) {
      case 0:
        return CourierDashboardScreen(
          sessionState: widget.sessionState,
          orderService: widget.orderService,
          tripService: widget.tripService,
          fleetService: widget.fleetService,
          cashClosureService: widget.cashClosureService,
        );
      case 1:
        return TripsScreen(
          sessionState: widget.sessionState,
          tripService: widget.tripService,
          fleetService: widget.fleetService,
          userService: widget.userService,
        );
      case 2:
        return FleetMapScreen(
          sessionState: widget.sessionState,
          fleetService: widget.fleetService,
        );
      case 3:
        return _buildCourierProfileView();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildCourierProfileView() {
    final user = widget.sessionState.currentUser;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const CircleAvatar(
            radius: 40,
            backgroundColor: Color(0xFF1E293B),
            child: Icon(Icons.two_wheeler_rounded, size: 45, color: Color(0xFF818CF8)),
          ),
          const SizedBox(height: 12),
          Text(
            user?.displayName ?? user?.email ?? 'Motorizado Activo',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          Text(user?.email ?? '', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
          const SizedBox(height: 8),
          const Chip(
            label: Text('ROL: MOTORIZADO OFICIAL'),
            backgroundColor: Color(0xFF1E293B),
            labelStyle: TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 11),
          ),
          const SizedBox(height: 24),
          ListTile(
            leading: const Icon(Icons.account_balance_wallet_outlined, color: Colors.white),
            title: const Text('Billetera y Arqueo de Caja', style: TextStyle(color: Colors.white)),
            subtitle: const Text('Liquidación y cierre de turno', style: TextStyle(color: Color(0xFF94A3B8))),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.white70),
            onTap: () => setState(() => _selectedIndex = 0),
          ),
          ListTile(
            leading: const Icon(Icons.motorcycle_outlined, color: Colors.white),
            title: const Text('Vehículo Asignado', style: TextStyle(color: Colors.white)),
            subtitle: const Text('Motocicleta Express', style: TextStyle(color: Color(0xFF94A3B8))),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.white70),
            onTap: () {},
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: () async {
                await widget.sessionState.signOut();
                setState(() => _selectedIndex = 0);
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Cerrar Sesión de Motorizado', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // C. COMERCIO / MERCHANT SHELL (Business Center)
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildMerchantShell() {
    return MerchantDashboardScreen(
      sessionState: widget.sessionState,
      merchantService: widget.merchantService,
      orderService: widget.orderService,
    );
  }


  // ═════════════════════════════════════════════════════════════════════════════
  // MODAL DE CARRITO DE COMPRAS
  // ═════════════════════════════════════════════════════════════════════════════
  void _openCartDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        bool isSubmittingOrder = false;
        String selectedPaymentMethod = 'efectivo';
        final addressController = TextEditingController(text: 'Colonia Centroamérica, Managua');

        return StatefulBuilder(
          builder: (context, setModalState) {
            final theme = Theme.of(context);
            final businessId = _cartItems.isNotEmpty
                ? (_cartItems.first['businessId'] as String? ?? '')
                : '';

            return StreamBuilder<BusinessEntity?>(
              stream: businessId.isNotEmpty
                  ? widget.merchantService.watchBusiness(businessId)
                  : Stream.value(null),
              builder: (context, snapshot) {
                final business = snapshot.data;
                _cart.setActiveBusiness(business);
                // GATE-01: Dynamic deliveryFee from SSOT /businesses/{id}.deliveryFee, fallback C$45.00. NEVER C$35.00
                final double deliveryFee = _cart.deliveryFee;
                final totalWithDelivery = _cart.total;

                return Container(
                  height: MediaQuery.of(context).size.height * 0.75,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
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
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            '🛒 Tu Carrito de Compras',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          if (_cartItems.isNotEmpty)
                            TextButton(
                              onPressed: () {
                                _clearCart();
                                setModalState(() {});
                              },
                              child: const Text('Vaciar', style: TextStyle(color: Colors.red)),
                            ),
                        ],
                      ),
                      const Divider(),
                      if (_cartItems.isEmpty)
                        Expanded(
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.shopping_bag_outlined, size: 64, color: Colors.grey.shade400),
                                const SizedBox(height: 12),
                                const Text('Tu carrito está vacío', style: TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                Text('Agrega tus platillos favoritos desde el menú', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                              ],
                            ),
                          ),
                        )
                      else
                        Expanded(
                          child: ListView.separated(
                            itemCount: _cartItems.length,
                            separatorBuilder: (_, __) => const Divider(),
                            itemBuilder: (context, index) {
                              final item = _cartItems[index];
                              return Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['name'] as String,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        Text(
                                          '${item['business']} • C\$ ${(item['price'] as double).toInt()}',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                        ),
                                        if (item['optionsSummary'] != null && (item['optionsSummary'] as String).isNotEmpty)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 2.0),
                                            child: Text(
                                              '+ ${item['optionsSummary']}',
                                              style: const TextStyle(fontSize: 10, color: Color(0xFF2563EB), fontWeight: FontWeight.w600),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove_circle_outline, size: 20),
                                        onPressed: () {
                                          setModalState(() {
                                            _cart.updateQuantity(index, -1);
                                          });
                                          setState(() {});
                                        },
                                      ),
                                      Text(
                                        '${item['quantity']}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add_circle_outline, size: 20),
                                        onPressed: () {
                                          setModalState(() {
                                            _cart.updateQuantity(index, 1);
                                          });
                                          setState(() {});
                                        },
                                      ),
                                    ],
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      if (_cartItems.isNotEmpty) ...[
                        const Divider(),
                        // Delivery Address selector (GAP-UI-01)
                        const Row(
                          children: [
                            Icon(Icons.location_on, size: 16, color: Color(0xFF10B981)),
                            SizedBox(width: 4),
                            Text('Dirección de entrega:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        if (widget.sessionState.currentUser != null &&
                            !widget.sessionState.isGuestMode)
                          StreamBuilder<List<SavedAddressEntity>>(
                            stream: _effectiveUserService.watchAddresses(widget.sessionState.currentUser!.uid),
                            builder: (context, addrSnap) {
                              final savedAddrs = addrSnap.data ?? [];
                              if (savedAddrs.isEmpty) return const SizedBox.shrink();
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: SingleChildScrollView(
                                  scrollDirection: Axis.horizontal,
                                  child: Row(
                                    children: savedAddrs.map((sa) {
                                      return Padding(
                                        padding: const EdgeInsets.only(right: 6),
                                        child: ActionChip(
                                          key: Key('quick_select_address_${sa.id}'),
                                          avatar: Icon(
                                            sa.isDefault ? Icons.check_circle : Icons.location_on,
                                            size: 14,
                                            color: BrandColors.bluePrimary,
                                          ),
                                          label: Text(
                                            '${sa.label}: ${sa.fullAddress}',
                                            style: const TextStyle(fontSize: 11),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          onPressed: () {
                                            setModalState(() {
                                              addressController.text = sa.fullAddress;
                                            });
                                          },
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                              );
                            },
                          ),
                        TextField(
                          key: const Key('checkout_delivery_address_field'),
                          controller: addressController,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            hintText: 'Ingresa tu dirección de entrega...',
                          ),
                          style: const TextStyle(fontSize: 12),
                        ),
                        const SizedBox(height: 8),

                        // Payment Method selector (GAP-UI-02)
                        const Row(
                          children: [
                            Icon(Icons.payment, size: 16, color: Color(0xFF2563EB)),
                            SizedBox(width: 4),
                            Text('Método de pago:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            ChoiceChip(
                              key: const Key('checkout_payment_cash_chip'),
                              label: const Text('Efectivo', style: TextStyle(fontSize: 11)),
                              selected: selectedPaymentMethod == 'efectivo',
                              onSelected: (val) {
                                if (val) setModalState(() => selectedPaymentMethod = 'efectivo');
                              },
                            ),
                            const SizedBox(width: 6),
                            ChoiceChip(
                              key: const Key('checkout_payment_transfer_chip'),
                              label: const Text('Transferencia', style: TextStyle(fontSize: 11)),
                              selected: selectedPaymentMethod == 'transferencia',
                              onSelected: (val) {
                                if (val) setModalState(() => selectedPaymentMethod = 'transferencia');
                              },
                            ),
                            const SizedBox(width: 6),
                            ChoiceChip(
                              key: const Key('checkout_payment_card_chip'),
                              label: const Text('Tarjeta', style: TextStyle(fontSize: 11)),
                              selected: selectedPaymentMethod == 'tarjeta',
                              onSelected: (val) {
                                if (val) setModalState(() => selectedPaymentMethod = 'tarjeta');
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Subtotal:'),
                            Text('C\$ ${_cartTotal.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Tarifa de Envío:'),
                            Text('C\$ ${deliveryFee.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total a Pagar:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            Text(
                              'C\$ ${totalWithDelivery.toInt()}',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: isSubmittingOrder
                                ? null
                                : () async {
                                    if (widget.sessionState.isGuestMode ||
                                        widget.sessionState.currentUser == null) {
                                      Navigator.pop(ctx);
                                      setState(() => _selectedIndex = 3);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Por favor inicia sesión para confirmar y enviar tu pedido.'),
                                          duration: Duration(seconds: 3),
                                        ),
                                      );
                                      return;
                                    }

                                    setModalState(() => isSubmittingOrder = true);

                                    final user = widget.sessionState.currentUser!;
                                    final customerId = user.uid;
                                    final customerName = user.displayName.isNotEmpty ? user.displayName : 'Cliente';
                                    final customerPhone = user.phoneNumber ?? '';

                                    final bizId = business?.businessId.isNotEmpty == true
                                        ? business!.businessId
                                        : businessId;
                                    final bizName = business?.name.isNotEmpty == true
                                        ? business!.name
                                        : (_cartItems.first['business'] as String? ?? 'Comercio');
                                    final bizAddress = business?.address ?? '';
                                    final bizLat = business?.latitude ?? 0.0;
                                    final bizLng = business?.longitude ?? 0.0;
                                    final tenantId = business?.tenantId.isNotEmpty == true
                                        ? business!.tenantId
                                        : (_cartItems.first['tenantId'] as String? ?? 'default');

                                    final orderItems = _cartItems.map((item) {
                                      final qty = item['quantity'] as int;
                                      final price = (item['price'] as num).toDouble();
                                      return {
                                        'productId': item['id'] as String,
                                        'productName': item['name'] as String,
                                        'price': price,
                                        'basePrice': (item['basePrice'] as num?)?.toDouble() ?? price,
                                        'quantity': qty,
                                        'subtotal': price * qty,
                                        'imageUrl': item['imageUrl'] as String?,
                                        'selectedOptions': (item['selectedOptions'] as List<dynamic>?)
                                                ?.map((o) => Map<String, dynamic>.from(o as Map))
                                                .toList() ??
                                            <Map<String, dynamic>>[],
                                      };
                                    }).toList();

                                    final subtotal = _cartTotal;
                                    final total = subtotal + deliveryFee;

                                    final words = bizName.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
                                    final cleanPrefix = words.length >= 3
                                        ? words.take(3).map((w) => w[0].toUpperCase()).join()
                                        : (words.length == 2
                                            ? (words[0].substring(0, words[0].length >= 2 ? 2 : 1) + words[1].substring(0, 1)).toUpperCase()
                                            : (words.isNotEmpty ? words[0].substring(0, words[0].length >= 4 ? 4 : words[0].length).toUpperCase() : 'ORD'));

                                    final effectiveAddress = addressController.text.trim().isNotEmpty
                                        ? addressController.text.trim()
                                        : 'Colonia Centroamérica, Managua';
                                    final effectivePaymentMethod = selectedPaymentMethod;

                                    final orderPayload = <String, dynamic>{
                                      'customerId': customerId,
                                      'clienteId': customerId,
                                      'userId': customerId,
                                      'uid': customerId,
                                      'customerName': customerName,
                                      'customerPhone': customerPhone,
                                      'businessId': bizId,
                                      'businessName': bizName,
                                      'branchId': _cartItems.first['branchId'] ?? '',
                                      'tenantId': tenantId,
                                      'commercialTenantId': tenantId,
                                      'municipalityId': business?.city ?? 'MANAGUA',
                                      'municipalityName': business?.city ?? 'Managua',
                                      'cityId': business?.city ?? 'MANAGUA',
                                      'city': business?.city ?? 'Managua',
                                      'cityName': business?.city ?? 'Managua',
                                      'routeDistanceMeters': 0,
                                      'routeDistanceKm': 0.0,
                                      'distanceKm': 0.0,
                                      'distanceSource': 'FALLBACK_ESTIMATED',
                                      'routingProvider': 'FALLBACK_ESTIMATED',
                                      'items': orderItems,
                                      'subtotal': subtotal,
                                      'merchantGrossSales': subtotal,
                                      'deliveryFee': deliveryFee,
                                      'discountAmount': 0.0,
                                      'couponCode': '',
                                      'couponDiscount': 0.0,
                                      'promotionDiscount': 0.0,
                                      'totalDiscount': 0.0,
                                      'coupon': <String, dynamic>{},
                                      'additionalChargeAmount': 0.0,
                                      'additionalCharge': 0.0,
                                      'tipAmount': 0.0,
                                      'tip': 0.0,
                                      'deliveryNote': '',
                                      'notes': '',
                                      'instructions': '',
                                      'deliveryInstructions': '',
                                      'total': total,
                                      'customerTotal': total,
                                      'valoresMonetarios': {
                                        'subtotal': subtotal,
                                        'merchantGrossSales': subtotal,
                                        'costoEnvio': deliveryFee,
                                        'cargoAdicional': 0.0,
                                        'propina': 0.0,
                                        'descuento': 0.0,
                                        'total': total,
                                        'customerTotal': total,
                                        'metodoPago': effectivePaymentMethod,
                                      },
                                      'status': 'pending',
                                      'estado': 'pendiente',
                                      'paymentMethod': effectivePaymentMethod,
                                      'paymentStatus': 'pending',
                                      'paymentVerified': false,
                                      'addressId': '',
                                      'address': effectiveAddress,
                                      'deliveryAddress': effectiveAddress,
                                      'destinationAddress': effectiveAddress,
                                      'fullAddress': effectiveAddress,
                                      'latitude': 12.1364,
                                      'longitude': -86.2514,
                                      'destinationLatitude': 12.1364,
                                      'destinationLongitude': -86.2514,
                                      'destino': {
                                        'direccion': effectiveAddress,
                                        'coordenadas': {
                                          'latitud': 12.1364,
                                          'longitud': -86.2514,
                                        },
                                      },
                                      'destination': {
                                        'address': effectiveAddress,
                                        'latitude': 12.1364,
                                        'longitude': -86.2514,
                                      },
                                      'origen': {
                                        'nombreComercio': bizName,
                                        'direccion': bizAddress,
                                        'coordenadas': {
                                          'latitud': bizLat,
                                          'longitud': bizLng,
                                        },
                                      },
                                      'origin': {
                                        'businessName': bizName,
                                        'address': bizAddress,
                                        'latitude': bizLat,
                                        'longitude': bizLng,
                                      },
                                      'orderCodePrefix': cleanPrefix,
                                      'platform': 'IOS',
                                      'courierPhase': 1,
                                      'hasBeenRated': false,
                                    };

                                    try {
                                      final orderId = await widget.orderService.createOrder(orderPayload);
                                      _clearCart();
                                      if (ctx.mounted) {
                                        Navigator.pop(ctx);
                                      }
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('¡Pedido enviado con éxito! ID: $orderId 🛵'),
                                            backgroundColor: Colors.green,
                                            duration: const Duration(seconds: 4),
                                          ),
                                        );
                                        setState(() => _selectedIndex = 2);
                                      }
                                    } catch (e) {
                                      if (ctx.mounted) {
                                        setModalState(() => isSubmittingOrder = false);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Error al enviar pedido: $e'),
                                            backgroundColor: Colors.red,
                                            duration: const Duration(seconds: 4),
                                          ),
                                        );
                                      }
                                    }
                                  },
                            child: isSubmittingOrder
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Confirmar y Enviar Pedido',
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
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

  void _handleNavigation(String routeName) {
    switch (routeName) {
      case '/orders':
        setState(() => _selectedIndex = 2);
        break;
      case '/trips':
        setState(() => _selectedIndex = 1);
        break;
      case '/fleet':
        setState(() => _selectedIndex = 2);
        break;
    }
  }
}
