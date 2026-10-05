/// BLUE SYSTEM DELIVERY ENTERPRISE — CENTRO DE NOTIFICACIONES ADMINISTRATIVO (FLUTTER)
/// Paridad 1:1 con AdminNotificationCenter.kt (Android Compose)
///
/// Consolida alertas críticas de 12 eventos de plataforma:
/// - ADMIN_NEW_MERCHANT_REQUEST
/// - ADMIN_NEW_COURIER_REQUEST
/// - ADMIN_COURIER_PROFILE_CHANGE
/// - ADMIN_SUPPORT_TICKET_CREATED
/// - ADMIN_SUPPORT_TICKET_PRIORITY
/// - ADMIN_COURIER_CLOSURE_SUBMITTED
/// - ADMIN_COURIER_CASH_DIFFERENCE
/// - ADMIN_TRANSFER_PENDING
/// - ADMIN_INCIDENT_CRITICAL
/// - ADMIN_SYSTEM_ALERT
/// - ADMIN_CONFIGURATION_CHANGED
/// - ADMIN_COMMERCE_STATUS_CHANGED

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminNotificationCenterScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;
  final Function(String route) onNavigate;

  const AdminNotificationCenterScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
    required this.onNavigate,
  });

  @override
  State<AdminNotificationCenterScreen> createState() => _AdminNotificationCenterScreenState();
}

class _AdminNotificationCenterScreenState extends State<AdminNotificationCenterScreen> {
  String _priorityFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final adminUid = widget.sessionState.currentUser?.uid ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Centro de Notificaciones', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Alertas operacionales y eventos de plataforma', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
      body: Column(
        children: [
          // Filtros por prioridad
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('ALL', 'Todas'),
                  _buildFilterChip('CRITICAL', 'Críticas'),
                  _buildFilterChip('HIGH', 'Altas'),
                  _buildFilterChip('MEDIUM', 'Medias'),
                  _buildFilterChip('NORMAL', 'Informativas'),
                ],
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Lista de notificaciones
          Expanded(
            child: StreamBuilder<List<AdminNotificationModel>>(
              stream: widget.adminService.getAdminNotificationsStream(adminUid),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                final allNotifications = snapshot.data ?? [];
                final filtered = _priorityFilter == 'ALL'
                    ? allNotifications
                    : allNotifications.where((n) => n.priority == _priorityFilter).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.notifications_none_rounded, size: 54, color: Color(0xFF94A3B8)),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No hay alertas administrativas',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF334155)),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Todas las operaciones se encuentran al día.',
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final item = filtered[index];
                    return _buildNotificationCard(item, adminUid);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _priorityFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: isSelected,
        label: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.white : const Color(0xFF334155),
          ),
        ),
        selectedColor: const Color(0xFF0F172A),
        backgroundColor: const Color(0xFFF8FAFC),
        checkmarkColor: Colors.white,
        side: BorderSide(color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0)),
        onSelected: (_) => setState(() => _priorityFilter = key),
      ),
    );
  }

  Widget _buildNotificationCard(AdminNotificationModel item, String adminUid) {
    final priorityColor = _getPriorityColor(item.priority);
    final iconData = _getTypeIcon(item.type);

    return Card(
      elevation: item.isRead ? 0 : 1,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: item.isRead ? const Color(0xFFE2E8F0) : const Color(0xFF38BDF8).withOpacity(0.5),
          width: item.isRead ? 1 : 1.5,
        ),
      ),
      color: item.isRead ? Colors.white : const Color(0xFFF0F9FF),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          if (!item.isRead && adminUid.isNotEmpty) {
            await widget.adminService.markNotificationAsRead(adminUid, item.id);
          }
          final target = _resolveTargetRoute(item);
          if (target.isNotEmpty) {
            widget.onNavigate(target);
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icono con color de prioridad
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: priorityColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(iconData, color: priorityColor, size: 22),
              ),
              const SizedBox(width: 12),

              // Contenido
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: TextStyle(
                              fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                              fontSize: 13.5,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: priorityColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.priority,
                            style: TextStyle(
                              color: priorityColor,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.body,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF475569),
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _formatTimeAgo(item.createdAt),
                          style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8)),
                        ),
                        if (!item.isRead)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0284C7),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'NUEVA',
                              style: TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.bold),
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
      ),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toUpperCase()) {
      case 'CRITICAL':
        return const Color(0xFFDC2626);
      case 'HIGH':
        return const Color(0xFFEA580C);
      case 'MEDIUM':
        return const Color(0xFFD97706);
      default:
        return const Color(0xFF0284C7);
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type.toUpperCase()) {
      case 'ADMIN_NEW_MERCHANT_REQUEST':
        return Icons.storefront_rounded;
      case 'ADMIN_NEW_COURIER_REQUEST':
        return Icons.two_wheeler_rounded;
      case 'ADMIN_COURIER_PROFILE_CHANGE':
        return Icons.badge_rounded;
      case 'ADMIN_SUPPORT_TICKET_CREATED':
      case 'ADMIN_SUPPORT_TICKET_PRIORITY':
        return Icons.support_agent_rounded;
      case 'ADMIN_COURIER_CLOSURE_SUBMITTED':
      case 'ADMIN_COURIER_CASH_DIFFERENCE':
        return Icons.point_of_sale_rounded;
      case 'ADMIN_COMMERCE_STATUS_CHANGED':
        return Icons.domain_rounded;
      case 'ADMIN_CONFIGURATION_CHANGED':
        return Icons.settings_suggest_rounded;
      case 'ADMIN_INCIDENT_CRITICAL':
      case 'ADMIN_TRANSFER_PENDING':
        return Icons.warning_amber_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  String _resolveTargetRoute(AdminNotificationModel item) {
    final type = item.type.toUpperCase();
    if (type.contains('MERCHANT_REQUEST')) return 'merchant_requests';
    if (type.contains('COURIER_REQUEST')) return 'courier_requests';
    if (type.contains('COURIER_PROFILE')) return 'courier_profile_requests';
    if (type.contains('SUPPORT')) return 'support';
    if (type.contains('CLOSURE') || type.contains('CASH')) return 'courier_cash';
    if (type.contains('COMMERCE')) return 'businesses';
    if (type.contains('CONFIGURATION')) return 'global_config';
    if (type.contains('IDENTITY') || type.contains('USER')) return 'identities';

    final link = item.deepLink.toLowerCase();
    if (link.contains('merchant')) return 'merchant_requests';
    if (link.contains('courier-request') || link.contains('courier_request')) return 'courier_requests';
    if (link.contains('courier-profile') || link.contains('courier_profile')) return 'courier_profile_requests';
    if (link.contains('support')) return 'support';
    if (link.contains('closure') || link.contains('cash')) return 'courier_cash';
    if (link.contains('commerce') || link.contains('business')) return 'businesses';
    if (link.contains('config')) return 'global_config';

    return item.targetModule.isNotEmpty ? item.targetModule : 'dashboard';
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Hace un momento';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours} h';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
