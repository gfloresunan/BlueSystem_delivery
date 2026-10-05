/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 3: MODIFICACIONES DE PERFIL (FLUTTER)
/// Live streaming from /courier_profile_requests with status reviews.

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminCourierProfileScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminCourierProfileScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminCourierProfileScreen> createState() => _AdminCourierProfileScreenState();
}

class _AdminCourierProfileScreenState extends State<AdminCourierProfileScreen> {
  String _filter = 'ALL';
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final adminUid = widget.sessionState.currentUser?.uid ?? 'admin';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Modificaciones de Perfil', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Cambios de vehículo, teléfono y documentos', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Buscar por motorizado o tipo...',
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
          Expanded(
            child: StreamBuilder<List<CourierProfileRequestModel>>(
              stream: widget.adminService.getCourierProfileRequestsStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final list = snapshot.data ?? [];
                final filtered = list.where((item) {
                  final matchFilter = _filter == 'ALL' || item.status == _filter;
                  final matchSearch = _search.isEmpty ||
                      item.courierName.toLowerCase().contains(_search) ||
                      item.requestType.toLowerCase().contains(_search) ||
                      item.description.toLowerCase().contains(_search);
                  return matchFilter && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.badge_outlined, size: 48, color: Color(0xFF94A3B8)),
                        SizedBox(height: 8),
                        Text('No hay solicitudes de modificación de perfil', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  itemCount: filtered.length,
                  itemBuilder: (context, i) {
                    final req = filtered[i];
                    return _buildRequestCard(req, adminUid);
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

  Widget _buildRequestCard(CourierProfileRequestModel req, String adminUid) {
    final isPending = req.status == 'PENDING';
    final isApproved = req.status == 'APPROVED';
    final statusColor = isPending ? const Color(0xFFF59E0B) : (isApproved ? const Color(0xFF10B981) : const Color(0xFFEF4444));

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(req.courierName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
                  child: Text(req.status, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 10)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Tipo: ${req.requestType}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2563EB))),
            if (req.description.isNotEmpty) Text(req.description, style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569))),
            if (req.reviewNote.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('Nota: ${req.reviewNote}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
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
                      onPressed: () async {
                        await widget.adminService.updateCourierProfileRequestStatus(requestId: req.id, status: 'REJECTED', adminUid: adminUid);
                      },
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
                        await widget.adminService.updateCourierProfileRequestStatus(requestId: req.id, status: 'APPROVED', adminUid: adminUid);
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
}
