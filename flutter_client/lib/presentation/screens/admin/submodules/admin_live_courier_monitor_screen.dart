/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 7: LIVE COURIER MONITOR (FLUTTER)
/// Live GPS telemetry from /ubicaciones_repartidores joined with /users profile.

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminLiveCourierMonitorScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminLiveCourierMonitorScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminLiveCourierMonitorScreen> createState() => _AdminLiveCourierMonitorScreenState();
}

class _AdminLiveCourierMonitorScreenState extends State<AdminLiveCourierMonitorScreen> {
  String _statusFilter = 'ALL';
  String _search = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Live Courier Monitor', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Telemetría satelital y estado de flota', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
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
                    hintText: 'Buscar por nombre, ID o teléfono...',
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
                      _buildFilterChip('ALL', 'Toda la Flota'),
                      _buildFilterChip('ONLINE', 'Disponibles'),
                      _buildFilterChip('BUSY', 'En Ruta / Ocupados'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<List<AdminUserModel>>(
              stream: widget.adminService.getAllUsersStream(),
              builder: (context, usersSnapshot) {
                final users = usersSnapshot.data ?? [];
                final driversMap = <String, AdminUserModel>{
                  for (final u in users) u.uid: u,
                };

                return StreamBuilder<List<ActiveCourierGpsModel>>(
                  stream: widget.adminService.getActiveCouriersGpsStream(),
                  builder: (context, gpsSnapshot) {
                    if (gpsSnapshot.connectionState == ConnectionState.waiting && !gpsSnapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final list = gpsSnapshot.data ?? [];

                    final resolvedList = list.map((c) {
                      final matching = driversMap[c.courierId] ?? driversMap[c.id];
                      final resolvedName = matching?.name.isNotEmpty == true
                          ? matching!.name
                          : c.name;
                      final resolvedPhone = matching?.phone.isNotEmpty == true
                          ? matching!.phone
                          : c.phone;

                      return ActiveCourierGpsModel(
                        id: c.id,
                        courierId: c.courierId,
                        name: resolvedName,
                        latitude: c.latitude,
                        longitude: c.longitude,
                        availabilityStatus: c.availabilityStatus,
                        phone: resolvedPhone,
                        lastUpdate: c.lastUpdate,
                      );
                    }).toList();

                    final filtered = resolvedList.where((c) {
                      final isAvailable = ['disponible', 'activo', 'online']
                          .contains(c.availabilityStatus.toLowerCase());
                      final matchFilter = _statusFilter == 'ALL' ||
                          (_statusFilter == 'ONLINE' && isAvailable) ||
                          (_statusFilter == 'BUSY' && !isAvailable);

                      final matchSearch = _search.isEmpty ||
                          c.name.toLowerCase().contains(_search) ||
                          c.phone.toLowerCase().contains(_search) ||
                          c.courierId.toLowerCase().contains(_search);

                      return matchFilter && matchSearch;
                    }).toList();

                    if (filtered.isEmpty) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.gps_off_rounded, size: 48, color: Color(0xFF94A3B8)),
                            SizedBox(height: 8),
                            Text('No hay motorizados transmitiendo telemetría', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                          ],
                        ),
                      );
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      itemCount: filtered.length,
                      itemBuilder: (context, i) {
                        final courier = filtered[i];
                        return _buildCourierCard(courier);
                      },
                    );
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
    final isSelected = _statusFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        selected: isSelected,
        label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : const Color(0xFF334155))),
        selectedColor: const Color(0xFF1E3A8A),
        backgroundColor: Colors.white,
        checkmarkColor: Colors.white,
        onSelected: (_) => setState(() => _statusFilter = key),
      ),
    );
  }

  Widget _buildCourierCard(ActiveCourierGpsModel courier) {
    final isOnline = ['disponible', 'activo', 'online'].contains(courier.availabilityStatus.toLowerCase());
    final statusColor = isOnline ? const Color(0xFF10B981) : const Color(0xFF2563EB);
    final statusText = isOnline ? 'ONLINE DISPONIBLE' : 'OCUPADO EN RUTA';

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
                Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.two_wheeler_rounded, color: statusColor, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(courier.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF0F172A))),
                        Text('ID: ${courier.courierId.length > 8 ? courier.courierId.substring(0, 8) : courier.courierId}...', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
                  child: Text(statusText, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 9)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Coordenadas GPS', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                    const SizedBox(height: 2),
                    Text(
                      '${courier.latitude.toStringAsFixed(4)}, ${courier.longitude.toStringAsFixed(4)}',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                    ),
                  ],
                ),
                if (courier.phone.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.phone, color: Color(0xFF2563EB), size: 20),
                    style: IconButton.styleFrom(backgroundColor: const Color(0xFFEFF6FF)),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Llamando a ${courier.name}: ${courier.phone}')),
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
