/// BLUE SYSTEM DELIVERY ENTERPRISE — ADMIN DASHBOARD (FLUTTER)
/// Live Operations Command Center with 5 Canonical KPI Domains.

import 'package:flutter/material.dart';
import '../../../data/services/admin_service.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../providers/session_state.dart';
import 'admin_drawer.dart';
import 'submodules/admin_merchant_requests_screen.dart';
import 'submodules/admin_courier_requests_screen.dart';
import 'submodules/admin_courier_profile_screen.dart';
import 'submodules/admin_identity_center_screen.dart';
import 'submodules/admin_support_center_screen.dart';
import 'submodules/admin_courier_cash_screen.dart';
import 'submodules/admin_live_courier_monitor_screen.dart';
import 'submodules/admin_enterprise_commerce_screen.dart';
import 'submodules/admin_global_config_screen.dart';
import 'submodules/admin_notification_center_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final IOrderService orderService;
  final ITripService tripService;
  final IFleetService fleetService;

  const AdminDashboardScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.orderService,
    required this.tripService,
    required this.fleetService,
  });

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  String _currentRoute = 'dashboard';

  void _navigateToSubmodule(String route) {
    setState(() => _currentRoute = route);
    if (_scaffoldKey.currentState?.isDrawerOpen == true) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    // ─── Submodule Switcher ──────────────────────────────────────────────────
    Widget bodyContent;
    switch (_currentRoute) {
      case 'merchant_requests':
        bodyContent = AdminMerchantRequestsScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'courier_requests':
        bodyContent = AdminCourierRequestsScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'courier_profile_requests':
        bodyContent = AdminCourierProfileScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'identities':
        bodyContent = AdminIdentityCenterScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'support':
        bodyContent = AdminSupportCenterScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'courier_cash':
        bodyContent = AdminCourierCashScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'courier_monitor':
        bodyContent = AdminLiveCourierMonitorScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'businesses':
        bodyContent = AdminEnterpriseCommerceScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'global_config':
        bodyContent = AdminGlobalConfigScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
        );
        break;
      case 'notifications':
        bodyContent = AdminNotificationCenterScreen(
          adminService: widget.adminService,
          sessionState: widget.sessionState,
          onBack: () => setState(() => _currentRoute = 'dashboard'),
          onNavigate: _navigateToSubmodule,
        );
        break;
      default:
        bodyContent = _buildDashboardConsole();
        break;
    }

    return Scaffold(
      key: _scaffoldKey,
      drawer: AdminDrawer(
        sessionState: widget.sessionState,
        currentRoute: _currentRoute,
        onNavigate: _navigateToSubmodule,
      ),
      body: bodyContent,
    );
  }

  Widget _buildDashboardConsole() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('BlueSystem Admin', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Centro de Operaciones Globales', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ),
        actions: [
          StreamBuilder<List<AdminNotificationModel>>(
            stream: widget.adminService.getAdminNotificationsStream(widget.sessionState.currentUser?.uid ?? ''),
            builder: (context, snapshot) {
              final unreadCount = (snapshot.data ?? []).where((n) => !n.isRead).length;
              return IconButton(
                icon: Badge(
                  isLabelVisible: unreadCount > 0,
                  label: Text(unreadCount > 99 ? '99+' : unreadCount.toString()),
                  backgroundColor: const Color(0xFFEF4444),
                  child: const Icon(Icons.notifications_rounded, size: 22),
                ),
                tooltip: 'Centro de Notificaciones',
                onPressed: () => _navigateToSubmodule('notifications'),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.gps_fixed_rounded, size: 20),
            tooltip: 'Live Courier Monitor',
            onPressed: () => _navigateToSubmodule('courier_monitor'),
          ),
          Container(
            margin: const EdgeInsets.only(right: 12, left: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.2),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Row(
              children: [
                Icon(Icons.circle, color: Color(0xFF10B981), size: 8),
                SizedBox(width: 4),
                Text('LIVE', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Header Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF0284C7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('PANEL EJECUTIVO', style: TextStyle(color: Color(0xFF93C5FD), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
                  SizedBox(height: 4),
                  Text('Supervisión en Tiempo Real', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text('Control directo sobre órdenes, flota, comercios y liquidaciones', style: TextStyle(color: Color(0xFFE0F2FE), fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 2. DOMAIN 1: Pedidos Globales
            const Text('1. OPERACIÓN DE PEDIDOS GLOBALES', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569), letterSpacing: 0.5)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildKpiCard(
                    title: 'Entregas Activas',
                    value: '14',
                    icon: Icons.delivery_dining,
                    color: const Color(0xFF2563EB),
                    onTap: () => _navigateToSubmodule('courier_monitor'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildKpiCard(
                    title: 'Express X→Y',
                    value: '6',
                    icon: Icons.local_shipping,
                    color: const Color(0xFF0D9488),
                    onTap: () => _navigateToSubmodule('courier_monitor'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 3. DOMAIN 2: Flota & Telemetría
            const Text('2. ESTADO DE FLOTA & TELEMETRÍA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569), letterSpacing: 0.5)),
            const SizedBox(height: 8),
            StreamBuilder<List<ActiveCourierGpsModel>>(
              stream: widget.adminService.getActiveCouriersGpsStream(),
              builder: (context, snapshot) {
                final couriers = snapshot.data ?? [];
                final onlineCount = couriers.where((c) => ['disponible', 'activo', 'online'].contains(c.availabilityStatus.toLowerCase())).length;

                return Row(
                  children: [
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Flota Transmitiendo',
                        value: couriers.length.toString(),
                        icon: Icons.two_wheeler,
                        color: const Color(0xFF10B981),
                        onTap: () => _navigateToSubmodule('courier_monitor'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Disponibles GPS',
                        value: onlineCount.toString(),
                        icon: Icons.fmd_good,
                        color: const Color(0xFF059669),
                        onTap: () => _navigateToSubmodule('courier_monitor'),
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),

            // 4. DOMAIN 3: Solicitudes Pendientes
            const Text('3. SOLICITUDES & AUDITORÍA PENDIENTE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569), letterSpacing: 0.5)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: StreamBuilder<List<MerchantApplicationModel>>(
                    stream: widget.adminService.getMerchantApplicationsStream(),
                    builder: (context, snap) {
                      final count = (snap.data ?? []).where((a) => a.status == 'PENDING').length;
                      return _buildKpiCard(
                        title: 'Altas Comercios',
                        value: count.toString(),
                        icon: Icons.storefront,
                        color: const Color(0xFFF59E0B),
                        onTap: () => _navigateToSubmodule('merchant_requests'),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StreamBuilder<List<CourierApplicationModel>>(
                    stream: widget.adminService.getCourierApplicationsStream(),
                    builder: (context, snap) {
                      final count = (snap.data ?? []).where((a) => a.status == 'PENDING').length;
                      return _buildKpiCard(
                        title: 'Altas Motorizados',
                        value: count.toString(),
                        icon: Icons.person_add_alt_1,
                        color: const Color(0xFFEA580C),
                        onTap: () => _navigateToSubmodule('courier_requests'),
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 5. DOMAIN 4: Centro Financiero & Cierres
            const Text('4. CONTROL FINANCIERO & CAJA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569), letterSpacing: 0.5)),
            const SizedBox(height: 8),
            StreamBuilder<List<CourierDailyClosureModel>>(
              stream: widget.adminService.getCourierDailyClosuresStream(),
              builder: (context, snap) {
                final count = (snap.data ?? []).where((c) => c.status == 'PENDING_REVIEW' || c.status == 'PENDING').length;
                return _buildKpiCard(
                  title: 'Arqueos Pendientes de Liquidación',
                  value: '$count cierres',
                  icon: Icons.point_of_sale,
                  color: const Color(0xFF8B5CF6),
                  onTap: () => _navigateToSubmodule('courier_cash'),
                );
              },
            ),
            const SizedBox(height: 24),

            // 6. Direct Access Buttons
            const Text('ACCESOS RÁPIDOS A MÓDULOS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569), letterSpacing: 0.5)),
            const SizedBox(height: 8),
            _buildQuickActionButton(
              title: 'Live Courier Monitor & GPS',
              subtitle: 'Supervisión en vivo de repartidores sobre el mapa',
              icon: Icons.explore_rounded,
              color: const Color(0xFF0284C7),
              onTap: () => _navigateToSubmodule('courier_monitor'),
            ),
            const SizedBox(height: 8),
            _buildQuickActionButton(
              title: 'Centro de Soporte & Chat',
              subtitle: 'Atención de incidencias de clientes y comercios',
              icon: Icons.support_agent_rounded,
              color: const Color(0xFFEC4899),
              onTap: () => _navigateToSubmodule('support'),
            ),
            const SizedBox(height: 8),
            _buildQuickActionButton(
              title: 'Configuración Global del Sistema',
              subtitle: 'Tarifas por kilómetro y switches de mantenimiento',
              icon: Icons.settings_suggest_rounded,
              color: const Color(0xFF475569),
              onTap: () => _navigateToSubmodule('global_config'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: color, size: 20),
                  ),
                  const Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFFCBD5E1)),
                ],
              ),
              const SizedBox(height: 12),
              Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
              const SizedBox(height: 2),
              Text(title, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionButton({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF0F172A))),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF94A3B8)),
        onTap: onTap,
      ),
    );
  }
}
