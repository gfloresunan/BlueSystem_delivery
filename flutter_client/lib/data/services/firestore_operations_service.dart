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
    if (customerId.isEmpty) {
      AppLogger.warning('FirestoreOperationsService', 'watchCustomerOrders: customerId is empty');
      return Stream.value(<OrderEntity>[]);
    }

    return _firestore
        .collection('orders')
        .where('customerId', isEqualTo: customerId)
        .snapshots()
        .map((snap) {
          final list = <OrderEntity>[];
          for (final doc in snap.docs) {
            final order = OrderEntity.fromMap(doc.data(), doc.id);
            if (order.customerId != customerId) continue;
            if (tenantId.isNotEmpty &&
                order.tenantId.isNotEmpty &&
                order.tenantId != tenantId) {
              continue;
            }
            list.add(order);
          }
          list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          return list;
        })
        .handleError((error, stackTrace) {
          AppLogger.error('FirestoreOperationsService', 'Error watching customer orders for $customerId', error, stackTrace);
          throw error;
        });
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
    if (courierId.isEmpty) {
      AppLogger.warning('FirestoreOperationsService', 'watchCourierAssignedOrders: courierId is empty');
      return Stream.value(<OrderEntity>[]);
    }

    AppLogger.info('FirestoreOperationsService', 'Watching assigned orders for courier: $courierId (tenant: $tenantId)');

    // 1:1 Android Parity (FirebaseManager.kt:788-802):
    // Single-field server query on 'assignedCourierId' avoids failed-precondition composite index errors.
    // Tenant isolation and active status filtering are evaluated in memory.
    return _firestore
        .collection('orders')
        .where('assignedCourierId', isEqualTo: courierId)
        .snapshots()
        .map((snap) {
          final list = <OrderEntity>[];
          for (final doc in snap.docs) {
            final order = OrderEntity.fromMap(doc.data(), doc.id);

            // 1. Strict Courier Identity Verification
            if (order.assignedCourierId != courierId) continue;

            // 2. Multi-Tenant Isolation
            if (tenantId.isNotEmpty &&
                order.tenantId.isNotEmpty &&
                order.tenantId != tenantId) {
              continue;
            }

            // 3. Active Order Status Filter (In-memory, 1:1 Android parity)
            // Exclude terminal states (delivered, cancelled, rejected)
            if (order.status == OrderStatus.delivered ||
                order.status == OrderStatus.cancelled ||
                order.status == OrderStatus.rejected) {
              continue;
            }

            list.add(order);
          }
          return list;
        })
        .handleError((error, stackTrace) {
          AppLogger.error('FirestoreOperationsService', 'Error watching courier assigned orders for $courierId', error, stackTrace);
          throw error;
        });
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
          throw error;
        });
  }

  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async {
    try {
      final docRef = _firestore.collection('orders').doc();
      final payload = Map<String, dynamic>.from(orderData);
      final id = docRef.id;
      final shortCode = id.length >= 4 ? id.substring(id.length - 4).toUpperCase() : id.toUpperCase();
      final prefix = (payload['orderCodePrefix'] as String?)?.isNotEmpty == true
          ? payload['orderCodePrefix'] as String
          : 'BSD';
      final orderCode = payload['orderCode'] ?? '$prefix-$shortCode';

      payload['pedidoId'] = payload['pedidoId'] ?? id;
      payload['orderCode'] = orderCode;
      payload['orderShortCode'] = payload['orderShortCode'] ?? shortCode;
      payload['orderCodePrefix'] = prefix;
      payload['platform'] = 'IOS';
      payload['createdAt'] = FieldValue.serverTimestamp();
      payload['updatedAt'] = FieldValue.serverTimestamp();
      payload['status'] = payload['status'] ?? 'pending';
      payload['paymentStatus'] = payload['paymentStatus'] ?? 'pending';

      await docRef.set(payload);
      AppLogger.info('FirestoreOperationsService', 'Order created with ID: $id (Platform: IOS, Code: $orderCode)');
      return id;
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
      String canonicalStatus;
      String estadoEs;
      int courierPhase;
      switch (status) {
        case OrderStatus.accepted:
          canonicalStatus = 'ACCEPTED';
          estadoEs = 'asignado';
          courierPhase = 1;
          break;
        case OrderStatus.preparing:
          canonicalStatus = 'PREPARING';
          estadoEs = 'preparando';
          courierPhase = 1;
          break;
        case OrderStatus.readyForPickup:
          canonicalStatus = 'READY_FOR_PICKUP';
          estadoEs = 'listo';
          courierPhase = 1;
          break;
        case OrderStatus.dispatched:
          canonicalStatus = 'DISPATCHED';
          estadoEs = 'en_camino';
          courierPhase = 2;
          break;
        case OrderStatus.arrivedAtCustomer:
          canonicalStatus = 'ARRIVED_AT_CUSTOMER';
          estadoEs = 'en_destino';
          courierPhase = 2;
          break;
        case OrderStatus.delivered:
          canonicalStatus = 'DELIVERED';
          estadoEs = 'entregado';
          courierPhase = 3;
          break;
        case OrderStatus.cancelled:
          canonicalStatus = 'CANCELLED';
          estadoEs = 'cancelado';
          courierPhase = 3;
          break;
        case OrderStatus.rejected:
          canonicalStatus = 'REJECTED';
          estadoEs = 'rechazado';
          courierPhase = 3;
          break;
        case OrderStatus.pending:
          canonicalStatus = 'PENDING';
          estadoEs = 'pendiente';
          courierPhase = 0;
          break;
      }

      final updates = <String, dynamic>{
        'status': canonicalStatus,
        'estado': estadoEs,
        'courierPhase': courierPhase,
        'updatedAt': FieldValue.serverTimestamp(),
      };
      if (status == OrderStatus.dispatched) {
        updates['pickedUpAt'] = FieldValue.serverTimestamp();
      } else if (status == OrderStatus.delivered) {
        updates['deliveredAt'] = FieldValue.serverTimestamp();
        updates['completedAt'] = FieldValue.serverTimestamp();
      }

      await _firestore.collection('orders').doc(orderId).update(updates);
      AppLogger.info('FirestoreOperationsService', 'Order $orderId updated to $canonicalStatus (courierPhase: $courierPhase)');
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
    if (customerId.isEmpty) {
      AppLogger.warning('FirestoreOperationsService', 'watchCustomerTrips: customerId is empty');
      return Stream.value(<TripEntity>[]);
    }

    AppLogger.info('FirestoreOperationsService', 'Watching trips for customer: $customerId (tenant: $tenantId)');

    // 1:1 Android Parity: Single-field server query on 'customerId' (no composite index required)
    return _firestore
        .collection('deliveryTrips')
        .where('customerId', isEqualTo: customerId)
        .snapshots()
        .map((snap) {
          final list = <TripEntity>[];
          for (final doc in snap.docs) {
            final trip = TripEntity.fromMap(doc.data(), doc.id);

            // 1. Strict Customer Identity Verification
            if (trip.customerId != customerId) continue;

            // 2. Multi-Tenant Isolation
            if (tenantId.isNotEmpty &&
                trip.tenantId.isNotEmpty &&
                trip.tenantId != tenantId) {
              continue;
            }

            list.add(trip);
          }

          // In-memory sort by createdAt descending (0 composite index required)
          list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          return list;
        })
        .handleError((error, stackTrace) {
          AppLogger.error('FirestoreOperationsService', 'Error watching customer trips for $customerId', error, stackTrace);
          throw error;
        });
  }

  @override
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId}) {
    if (courierId.isEmpty) {
      AppLogger.warning('FirestoreOperationsService', 'watchCourierAssignedTrips: courierId is empty');
      return Stream.value(<TripEntity>[]);
    }

    AppLogger.info('FirestoreOperationsService', 'Watching assigned trips for courier: $courierId (tenant: $tenantId)');

    // 1:1 Android Parity (FirebaseManager.kt:817-826):
    // Single-field server query on 'assignedCourierId' avoids failed-precondition composite index errors.
    // Tenant isolation and active status filtering are evaluated in memory.
    return _firestore
        .collection('deliveryTrips')
        .where('assignedCourierId', isEqualTo: courierId)
        .snapshots()
        .map((snap) {
          final list = <TripEntity>[];
          for (final doc in snap.docs) {
            final trip = TripEntity.fromMap(doc.data(), doc.id);

            // 1. Strict Courier Identity Verification
            if (trip.assignedCourierId != courierId) continue;

            // 2. Multi-Tenant Isolation
            if (tenantId.isNotEmpty &&
                trip.tenantId.isNotEmpty &&
                trip.tenantId != tenantId) {
              continue;
            }

            // 3. Active Trip Status Filter (In-memory, 1:1 Android parity)
            // Exclude terminal states (completed, cancelled)
            if (trip.status == TripStatus.completed ||
                trip.status == TripStatus.cancelled) {
              continue;
            }

            list.add(trip);
          }

          // In-memory sort by createdAt descending
          list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          return list;
        })
        .handleError((error, stackTrace) {
          AppLogger.error('FirestoreOperationsService', 'Error watching courier assigned trips for $courierId', error, stackTrace);
          throw error;
        });
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
          throw error;
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
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) {
    if (courierId.isEmpty) return Stream.value(null);
    return _firestore
        .collection('ubicaciones_repartidores')
        .doc(courierId)
        .snapshots()
        .map((doc) {
          if (!doc.exists || doc.data() == null) return null;
          return CourierLocationEntity.fromMap(doc.data()!, doc.id);
        })
        .handleError((error, st) {
          AppLogger.error('FirestoreOperationsService', 'Error watching courier location for $courierId', error, st);
          throw error;
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
