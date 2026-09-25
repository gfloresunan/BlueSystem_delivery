/// BLUE SYSTEM DELIVERY ENTERPRISE — COURIER OPERATIONAL DASHBOARD
/// Availability toggle, assigned order queue, GPS telemetry indicator, trip tracking.

import 'package:flutter/material.dart';

import '../../../core/observability/app_logger.dart';
import '../../../domain/entities/courier_balance_entity.dart';
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
                  value: _isOnline,
                  activeColor: Colors.green,
                  onChanged: (val) {
                    setState(() => _isOnline = val);
                    AppLogger.info('CourierDashboardScreen', 'Courier availability changed: $val for uid: $courierId');
                    // NOTE: Actual availability update must go through Cloud Function / Backend
                    // 🟡 GAP: CONTRACT REQUIRED — updateCourierAvailability Cloud Function
                  },
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
                  Column(
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
                      ),
                    ],
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

  Widget _buildAssignedOrderTile(BuildContext context, OrderEntity order) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.receipt_outlined, color: Colors.blue),
        title: Text('Pedido #${order.orderId.length > 8 ? order.orderId.substring(0, 8) : order.orderId}'),
        subtitle: Text(order.deliveryAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: Text('\$${order.total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
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
                  Row(
                    children: [
                      Icon(Icons.account_balance_wallet, color: theme.colorScheme.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Efectivo Recaudado (Arqueo)',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  OutlinedButton.icon(
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
                  Column(
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
                      ),
                    ],
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
        const SizedBox(height: 10),
      ],
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Iniciar Cierre Diario (Arqueo)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Monto a liquidar: C\$ ${(totalCollectedCents / 100).toStringAsFixed(2)}'),
            const SizedBox(height: 12),
            TextField(
              controller: refController,
              decoration: const InputDecoration(
                labelText: 'Referencia Bancaria',
                hintText: 'Ej. DEP-12345678',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Al iniciar, se registrará el depósito y se enviará para aprobación del Admin.',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final ref = refController.text.trim();
              if (ref.isEmpty) return;
              Navigator.pop(ctx);
              try {
                await widget.cashClosureService!.initiateDailyClosure(
                  courierId: courierId,
                  bankReference: ref,
                  receiptUrl: 'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/courier_deposits/mock_receipt.jpg',
                  totalCollectedCents: totalCollectedCents,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Cierre diario enviado correctamente.'), backgroundColor: Colors.green),
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
            child: const Text('Enviar Cierre'),
          ),
        ],
      ),
    );
  }

  Widget _buildTripTile(BuildContext context, TripEntity trip) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.local_shipping_outlined, color: Colors.teal),
        title: Text('Viaje #${trip.tripId.length > 8 ? trip.tripId.substring(0, 8) : trip.tripId}'),
        subtitle: Text('${trip.originAddress} → ${trip.destinationAddress}', maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: Text('\$${trip.fare.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
