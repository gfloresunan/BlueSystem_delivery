/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 8: COMERCIOS Y SUCURSALES (FLUTTER)
/// Live streaming from /businesses with active/suspended toggles.

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminEnterpriseCommerceScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminEnterpriseCommerceScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminEnterpriseCommerceScreen> createState() => _AdminEnterpriseCommerceScreenState();
}

class _AdminEnterpriseCommerceScreenState extends State<AdminEnterpriseCommerceScreen> {
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
            Text('Comercios y Sucursales', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Directorio empresarial y estado operativo', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
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
                    hintText: 'Buscar por comercio, categoría o dirección...',
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
                      _buildFilterChip('ALL', 'Todos'),
                      _buildFilterChip('ACTIVE', 'Activos'),
                      _buildFilterChip('INACTIVE', 'Suspendidos'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<List<BusinessAdminModel>>(
              stream: widget.adminService.getAllBusinessesStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final list = snapshot.data ?? [];
                final filtered = list.where((b) {
                  final matchFilter = _filter == 'ALL' ||
                      (_filter == 'ACTIVE' && b.active) ||
                      (_filter == 'INACTIVE' && !b.active);

                  final matchSearch = _search.isEmpty ||
                      b.name.toLowerCase().contains(_search) ||
                      b.category.toLowerCase().contains(_search) ||
                      b.address.toLowerCase().contains(_search);

                  return matchFilter && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.domain_outlined, size: 48, color: Color(0xFF94A3B8)),
                        SizedBox(height: 8),
                        Text('No se encontraron comercios', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  itemCount: filtered.length,
                  itemBuilder: (context, i) {
                    final biz = filtered[i];
                    return _buildBusinessCard(biz, adminUid);
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

  Widget _buildBusinessCard(BusinessAdminModel biz, String adminUid) {
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
                Expanded(
                  child: Text(biz.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: biz.active ? const Color(0xFF10B981).withOpacity(0.12) : const Color(0xFFEF4444).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    biz.active ? 'ACTIVO' : 'SUSPENDIDO',
                    style: TextStyle(
                      color: biz.active ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      fontWeight: FontWeight.bold,
                      fontSize: 9.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Categoría: ${biz.category}', style: const TextStyle(fontSize: 11.5, color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
            if (biz.address.isNotEmpty) Text('Dirección: ${biz.address}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            if (biz.phone.isNotEmpty) Text('Teléfono: ${biz.phone}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  icon: Icon(biz.active ? Icons.block : Icons.check_circle, size: 14),
                  label: Text(biz.active ? 'Suspender Comercio' : 'Reactivar Comercio', style: const TextStyle(fontSize: 11)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: biz.active ? const Color(0xFFDC2626) : const Color(0xFF10B981),
                    side: BorderSide(color: biz.active ? const Color(0xFFDC2626) : const Color(0xFF10B981)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                  onPressed: () async {
                    await widget.adminService.toggleBusinessStatus(
                      businessId: biz.id,
                      active: !biz.active,
                      adminUid: adminUid,
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
