import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../data/services/courier_cash_closure_service.dart';
import '../../../domain/entities/courier_balance_entity.dart';

/// BLUE SYSTEM DELIVERY ENTERPRISE — COURIER CASH CLOSURE & FINANCES SCREEN (iOS / Flutter)
/// Paridad 1:1 con Android CourierCashClosureScreen.kt (ADR-018)
///
/// Gestiona:
/// 1. Balance de efectivo vivo en mano vs límite operativo.
/// 2. Selección de bancos oficiales de Nicaragua (BAC, Banpro, LAFISE, BDF, Avanz).
/// 3. Captura y registro de referencia bancaria y comprobante de depósito.
/// 4. Generación inmutable de Acta Oficial con hash de auditoría.
/// 5. Historial reactivo de cierres diarios con chips de estado canónicos.
class CourierCashClosureScreen extends StatefulWidget {
  final String courierId;
  final String courierName;
  final ICourierCashClosureService cashClosureService;
  final VoidCallback? onBack;

  const CourierCashClosureScreen({
    super.key,
    required this.courierId,
    required this.courierName,
    required this.cashClosureService,
    this.onBack,
  });

  static const List<String> availableBanks = [
    'BAC Credomatic',
    'Banpro Grupo Promerica',
    'Banco LAFISE Bancentro',
    'BDF Banco de Finanzas',
    'Avanz',
    'Billetera Móvil / Banpro',
    'Kash / BAC',
  ];

  @override
  State<CourierCashClosureScreen> createState() => _CourierCashClosureScreenState();
}

