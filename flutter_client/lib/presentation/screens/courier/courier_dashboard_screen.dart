/// BLUE SYSTEM DELIVERY ENTERPRISE — COURIER OPERATIONAL DASHBOARD
/// Availability toggle, assigned order queue, GPS telemetry indicator, trip tracking.

import 'package:flutter/material.dart';

import '../../../core/auth/auth_context.dart';
import '../../../core/observability/app_logger.dart';
import '../../../domain/entities/courier_balance_entity.dart';
import '../../../domain/entities/courier_location_entity.dart';
import '../../../domain/entities/order_entity.dart';
import '../../../domain/entities/trip_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../../data/services/courier_cash_closure_service.dart';
import '../../providers/session_state.dart';
import '../../widgets/state_views.dart';

class CourierDashboardScreen extends StatefulWidget {
  final SessionState sessionState;
  final IOrderService orderService;
  final ITripService tripService;
  final IFleetService fleetService;
  final ICourierCashClosureService? cashClosureService;

  const CourierDashboardScreen({
    super.key,
    required this.sessionState,
    required this.orderService,
    required this.tripService,
    required this.fleetService,
    this.cashClosureService,
  });

  @override
  State<CourierDashboardScreen> createState() => _CourierDashboardScreenState();
}

class _CourierDashboardScreenState extends State<CourierDashboardScreen> {
  bool _isOnline = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tenantId = widget.sessionState.claims?.tenantId ??
        widget.sessionState.activeTenant?.tenantId ??
        'ten_bluesystem_core';
    final courierId = widget.sessionState.currentUser?.uid ?? '';

    if (!widget.sessionState.canAccess('COURIER') &&
        widget.sessionState.claims?.role != EiamRole.driver &&
        widget.sessionState.currentUser?.role != EiamRole.driver) {
      return const UnauthorizedView(moduleKey: 'COURIER');
    }

