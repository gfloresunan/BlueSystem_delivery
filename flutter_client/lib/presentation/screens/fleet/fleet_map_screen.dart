/// BLUE SYSTEM DELIVERY ENTERPRISE — FLEET MAP SCREEN
/// Active courier telemetry list, location freshness validation, tenant-isolated.

import 'package:flutter/material.dart';

import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/observability/app_logger.dart';
import '../../../domain/entities/courier_location_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../providers/session_state.dart';
import '../../widgets/state_views.dart';

class FleetMapScreen extends StatefulWidget {
  final SessionState sessionState;
  final IFleetService fleetService;

  const FleetMapScreen({
    super.key,
    required this.sessionState,
    required this.fleetService,
  });

  @override
  State<FleetMapScreen> createState() => _FleetMapScreenState();
}

class _FleetMapScreenState extends State<FleetMapScreen> {
  GoogleMapController? _mapController;
  String? _selectedCourierId;

  // Fallback coordinates for Managua
  static const double _defaultLat = 12.136389;
  static const double _defaultLng = -86.251389;

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  void _onCourierSelected(CourierLocationEntity courier) {
    setState(() {
      _selectedCourierId = courier.courierId;
    });
    if (_mapController != null && courier.latitude != 0.0 && courier.longitude != 0.0) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(courier.latitude, courier.longitude),
          15.0,
        ),
      );
    }
  }

  Set<Marker> _buildMarkers(List<CourierLocationEntity> couriers) {
    final markers = <Marker>{};
    for (final courier in couriers) {
      if (courier.latitude == 0.0 && courier.longitude == 0.0) continue;

      final isSelected = courier.courierId == _selectedCourierId;
      final isFresh = courier.isFresh;

      final hue = isFresh
          ? (isSelected ? BitmapDescriptor.hueAzure : BitmapDescriptor.hueGreen)
          : BitmapDescriptor.hueOrange;

      markers.add(
        Marker(
          markerId: MarkerId(courier.courierId),
          position: LatLng(courier.latitude, courier.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(hue),
          infoWindow: InfoWindow(
            title: courier.courierName ?? courier.courierId,
            snippet: '${courier.speedKmh.toStringAsFixed(0)} km/h • Bat: ${courier.batteryLevel?.toStringAsFixed(0) ?? "—"}% • ${isFresh ? "En Línea" : "Inactivo"}',
          ),
          onTap: () => _onCourierSelected(courier),
        ),
      );
    }
    return markers;
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = widget.sessionState;
    final tenantId = sessionState.claims?.tenantId ?? sessionState.activeTenant?.tenantId ?? '';

    if (!sessionState.canAccess('FLEET')) {
      return const UnauthorizedView(moduleKey: 'FLEET');
    }

    if (tenantId.isEmpty) {
      return const ErrorView(
        title: 'Error de Contexto',
        message: 'No se detectó un Tenant activo para la consulta de flota.',
      );
    }

    AppLogger.info('FleetMapScreen', 'Watching active couriers for tenant: $tenantId');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Control de Flota'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            tooltip: 'Telemetría GPS activa — ADR-016',
            onPressed: () => _showFleetInfo(context),
          ),
        ],
      ),
      body: StreamBuilder<List<CourierLocationEntity>>(
        stream: widget.fleetService.watchActiveCouriers(tenantId: tenantId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Sincronizando flota activa...');
          }
          if (snapshot.hasError) {
            AppLogger.error('FleetMapScreen', 'Fleet stream error', snapshot.error);
            return ErrorView(message: 'Error al cargar flota: ${snapshot.error}');
          }

          final couriers = snapshot.data ?? [];
          final freshCouriersCount = couriers.where((c) => c.isFresh).length;

          // Determine initial camera position
          LatLng initialCenter = const LatLng(_defaultLat, _defaultLng);
          if (couriers.isNotEmpty) {
            final active = couriers.firstWhere(
              (c) => c.isFresh && c.latitude != 0.0 && c.longitude != 0.0,
              orElse: () => couriers.first,
            );
            if (active.latitude != 0.0 && active.longitude != 0.0) {
              initialCenter = LatLng(active.latitude, active.longitude);
            }
          }

          return Column(
            children: [
              // ─── Live Google Map Widget (GAP-MAP-01 Certified) ───────────────
              SizedBox(
                height: 240,
                width: double.infinity,
                child: Stack(
                  children: [
                    GoogleMap(
                      key: const Key('fleet_map_widget'),
                      initialCameraPosition: CameraPosition(
                        target: initialCenter,
                        zoom: 13.0,
                      ),
                      markers: _buildMarkers(couriers),
                      onMapCreated: (controller) => _mapController = controller,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                      mapToolbarEnabled: false,
                    ),
                    Positioned(
                      top: 10,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A).withOpacity(0.85),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.blue.withOpacity(0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.greenAccent,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Flota Activa: $freshCouriersCount/${couriers.length}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ─── Courier List ───────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.two_wheeler, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Motorizados Registrados: ${couriers.length}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    if (_selectedCourierId != null)
                      TextButton.icon(
                        style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                        onPressed: () => setState(() => _selectedCourierId = null),
                        icon: const Icon(Icons.clear, size: 14),
                        label: const Text('Limpiar foco', style: TextStyle(fontSize: 11)),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 4),

              if (couriers.isEmpty)
                const Expanded(
                  child: EmptyView(
                    title: 'Sin motorizados activos',
                    message: 'Ningún motorizado está en línea con telemetría fresca en este momento.',
                    icon: Icons.two_wheeler_outlined,
                  ),
                )
              else
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: couriers.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (ctx, i) => _buildCourierTile(ctx, couriers[i]),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCourierTile(BuildContext context, CourierLocationEntity courier) {
    final theme = Theme.of(context);
    final isFresh = courier.isFresh;
    final freshness = isFresh ? 'GPS Fresco' : 'GPS Antiguo';
    final freshnessColor = isFresh ? Colors.green : Colors.orange;

    final isSelected = courier.courierId == _selectedCourierId;

    return ListTile(
      key: Key('courier_tile_${courier.courierId}'),
      selected: isSelected,
      selectedTileColor: Colors.blue.withOpacity(0.08),
      onTap: () => _onCourierSelected(courier),
      contentPadding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      leading: CircleAvatar(
        backgroundColor: isFresh ? Colors.green.withOpacity(0.15) : Colors.orange.withOpacity(0.15),
        child: Icon(Icons.two_wheeler, color: isFresh ? Colors.green : Colors.orange),
      ),
      title: Text(
        courier.courierName ?? courier.courierId,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
          color: isSelected ? Colors.blue.shade700 : null,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Lat: ${courier.latitude.toStringAsFixed(5)}, Lng: ${courier.longitude.toStringAsFixed(5)}',
            style: const TextStyle(fontSize: 11),
          ),
          Row(
            children: [
              Icon(Icons.circle, size: 10, color: freshnessColor),
              const SizedBox(width: 4),
              Text(freshness, style: TextStyle(fontSize: 11, color: freshnessColor)),
            ],
          ),
        ],
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            '${courier.speedKmh.toStringAsFixed(0)} km/h',
            style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
          ),
          Text(
            'Bat: ${courier.batteryLevel?.toStringAsFixed(0) ?? "—"}%',
            style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  void _showFleetInfo(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Telemetría GPS — ADR-016'),
        content: const Text(
          'La telemetría se lee de /ubicaciones_repartidores/{courierId}.\n\n'
          'Cada documento tiene un TTL de frescura de 10 minutos.\n\n'
          'Los listeners son individuales por courier para cumplir el aislamiento Multi-Tenant.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Entendido')),
        ],
      ),
    );
  }
}
