/// BLUE SYSTEM DELIVERY ENTERPRISE — LIVE ORDER TRACKING SCREEN (1:1 ANDROID PARITY)
/// Reconstructs OrderDetailScreen.kt from Android reference.
/// Real-time live courier tracking on Google Maps with Origin, Destination, and Courier GPS markers,
/// status progression stepper, and ADR-016 /ubicaciones_repartidores/{courierId} telemetry.

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../domain/entities/courier_location_entity.dart';
import '../../../domain/entities/order_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';

class OrderLiveTrackingScreen extends StatefulWidget {
  final OrderEntity initialOrder;
  final IOrderService orderService;
  final IFleetService fleetService;
  final VoidCallback onBack;

  const OrderLiveTrackingScreen({
    super.key,
    required this.initialOrder,
    required this.orderService,
    required this.fleetService,
    required this.onBack,
  });

  @override
  State<OrderLiveTrackingScreen> createState() => _OrderLiveTrackingScreenState();
}

class _OrderLiveTrackingScreenState extends State<OrderLiveTrackingScreen> {
  GoogleMapController? _mapController;

  // Fallback coordinates for Managua in case order lacks explicit coords
  static const double _defaultManaguaLat = 12.136389;
  static const double _defaultManaguaLng = -86.251389;

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<OrderEntity?>(
      stream: widget.orderService.watchOrder(widget.initialOrder.orderId),
      initialData: widget.initialOrder,
      builder: (context, orderSnapshot) {
        final order = orderSnapshot.data ?? widget.initialOrder;
        final courierId = order.assignedCourierId ?? '';

        return StreamBuilder<CourierLocationEntity?>(
          stream: courierId.isNotEmpty
              ? widget.fleetService.watchCourierLocation(courierId)
              : Stream.value(null),
          builder: (context, courierSnapshot) {
            final courierLoc = courierSnapshot.data;
            final isCourierLive = courierLoc != null && courierLoc.isFresh;

            // Generate map markers
            final markers = _buildMarkers(order, courierLoc);

            // Compute camera target
            final LatLng targetPosition;
            if (courierLoc != null && courierLoc.latitude != 0.0 && courierLoc.longitude != 0.0) {
              targetPosition = LatLng(courierLoc.latitude, courierLoc.longitude);
            } else if (order.deliveryLat != null && order.deliveryLng != null) {
              targetPosition = LatLng(order.deliveryLat!, order.deliveryLng!);
            } else if (order.merchantLat != null && order.merchantLng != null) {
              targetPosition = LatLng(order.merchantLat!, order.merchantLng!);
            } else {
              targetPosition = const LatLng(_defaultManaguaLat, _defaultManaguaLng);
            }

            return Scaffold(
              backgroundColor: const Color(0xFF0F172A),
              appBar: AppBar(
                backgroundColor: const Color(0xFF0F172A),
                foregroundColor: Colors.white,
                elevation: 0,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: widget.onBack,
                ),
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Seguimiento en Vivo 🛵',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                    ),
                    Text(
                      'Pedido #${order.orderId.length > 8 ? order.orderId.substring(0, 8).toUpperCase() : order.orderId}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
                actions: [
                  Padding(
                    padding: const EdgeInsets.only(right: 16.0),
                    child: Center(
                      child: _buildGpsStatusBadge(courierId, isCourierLive, courierLoc),
                    ),
                  ),
                ],
              ),
              body: Stack(
                children: [
                  // ─── 1. Map View (or Test/Sentinels fallback) ─────────────────
                  Positioned.fill(
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: targetPosition,
                        zoom: 15.0,
                      ),
                      markers: markers,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                      compassEnabled: true,
                      onMapCreated: (controller) {
                        _mapController = controller;
                      },
                    ),
                  ),

                  // ─── 2. Top Stepper Card ─────────────────────────────────────
                  Positioned(
                    top: 12,
                    left: 16,
                    right: 16,
                    child: _buildTrackingStepperCard(order),
                  ),

                  // ─── 3. Bottom Order Info Sheet ──────────────────────────────
                  Positioned(
                    bottom: 16,
                    left: 16,
                    right: 16,
                    child: _buildBottomInfoCard(order, courierLoc, isCourierLive),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Set<Marker> _buildMarkers(OrderEntity order, CourierLocationEntity? courierLoc) {
    final markers = <Marker>{};

    // 1. Origin Marker (Store / Commerce - Green HUE)
    final storeLat = order.merchantLat ?? _defaultManaguaLat;
    final storeLng = order.merchantLng ?? _defaultManaguaLng;
    final storeName = order.businessName.isNotEmpty ? order.businessName : 'Comercio Aliado';

    markers.add(
      Marker(
        markerId: const MarkerId('marker_store_origin'),
        position: LatLng(storeLat, storeLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(
          title: storeName,
          snippet: 'Punto de recogida del pedido',
        ),
      ),
    );

    // 2. Destination Marker (Customer Address - Red HUE)
    final customerLat = order.deliveryLat ?? (_defaultManaguaLat + 0.005);
    final customerLng = order.deliveryLng ?? (_defaultManaguaLng - 0.005);

    markers.add(
      Marker(
        markerId: const MarkerId('marker_customer_destination'),
        position: LatLng(customerLat, customerLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(
          title: 'Tu Dirección de Entrega',
          snippet: order.deliveryAddress.isNotEmpty ? order.deliveryAddress : 'Destino',
        ),
      ),
    );

    // 3. Courier Live Marker (Azure HUE / Moto)
    if (courierLoc != null && courierLoc.latitude != 0.0 && courierLoc.longitude != 0.0) {
      final speedText = courierLoc.speedKmh > 3
          ? 'Velocidad: ~${courierLoc.speedKmh.toInt()} km/h'
          : 'Transmitiendo señal GPS';

      markers.add(
        Marker(
          markerId: const MarkerId('marker_courier_live'),
          position: LatLng(courierLoc.latitude, courierLoc.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: InfoWindow(
            title: '🛵 Repartidor en Ruta',
            snippet: speedText,
          ),
        ),
      );
    }

    return markers;
  }

  Widget _buildGpsStatusBadge(String courierId, bool isLive, CourierLocationEntity? loc) {
    if (courierId.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFF334155),
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Text('Por Asignar', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
      );
    }

    if (isLive) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFF10B981).withOpacity(0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF10B981)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 8, height: 8, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF10B981))),
            const SizedBox(width: 6),
            const Text('GPS En Vivo', style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF59E0B)),
      ),
      child: const Text('Conectando GPS...', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildTrackingStepperCard(OrderEntity order) {
    int activeStep = 0;
    if (order.status == OrderStatus.accepted || order.status == OrderStatus.pending) {
      activeStep = 0;
    } else if (order.status == OrderStatus.preparing || order.status == OrderStatus.readyForPickup) {
      activeStep = 1;
    } else if (order.status == OrderStatus.dispatched || order.status == OrderStatus.arrivedAtCustomer) {
      activeStep = 2;
    } else if (order.status == OrderStatus.delivered) {
      activeStep = 3;
    }

    final steps = [
      {'label': 'Confirmado', 'icon': Icons.receipt_long},
      {'label': 'En Cocina', 'icon': Icons.soup_kitchen_rounded},
      {'label': 'En Camino', 'icon': Icons.delivery_dining_rounded},
      {'label': 'Entregado', 'icon': Icons.check_circle_rounded},
    ];

    return Card(
      elevation: 6,
      shadowColor: Colors.black.withOpacity(0.3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
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
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isPassed
                        ? const Color(0xFF10B981)
                        : (isCurrent ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9)),
                  ),
                  child: Center(
                    child: Icon(
                      isPassed ? Icons.check : (step['icon'] as IconData),
                      size: 14,
                      color: (isPassed || isCurrent) ? Colors.white : const Color(0xFF94A3B8),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  step['label'] as String,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                    color: isCurrent ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                  ),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }

  Widget _buildBottomInfoCard(OrderEntity order, CourierLocationEntity? courierLoc, bool isLive) {
    return Card(
      elevation: 8,
      shadowColor: Colors.black.withOpacity(0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.businessName.isNotEmpty ? order.businessName : 'Comercio Aliado',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      '${order.items.length} artículo(s) • Total: C\$ ${order.total.toInt()}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                if (courierLoc != null && courierLoc.speedKmh > 3)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '⚡ ~${courierLoc.speedKmh.toInt()} km/h',
                      style: const TextStyle(
                        color: Color(0xFF2563EB),
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.location_on, color: Color(0xFFEF4444), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    order.deliveryAddress.isNotEmpty ? order.deliveryAddress : 'Dirección de Entrega',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
