/// BLUE SYSTEM DELIVERY ENTERPRISE — APPLICATION SHELL
/// Parity with Android BlueSystem Architecture:
/// Dynamic role switching (Customer/Guest, Courier, Merchant).
/// Android-aligned Curved Bottom Bar with Central Floating Cart Button for Customers.
/// Dark-mode Operational Panel for Motorizados, Merchant Center for Comercios.

import 'package:flutter/material.dart';

import '../../../core/auth/auth_context.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../../data/services/banner_service.dart';
import '../../../data/services/courier_cash_closure_service.dart';
import '../../providers/session_state.dart';
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

        // Reset selected index if exceeding tab bounds
        final maxTabs = isCourier ? 4 : (isMerchant ? 4 : 4);
        if (_selectedIndex >= maxTabs) {
          _selectedIndex = 0;
        }

        // ─── 3. Render Appropriate Shell Based on Role ───────────────────────
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
    final theme = Theme.of(context);
    final brand = widget.sessionState.activeBrand;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.delivery_dining_rounded, size: 24, color: Color(0xFF2563EB)),
            const SizedBox(width: 8),
            Text(
              brand?.displayName ?? 'BlueSystem Delivery',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          if (widget.sessionState.isOffline) const OfflineBanner(),
          if (isGuestMode)
            TextButton.icon(
              onPressed: () {
                setState(() => _selectedIndex = 3); // Navegar a tab Mi Perfil (Login)
              },
              icon: const Icon(Icons.login_rounded, size: 18),
              label: const Text('Ingresar'),
            )
          else
            IconButton(
              icon: const Icon(Icons.account_circle_outlined),
              tooltip: 'Mi Cuenta',
              onPressed: () => setState(() => _selectedIndex = 3),
            ),
        ],
      ),
      body: _buildCustomerScreen(isGuestMode),
      floatingActionButton: FloatingActionButton(
        onPressed: _openCartDialog,
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
        elevation: 6,
        shape: const CircleBorder(),
        child: Badge(
          isLabelVisible: _cartItems.isNotEmpty,
          label: Text(
            '${_cartItems.length}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          ),
          child: const Icon(Icons.shopping_bag_rounded, size: 26),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8.0,
        color: theme.colorScheme.surface,
        elevation: 12,
        child: SizedBox(
          height: 60,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              // Tab 0: Inicio
              _buildBottomNavItem(
                icon: Icons.home_rounded,
                label: 'Inicio',
                isSelected: _selectedIndex == 0,
                onTap: () => setState(() => _selectedIndex = 0),
              ),
              // Tab 1: Favoritos
              _buildBottomNavItem(
                icon: Icons.favorite_rounded,
                label: 'Favoritos',
                isSelected: _selectedIndex == 1,
                onTap: () => setState(() => _selectedIndex = 1),
              ),
              // Spacer for the center FAB
              const SizedBox(width: 48),
              // Tab 2: Pedidos
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
              // Tab 3: Mi Perfil
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
    );
  }

  Widget _buildBottomNavItem({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final color = isSelected ? const Color(0xFF2563EB) : Colors.grey.shade500;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
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
              onPressed: () => setState(() => _selectedIndex = 0),
              child: const Text('Explorar Restaurantes'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserProfileView() {
    final user = widget.sessionState.currentUser;
    final claims = widget.sessionState.claims;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: const Color(0xFF2563EB).withOpacity(0.15),
            child: const Icon(Icons.person, size: 45, color: Color(0xFF2563EB)),
          ),
          const SizedBox(height: 12),
          Text(
            user?.displayName ?? user?.email ?? 'Cliente Registrado',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          Text(user?.email ?? '', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          const SizedBox(height: 8),
          Chip(
            label: Text('ROL: ${claims?.role.name.toUpperCase() ?? "CLIENT"}'),
            backgroundColor: const Color(0xFF2563EB).withOpacity(0.1),
            labelStyle: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 11),
          ),
          const SizedBox(height: 24),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: const Text('Mis Direcciones'),
            subtitle: const Text('Managua, Nicaragua'),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.local_offer_outlined),
            title: const Text('Cupones y Descuentos'),
            subtitle: const Text('Promociones activas disponibles'),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.security_outlined),
            title: const Text('Seguridad y PIN'),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
            onTap: () {},
          ),
          const Divider(),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
                padding: const EdgeInsets.symmetric(vertical: 14),
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
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.storefront_rounded, color: Color(0xFF2563EB)),
            SizedBox(width: 8),
            Text('Panel de Comercio', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.red),
            tooltip: 'Cerrar Sesión',
            onPressed: () async {
              await widget.sessionState.signOut();
              setState(() => _selectedIndex = 0);
            },
          ),
        ],
      ),
      body: _buildMerchantScreen(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront_rounded),
            label: 'Mi Comercio',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded),
            label: 'Pedidos',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping_rounded),
            label: 'Envíos',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }

  Widget _buildMerchantScreen() {
    switch (_selectedIndex) {
      case 0:
        return MerchantDashboardScreen(
          sessionState: widget.sessionState,
          merchantService: widget.merchantService,
        );
      case 1:
        return OrdersScreen(
          sessionState: widget.sessionState,
          orderService: widget.orderService,
        );
      case 2:
        return TripsScreen(
          sessionState: widget.sessionState,
          tripService: widget.tripService,
        );
      case 3:
        return _buildUserProfileView();
      default:
        return const SizedBox.shrink();
    }
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
