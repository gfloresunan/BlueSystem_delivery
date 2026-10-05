/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 1: SOLICITUDES DE COMERCIO (FLUTTER)
/// Live streaming from /merchant_applications with atomic approvals/rejections.

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminMerchantRequestsScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminMerchantRequestsScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminMerchantRequestsScreen> createState() => _AdminMerchantRequestsScreenState();
}

class _AdminMerchantRequestsScreenState extends State<AdminMerchantRequestsScreen> {
  String _filter = 'ALL'; // ALL, PENDING, APPROVED, REJECTED
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final adminUid = widget.sessionState.currentUser?.uid ?? 'admin';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBack,
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Solicitudes de Comercio', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Altas de comercios y sucursales', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search & Filters
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Buscar por comercio, contacto o email...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  onChanged: (v) => setState(() => _search = v.trim().toLowerCase()),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('ALL', 'Todas'),
                      _buildFilterChip('PENDING', 'Pendientes'),
                      _buildFilterChip('APPROVED', 'Aprobadas'),
                      _buildFilterChip('REJECTED', 'Rechazadas'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Live Stream List
          Expanded(
            child: StreamBuilder<List<MerchantApplicationModel>>(
              stream: widget.adminService.getMerchantApplicationsStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final list = snapshot.data ?? [];
                final filtered = list.where((item) {
                  final matchFilter = _filter == 'ALL' || item.status == _filter;
                  final matchSearch = _search.isEmpty ||
                      item.businessName.toLowerCase().contains(_search) ||
                      item.contactName.toLowerCase().contains(_search) ||
                      item.email.toLowerCase().contains(_search);
                  return matchFilter && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.storefront_outlined, size: 48, color: Color(0xFF94A3B8)),
                        SizedBox(height: 8),
                        Text('No se encontraron solicitudes de comercio', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  itemCount: filtered.length,
                  itemBuilder: (context, i) {
                    final app = filtered[i];
                    return _buildApplicationCard(app, adminUid);
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
    final isSelected = _filter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        selected: isSelected,
        label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : const Color(0xFF334155))),
        selectedColor: const Color(0xFF1E3A8A),
        backgroundColor: Colors.white,
        checkmarkColor: Colors.white,
        onSelected: (_) => setState(() => _filter = key),
      ),
    );
  }

  Widget _buildApplicationCard(MerchantApplicationModel app, String adminUid) {
    final isPending = app.status == 'PENDING';
    final isApproved = app.status == 'APPROVED';

    final statusColor = isPending
        ? const Color(0xFFF59E0B)
        : (isApproved ? const Color(0xFF10B981) : const Color(0xFFEF4444));

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    app.businessName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    app.status,
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 10),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Contacto: ${app.contactName} • ${app.phone}', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
            if (app.email.isNotEmpty) Text('Email: ${app.email}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            if (app.address.isNotEmpty) Text('Dirección: ${app.address}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            if (app.rejectionReason.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('Motivo Rechazo: ${app.rejectionReason}', style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11, fontWeight: FontWeight.w600)),
            ],
            if (isPending) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFDC2626),
                        side: const BorderSide(color: Color(0xFFDC2626)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _promptRejectionDialog(app.id, adminUid),
                      child: const Text('Rechazar', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        await widget.adminService.updateMerchantApplicationStatus(
                          applicationId: app.id,
                          status: 'APPROVED',
                          adminUid: adminUid,
                        );
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Comercio "${app.businessName}" aprobado exitosamente')),
                          );
                        }
                      },
                      child: const Text('Aprobar', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _promptRejectionDialog(String id, String adminUid) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rechazar Solicitud'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Motivo del rechazo...'),
          maxLines: 2,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              await widget.adminService.updateMerchantApplicationStatus(
                applicationId: id,
                status: 'REJECTED',
                rejectionReason: controller.text.trim(),
                adminUid: adminUid,
              );
            },
            child: const Text('Confirmar Rechazo'),
          ),
        ],
      ),
    );
  }
}
