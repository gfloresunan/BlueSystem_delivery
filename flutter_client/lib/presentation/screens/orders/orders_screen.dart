/// BLUE SYSTEM DELIVERY ENTERPRISE — ORDERS MODULE SCREEN
/// Realtime orders streaming, status filters, multi-tenant isolation, and order detail view.

import 'package:flutter/material.dart';

import '../../../core/observability/app_logger.dart';
import '../../../domain/entities/order_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../providers/session_state.dart';
import '../../widgets/state_views.dart';

class OrdersScreen extends StatefulWidget {
  final SessionState sessionState;
  final IOrderService orderService;

  const OrdersScreen({
    super.key,
    required this.sessionState,
    required this.orderService,
  });

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String _selectedStatusFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tenantId = widget.sessionState.claims?.tenantId ?? widget.sessionState.activeTenant?.tenantId ?? '';
    final businessId = widget.sessionState.claims?.businessId;

    if (tenantId.isEmpty) {
      return const ErrorView(
        title: 'Error de Contexto',
        message: 'No se detectó un Tenant activo para la consulta de pedidos.',
      );
    }

    final Stream<List<OrderEntity>> ordersStream = (businessId != null && businessId.isNotEmpty)
        ? widget.orderService.watchBusinessOrders(businessId, tenantId: tenantId)
        : widget.orderService.watchCustomerOrders(
            widget.sessionState.currentUser?.uid ?? '',
            tenantId: tenantId,
          );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestión de Pedidos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _filterChip('TODOS', 'ALL'),
                _filterChip('PENDIENTES', 'PENDING'),
                _filterChip('EN PREPARACIÓN', 'PREPARING'),
                _filterChip('EN CAMINO', 'DISPATCHED'),
                _filterChip('ENTREGADOS', 'DELIVERED'),
              ],
            ),
          ),
          const Divider(height: 1),

          // Orders Stream List
          Expanded(
            child: StreamBuilder<List<OrderEntity>>(
              stream: ordersStream,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const LoadingView(message: 'Sincronizando pedidos en tiempo real...');
                }

                if (snapshot.hasError) {
                  AppLogger.error('OrdersScreen', 'Stream error', snapshot.error);
                  return ErrorView(
                    message: 'Error al cargar pedidos: ${snapshot.error}',
                    onRetry: () => setState(() {}),
                  );
                }

                final orders = snapshot.data ?? [];
                final filteredOrders = _filterOrders(orders);

                if (filteredOrders.isEmpty) {
                  return const EmptyView(
                    title: 'No hay pedidos disponibles',
                    message: 'Los nuevos pedidos aparecerán aquí automáticamente en tiempo real.',
                    icon: Icons.receipt_long_outlined,
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredOrders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final order = filteredOrders[index];
                    return _buildOrderCard(context, order);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  List<OrderEntity> _filterOrders(List<OrderEntity> orders) {
    if (_selectedStatusFilter == 'ALL') return orders;
    return orders.where((o) => o.status.name.toUpperCase() == _selectedStatusFilter).toList();
  }

  Widget _filterChip(String label, String value) {
    final isSelected = _selectedStatusFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        selected: isSelected,
        onSelected: (val) {
          setState(() {
            _selectedStatusFilter = value;
          });
        },
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, OrderEntity order) {
    final theme = Theme.of(context);
    final statusColor = _getStatusColor(order.status);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showOrderDetail(context, order),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Pedido #${order.orderId.length > 8 ? order.orderId.substring(0, 8) : order.orderId}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: statusColor.withOpacity(0.4)),
                    ),
                    child: Text(
                      order.status.name.toUpperCase(),
                      style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(Icons.person_outline, size: 16, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 6),
                  Text(order.customerName, style: const TextStyle(fontSize: 13)),
                  const Spacer(),
                  Text(
                    '\$${order.total.toStringAsFixed(2)}',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: theme.colorScheme.primary),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.location_on_outlined, size: 16, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      order.deliveryAddress,
                      style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return Colors.orange;
      case OrderStatus.accepted:
      case OrderStatus.preparing:
        return Colors.blue;
      case OrderStatus.readyForPickup:
      case OrderStatus.dispatched:
        return Colors.teal;
      case OrderStatus.delivered:
        return Colors.green;
      case OrderStatus.cancelled:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Filtrar por Estado'),
        children: [
          SimpleDialogOption(
            onPressed: () {
              setState(() => _selectedStatusFilter = 'ALL');
              Navigator.pop(ctx);
            },
            child: const Text('Todos'),
          ),
          SimpleDialogOption(
            onPressed: () {
              setState(() => _selectedStatusFilter = 'PENDING');
              Navigator.pop(ctx);
            },
            child: const Text('Pendientes'),
          ),
          SimpleDialogOption(
            onPressed: () {
              setState(() => _selectedStatusFilter = 'PREPARING');
              Navigator.pop(ctx);
            },
            child: const Text('En Preparación'),
          ),
          SimpleDialogOption(
            onPressed: () {
              setState(() => _selectedStatusFilter = 'DELIVERED');
              Navigator.pop(ctx);
            },
            child: const Text('Entregados'),
          ),
        ],
      ),
    );
  }

  void _showOrderDetail(BuildContext context, OrderEntity order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (_, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            Text('Detalle de Pedido', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.tag),
              title: const Text('ID de Pedido'),
              subtitle: Text(order.orderId),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.person),
              title: const Text('Cliente'),
              subtitle: Text('${order.customerName} (${order.customerPhone})'),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.place),
              title: const Text('Dirección de Entrega'),
              subtitle: Text(order.deliveryAddress),
            ),
            const Divider(),
            const Text('Artículos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            ...order.items.map((it) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${it.quantity}x ${it.name}'),
                      Text('\$${(it.unitPrice * it.quantity).toStringAsFixed(2)}'),
                    ],
                  ),
                )),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('\$${order.total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
