/// BLUE SYSTEM DELIVERY ENTERPRISE — MÓDULO 5: SOPORTE & INCIDENCIAS (FLUTTER)
/// Live streaming from /support_tickets and /messages subcollection.

import 'package:flutter/material.dart';
import '../../../../data/services/admin_service.dart';
import '../../../providers/session_state.dart';

class AdminSupportCenterScreen extends StatefulWidget {
  final AdminFirestoreService adminService;
  final SessionState sessionState;
  final VoidCallback onBack;

  const AdminSupportCenterScreen({
    super.key,
    required this.adminService,
    required this.sessionState,
    required this.onBack,
  });

  @override
  State<AdminSupportCenterScreen> createState() => _AdminSupportCenterScreenState();
}

class _AdminSupportCenterScreenState extends State<AdminSupportCenterScreen> {
  String _filter = 'ALL';
  String _search = '';
  SupportTicketModel? _activeTicket;

  @override
  Widget build(BuildContext context) {
    final adminUid = widget.sessionState.currentUser?.uid ?? 'admin';
    final adminName = widget.sessionState.currentUser?.displayName ?? 'Admin Soporte';

    if (_activeTicket != null) {
      return _buildChatView(_activeTicket!, adminUid, adminName);
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Soporte & Incidencias', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Atención en tiempo real y resolución de tickets', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
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
                    hintText: 'Buscar por usuario, asunto o mensaje...',
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
                      _buildFilterChip('OPEN', 'Abiertos'),
                      _buildFilterChip('IN_PROGRESS', 'En Proceso'),
                      _buildFilterChip('RESOLVED', 'Resueltos'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<List<SupportTicketModel>>(
              stream: widget.adminService.getSupportTicketsStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final list = snapshot.data ?? [];
                final filtered = list.where((t) {
                  final matchFilter = _filter == 'ALL' || t.status == _filter;
                  final matchSearch = _search.isEmpty ||
                      t.userName.toLowerCase().contains(_search) ||
                      t.subject.toLowerCase().contains(_search) ||
                      t.lastMessage.toLowerCase().contains(_search);
                  return matchFilter && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.support_agent_outlined, size: 48, color: Color(0xFF94A3B8)),
                        SizedBox(height: 8),
                        Text('No hay tickets de soporte', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  itemCount: filtered.length,
                  itemBuilder: (context, i) {
                    final ticket = filtered[i];
                    return _buildTicketCard(ticket);
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

  Widget _buildTicketCard(SupportTicketModel ticket) {
    final isOpen = ticket.status == 'OPEN';
    final isResolved = ticket.status == 'RESOLVED';
    final statusColor = isOpen ? const Color(0xFFEF4444) : (isResolved ? const Color(0xFF10B981) : const Color(0xFFF59E0B));

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() => _activeTicket = ticket),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(ticket.subject, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF0F172A))),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
                    child: Text(ticket.status, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 9.5)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('De: ${ticket.userName} (${ticket.userRole})', style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569))),
              if (ticket.lastMessage.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(ticket.lastMessage, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChatView(SupportTicketModel ticket, String adminUid, String adminName) {
    final msgController = TextEditingController();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => setState(() => _activeTicket = null),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ticket.userName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            Text(ticket.subject, style: const TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (val) async {
              await widget.adminService.updateTicketStatus(ticket.id, val);
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(value: 'IN_PROGRESS', child: Text('Marcar En Proceso')),
              const PopupMenuItem(value: 'RESOLVED', child: Text('Marcar Resuelto')),
              const PopupMenuItem(value: 'CLOSED', child: Text('Cerrar Ticket')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<SupportMessageModel>>(
              stream: widget.adminService.getTicketMessagesStream(ticket.id),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final msgs = snapshot.data ?? [];
                if (msgs.isEmpty) {
                  return const Center(child: Text('Sin mensajes anteriores', style: TextStyle(color: Color(0xFF94A3B8))));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: msgs.length,
                  itemBuilder: (context, i) {
                    final msg = msgs[i];
                    final isMe = msg.isAdmin;
                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isMe ? const Color(0xFF1E3A8A) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: isMe ? null : Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                          children: [
                            Text(
                              msg.senderName,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isMe ? const Color(0xFF93C5FD) : const Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              msg.text,
                              style: TextStyle(
                                fontSize: 13,
                                color: isMe ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: msgController,
                      decoration: InputDecoration(
                        hintText: 'Escribir respuesta de soporte...',
                        isDense: true,
                        filled: true,
                        fillColor: const Color(0xFFF1F5F9),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    style: IconButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
                    icon: const Icon(Icons.send, size: 18),
                    onPressed: () async {
                      final txt = msgController.text.trim();
                      if (txt.isEmpty) return;
                      msgController.clear();
                      await widget.adminService.sendSupportMessage(
                        ticketId: ticket.id,
                        text: txt,
                        adminUid: adminUid,
                        adminName: adminName,
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
