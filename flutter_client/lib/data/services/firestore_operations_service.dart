/// BLUE SYSTEM DELIVERY ENTERPRISE — FIRESTORE OPERATIONS SERVICE
/// Canonical Implementations of IOrderService, ITripService, and IFleetService.
/// Supports dual-track multiplatform operations (Android/iOS) with atomic claims.

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/courier_location_entity.dart';
import '../../domain/entities/order_entity.dart';
import '../../domain/entities/trip_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

class FirestoreOperationsService implements IOrderService, ITripService, IFleetService {
  final FirebaseFirestore _firestore;

  FirestoreOperationsService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  // ─── 1. ORDER SERVICE (/orders) ──────────────────────────────────────────────

  @override
  Future<OrderEntity?> getOrderById(String orderId) async {
    try {
      final doc = await _firestore.collection('orders').doc(orderId).get();
      if (!doc.exists || doc.data() == null) return null;
      return OrderEntity.fromMap(doc.data()!, doc.id);
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Error getting order $orderId', e, st);
      return null;
    }
  }

  @override
  Stream<OrderEntity?> watchOrder(String orderId) {
    return _firestore.collection('orders').doc(orderId).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return OrderEntity.fromMap(doc.data()!, doc.id);
    });
  }

  @override
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId}) {
    return _firestore
        .collection('orders')
        .where('customerId', isEqualTo: customerId)
        .where('tenantId', isEqualTo: tenantId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => OrderEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) {
    return _firestore
        .collection('orders')
        .where('businessId', isEqualTo: businessId)
        .where('tenantId', isEqualTo: tenantId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => OrderEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) {
    return _firestore
        .collection('orders')
        .where('assignedCourierId', isEqualTo: courierId)
        .where('tenantId', isEqualTo: tenantId)
        .where('status', whereIn: ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DISPATCHED', 'courier_accepted', 'en_ruta'])
        .snapshots()
        .map((snap) => snap.docs.map((d) => OrderEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) {
    // Escucha pedidos disponibles para entrega (status READY o preparando)
    return _firestore
        .collection('orders')
        .where('status', whereIn: ['READY', 'ready', 'listo', 'LISTO'])
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => OrderEntity.fromMap(d.data(), d.id))
            .where((order) =>
                order.assignedCourierId == null ||
                order.assignedCourierId!.isEmpty)
            .toList())
        .handleError((error, st) {
          AppLogger.error('FirestoreOperationsService', 'Error in watchEligibleOrders', error, st);
          return <OrderEntity>[];
        });
  }

  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async {
    try {
      // Sello canónico de plataforma y timestamp
      final payload = Map<String, dynamic>.from(orderData);
      payload['platform'] = 'IOS';
      payload['createdAt'] = FieldValue.serverTimestamp();
      payload['updatedAt'] = FieldValue.serverTimestamp();
      payload['status'] = payload['status'] ?? 'pending';
      payload['paymentStatus'] = payload['paymentStatus'] ?? 'pending';

      final docRef = await _firestore.collection('orders').add(payload);
      AppLogger.info('FirestoreOperationsService', 'Order created with ID: ${docRef.id} (Platform: IOS)');
      return docRef.id;
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Failed creating order', e, st);
      rethrow;
    }
  }

  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async {
    final orderRef = _firestore.collection('orders').doc(orderId);

    try {
      return await _firestore.runTransaction<bool>((transaction) async {
        final snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
          AppLogger.warning('FirestoreOperationsService', 'claimOrderAtomically: Order $orderId does not exist');
          return false;
        }

        final data = snapshot.data()!;
        final currentAssigned = data['assignedCourierId'] as String? ?? data['motorizadoId'] as String?;
        final currentStatus = (data['status'] as String? ?? '').toUpperCase();

        // Validar si ya está asignado a otro motorizado
        if (currentAssigned != null && currentAssigned.isNotEmpty && currentAssigned != courierId) {
          AppLogger.warning('FirestoreOperationsService', 'claimOrderAtomically: Order $orderId already assigned to $currentAssigned');
          return false;
        }

        // Validar que el estado sea elegible para reclamo
        final eligibleStatuses = ['READY', 'LISTO', 'PREPARING', 'PREPARANDO', 'PENDING', 'PENDIENTE'];
        if (!eligibleStatuses.contains(currentStatus) && currentAssigned != courierId) {
          AppLogger.warning('FirestoreOperationsService', 'claimOrderAtomically: Status $currentStatus not eligible for claim');
          return false;
        }

        transaction.update(orderRef, {
          'assignedCourierId': courierId,
          'motorizadoId': courierId,
          'driverName': courierName,
          'status': 'COURIER_ACCEPTED',
          'estado': 'aceptado_por_courier',
          'courierPhase': 'TO_PICKUP',
          'acceptedAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });

        AppLogger.info('FirestoreOperationsService', 'Order $orderId claimed atomically by courier $courierId');
        return true;
      });
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Transaction failed in claimOrderAtomically for order $orderId', e, st);
      return false;
    }
  }

  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    try {
      await _firestore.collection('orders').doc(orderId).update({
        'status': status.name.toUpperCase(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      AppLogger.info('FirestoreOperationsService', 'Order $orderId updated to ${status.name}');
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Failed updating order $orderId', e, st);
      rethrow;
    }
  }

  // ─── 2. TRIP SERVICE (/deliveryTrips) ─────────────────────────────────────────

  @override
  Future<TripEntity?> getTripById(String tripId) async {
    try {
      final doc = await _firestore.collection('deliveryTrips').doc(tripId).get();
      if (!doc.exists || doc.data() == null) return null;
      return TripEntity.fromMap(doc.data()!, doc.id);
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Error getting trip $tripId', e, st);
      return null;
    }
  }

  @override
  Stream<TripEntity?> watchTrip(String tripId) {
    return _firestore.collection('deliveryTrips').doc(tripId).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return TripEntity.fromMap(doc.data()!, doc.id);
    });
  }

  @override
  Stream<List<TripEntity>> watchCustomerTrips(String customerId, {required String tenantId}) {
    return _firestore
        .collection('deliveryTrips')
        .where('customerId', isEqualTo: customerId)
        .where('tenantId', isEqualTo: tenantId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => TripEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId}) {
    return _firestore
        .collection('deliveryTrips')
        .where('assignedCourierId', isEqualTo: courierId)
        .where('tenantId', isEqualTo: tenantId)
        .where('status', whereIn: [
          'OFFERED',
          'ASSIGNED',
          'ON_WAY_TO_ORIGIN',
          'ARRIVED_ORIGIN',
          'PICKED_UP',
          'ON_WAY_DESTINATION',
          'ARRIVED_DESTINATION',
        ])
        .snapshots()
        .map((snap) => snap.docs.map((d) => TripEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<TripEntity>> watchEligibleTrips({required String tenantId}) {
    return _firestore
        .collection('deliveryTrips')
        .where('status', whereIn: ['PENDING', 'pending', 'OFFERED', 'offered'])
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => TripEntity.fromMap(d.data(), d.id))
            .where((t) => t.assignedCourierId == null || t.assignedCourierId!.isEmpty)
            .toList())
        .handleError((error, st) {
          AppLogger.error('FirestoreOperationsService', 'Error in watchEligibleTrips', error, st);
          return <TripEntity>[];
        });
  }

  @override
  Future<String> createTrip(Map<String, dynamic> tripData) async {
    try {
      final payload = Map<String, dynamic>.from(tripData);
      payload['platform'] = 'IOS';
      payload['createdAt'] = FieldValue.serverTimestamp();
      payload['updatedAt'] = FieldValue.serverTimestamp();
      payload['status'] = payload['status'] ?? 'PENDING';
      payload['paymentStatus'] = payload['paymentStatus'] ?? 'pending';

      final docRef = await _firestore.collection('deliveryTrips').add(payload);
      AppLogger.info('FirestoreOperationsService', 'Trip created with ID: ${docRef.id} (Platform: IOS)');
      return docRef.id;
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Failed creating trip', e, st);
      rethrow;
    }
  }

  @override
  Future<bool> claimTripAtomically(String tripId, String courierId, String courierName) async {
    final tripRef = _firestore.collection('deliveryTrips').doc(tripId);

    try {
      return await _firestore.runTransaction<bool>((transaction) async {
        final snapshot = await transaction.get(tripRef);
        if (!snapshot.exists) {
          AppLogger.warning('FirestoreOperationsService', 'claimTripAtomically: Trip $tripId does not exist');
          return false;
        }

        final data = snapshot.data()!;
        final currentAssigned = data['assignedCourierId'] as String? ?? data['courierId'] as String?;
        final currentStatus = (data['status'] as String? ?? '').toUpperCase();

        if (currentAssigned != null && currentAssigned.isNotEmpty && currentAssigned != courierId) {
          AppLogger.warning('FirestoreOperationsService', 'claimTripAtomically: Trip $tripId already claimed by $currentAssigned');
          return false;
        }

        if (!['PENDING', 'OFFERED', 'DRAFT'].contains(currentStatus) && currentAssigned != courierId) {
          AppLogger.warning('FirestoreOperationsService', 'claimTripAtomically: Status $currentStatus not eligible');
          return false;
        }

        transaction.update(tripRef, {
          'assignedCourierId': courierId,
          'courierId': courierId,
          'courierName': courierName,
          'status': 'ASSIGNED',
          'estado': 'asignado',
          'courierPhase': 'TO_ORIGIN',
          'assignedAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });

        AppLogger.info('FirestoreOperationsService', 'Trip $tripId claimed atomically by courier $courierId');
        return true;
      });
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Transaction failed in claimTripAtomically for trip $tripId', e, st);
      return false;
    }
  }

  @override
  Future<void> updateTripStatus(String tripId, TripStatus status) async {
    try {
      await _firestore.collection('deliveryTrips').doc(tripId).update({
        'status': status.name.toUpperCase(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      AppLogger.info('FirestoreOperationsService', 'Trip $tripId updated to ${status.name}');
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Failed updating trip $tripId', e, st);
      rethrow;
    }
  }

  // ─── 3. FLEET SERVICE (/ubicaciones_repartidores) ──────────────────────────────

  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) {
    return _firestore
        .collection('ubicaciones_repartidores')
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => CourierLocationEntity.fromMap(d.data(), d.id))
            .where((c) => c.isFresh)
            .toList())
        .handleError((error, st) {
          AppLogger.error('FirestoreOperationsService', 'Error in watchActiveCouriers', error, st);
          return <CourierLocationEntity>[];
        });
  }

  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {
    try {
      // Contrato idéntico al de Android LocationTrackingService:
      // coordenadas: { latitud, longitud }, ultimaActualizacion: ms string
      final payload = {
        'coordenadas': {
          'latitud': telemetry.latitude,
          'longitud': telemetry.longitude,
        },
        'latitud': telemetry.latitude,
        'longitud': telemetry.longitude,
        'ultimaActualizacion': DateTime.now().millisecondsSinceEpoch.toString(),
        'tenantId': telemetry.tenantId,
        'isOnline': telemetry.isOnline,
        'pedidoActivoId': telemetry.activeOrderId,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      await _firestore
          .collection('ubicaciones_repartidores')
          .doc(telemetry.courierId)
          .set(payload, SetOptions(merge: true));
    } catch (e, st) {
      AppLogger.error('FirestoreOperationsService', 'Failed publishing telemetry for ${telemetry.courierId}', e, st);
    }
  }
}
