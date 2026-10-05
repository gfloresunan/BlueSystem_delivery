/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 6: CAJA DE MOTORIZADOS & CIERRES (FLUTTER)
/// Live streaming from /courier_daily_closures with atomic reconciliation and balance reset.

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminCourierCashScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminCourierCashScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminCourierCashScreen> createState() => _AdminCourierCashScreenState();
}

class _AdminCourierCashScreenState extends State<AdminCourierCashScreen> {
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
            Text('Caja de Motorizados', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Arqueos diarios, comprobantes y liquidación', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
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
                    hintText: 'Buscar por motorizado, acta o referencia...',
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
                      _buildFilterChip('PENDING_REVIEW', 'Pendientes'),
                      _buildFilterChip('APPROVED', 'Aprobados'),
                      _buildFilterChip('REJECTED', 'Rechazados'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<List<CourierDailyClosureModel>>(
              stream: widget.adminService.getCourierDailyClosuresStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final list = snapshot.data ?? [];
                final filtered = list.where((c) {
                  final matchFilter = _filter == 'ALL' || c.status == _filter;
                  final matchSearch = _search.isEmpty ||
                      c.courierName.toLowerCase().contains(_search) ||
                      c.actNumber.toLowerCase().contains(_search) ||
                      c.bankReference.toLowerCase().contains(_search);
                  return matchFilter && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.point_of_sale_outlined, size: 48, color: Color(0xFF94A3B8)),
                        SizedBox(height: 8),
                        Text('No hay cierres de caja registrados', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  itemCount: filtered.length,
                  itemBuilder: (context, i) {
                    final closure = filtered[i];
                    return _buildClosureCard(closure, adminUid);
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

  Widget _buildClosureCard(CourierDailyClosureModel c, String adminUid) {
    final isPending = c.status == 'PENDING_REVIEW' ||
        c.status == 'PENDING' ||
        c.status == 'PENDING_APPROVAL' ||
        c.status == 'PENDING_ADMIN_VERIFICATION' ||
        c.status == 'SUBMITTED' ||
        c.status == 'OPEN';
    final isApproved = c.status == 'APPROVED' || c.status == 'VERIFIED' || c.status == 'APROBADO';
    final statusColor = isPending
        ? const Color(0xFFF59E0B)
        : (isApproved ? const Color(0xFF10B981) : const Color(0xFFEF4444));

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE2E8F0))),
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
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF059669), size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.courierName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF0F172A))),
                        Text(c.actNumber, style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontFamily: 'monospace')),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                  child: Text(c.status, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 8.5)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildMetricColumn('Recaudado', 'C\$ ${c.collectedCash.toStringAsFixed(2)}', const Color(0xFF1E293B)),
                _buildMetricColumn('Depositado', 'C\$ ${c.depositedAmount > 0 ? c.depositedAmount.toStringAsFixed(2) : c.collectedCash.toStringAsFixed(2)}', const Color(0xFF059669)),
                _buildMetricColumn(
                  'Diferencia',
                  'C\$ ${(c.collectedCash - (c.depositedAmount > 0 ? c.depositedAmount : c.collectedCash)).abs().toStringAsFixed(2)}',
                  (c.collectedCash - (c.depositedAmount > 0 ? c.depositedAmount : c.collectedCash)).abs() == 0 ? const Color(0xFF10B981) : const Color(0xFFDC2626),
                ),
              ],
            ),
            if (c.bankReference.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Ref. Banco: ${c.bankReference}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _showActDetailDialog(c),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    child: const Text('Ver Acta', style: TextStyle(fontSize: 11)),
                  ),
                ),
                if (isPending) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onPressed: () async {
                        try {
                          final res = await widget.adminService.approveCourierDailyClosure(
                            closureId: c.id,
                            adminUid: adminUid,
                          );
                          final issuedAct = (res['officialAct'] as Map?)?['actNumber'] ?? c.actNumber;
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Cierre #$issuedAct verificado y liquidado exitosamente (ADR-018)'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error al verificar: $e'), backgroundColor: const Color(0xFFDC2626)),
                            );
                          }
                        }
                      },
                      child: const Text('Aprobar', style: TextStyle(fontSize: 11)),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    icon: const Icon(Icons.cancel_outlined, color: Color(0xFFDC2626), size: 22),
                    tooltip: 'Rechazar Arqueo',
                    onPressed: () => _showRejectDialog(c, adminUid),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showActDetailDialog(CourierDailyClosureModel c) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Acta Oficial: ${c.actNumber}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Motorizado: ${c.courierName}', style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 4),
              Text('Fecha: ${c.closureDate.day}/${c.closureDate.month}/${c.closureDate.year}', style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 4),
              Text('Efectivo Esperado: C\$ ${c.collectedCash.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 4),
              Text('Efectivo Depositado: C\$ ${c.depositedAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('Diferencia: C\$ ${(c.collectedCash - c.depositedAmount).abs().toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: (c.collectedCash - c.depositedAmount).abs() == 0 ? const Color(0xFF10B981) : const Color(0xFFDC2626),
                    fontWeight: FontWeight.bold,
                  )),
              const SizedBox(height: 4),
              Text('Referencia Banco: ${c.bankReference.isNotEmpty ? c.bankReference : "N/A"}', style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 4),
              Text('Estado Contable: ${c.status}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              if (c.depositReceiptUrl.isNotEmpty) ...[
                const SizedBox(height: 10),
                const Text('Comprobante de Depósito Adjunto:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    c.depositReceiptUrl,
                    height: 120,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Text('Error al cargar comprobante', style: TextStyle(fontSize: 10, color: Colors.red)),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cerrar'),
            ),
          ],
        );
      },
    );
  }

  void _showRejectDialog(CourierDailyClosureModel c, String adminUid) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Rechazar Arqueo de Caja', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold, fontSize: 15)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Indique el motivo por el cual rechaza el cierre de ${c.courierName}:', style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 10),
              TextField(
                controller: reasonController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Ej: Depósito bancario no coincide con la minuta...',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
              onPressed: () async {
                final reason = reasonController.text.trim();
                if (reason.isEmpty) return;
                Navigator.pop(ctx);
                try {
                  await widget.adminService.rejectCourierDailyClosure(
                    closureId: c.id,
                    reason: reason,
                    adminUid: adminUid,
                  );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Arqueo #${c.actNumber} rechazado formalmente'), backgroundColor: const Color(0xFFDC2626)),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error al rechazar: $e'), backgroundColor: const Color(0xFFDC2626)),
                    );
                  }
                }
              },
              child: const Text('Confirmar Rechazo'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildMetricColumn(String label, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: valueColor)),
      ],
    );
  }
}
