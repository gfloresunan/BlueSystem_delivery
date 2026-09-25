/// BLUE SYSTEM DELIVERY ENTERPRISE — APPLICATION SHELL
/// Authenticated shell with dynamic brand navigation, session lifecycle, and Gatekeeper-aware routing.

import 'package:flutter/material.dart';

import '../../../core/auth/auth_context.dart';
import '../../providers/session_state.dart';
import '../../widgets/state_views.dart';
import '../auth/login_screen.dart';
import '../courier/courier_dashboard_screen.dart';
import '../home/commercial_home_screen.dart';
import '../orders/orders_screen.dart';
import '../trips/trips_screen.dart';
import '../fleet/fleet_map_screen.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../../data/services/banner_service.dart';
import '../../../data/services/courier_cash_closure_service.dart';

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

  List<_NavItem> _getNavItems(bool isCourier) {
    if (isCourier) {
      return const [
        _NavItem(label: 'Motorizado', icon: Icons.two_wheeler_outlined, selectedIcon: Icons.two_wheeler, moduleKey: 'COURIER'),
        _NavItem(label: 'Pedidos', icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long, moduleKey: 'ORDERS'),
        _NavItem(label: 'Envíos', icon: Icons.local_shipping_outlined, selectedIcon: Icons.local_shipping, moduleKey: 'TRIPS'),
        _NavItem(label: 'Flota', icon: Icons.map_outlined, selectedIcon: Icons.map, moduleKey: 'FLEET'),
      ];
    }
    return const [
      _NavItem(label: 'Inicio', icon: Icons.home_outlined, selectedIcon: Icons.home, moduleKey: null),
      _NavItem(label: 'Pedidos', icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long, moduleKey: 'ORDERS'),
      _NavItem(label: 'Envíos', icon: Icons.local_shipping_outlined, selectedIcon: Icons.local_shipping, moduleKey: 'TRIPS'),
      _NavItem(label: 'Flota', icon: Icons.two_wheeler_outlined, selectedIcon: Icons.two_wheeler, moduleKey: 'FLEET'),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.sessionState,
      builder: (context, _) {
        final status = widget.sessionState.status;

        // ─── Uninitialized ─────────────────────────────────────────────────
        if (status == AuthStatus.uninitialized) {
          return const Scaffold(body: LoadingView(message: 'Inicializando BlueSystem Enterprise...'));
        }

        // ─── Unauthenticated / Error / Authenticating → Login ────────────────
        if (status == AuthStatus.unauthenticated ||
            status == AuthStatus.error ||
            status == AuthStatus.authenticating) {
          return LoginScreen(
            sessionState: widget.sessionState,
            onLoginSuccess: () {
              setState(() => _selectedIndex = 0);
            },
          );
        }

        // ─── Authenticated → Commercial Shell ──────────────────────────────
        final brand = widget.sessionState.activeBrand;
        final isCourier = widget.sessionState.claims?.role == EiamRole.driver ||
            widget.sessionState.currentUser?.role == EiamRole.driver;
        final navItems = _getNavItems(isCourier);
        final isGuestMode = widget.sessionState.currentUser == null ||
            (widget.sessionState.claims?.role == EiamRole.guest &&
                widget.sessionState.currentUser?.role != EiamRole.driver);

        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                const Icon(Icons.delivery_dining_rounded, size: 24),
                const SizedBox(width: 8),
                Text(brand?.displayName ?? 'BlueSystem Delivery'),
              ],
            ),
            actions: [
              if (widget.sessionState.isOffline) const OfflineBanner(),
              if (isGuestMode)
                TextButton.icon(
                  onPressed: () => widget.sessionState.signOut(),
                  icon: const Icon(Icons.login_rounded, size: 18),
                  label: const Text('Iniciar Sesión'),
                )
              else
                IconButton(
                  icon: const Icon(Icons.account_circle_outlined),
                  tooltip: widget.sessionState.currentUser?.email ?? 'Perfil',
                  onPressed: () => _showUserMenu(context),
                ),
            ],
          ),
          body: _buildCurrentScreen(isCourier),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
            destinations: navItems.map((item) {
              final isAllowed = item.moduleKey == null || widget.sessionState.canAccess(item.moduleKey!);
              return NavigationDestination(
                icon: Icon(item.icon, color: isAllowed ? null : Colors.grey.shade600),
                selectedIcon: Icon(item.selectedIcon),
                label: item.label,
                tooltip: isAllowed ? item.label : '${item.label} (No habilitado)',
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Widget _buildCurrentScreen(bool isCourier) {
    switch (_selectedIndex) {
      case 0:
        if (isCourier) {
          return CourierDashboardScreen(
            sessionState: widget.sessionState,
            orderService: widget.orderService,
            tripService: widget.tripService,
            fleetService: widget.fleetService,
            cashClosureService: widget.cashClosureService,
          );
        }
        return CommercialHomeScreen(
          sessionState: widget.sessionState,
          onNavigate: _handleNavigation,
          bannerService: widget.bannerService,
        );
      case 1:
        if (!widget.sessionState.canAccess('ORDERS')) {
          return const UnauthorizedView(moduleKey: 'ORDERS');
        }
        return OrdersScreen(
          sessionState: widget.sessionState,
          orderService: widget.orderService,
        );
      case 2:
        if (!widget.sessionState.canAccess('TRIPS')) {
          return const UnauthorizedView(moduleKey: 'TRIPS');
        }
        return TripsScreen(
          sessionState: widget.sessionState,
          tripService: widget.tripService,
        );
      case 3:
        if (!widget.sessionState.canAccess('FLEET')) {
          return const UnauthorizedView(moduleKey: 'FLEET');
        }
        return FleetMapScreen(
          sessionState: widget.sessionState,
          fleetService: widget.fleetService,
        );
      default:
        return const EmptyView(title: 'Módulo no encontrado', message: 'Seleccione un módulo válido del menú inferior.');
    }
  }

  void _handleNavigation(String routeName) {
    switch (routeName) {
      case '/orders':
        setState(() => _selectedIndex = 1);
        break;
      case '/trips':
        setState(() => _selectedIndex = 2);
        break;
      case '/fleet':
        setState(() => _selectedIndex = 3);
        break;
    }
  }

  void _showUserMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.person),
              title: Text(widget.sessionState.currentUser?.displayName ?? 'Usuario'),
              subtitle: Text(widget.sessionState.currentUser?.email ?? ''),
            ),
            ListTile(
              leading: const Icon(Icons.badge_outlined),
              title: Text('Rol: ${widget.sessionState.claims?.role.name.toUpperCase() ?? "GUEST"}'),
              subtitle: Text('Tenant: ${widget.sessionState.claims?.tenantId ?? "—"}'),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Cerrar Sesión', style: TextStyle(color: Colors.red)),
              onTap: () async {
                Navigator.pop(ctx);
                await widget.sessionState.signOut();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String? moduleKey;
  const _NavItem({required this.label, required this.icon, required this.selectedIcon, this.moduleKey});
}
