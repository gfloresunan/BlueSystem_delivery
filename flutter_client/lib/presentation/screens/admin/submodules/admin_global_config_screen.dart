/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 9: CONFIGURACIÓN GLOBAL (FLUTTER)
/// Live streaming from /system_config/global with frozen rate protection (ADR-015) and audit snapshots.
/// Paridad 1:1 con AdminGlobalConfigurationScreen.kt (Android Compose)

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminGlobalConfigScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminGlobalConfigScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminGlobalConfigScreen> createState() => _AdminGlobalConfigScreenState();
}

class _AdminGlobalConfigScreenState extends State<AdminGlobalConfigScreen> {
  final _commissionController = TextEditingController(text: '15.0');
  final _phoneController = TextEditingController();
  final _whatsappController = TextEditingController();
  bool _maintenance = false;
  bool _loaded = false;
  bool _isSaving = false;

  @override
  void dispose() {
    _commissionController.dispose();
    _phoneController.dispose();
    _whatsappController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final adminUid = widget.sessionState.currentUser?.uid ?? 'admin';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Configuración Global', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Parámetros maestros y comisiones Enterprise', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
      body: StreamBuilder<GlobalConfigModel>(
        stream: widget.adminService.getGlobalConfigStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !_loaded) {
            return const Center(child: CircularProgressIndicator());
          }
          final config = snapshot.data;
          if (config != null && !_loaded) {
            _commissionController.text = config.commissionPercent.toStringAsFixed(1);
            _phoneController.text = config.supportPhone;
            _whatsappController.text = config.supportWhatsapp;
            _maintenance = config.maintenanceMode;
            _loaded = true;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. FROZEN CORE ADR-015: Tarifas X->Y Blindadas (Read-Only)
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.lock_rounded, color: Color(0xFF0284C7), size: 18),
                            SizedBox(width: 8),
                            Text(
                              'TARIFAS X→Y (FROZEN CORE ADR-015)',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: Color(0xFF1E293B)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Las tarifas de Delivery Express están blindadas bajo ADR-015/ADR-026 para garantizar consistencia contractual y financiera:',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFCBD5E1)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Tarifa Base (Blindada)', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                    const SizedBox(height: 2),
                                    Text(
                                      'C\$ ${(config?.x2yBaseFee ?? 35.0).toStringAsFixed(2)}',
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFCBD5E1)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Precio por Km (Blindado)', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                    const SizedBox(height: 2),
                                    Text(
                                      'C\$ ${(config?.x2yPerKmRate ?? 15.0).toStringAsFixed(2)} / km',
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 2. Comisión de Comercio Enterprise
                _buildSectionCard(
                  title: 'Comisiones de Comercios Enterprise',
                  icon: Icons.percent_rounded,
                  children: [
                    TextField(
                      controller: _commissionController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Comisión del Comercio (%)',
                        hintText: '15.0',
                        isDense: true,
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                        suffixText: '%',
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Tasa porcentual aplicada sobre ventas brutas del comercio para pre-liquidaciones (/merchant_settlements).',
                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 3. Canales Oficiales de Soporte
                _buildSectionCard(
                  title: 'Canales Oficiales de Atención & Soporte',
                  icon: Icons.headset_mic_outlined,
                  children: [
                    TextField(
                      controller: _phoneController,
                      decoration: const InputDecoration(
                        labelText: 'Teléfono de Soporte',
                        hintText: '+505 8888-8888',
                        isDense: true,
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _whatsappController,
                      decoration: const InputDecoration(
                        labelText: 'WhatsApp Oficial de Incidencias',
                        hintText: '+505 8888-8888',
                        isDense: true,
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 4. Estado Operativo del Sistema
                _buildSectionCard(
                  title: 'Estado del Sistema',
                  icon: Icons.shield_outlined,
                  children: [
                    SwitchListTile(
                      title: const Text('Modo Mantenimiento Global', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                      subtitle: const Text('Restringe temporalmente nuevas transacciones de clientes', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      value: _maintenance,
                      onChanged: (v) => setState(() => _maintenance = v),
                      activeColor: const Color(0xFFDC2626),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Botón Guardar
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    icon: _isSaving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.save_rounded, size: 18),
                    label: Text(
                      _isSaving ? 'Guardando Snapshot...' : 'Guardar Configuración Inmutable',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _isSaving
                        ? null
                        : () async {
                            final comm = double.tryParse(_commissionController.text.trim()) ?? 15.0;
                            final phone = _phoneController.text.trim();
                            final whatsapp = _whatsappController.text.trim();

                            setState(() => _isSaving = true);
                            try {
                              await widget.adminService.updateGlobalConfig(
                                commissionPercent: comm,
                                maintenanceMode: _maintenance,
                                supportPhone: phone,
                                supportWhatsapp: whatsapp,
                                adminUid: adminUid,
                              );

                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Configuración guardada y auditada con snapshot en /audit_events'),
                                    backgroundColor: Color(0xFF10B981),
                                  ),
                                );
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Error al guardar: $e'), backgroundColor: const Color(0xFFDC2626)),
                                );
                              }
                            } finally {
                              if (mounted) setState(() => _isSaving = false);
                            }
                          },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFF0F172A), size: 20),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF0F172A))),
              ],
            ),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      ),
    );
  }
}