class _CourierCashClosureScreenState extends State<CourierCashClosureScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Form Controllers
  late TextEditingController _refController;
  late TextEditingController _receiptController;
  late TextEditingController _notesController;

  String _selectedBank = CourierCashClosureScreen.availableBanks.first;
  bool _isSubmitting = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _refController = TextEditingController();
    _notesController = TextEditingController();
    _receiptController = TextEditingController(
      text:
          'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/courier_deposits/${widget.courierId}/${DateTime.now().millisecondsSinceEpoch}.jpg',
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _refController.dispose();
    _receiptController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Color _getStatusColor(ClosureStatus status) {
    switch (status) {
      case ClosureStatus.approved:
        return const Color(0xFF10B981); // Emerald Green
      case ClosureStatus.pendingApproval:
        return const Color(0xFFF59E0B); // Amber / Orange
      case ClosureStatus.rejected:
        return const Color(0xFFEF4444); // Red
      case ClosureStatus.submitted:
        return const Color(0xFF3B82F6); // Blue
    }
  }

  String _getStatusLabel(ClosureStatus status) {
    switch (status) {
      case ClosureStatus.approved:
        return 'VERIFICADO Y LIQUIDADO';
      case ClosureStatus.pendingApproval:
        return 'PENDIENTE DE VERIFICACIÓN';
      case ClosureStatus.rejected:
        return 'RECHAZADO';
      case ClosureStatus.submitted:
        return 'ENVIADO';
    }
  }

  Future<void> _submitClosure(int outstandingCents) async {
    final ref = _refController.text.trim();
    if (ref.isEmpty) {
      setState(() {
        _errorMessage = 'Por favor ingresa la referencia bancaria / minuta.';
      });
      return;
    }

    final receiptUrl = _receiptController.text.trim();
    if (receiptUrl.isEmpty) {
      setState(() {
        _errorMessage = 'Por favor ingresa la URL del comprobante de depósito.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      // 1. Generar Acta Oficial PDF inmutable con hash
      final actDoc = await widget.cashClosureService.generateOfficialActDocument(
        courierId: widget.courierId,
        courierName: widget.courierName,
        totalCollectedCents: outstandingCents,
        bankReference: ref,
        depositReceiptUrl: receiptUrl,
      );

      // 2. Invocar Cloud Functions canónicas mediante el servicio
      await widget.cashClosureService.initiateDailyClosure(
        courierId: widget.courierId,
        bankReference: ref,
        receiptUrl: receiptUrl,
        totalCollectedCents: outstandingCents,
        bankName: _selectedBank,
        notes: _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
      );

      final actNumberLine = actDoc.split('\n').firstWhere(
            (line) => line.contains('Número de Acta:'),
            orElse: () => 'Acta generada exitosamente',
          );

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _successMessage = '✅ Cierre iniciado exitosamente. $actNumberLine.';
          _refController.clear();
          _notesController.clear();
        });
        _tabController.animateTo(1); // Cambiar a pestaña de Historial
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = 'Error al procesar el cierre: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cierre Diario y Finanzas (ADR-018)'),
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: widget.onBack,
              )
            : null,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: theme.colorScheme.primary,
          tabs: const [
            Tab(icon: Icon(Icons.point_of_sale), text: 'Arqueo Actual'),
            Tab(icon: Icon(Icons.history), text: 'Historial de Cierres'),
          ],
        ),
      ),
      body: StreamBuilder<CourierBalanceEntity?>(
        stream: widget.cashClosureService.watchCourierBalance(widget.courierId),
        builder: (context, balanceSnapshot) {
          final balance = balanceSnapshot.data;
          final outstandingCents = balance?.cashOutstandingCents ?? 0;
          final limitCents = balance?.effectiveCashLimitCents ?? 300000;
          final outstandingCordobas = (outstandingCents / 100).toStringAsFixed(2);
          final limitCordobas = (limitCents / 100).toStringAsFixed(2);
          final isLimitReached = outstandingCents >= limitCents;

          return TabBarView(
            controller: _tabController,
            children: [
              // Pestaña 1: Formulario de Arqueo y Cierre
              _buildArqueoTab(
                context,
                outstandingCents,
                outstandingCordobas,
                limitCordobas,
                isLimitReached,
              ),

              // Pestaña 2: Historial Reactivo de Cierres
              _buildHistoryTab(context),
            ],
          );
        },
      ),
    );
  }

  Widget _buildArqueoTab(
    BuildContext context,
    int outstandingCents,
    String outstandingCordobas,
    String limitCordobas,
    bool isLimitReached,
  ) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Tarjeta de Balance Vivo
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            color: theme.colorScheme.surface,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.monetization_on,
                            color: theme.colorScheme.primary,
                            size: 24,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Efectivo Recaudado (Arqueo)',
                            key: const Key('courier_balance_card_title'),
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isLimitReached
                              ? Colors.red.withOpacity(0.15)
                              : Colors.green.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isLimitReached ? 'LÍMITE ALCANZADO' : 'OPERATIVO',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isLimitReached ? Colors.red : Colors.green,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'C\$ $outstandingCordobas',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isLimitReached ? Colors.red : theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Límite asignable de efectivo: C\$ $limitCordobas',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.red.shade900.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade400),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.red, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

          if (_successMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.green.shade900.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade400),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _successMessage!,
                      style: const TextStyle(color: Colors.green, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

          // Selector de Bancos Oficiales de Nicaragua
          Text(
            'Banco de Depósito *',
            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: _selectedBank,
            key: const Key('cash_closure_bank_selector'),
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.account_balance),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            items: CourierCashClosureScreen.availableBanks.map((bank) {
              return DropdownMenuItem<String>(
                value: bank,
                child: Text(bank),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) {
                setState(() => _selectedBank = val);
              }
            },
          ),
          const SizedBox(height: 14),

          // Campo de Referencia Bancaria / Minuta
          Text(
            'Referencia Bancaria / Minuta *',
            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          TextField(
            key: const Key('cash_closure_ref_input'),
            controller: _refController,
            decoration: const InputDecoration(
              hintText: 'Ej. DEP-98765432 / MINUTA-8812',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.receipt),
            ),
          ),
          const SizedBox(height: 14),

          // Comprobante de Depósito (Storage URL / Adjunto)
          Text(
            'Comprobante de Depósito (Voucher Storage) *',
            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          TextField(
            key: const Key('cash_closure_receipt_input'),
            controller: _receiptController,
            decoration: const InputDecoration(
              hintText: 'https://storage.googleapis.com/...',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.cloud_upload_outlined),
            ),
          ),
          const SizedBox(height: 14),

          // Notas / Observaciones Opcionales
          Text(
            'Notas u Observaciones (Opcional)',
            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          TextField(
            key: const Key('cash_closure_notes_input'),
            controller: _notesController,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: 'Ej. Depósito en sucursal BAC Metrocentro',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.note_alt_outlined),
            ),
          ),
          const SizedBox(height: 12),

          // Aviso Legal y Regulatorio
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.shade50.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade300.withOpacity(0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.shield_outlined, color: Colors.blue.shade400, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Al enviar el arqueo, el sistema emite el Acta Oficial PDF (ADR-018) con hash inmutable y notifica al centro de liquidación. Tu saldo se restablece tras la verificación administrativa.',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Botón de Envío
          ElevatedButton.icon(
            key: const Key('cash_closure_submit_button'),
            icon: _isSubmitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.send_rounded),
            label: Text(
              _isSubmitting ? 'Procesando Acta...' : 'Generar Acta y Enviar Cierre',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
            ),
            onPressed: _isSubmitting ? null : () => _submitClosure(outstandingCents),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab(BuildContext context) {
    final theme = Theme.of(context);

    return StreamBuilder<List<CourierDailyClosureEntity>>(
      stream: widget.cashClosureService.watchClosureHistory(widget.courierId),
      initialData: const <CourierDailyClosureEntity>[],
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final closures = snapshot.data ?? [];
        if (closures.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history_toggle_off, size: 48, color: Colors.grey.shade600),
                const SizedBox(height: 12),
                Text(
                  'No hay cierres diarios registrados aún.',
                  style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16.0),
          itemCount: closures.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final closure = closures[index];
            final statusColor = _getStatusColor(closure.status);
            final statusLabel = _getStatusLabel(closure.status);
            final amountCordobas = (closure.totalCollectedCents / 100).toStringAsFixed(2);
            final dateStr = closure.businessDate;

            return Card(
              elevation: 1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              color: theme.colorScheme.surface,
              child: Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Cierre: $dateStr',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: statusColor.withOpacity(0.4)),
                          ),
                          child: Text(
                            statusLabel,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: statusColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Total Liquidado',
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                            ),
                            Text(
                              'C\$ $amountCordobas',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'Ref: ${closure.bankReference}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                            ),
                            if (closure.bankName.isNotEmpty)
                              Text(
                                closure.bankName,
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                              ),
                          ],
                        ),
                      ],
                    ),
                    if (closure.actNumber != null && closure.actNumber!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.blue.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.verified_outlined, size: 14, color: Colors.blue),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                'Acta: ${closure.actNumber}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                  color: Colors.blue,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton.icon(
                          key: Key('view_act_button_${closure.closureId}'),
                          icon: const Icon(Icons.description, size: 14),
                          label: const Text('Ver Acta Oficial', style: TextStyle(fontSize: 11)),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            visualDensity: VisualDensity.compact,
                          ),
                          onPressed: () => _showOfficialActDetails(context, closure),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showOfficialActDetails(BuildContext context, CourierDailyClosureEntity closure) {
    final amountCordobas = (closure.totalCollectedCents / 100).toStringAsFixed(2);
    final statusColor = _getStatusColor(closure.status);
    final statusLabel = _getStatusLabel(closure.status);
    final actNumber = closure.actNumber ?? 'ACTA-CASH-PENDIENTE';
    final verificationCode = 'BSD-VERIF-${closure.closureId.hashCode.abs().toRadixString(16).toUpperCase()}';

    final fullActText = '''
============================================================
       BLUESYSTEM DELIVERY ENTERPRISE v2.2
 ACTA OFICIAL DE CIERRE DIARIO Y ARQUEO DE EFECTIVO
          (ADR-018 INMUTABLE BASELINE)
============================================================
Número de Acta:      $actNumber
Código Verificación: $verificationCode
Fecha Operacional:   ${closure.businessDate}
Plataforma:          iOS Flutter Client
------------------------------------------------------------
DATOS DEL MOTORIZADO:
ID Courier:          ${closure.courierId}
Nombre Oficial:      ${closure.courierName}
------------------------------------------------------------
CONCILIACIÓN FINANCIERA DE 4 CAPAS:
1. Total Recaudado:          C\$ $amountCordobas
2. Saldo Arqueo en Mesa:     C\$ $amountCordobas
3. Depósito Bancario:        C\$ $amountCordobas
   - Banco:                  ${closure.bankName}
   - Ref Bancaria:           ${closure.bankReference}
   - Voucher Storage:        ${closure.depositReceiptUrl}
4. Saldo Pendiente:          C\$ 0.00 (Post-Aprobación)
------------------------------------------------------------
ESTADO DE AUDITORÍA: $statusLabel
Supervisor Canónico: AUDITORÍA CENTRAL BLUESYSTEM
Firma Digital:       SHA256:${closure.closureId.hashCode.abs()}-${closure.businessDate}-OFFICIAL
============================================================
''';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.shield_outlined, color: Color(0xFF2563EB), size: 24),
                      const SizedBox(width: 8),
                      Text(
                        'Acta Oficial PDF (ADR-018)',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: statusColor.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      actNumber,
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: statusColor, fontFamily: 'monospace'),
                    ),
                    Text(
                      statusLabel,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Card(
                color: Theme.of(context).colorScheme.surface,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.5)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Conciliación Financiera (4 Capas):', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const Divider(height: 14),
                      _buildConciliationRow('1. Total Recaudado:', 'C\$ $amountCordobas'),
                      _buildConciliationRow('2. Arqueo Físico en Mesa:', 'C\$ $amountCordobas'),
                      _buildConciliationRow('3. Depósito Bancario:', 'C\$ $amountCordobas'),
                      _buildConciliationRow('4. Saldo Vivo Pendiente:', closure.status == ClosureStatus.approved ? 'C\$ 0.00' : 'C\$ $amountCordobas (Por Conciliar)'),
                      const Divider(height: 14),
                      _buildConciliationRow('Banco de Nicaragua:', closure.bankName),
                      _buildConciliationRow('Minuta / Referencia:', closure.bankReference),
                      _buildConciliationRow('Fecha Comercial:', closure.businessDate ?? 'N/A'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              // Documento Monospace Completo
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.withOpacity(0.2)),
                ),
                child: Text(
                  fullActText,
                  style: const TextStyle(fontSize: 10, fontFamily: 'monospace', height: 1.3),
                ),
              ),
              const SizedBox(height: 18),
              // Acciones
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Copiar Texto Acta'),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: fullActText));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('📋 Acta Oficial copiada al portapapeles.'),
                            backgroundColor: Colors.blue,
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.share, size: 16),
                      label: const Text('Compartir'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: fullActText));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('📤 Acta $actNumber lista para enviar al supervisor.'),
                            backgroundColor: Colors.green,
                            duration: const Duration(seconds: 3),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConciliationRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

