/// BLUE SYSTEM DELIVERY ENTERPRISE — TRIP LIVE TRACKING SCREEN (1:1 ANDROID PARITY)
/// Implements Real-Time Telemetry and State Stepper matching EsperandoRepartidorScreen.kt and OrderDetailScreen.kt.
/// Listens to /deliveryTrips/{tripId} and /ubicaciones_repartidores/{courierId}.

import 'package:flutter/material.dart';

import '../../../domain/entities/courier_location_entity.dart';
import '../../../domain/entities/trip_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../theme/brand_theme_builder.dart';

class TripLiveTrackingScreen extends StatelessWidget {
  final String tripId;
  final ITripService tripService;
  final IFleetService fleetService;
  final TripEntity? initialTrip;
  final VoidCallback onBack;

  const TripLiveTrackingScreen({
    super.key,
    required this.tripId,
    required this.tripService,
    required this.fleetService,
    this.initialTrip,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<TripEntity?>(
      stream: tripService.watchTrip(tripId),
      initialData: initialTrip,
      builder: (context, snapshot) {
        final trip = snapshot.data;
        if (trip == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Rastreando Envío')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 1,
            leading: IconButton(
              key: const Key('trip_tracking_back_btn'),
              icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
              onPressed: onBack,
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Envío Express #${trip.tripId.length > 6 ? trip.tripId.substring(trip.tripId.length - 6).toUpperCase() : trip.tripId.toUpperCase()}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                ),
                Text(
                  'Estado: ${_getStatusLabel(trip.status)}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _getStatusColor(trip.status),
                  ),
                ),
              ],
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ─── 1. STATUS PROGRESS STEPPER ─────────────────────────────
                _buildTripProgressStepper(trip),
                const SizedBox(height: 16),

                // ─── 2. COURIER CARD & GPS TELEMETRY ─────────────────────────
                if (trip.assignedCourierId != null && trip.assignedCourierId!.isNotEmpty) ...[
                  _buildCourierTelemetryCard(trip.assignedCourierId!),
                  const SizedBox(height: 16),
                ] else ...[
                  _buildSearchingCourierCard(),
                  const SizedBox(height: 16),
                ],

                // ─── 3. ROUTE SUMMARY CARD (X ➔ Y) ───────────────────────────
                _buildRouteSummaryCard(trip),
                const SizedBox(height: 16),

                // ─── 4. FINANCIAL SUMMARY (ADR-026) ──────────────────────────
                _buildFinancialSummaryCard(trip),
                const SizedBox(height: 24),

                // ─── 5. CANCEL BUTTON IF PENDING ─────────────────────────────
                if (trip.status == TripStatus.requested || trip.status == TripStatus.offered) ...[
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      key: const Key('cancel_trip_button'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () async {
                        await tripService.updateTripStatus(trip.tripId, TripStatus.cancelled);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Solicitud cancelada')),
                        );
                        onBack();
                      },
                      icon: const Icon(Icons.cancel_outlined, size: 18),
                      label: const Text('Cancelar Solicitud de Envío'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTripProgressStepper(TripEntity trip) {
    final stepIndex = _getStepIndex(trip.status);

    final steps = [
      {'title': 'Solicitado', 'desc': 'Buscando repartidor cercano'},
      {'title': 'Asignado', 'desc': 'Repartidor en camino a origen'},
      {'title': 'En Origen / Recogido', 'desc': 'Paquete recibido en Punto X'},
      {'title': 'En Ruta', 'desc': 'En camino al destino Y'},
      {'title': 'Entregado', 'desc': 'Envío completado exitosamente'},
    ];

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Progreso del Envío',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 16),
            Column(
              children: List.generate(steps.length, (index) {
                final isCompleted = index < stepIndex;
                final isCurrent = index == stepIndex;
                final isPending = index > stepIndex;

                Color circleColor = const Color(0xFFCBD5E1);
                IconData circleIcon = Icons.circle;
                if (isCompleted) {
                  circleColor = const Color(0xFF15803D);
                  circleIcon = Icons.check_circle;
                } else if (isCurrent) {
                  circleColor = BrandColors.bluePrimary;
                  circleIcon = Icons.radio_button_checked;
                }

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Icon(circleIcon, size: 20, color: circleColor),
                        if (index < steps.length - 1)
                          Container(
                            width: 2,
                            height: 28,
                            color: isCompleted ? const Color(0xFF15803D) : const Color(0xFFE2E8F0),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            steps[index]['title']!,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.w600,
                              color: isPending ? const Color(0xFF94A3B8) : const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            steps[index]['desc']!,
                            style: TextStyle(
                              fontSize: 11,
                              color: isCurrent ? BrandColors.bluePrimary : const Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 10),
                        ],
                      ),
                    ),
                  ],
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchingCourierCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: const Row(
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: BrandColors.bluePrimary),
          ),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Localizando repartidor disponible...',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: BrandColors.bluePrimary),
                ),
                Text(
                  'Notificando a la flota dentro de 5 km (ADR-026)',
                  style: TextStyle(fontSize: 11, color: Color(0xFF475569)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourierTelemetryCard(String courierId) {
    return StreamBuilder<CourierLocationEntity?>(
      stream: fleetService.watchCourierLocation(courierId),
      builder: (context, snapshot) {
        final loc = snapshot.data;
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          color: Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Color(0xFFDBEAFE),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.two_wheeler, color: BrandColors.bluePrimary, size: 22),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Motorizado Asignado',
                              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                            ),
                            Text(
                              'ID: ${courierId.length > 8 ? courierId.substring(0, 8) : courierId}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.gps_fixed, size: 12, color: Color(0xFF15803D)),
                          SizedBox(width: 4),
                          Text('GPS Vivo', style: TextStyle(color: Color(0xFF15803D), fontWeight: FontWeight.bold, fontSize: 10)),
                        ],
                      ),
                    ),
                  ],
                ),
                if (loc != null) ...[
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Coordenadas: ${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)}',
                        key: const Key('courier_coordinates_badge'),
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                      Text(
                        '${((loc.speed ?? 0.0) * 3.6).toStringAsFixed(0)} km/h',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: BrandColors.bluePrimary),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildRouteSummaryCard(TripEntity trip) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ruta y Puntos de Contacto',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
            ),
            const Divider(height: 20, color: Color(0xFFF1F5F9)),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.trip_origin, size: 16, color: BrandColors.bluePrimary),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Origen (X):', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text(trip.originAddress, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on, size: 16, color: Colors.red),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Destino (Y):', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text(trip.destinationAddress, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialSummaryCard(TripEntity trip) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tarifa ADR-026 Oficial',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
            ),
            const Divider(height: 16, color: Color(0xFFF1F5F9)),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Distancia:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                Text('${trip.distanceKm} km', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tarifa Total:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(
                  'C\$ ${trip.totalPrice.toStringAsFixed(2)}',
                  key: const Key('trip_tracking_fare_text'),
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF15803D)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  int _getStepIndex(TripStatus status) {
    switch (status) {
      case TripStatus.requested:
      case TripStatus.offered:
        return 0;
      case TripStatus.assigned:
      case TripStatus.onWayToOrigin:
        return 1;
      case TripStatus.arrivedAtOrigin:
      case TripStatus.goodsPickedUp:
        return 2;
      case TripStatus.onWayToDestination:
      case TripStatus.arrivedAtDestination:
        return 3;
      case TripStatus.completed:
        return 4;
      case TripStatus.cancelled:
        return 0;
    }
  }

  String _getStatusLabel(TripStatus status) {
    switch (status) {
      case TripStatus.requested:
        return 'Solicitud Enviada';
      case TripStatus.offered:
        return 'Ofertado a Motorizados';
      case TripStatus.assigned:
        return 'Motorizado Asignado';
      case TripStatus.onWayToOrigin:
        return 'En Camino al Origen (X)';
      case TripStatus.arrivedAtOrigin:
        return 'En Origen (X)';
      case TripStatus.goodsPickedUp:
        return 'Paquete Recogido';
      case TripStatus.onWayToDestination:
        return 'En Camino al Destino (Y)';
      case TripStatus.arrivedAtDestination:
        return 'En Destino (Y)';
      case TripStatus.completed:
        return 'Entregado';
      case TripStatus.cancelled:
        return 'Cancelado';
    }
  }

  Color _getStatusColor(TripStatus status) {
    switch (status) {
      case TripStatus.completed:
        return const Color(0xFF15803D);
      case TripStatus.cancelled:
        return Colors.red;
      case TripStatus.assigned:
      case TripStatus.goodsPickedUp:
      case TripStatus.onWayToDestination:
        return BrandColors.bluePrimary;
      default:
        return Colors.orange;
    }
  }
}