    if (courierId.isEmpty) {
      return const ErrorView(
        title: 'Contexto Courier Incompleto',
        message: 'No se encontró un perfil de motorizado activo.',
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel Motorizado'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: Row(
              children: [
                Text(
                  _isOnline ? 'En Línea' : 'Fuera de Línea',
                  style: TextStyle(
                    color: _isOnline ? Colors.green : Colors.grey,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 8),
                Switch.adaptive(
                  key: const Key('courier_availability_switch'),
                  value: _isOnline,
                  activeColor: Colors.green,
                  onChanged: (val) => _toggleAvailability(val, courierId, tenantId),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Status Banner ─────────────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _isOnline ? Colors.green.withOpacity(0.1) : theme.colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _isOnline ? Colors.green.withOpacity(0.4) : theme.colorScheme.outlineVariant.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  Icon(
                    _isOnline ? Icons.sensors : Icons.sensors_off,
                    color: _isOnline ? Colors.green : Colors.grey,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isOnline ? 'Disponible para Entregas' : 'No Disponible',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _isOnline ? Colors.green : Colors.grey,
                            fontSize: 15,
                          ),
                        ),
                        Text(
                          _isOnline ? 'Tu ubicación está siendo transmitida.' : 'Activa el switch para recibir pedidos.',
                          style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ─── Courier Cash Balance & Closure (ADR-018) ──────────────────
            if (widget.cashClosureService != null) _buildBalanceCard(context, courierId),

            // ─── Eligible Orders (Atomic Claim) ─────────────────────────────
            if (_isOnline) _buildEligibleOrdersSection(context, tenantId, courierId),

            // ─── Assigned Orders ───────────────────────────────────────────
            Text('Pedidos Asignados', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            StreamBuilder<List<OrderEntity>>(
              stream: widget.orderService.watchCourierAssignedOrders(courierId, tenantId: tenantId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const LoadingView(message: 'Buscando pedidos...');
                }
                if (snapshot.hasError) {
                  return ErrorView(message: 'Error: ${snapshot.error}');
                }
                final orders = snapshot.data ?? [];
                if (orders.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Text('Sin pedidos asignados actualmente.', style: TextStyle(color: Colors.grey)),
                    ),
                  );
                }
                return Column(
                  children: orders.map((o) => _buildAssignedOrderTile(context, o)).toList(),
                );
              },
            ),

            const SizedBox(height: 20),

            // ─── Active Trips ──────────────────────────────────────────────
            Text('Viajes X→Y Activos', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            StreamBuilder<List<TripEntity>>(
              stream: widget.tripService.watchCourierAssignedTrips(courierId, tenantId: tenantId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const LoadingView(message: 'Buscando viajes...');
                }
                if (snapshot.hasError) {
                  return ErrorView(message: 'Error: ${snapshot.error}');
                }
                final trips = snapshot.data ?? [];
                if (trips.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Text('Sin viajes X→Y asignados actualmente.', style: TextStyle(color: Colors.grey)),
                    ),
                  );
                }
                return Column(
                  children: trips.map((t) => _buildTripTile(context, t)).toList(),
                );
              },
            ),

            const SizedBox(height: 20),

            // ─── GPS Telemetry Notice ──────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.withOpacity(0.2)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.gps_fixed, color: Colors.blue, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'La transmisión GPS utiliza /ubicaciones_repartidores/{courierId} conforme a ADR-016.',
                      style: TextStyle(fontSize: 12, color: Colors.blue),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  final Set<String> _updatingOrderIds = {};
  final Set<String> _updatingTripIds = {};

  Future<void> _toggleAvailability(bool val, String courierId, String tenantId) async {
    setState(() => _isOnline = val);
    AppLogger.info('CourierDashboardScreen', 'Courier availability changed: $val for uid: $courierId');
    try {
      final courierName = widget.sessionState.currentUser?.displayName ?? 'Motorizado';
      final telemetry = CourierLocationEntity(
        courierId: courierId,
        tenantId: tenantId,
        courierName: courierName,
        latitude: 12.1364,
        longitude: -86.2514,
        speed: 0.0,
        heading: 0.0,
        accuracy: 5.0,
        timestamp: DateTime.now().millisecondsSinceEpoch,
        isOnline: val,
      );
      await widget.fleetService.publishCourierTelemetry(telemetry);
    } catch (e) {
      AppLogger.warn('CourierDashboardScreen', 'Could not publish courier telemetry: $e');
    }
  }

  void _showNavigationOptions(BuildContext context, String title, String address, double lat, double lng) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.navigation_rounded, color: Color(0xFF2563EB)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Navegar: $title', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(address, style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
            const SizedBox(height: 6),
            Text('GPS: ${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}',
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                key: const Key('open_maps_button'),
                icon: const Icon(Icons.map_outlined),
                label: const Text('Iniciar Navegación GPS Externa'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Abriendo navegación hacia: $address'),
                      backgroundColor: const Color(0xFF2563EB),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<Map<String, dynamic>?> _showProofOfDeliveryDialog({
    required BuildContext context,
    required String title,
    required String identifier,
    required double total,
    required bool isCash,
  }) async {
    final nameController = TextEditingController();
    final notesController = TextEditingController();
    return await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.verified_user_rounded, color: Color(0xFF16A34A)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isCash ? 'Confirmar Cobro en Efectivo' : title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Confirmar Entrega (POD)',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF16A34A)),
              ),
              const SizedBox(height: 2),
              Text(
                'Identificador: $identifier',
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              if (isCash) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFCD34D)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total cobrado en efectivo:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      Text(
                        'C\$ ${total.toInt()}',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF92400E)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                key: const Key('pod_recipient_name_input'),
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre de quien recibe (opcional)',
                  hintText: 'Ej. Juan Pérez / Recepción',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('pod_notes_input'),
                controller: notesController,
                decoration: const InputDecoration(
                  labelText: 'Notas / Observaciones (opcional)',
                  hintText: 'Ej. Entregado en recepción',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.note_alt_outlined),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            key: const Key('pod_confirm_submit_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF16A34A),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              final recipient = nameController.text.trim().isEmpty ? 'Cliente' : nameController.text.trim();
              Navigator.pop(ctx, {
                'recipientName': recipient,
                'notes': notesController.text.trim(),
                'timestamp': DateTime.now().millisecondsSinceEpoch,
              });
            },
            child: const Text('Confirmar Entrega'),
          ),
        ],
      ),
    );
  }

  Widget _buildAssignedOrderTile(BuildContext context, OrderEntity order) {
    final theme = Theme.of(context);
    final isUpdating = _updatingOrderIds.contains(order.orderId);
    final isCash = order.paymentMethod == PaymentMethod.cash;

    // Calculate current step index (0: Asignado, 1: En Comercio, 2: En Camino, 3: Entregado)
    int currentStep = 0;
    if (order.status == OrderStatus.accepted || order.status == OrderStatus.pending) {
      currentStep = 0;
    } else if (order.status == OrderStatus.preparing || order.status == OrderStatus.readyForPickup) {
      currentStep = 1;
    } else if (order.status == OrderStatus.dispatched || order.status == OrderStatus.arrivedAtCustomer) {
      currentStep = 2;
    } else if (order.status == OrderStatus.delivered) {
      currentStep = 3;
    }

    String nextButtonLabel = '';
    OrderStatus? nextStatus;
    Color buttonColor = Colors.blue;

    switch (order.status) {
      case OrderStatus.pending:
      case OrderStatus.accepted:
        nextButtonLabel = 'Estoy en el comercio — CONFIRMAR RECOGIDA 📦';
        nextStatus = OrderStatus.readyForPickup;
        buttonColor = const Color(0xFF2563EB);
        break;
      case OrderStatus.preparing:
      case OrderStatus.readyForPickup:
        nextButtonLabel = 'INICIAR RUTA AL CLIENTE 🚀';
        nextStatus = OrderStatus.dispatched;
        buttonColor = const Color(0xFF0284C7);
        break;
      case OrderStatus.dispatched:
        nextButtonLabel = 'Llegué donde el Cliente 📍';
        nextStatus = OrderStatus.arrivedAtCustomer;
        buttonColor = const Color(0xFF0D9488);
        break;
      case OrderStatus.arrivedAtCustomer:
        nextButtonLabel = isCash
            ? 'COBRAR C\$ ${order.total.toInt()} Y ENTREGAR 💵'
            : 'CONFIRMAR ENTREGA Y FINALIZAR ✅';
        nextStatus = OrderStatus.delivered;
        buttonColor = const Color(0xFF16A34A);
        break;
      case OrderStatus.delivered:
        nextButtonLabel = 'PEDIDO ENTREGADO EXITOSAMENTE ✅';
        nextStatus = null;
        buttonColor = Colors.grey;
        break;
      case OrderStatus.cancelled:
      case OrderStatus.rejected:
        nextButtonLabel = 'PEDIDO CANCELADO ❌';
        nextStatus = null;
        buttonColor = Colors.red;
        break;
    }

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Header: Code, Badges, Total ─────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.two_wheeler_rounded, color: Color(0xFF2563EB), size: 22),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Pedido #${order.orderId.length > 8 ? order.orderId.substring(0, 8).toUpperCase() : order.orderId}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                            Text(
                              isCash ? '💵 Efectivo contra entrega' : '💳 Pago electrónico',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isCash ? const Color(0xFFD97706) : const Color(0xFF2563EB),
                              ),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'C\$ ${order.total.toInt()}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ─── Address & Navigation ───────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          order.deliveryAddress.isNotEmpty ? order.deliveryAddress : 'Dirección del cliente',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton.icon(
                  key: Key('order_navigate_btn_${order.orderId}'),
                  icon: const Icon(Icons.navigation_outlined, size: 14),
                  label: const Text('Navegar', style: TextStyle(fontSize: 11)),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  onPressed: () => _showNavigationOptions(
                    context,
                    'Cliente (Pedido #${order.orderId.length > 6 ? order.orderId.substring(0, 6) : order.orderId})',
                    order.deliveryAddress,
                    12.1364,
                    -86.2514,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ─── 4-Step Stepper Widget (1:1 Android Parity) ───────────────────
            _buildOrderStepper(currentStep),
            const SizedBox(height: 16),

            // ─── Next Action Button ──────────────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                key: Key('courier_action_btn_${order.orderId}'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: buttonColor,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  disabledForegroundColor: Colors.grey.shade600,
                  elevation: nextStatus != null ? 2 : 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: (nextStatus == null || isUpdating)
                    ? null
                    : () async {
                        final targetStatus = nextStatus;
                        if (targetStatus == null) return;

                        if (targetStatus == OrderStatus.delivered) {
                          final podData = await _showProofOfDeliveryDialog(
                            context: context,
                            title: 'Confirmar Entrega (POD)',
                            identifier: 'Pedido #${order.orderId.length > 8 ? order.orderId.substring(0, 8).toUpperCase() : order.orderId}',
                            total: order.total,
                            isCash: isCash,
                          );
                          if (podData == null) return;
                        }

                        setState(() => _updatingOrderIds.add(order.orderId));
                        try {
                          await widget.orderService.updateOrderStatus(order.orderId, targetStatus);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Estado actualizado: ${targetStatus.name.toUpperCase()} ✓'),
                                backgroundColor: const Color(0xFF10B981),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error al actualizar pedido: $e'), backgroundColor: Colors.red),
                            );
                          }
                        } finally {
                          if (mounted) {
                            setState(() => _updatingOrderIds.remove(order.orderId));
                          }
                        }
                      },
                child: isUpdating
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        nextButtonLabel,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderStepper(int activeStep) {
    final steps = [
      {'label': 'Asignado', 'icon': Icons.assignment_turned_in},
      {'label': 'En Comercio', 'icon': Icons.storefront_rounded},
      {'label': 'En Ruta', 'icon': Icons.delivery_dining_rounded},
      {'label': 'Entregado', 'icon': Icons.check_circle_rounded},
    ];

    return Row(
      children: List.generate(steps.length * 2 - 1, (index) {
        if (index.isOdd) {
          final stepBefore = index ~/ 2;
          final isCompleted = activeStep > stepBefore;
          return Expanded(
            child: Container(
              height: 3,
              color: isCompleted ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
            ),
          );
        }

        final stepIndex = index ~/ 2;
        final step = steps[stepIndex];
        final isPassed = activeStep > stepIndex;
        final isCurrent = activeStep == stepIndex;

        return Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isPassed
                    ? const Color(0xFF10B981)
                    : (isCurrent ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9)),
                border: Border.all(
                  color: isPassed
                      ? const Color(0xFF10B981)
                      : (isCurrent ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1)),
                  width: 2,
                ),
              ),
              child: Center(
                child: Icon(
                  isPassed ? Icons.check : (step['icon'] as IconData),
                  size: 16,
                  color: (isPassed || isCurrent) ? Colors.white : const Color(0xFF94A3B8),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              step['label'] as String,
              style: TextStyle(
                fontSize: 9,
                fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                color: isCurrent ? const Color(0xFF0F172A) : const Color(0xFF64748B),
              ),
            ),
          ],
        );
      }),
    );
  }


  Widget _buildBalanceCard(BuildContext context, String courierId) {
    final theme = Theme.of(context);
    return StreamBuilder<CourierBalanceEntity?>(
      stream: widget.cashClosureService!.watchCourierBalance(courierId),
      builder: (context, snapshot) {
        final balance = snapshot.data;
        final outstandingCents = balance?.cashOutstandingCents ?? 0;
        final limitCents = balance?.effectiveCashLimitCents ?? 300000;
        final outstandingCordobas = (outstandingCents / 100).toStringAsFixed(2);
        final limitCordobas = (limitCents / 100).toStringAsFixed(2);

        return Container(
          margin: const EdgeInsets.only(bottom: 20),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.account_balance_wallet, color: theme.colorScheme.primary, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Efectivo Recaudado (Arqueo)',
                            key: const Key('courier_balance_card_title'),
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    key: const Key('courier_daily_closure_button'),
                    icon: const Icon(Icons.receipt_long, size: 16),
                    label: const Text('Cierre Diario', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () => _showCashClosureDialog(context, courierId, outstandingCents),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'C\$ $outstandingCordobas',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: outstandingCents > (limitCents * 0.8) ? Colors.orange : theme.colorScheme.onSurface,
                          ),
                        ),
                        Text(
                          'Límite asignable: C\$ $limitCordobas',
                          style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: outstandingCents >= limitCents
                          ? Colors.red.withOpacity(0.15)
                          : Colors.green.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      outstandingCents >= limitCents ? 'LÍMITE ALCANZADO' : 'OPERATIVO',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: outstandingCents >= limitCents ? Colors.red : Colors.green,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEligibleOrdersSection(BuildContext context, String tenantId, String courierId) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Pedidos Listos para Tomar', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: Colors.amber.withOpacity(0.2), borderRadius: BorderRadius.circular(4)),
              child: const Text('READY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange)),
            ),
          ],
        ),
        const SizedBox(height: 10),
        StreamBuilder<List<OrderEntity>>(
          stream: widget.orderService.watchEligibleOrders(tenantId: tenantId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(height: 60, child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
            }
            final readyOrders = snapshot.data ?? [];
            if (readyOrders.isEmpty) {
              return Container(
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceVariant.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Center(
                  child: Text('No hay pedidos pendientes de recolección en este momento.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                ),
              );
            }
            return Column(
              children: readyOrders.map((o) => _buildEligibleOrderTile(context, o, tenantId, courierId)).toList(),
            );
          },
        ),
        // ─── Eligible X→Y Trips ─────────────────────────────────────
        StreamBuilder<List<TripEntity>>(
          stream: widget.tripService.watchEligibleTrips(tenantId: tenantId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox.shrink();
            }
            final readyTrips = snapshot.data ?? [];
            if (readyTrips.isEmpty) {
              return const SizedBox.shrink();
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Envíos Express X→Y Disponibles', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.teal.withOpacity(0.2), borderRadius: BorderRadius.circular(4)),
                      child: const Text('EXPRESS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.teal)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ...readyTrips.map((t) => _buildEligibleTripTile(context, t, tenantId, courierId)),
              ],
            );
          },
        ),
        const SizedBox(height: 10),
      ],
    );
  }

  Widget _buildEligibleTripTile(BuildContext context, TripEntity trip, String tenantId, String courierId) {
    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Colors.teal,
          child: Icon(Icons.local_shipping, color: Colors.white, size: 20),
        ),
        title: Text(
          'Envío Express #${trip.tripId.length > 8 ? trip.tripId.substring(0, 8) : trip.tripId}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          '${trip.originAddress} → ${trip.destinationAddress} (${trip.distanceKm.toStringAsFixed(1)} km)',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'C\$ ${trip.totalPrice.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              key: Key('claim_trip_btn_${trip.tripId}'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D9488),
                foregroundColor: Colors.white,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              ),
              onPressed: () async {
                try {
                  final courierName = widget.sessionState.currentUser?.displayName ?? 'Motorizado';
                  final ok = await widget.tripService.claimTripAtomically(
                    trip.tripId,
                    courierId,
                    courierName,
                  );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(ok ? '¡Envío express tomado con éxito!' : 'Conflicto: El envío ya fue asignado.'),
                        backgroundColor: ok ? Colors.green : Colors.red,
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error al tomar envío express: $e'), backgroundColor: Colors.red),
                    );
                  }
                }
              },
              child: const Text('Tomar', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEligibleOrderTile(BuildContext context, OrderEntity order, String tenantId, String courierId) {
    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Colors.amber,
          child: Icon(Icons.takeout_dining, color: Colors.white, size: 20),
        ),
        title: Text('Pedido #${order.orderId.length > 8 ? order.orderId.substring(0, 8) : order.orderId}', style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(order.deliveryAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          ),
          onPressed: () async {
            try {
              final courierName = widget.sessionState.currentUser?.displayName ?? 'Motorizado';
              final ok = await widget.orderService.claimOrderAtomically(
                order.orderId,
                courierId,
                courierName,
              );
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok ? '¡Pedido tomado con éxito!' : 'Conflicto: El pedido ya fue asignado.'),
                    backgroundColor: ok ? Colors.green : Colors.red,
                  ),
                );
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error al tomar pedido: $e'), backgroundColor: Colors.red),
                );
              }
            }
          },
          child: const Text('Tomar', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }

  void _showCashClosureDialog(BuildContext context, String courierId, int totalCollectedCents) {
    final refController = TextEditingController();
    final receiptController = TextEditingController(
      text: 'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/courier_deposits/$courierId/${DateTime.now().millisecondsSinceEpoch}.jpg',
    );
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Iniciar Cierre Diario (Arqueo)'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.monetization_on, color: Color(0xFF2563EB)),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total a liquidar (Arqueo):', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        Text(
                          'C\$ ${(totalCollectedCents / 100).toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('cash_closure_ref_input'),
                controller: refController,
                decoration: const InputDecoration(
                  labelText: 'Referencia Bancaria / Minuta *',
                  hintText: 'Ej. DEP-98765432',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.receipt),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('cash_closure_receipt_input'),
                controller: receiptController,
                decoration: const InputDecoration(
                  labelText: 'URL Comprobante Storage (ADR-018)',
                  hintText: 'gs:// / https://storage...',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.cloud_upload_outlined),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Al enviar se genera el Acta Oficial PDF (ADR-018) con hash inmutable y se transfiere el arqueo al centro de liquidación.',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            key: const Key('cash_closure_submit_button'),
            onPressed: () async {
              final ref = refController.text.trim();
              if (ref.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Por favor ingresa la referencia bancaria.'), backgroundColor: Colors.orange),
                );
                return;
              }
              final receiptUrl = receiptController.text.trim();
              final courierName = widget.sessionState.currentUser?.displayName ?? 'Motorizado';

              Navigator.pop(ctx);
              try {
                // 1. Generate ADR-018 Official Act Document
                final actDoc = await widget.cashClosureService!.generateOfficialActDocument(
                  courierId: courierId,
                  courierName: courierName,
                  totalCollectedCents: totalCollectedCents,
                  bankReference: ref,
                  depositReceiptUrl: receiptUrl,
                );

                // 2. Transmit closure to backend callable
                await widget.cashClosureService!.initiateDailyClosure(
                  courierId: courierId,
                  bankReference: ref,
                  receiptUrl: receiptUrl,
                  totalCollectedCents: totalCollectedCents,
                );

                if (mounted) {
                  final actNumberLine = actDoc.split('\n').firstWhere(
                        (line) => line.contains('Número de Acta:'),
                        orElse: () => 'Acta generada exitosamente',
                      );
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('✅ Cierre y $actNumberLine.'),
                      backgroundColor: Colors.green,
                      duration: const Duration(seconds: 4),
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error al iniciar cierre: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Generar Acta y Enviar'),
          ),
        ],
      ),
    );
  }

  Widget _buildTripTile(BuildContext context, TripEntity trip) {
    final theme = Theme.of(context);
    final isUpdating = _updatingTripIds.contains(trip.tripId);

    // Calculate step for X→Y:
    // 0: Asignado (assigned / onWayToOrigin)
    // 1: En Origen / Recogida (arrivedAtOrigin / goodsPickedUp)
    // 2: En Camino (onWayToDestination / arrivedAtDestination)
    // 3: Entregado (completed)
    int currentStep = 0;
    if (trip.status == TripStatus.assigned || trip.status == TripStatus.onWayToOrigin) {
      currentStep = 0;
    } else if (trip.status == TripStatus.arrivedAtOrigin || trip.status == TripStatus.goodsPickedUp) {
      currentStep = 1;
    } else if (trip.status == TripStatus.onWayToDestination || trip.status == TripStatus.arrivedAtDestination) {
      currentStep = 2;
    } else if (trip.status == TripStatus.completed) {
      currentStep = 3;
    }

    String nextButtonLabel = '';
    TripStatus? nextStatus;
    Color buttonColor = Colors.teal;

    switch (trip.status) {
      case TripStatus.requested:
      case TripStatus.offered:
      case TripStatus.assigned:
      case TripStatus.onWayToOrigin:
        nextButtonLabel = 'Estoy en Origen — CONFIRMAR RECOGIDA 📦';
        nextStatus = TripStatus.goodsPickedUp;
        buttonColor = const Color(0xFF2563EB);
        break;
      case TripStatus.arrivedAtOrigin:
      case TripStatus.goodsPickedUp:
        nextButtonLabel = 'INICIAR RUTA AL DESTINO 🚀';
        nextStatus = TripStatus.onWayToDestination;
        buttonColor = const Color(0xFF0284C7);
        break;
      case TripStatus.onWayToDestination:
        nextButtonLabel = 'Llegué a Destino 📍';
        nextStatus = TripStatus.arrivedAtDestination;
        buttonColor = const Color(0xFF0D9488);
        break;
      case TripStatus.arrivedAtDestination:
        nextButtonLabel = 'CONFIRMAR ENTREGA (POD) Y FINALIZAR ✅';
        nextStatus = TripStatus.completed;
        buttonColor = const Color(0xFF16A34A);
        break;
      case TripStatus.completed:
        nextButtonLabel = 'ENVÍO EXPRESS FINALIZADO EXITOSAMENTE ✅';
        nextStatus = null;
        buttonColor = Colors.grey;
        break;
      case TripStatus.cancelled:
        nextButtonLabel = 'ENVÍO EXPRESS CANCELADO ❌';
        nextStatus = null;
        buttonColor = Colors.red;
        break;
    }

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDFA),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.local_shipping_rounded, color: Color(0xFF0D9488), size: 22),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Envío Express #${trip.tripId}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                            Text(
                              'Punto a Punto (${trip.distanceKm.toStringAsFixed(1)} km) • ADR-026',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0D9488)),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'C\$ ${trip.totalPrice.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Route: Origin & Destination
            Row(
              children: [
                const Icon(Icons.trip_origin, size: 14, color: Colors.green),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'X: ${trip.originAddress}',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on, size: 14, color: Colors.red),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Y: ${trip.destinationAddress}',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                TextButton.icon(
                  key: Key('trip_navigate_btn_${trip.tripId}'),
                  icon: const Icon(Icons.navigation_outlined, size: 14),
                  label: const Text('Navegar', style: TextStyle(fontSize: 11)),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  onPressed: () => _showNavigationOptions(
                    context,
                    'Destino Envío Express',
                    trip.destinationAddress,
                    trip.destination.latitude,
                    trip.destination.longitude,
                  ),
                ),
              ],
            ),
            if ((trip.packageDescription ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.inventory_2_outlined, size: 14, color: Colors.grey),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Paquete: ${trip.packageDescription}',
                      style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF64748B)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),

            // Stepper
            _buildOrderStepper(currentStep),
            const SizedBox(height: 16),

            // Action Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                key: Key('trip_action_btn_${trip.tripId}'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: buttonColor,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  disabledForegroundColor: Colors.grey.shade600,
                  elevation: nextStatus != null ? 2 : 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: (nextStatus == null || isUpdating)
                    ? null
                    : () async {
                        final targetStatus = nextStatus;
                        if (targetStatus == null) return;

                        if (targetStatus == TripStatus.completed) {
                          final podData = await _showProofOfDeliveryDialog(
                            context: context,
                            title: 'Confirmar Entrega Envío Express (POD)',
                            identifier: 'Envío #${trip.tripId.length > 8 ? trip.tripId.substring(0, 8).toUpperCase() : trip.tripId}',
                            total: trip.totalPrice,
                            isCash: false,
                          );
                          if (podData == null) return;
                        }

                        setState(() => _updatingTripIds.add(trip.tripId));
                        try {
                          await widget.tripService.updateTripStatus(trip.tripId, targetStatus);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Estado de envío actualizado: ${targetStatus.name.toUpperCase()} ✓'),
                                backgroundColor: const Color(0xFF10B981),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error al actualizar envío: $e'), backgroundColor: Colors.red),
                            );
                          }
                        } finally {
                          if (mounted) {
                            setState(() => _updatingTripIds.remove(trip.tripId));
                          }
                        }
                      },
                child: isUpdating
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        nextButtonLabel,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
