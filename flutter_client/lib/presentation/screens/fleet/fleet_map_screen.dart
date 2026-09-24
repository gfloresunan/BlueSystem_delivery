/// BLUE SYSTEM DELIVERY ENTERPRISE — FLEET MAP SCREEN
/// Active courier telemetry list, location freshness validation, tenant-isolated.

import 'package:flutter/material.dart';

import '../../../core/observability/app_logger.dart';
import '../../../domain/entities/courier_location_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../providers/session_state.dart';
import '../../widgets/state_views.dart';

class FleetMapScreen extends StatelessWidget {
  final SessionState sessionState;
  final IFleetService fleetService;

  const FleetMapScreen({
    super.key,
    required this.sessionState,
    required this.fleetService,
  });

  @override
  Widget build(BuildContext context) {
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
        stream: fleetService.watchActiveCouriers(tenantId: tenantId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Sincronizando flota activa...');
          }
          if (snapshot.hasError) {
            AppLogger.error('FleetMapScreen', 'Fleet stream error', snapshot.error);
            return ErrorView(message: 'Error al cargar flota: ${snapshot.error}');
          }

          final couriers = snapshot.data ?? [];

          return Column(
            children: [
              // ─── Map Placeholder (Architecture Ready, Provisioning Pending) ─────
              Container(
                height: 220,
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.map_outlined, size: 48, color: Colors.blue),
                    const SizedBox(height: 8),
                    const Text(
                      'MAPA DE FLOTA EN TIEMPO REAL',
                      style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Arquitectura multiplataforma lista — Provisioning pendiente (Fase C2D.27)',
                      style: TextStyle(color: Colors.blue.withOpacity(0.6), fontSize: 11),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.amber.withOpacity(0.4)),
                      ),
                      child: const Text(
                        '🟡 GAP: MAP_PROVISIONING / C2D.27',
                        style: TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),

              // ─── Courier List ───────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Icon(Icons.two_wheeler, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Motorizados Activos: ${couriers.length}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

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

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 0),
      leading: CircleAvatar(
        backgroundColor: isFresh ? Colors.green.withOpacity(0.15) : Colors.orange.withOpacity(0.15),
        child: Icon(Icons.two_wheeler, color: isFresh ? Colors.green : Colors.orange),
      ),
      title: Text(
        courier.courierName ?? courier.courierId,
        style: const TextStyle(fontWeight: FontWeight.bold),
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
            '${courier.speedKmh?.toStringAsFixed(0) ?? "—"} km/h',
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
