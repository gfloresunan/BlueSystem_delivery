/// BLUE SYSTEM DELIVERY ENTERPRISE — ADMIN NAVIGATION DRAWER v2.2 (FLUTTER)
/// Enterprise 9-Module Drawer Navigation for Mobile Admin Console (iOS/Multiplatform Track B).

import 'package:flutter/material.dart';
import '../../providers/session_state.dart';

class AdminDrawer extends StatelessWidget {
  final SessionState sessionState;
  final String currentRoute;
  final Function(String route) onNavigate;

  const AdminDrawer({
    super.key,
    required this.sessionState,
    required this.currentRoute,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final user = sessionState.currentUser;
    final email = user?.email ?? 'admin@bluesystemdelivery.com';

    return Drawer(
      backgroundColor: const Color(0xFF0F172A),
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              decoration: const BoxDecoration(
                color: Color(0xFF1E293B),
                border: Border(bottom: BorderSide(color: Color(0xFF334155))),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withOpacity(0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF2563EB), width: 1.5),
                    ),
                    child: const Icon(Icons.admin_panel_settings, color: Color(0xFF38BDF8), size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'BlueSystem Admin',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          email,
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'ONLINE • EIAM ENTERPRISE',
                            style: TextStyle(color: Color(0xFF10B981), fontSize: 8.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Modules list
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  _buildDrawerItem(
                    icon: Icons.dashboard_rounded,
                    title: 'Dashboard Operativo',
                    subtitle: 'KPIs y Operación en Vivo',
                    route: 'dashboard',
                    accentColor: const Color(0xFF38BDF8),
                  ),
                  const Divider(color: Color(0xFF334155), indent: 16, endIndent: 16),
                  _buildSectionHeader('GESTIÓN DE ALTAS & PERFILES'),
                  _buildDrawerItem(
                    icon: Icons.storefront_rounded,
                    title: 'Solicitudes Comercio',
                    subtitle: 'Nuevos Comercios',
                    route: 'merchant_requests',
                    accentColor: const Color(0xFF60A5FA),
                  ),
                  _buildDrawerItem(
                    icon: Icons.two_wheeler_rounded,
                    title: 'Solicitudes Motorizado',
                    subtitle: 'Nuevos Repartidores',
                    route: 'courier_requests',
                    accentColor: const Color(0xFF34D399),
                  ),
                  _buildDrawerItem(
                    icon: Icons.badge_rounded,
                    title: 'Modificaciones Perfil',
                    subtitle: 'Cambios de Vehículo/Doc',
                    route: 'courier_profile_requests',
                    accentColor: const Color(0xFFFBBF24),
                  ),
                  const Divider(color: Color(0xFF334155), indent: 16, endIndent: 16),
                  _buildSectionHeader('CONTROL & IDENTIDAD EIAM'),
                  _buildDrawerItem(
                    icon: Icons.manage_accounts_rounded,
                    title: 'Centro de Identidades',
                    subtitle: 'Roles EIAM y Usuarios',
                    route: 'identities',
                    accentColor: const Color(0xFFA78BFA),
                  ),
                  _buildDrawerItem(
                    icon: Icons.support_agent_rounded,
                    title: 'Soporte & Incidencias',
                    subtitle: 'Tickets en Tiempo Real',
                    route: 'support',
                    accentColor: const Color(0xFFF472B6),
                  ),
                  _buildDrawerItem(
                    icon: Icons.point_of_sale_rounded,
                    title: 'Caja de Motorizados',
                    subtitle: 'Arqueo y Liquidaciones',
                    route: 'courier_cash',
                    accentColor: const Color(0xFF4ADE80),
                  ),
                  const Divider(color: Color(0xFF334155), indent: 16, endIndent: 16),
                  _buildSectionHeader('OPERACIÓN EN VIVO'),
                  _buildDrawerItem(
                    icon: Icons.explore_rounded,
                    title: 'Live Courier Monitor',
                    subtitle: 'Telemetría GPS Satelital',
                    route: 'courier_monitor',
                    accentColor: const Color(0xFF38BDF8),
                  ),
                  _buildDrawerItem(
                    icon: Icons.domain_rounded,
                    title: 'Comercios y Sucursales',
                    subtitle: 'Directorio y Suspensiones',
                    route: 'businesses',
                    accentColor: const Color(0xFFFB923C),
                  ),
                  _buildDrawerItem(
                    icon: Icons.settings_suggest_rounded,
                    title: 'Configuración Global',
                    subtitle: 'Tarifas X→Y y Mantenimiento',
                    route: 'global_config',
                    accentColor: const Color(0xFF94A3B8),
                  ),
                ],
              ),
            ),

            // Footer / Logout
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFF334155))),
              ),
              child: ListTile(
                leading: const Icon(Icons.logout, color: Color(0xFFEF4444)),
                title: const Text('Cerrar Sesión', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                onTap: () async {
                  await sessionState.signOut();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Text(
        title,
        style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 0.8),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required String route,
    required Color accentColor,
  }) {
    final isSelected = currentRoute == route;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? accentColor.withOpacity(0.15) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        border: isSelected ? Border.all(color: accentColor.withOpacity(0.3)) : null,
      ),
      child: ListTile(
        leading: Icon(icon, color: isSelected ? accentColor : const Color(0xFF94A3B8), size: 22),
        title: Text(
          title,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFFE2E8F0),
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: isSelected ? accentColor.withOpacity(0.8) : const Color(0xFF64748B),
            fontSize: 10,
          ),
        ),
        dense: true,
        onTap: () => onNavigate(route),
      ),
    );
  }
}
