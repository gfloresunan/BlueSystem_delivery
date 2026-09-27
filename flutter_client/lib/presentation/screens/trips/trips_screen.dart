/// BLUE SYSTEM DELIVERY ENTERPRISE — DELIVERY TRIPS SCREEN (X→Y)
/// Realtime trip stream, X→Y origin/destination display, status timeline.

import 'package:flutter/material.dart';

import '../../../core/observability/app_logger.dart';
import '../../../domain/entities/trip_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../providers/session_state.dart';
import '../../widgets/state_views.dart';
import 'solicitar_envio_screen.dart';
import 'trip_live_tracking_screen.dart';

class TripsScreen extends StatelessWidget {
  final SessionState sessionState;
  final ITripService tripService;
  final IFleetService? fleetService;
  final IUserService? userService;

  const TripsScreen({
    super.key,
    required this.sessionState,
    required this.tripService,
    this.fleetService,
    this.userService,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tenantId = sessionState.claims?.tenantId ?? sessionState.activeTenant?.tenantId ?? '';
    final customerId = sessionState.currentUser?.uid ?? '';

    if (tenantId.isEmpty) {
      return const ErrorView(
        title: 'Error de Contexto',
        message: 'No se detectó un Tenant activo para la consulta de envíos.',
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Envíos X→Y')),
      floatingActionButton: (userService != null && sessionState.currentUser != null)
          ? FloatingActionButton.extended(
              key: const Key('create_new_trip_fab'),
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Solicitar Envío'),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (ctx) => SolicitarEnvioScreen(
                      tripService: tripService,
                      userService: userService!,
                      currentUser: sessionState.currentUser!,
                      tenantId: tenantId,
                      onBack: () => Navigator.pop(ctx),
                      onTripCreated: (newTripId) {
                        Navigator.pop(ctx);
                        if (fleetService != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (trackCtx) => TripLiveTrackingScreen(
                                tripId: newTripId,
                                tripService: tripService,
                                fleetService: fleetService!,
                                onBack: () => Navigator.pop(trackCtx),
                              ),
                            ),
                          );
                        }
                      },
                    ),
                  ),
                );
              },
            )
          : null,
      body: StreamBuilder<List<TripEntity>>(
        stream: tripService.watchCustomerTrips(customerId, tenantId: tenantId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Sincronizando envíos en tiempo real...');
          }
          if (snapshot.hasError) {
            AppLogger.error('TripsScreen', 'Stream error', snapshot.error);
            return ErrorView(message: 'Error al cargar envíos: ${snapshot.error}');
          }

          final trips = snapshot.data ?? [];
          if (trips.isEmpty) {
            return const EmptyView(
              title: 'Sin envíos activos',
              message: 'Los envíos punto a punto creados aparecerán aquí en tiempo real.',
              icon: Icons.local_shipping_outlined,
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: trips.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) => _buildTripCard(ctx, trips[i]),
          );
        },
      ),
    );
  }

  Widget _buildTripCard(BuildContext context, TripEntity trip) {
    final theme = Theme.of(context);
    final statusColor = _getStatusColor(trip.status);

    return InkWell(
      key: Key('trip_card_${trip.tripId}'),
      borderRadius: BorderRadius.circular(12),
      onTap: fleetService != null
          ? () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (ctx) => TripLiveTrackingScreen(
                    tripId: trip.tripId,
                    tripService: tripService,
                    fleetService: fleetService!,
                    initialTrip: trip,
                    onBack: () => Navigator.pop(ctx),
                  ),
                ),
              );
            }
          : null,
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.4)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Envío #${trip.tripId.length > 8 ? trip.tripId.substring(0, 8) : trip.tripId}',
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
                      trip.status.name.toUpperCase(),
                      style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Origin
              Row(
                children: [
                  const Icon(Icons.circle, size: 12, color: Colors.green),
                  const SizedBox(width: 8),
                  const Text('Origen: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  Expanded(
                    child: Text(
                      trip.originAddress,
                      style: const TextStyle(fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              Container(
                margin: const EdgeInsets.only(left: 5),
                height: 16,
                width: 2,
                color: theme.colorScheme.outlineVariant,
              ),
              // Destination
              Row(
                children: [
                  const Icon(Icons.location_on, size: 14, color: Colors.red),
                  const SizedBox(width: 6),
                  const Text('Destino: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  Expanded(
                    child: Text(
                      trip.destinationAddress,
                      style: const TextStyle(fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (trip.assignedCourierId != null)
                    Row(
                      children: [
                        Icon(Icons.two_wheeler, size: 16, color: theme.colorScheme.primary),
                        const SizedBox(width: 4),
                        Text(
                          'Motorizado Asignado',
                          style: TextStyle(fontSize: 12, color: theme.colorScheme.primary),
                        ),
                      ],
                    )
                  else
                    Text(
                      'Buscando motorizado...',
                      style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                    ),
                  Text(
                    'C\$ ${trip.fare.toStringAsFixed(2)}',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: theme.colorScheme.primary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(TripStatus status) {
    switch (status) {
      case TripStatus.offered:
        return Colors.orange;
      case TripStatus.assigned:
        return Colors.blue;
      case TripStatus.onWayToOrigin:
      case TripStatus.arrivedAtOrigin:
        return Colors.purple;
      case TripStatus.goodsPickedUp:
      case TripStatus.onWayToDestination:
        return Colors.teal;
      case TripStatus.arrivedAtDestination:
      case TripStatus.completed:
        return Colors.green;
      case TripStatus.cancelled:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
