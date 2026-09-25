/// BLUE SYSTEM DELIVERY ENTERPRISE — APPLICATION SHELL
/// Parity with Android BlueSystem Architecture:
/// Dynamic role switching (Customer/Guest, Courier, Merchant).
/// Android-aligned Curved Bottom Bar with Central Floating Cart Button for Customers.
/// Dark-mode Operational Panel for Motorizados, Merchant Center for Comercios.

import 'package:flutter/material.dart';

import '../../../core/auth/auth_context.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../../data/services/courier_cash_closure_service.dart';
import '../../providers/session_state.dart';
import '../../theme/brand_theme_builder.dart';
import '../../widgets/state_views.dart';
import '../auth/login_screen.dart';
import '../courier/courier_dashboard_screen.dart';
import '../fleet/fleet_map_screen.dart';
import '../home/commercial_home_screen.dart';
import '../merchant/merchant_dashboard_screen.dart';
import '../orders/orders_screen.dart';
import '../trips/trips_screen.dart';

class AppShell extends StatefulWidget {
  final SessionState sessionState;
  final IOrderService orderService;
  final ITripService tripService;
  final IFleetService fleetService;
  final IMerchantService merchantService;
  final IBannerService? bannerService;
  final ICourierCashClosureService? cashClosureService;

  const AppShell({
    super.key,
    required this.sessionState,
    required this.orderService,
    required this.tripService,
    required this.fleetService,
    required this.merchantService,
    this.bannerService,
    this.cashClosureService,
  });

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _selectedIndex = 0;
  final List<Map<String, dynamic>> _cartItems = [];

  void _addToCart(ProductEntity product, String businessName) {
    setState(() {
      final existingIndex = _cartItems.indexWhere((item) => item['id'] == product.productId);
      if (existingIndex >= 0) {
        _cartItems[existingIndex]['quantity'] = (_cartItems[existingIndex]['quantity'] as int) + 1;
      } else {
        _cartItems.add({
          'id': product.productId,
          'name': product.name,
          'price': product.price,
          'business': businessName,
          'quantity': 1,
        });
      }
    });
  }

  void _clearCart() {
    setState(() {
      _cartItems.clear();
    });
  }

  double get _cartTotal {
    return _cartItems.fold(0.0, (sum, item) => sum + (item['price'] as double) * (item['quantity'] as int));
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
      floatingActionButton: Container(
        height: 64,
        width: 64,
        margin: const EdgeInsets.only(top: 24),
        child: FloatingActionButton(
          onPressed: _openCartDialog,
          backgroundColor: BrandColors.fabAccent, // Vibrant Red/Pink (#FF2D55)
          foregroundColor: Colors.white,
          elevation: 8,
          shape: const CircleBorder(),
          child: Badge(
            isLabelVisible: _cartItems.isNotEmpty,
            backgroundColor: BrandColors.bluePrimary,
            label: Text(
              '${_cartItems.length}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
            ),
            child: const Icon(Icons.shopping_cart_rounded, size: 28),
          ),
        ),
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
        );
      case 1:
        return _buildFavoritesView();
      case 2:
        return OrdersScreen(
          sessionState: widget.sessionState,
          orderService: widget.orderService,
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
                  icon: Icons.person_outline,
                  iconColor: BrandColors.bluePrimary,
                  title: 'Mi Perfil',
                  subtitle: 'Datos personales y contacto',
                  onTap: () {},
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
                  icon: Icons.location_on_outlined,
                  iconColor: BrandColors.statusSuccess,
                  title: 'Mis direcciones',
                  subtitle: 'Gestionar puntos de entrega',
                  onTap: () {},
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
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
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
        backgroundColor: const Color(0xFF0F172A),
        indicatorColor: const Color(0xFF6366F1),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.two_wheeler_outlined, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.two_wheeler, color: Colors.white),
            label: 'Pedidos',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.local_shipping, color: Colors.white),
            label: 'Envíos',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.map, color: Colors.white),
            label: 'Flota / GPS',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline, color: Color(0xFF94A3B8)),
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
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final theme = Theme.of(context);
          const deliveryFee = 35.0;
          final totalWithDelivery = _cartTotal > 0 ? _cartTotal + deliveryFee : 0.0;

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
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 20),
                                  onPressed: () {
                                    setModalState(() {
                                      final currentQty = item['quantity'] as int;
                                      if (currentQty > 1) {
                                        item['quantity'] = currentQty - 1;
                                      } else {
                                        _cartItems.removeAt(index);
                                      }
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
                                      item['quantity'] = (item['quantity'] as int) + 1;
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal:'),
                      Text('C\$ ${_cartTotal.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Tarifa de Envío:'),
                      Text('C\$ 35', style: TextStyle(fontWeight: FontWeight.bold)),
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
                      onPressed: () {
                        Navigator.pop(ctx);
                        if (widget.sessionState.isGuestMode) {
                          setState(() => _selectedIndex = 3);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Por favor inicia sesión para confirmar y enviar tu pedido.'),
                              duration: Duration(seconds: 3),
                            ),
                          );
                        } else {
                          _clearCart();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('¡Pedido enviado con éxito! Un motorizado lo recogerá pronto. 🛵'),
                              backgroundColor: Colors.green,
                              duration: Duration(seconds: 4),
                            ),
                          );
                          setState(() => _selectedIndex = 2); // Ir a la pestaña de Pedidos
                        }
                      },
                      child: const Text('Confirmar y Enviar Pedido', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
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
