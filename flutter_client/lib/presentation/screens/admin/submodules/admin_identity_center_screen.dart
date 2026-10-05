/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 4: CENTRO DE IDENTIDADES EIAM (FLUTTER)
/// Live streaming from /users with role mutations and active toggles.

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminIdentityCenterScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminIdentityCenterScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminIdentityCenterScreen> createState() => _AdminIdentityCenterScreenState();
}

class _AdminIdentityCenterScreenState extends State<AdminIdentityCenterScreen> {
  String _roleFilter = 'ALL';
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
            Text('Centro de Identidades EIAM', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Gestión de roles y permisos corporativos', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
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
                    hintText: 'Buscar por nombre, email o teléfono...',
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
                      _buildFilterChip('ADMIN', 'Admins'),
                      _buildFilterChip('DRIVER', 'Motorizados'),
                      _buildFilterChip('OWNER', 'Comercios'),
                      _buildFilterChip('CLIENT', 'Clientes'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<List<AdminUserModel>>(
              stream: widget.adminService.getAllUsersStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final list = snapshot.data ?? [];
                final filtered = list.where((u) {
                  final matchFilter = _roleFilter == 'ALL' || u.role == _roleFilter || u.eiamRole == _roleFilter;
                  final matchSearch = _search.isEmpty ||
                      u.name.toLowerCase().contains(_search) ||
                      u.email.toLowerCase().contains(_search) ||
                      u.phone.toLowerCase().contains(_search) ||
                      u.uid.toLowerCase().contains(_search);
                  return matchFilter && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.manage_accounts_outlined, size: 48, color: Color(0xFF94A3B8)),
                        SizedBox(height: 8),
                        Text('No se encontraron usuarios', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  itemCount: filtered.length,
                  itemBuilder: (context, i) {
                    final user = filtered[i];
                    return _buildUserCard(user, adminUid);
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
    final isSelected = _roleFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        selected: isSelected,
        label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : const Color(0xFF334155))),
        selectedColor: const Color(0xFF1E3A8A),
        backgroundColor: Colors.white,
        checkmarkColor: Colors.white,
        onSelected: (_) => setState(() => _roleFilter = key),
      ),
    );
  }

  Widget _buildUserCard(AdminUserModel user, String adminUid) {
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
                  child: Text(user.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    user.role,
                    style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 10),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Email: ${user.email.isEmpty ? "Sin correo" : user.email}', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
            if (user.phone.isNotEmpty) Text('Teléfono: ${user.phone}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            Text('UID: ${user.uid.length > 12 ? user.uid.substring(0, 12) : user.uid}...', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.edit, size: 14),
                  label: const Text('Editar Rol EIAM', style: TextStyle(fontSize: 11)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF1E3A8A),
                    side: const BorderSide(color: Color(0xFF1E3A8A)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                  onPressed: () => _showRoleDialog(user, adminUid),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showRoleDialog(AdminUserModel user, String adminUid) {
    String selectedRole = user.role;
    bool isActive = user.active;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Editar: ${user.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Rol EIAM:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 6),
              DropdownButton<String>(
                value: ['ADMIN', 'DRIVER', 'OWNER', 'CLIENT'].contains(selectedRole) ? selectedRole : 'CLIENT',
                isExpanded: true,
                items: const [
                  DropdownMenuItem(value: 'ADMIN', child: Text('ADMIN')),
                  DropdownMenuItem(value: 'DRIVER', child: Text('DRIVER / MOTORIZADO')),
                  DropdownMenuItem(value: 'OWNER', child: Text('OWNER / COMERCIO')),
                  DropdownMenuItem(value: 'CLIENT', child: Text('CLIENT / CLIENTE')),
                ],
                onChanged: (v) {
                  if (v != null) setDialogState(() => selectedRole = v);
                },
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                title: const Text('Usuario Activo', style: TextStyle(fontSize: 13)),
                value: isActive,
                onChanged: (v) => setDialogState(() => isActive = v),
                dense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
              onPressed: () async {
                Navigator.pop(ctx);
                await widget.adminService.updateUserRole(
                  targetUid: user.uid,
                  newRole: selectedRole,
                  active: isActive,
                  adminUid: adminUid,
                );
              },
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }
}
