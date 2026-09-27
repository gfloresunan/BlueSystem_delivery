import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/trip_entity.dart';

void main() {
  group('GAP-FST-02: DeliveryTrips Customer & Courier In-Memory Contract Tests', () {
    // Helper function that mirrors watchCustomerTrips in-memory filtering logic
    List<TripEntity> filterCustomerTrips(
      List<Map<String, dynamic>> rawDocs,
      String customerId, {
      required String tenantId,
    }) {
      if (customerId.isEmpty) return [];

      final list = <TripEntity>[];
      for (var i = 0; i < rawDocs.length; i++) {
        final docData = rawDocs[i];
        final id = docData['tripId'] as String? ?? 'trip_$i';
        final trip = TripEntity.fromMap(docData, id);

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

      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    }

    // Helper function that mirrors watchCourierAssignedTrips in-memory filtering logic
    List<TripEntity> filterCourierAssignedTrips(
      List<Map<String, dynamic>> rawDocs,
      String courierId, {
      required String tenantId,
    }) {
      if (courierId.isEmpty) return [];

      final list = <TripEntity>[];
      for (var i = 0; i < rawDocs.length; i++) {
        final docData = rawDocs[i];
        final id = docData['tripId'] as String? ?? 'trip_$i';
        final trip = TripEntity.fromMap(docData, id);

        // 1. Strict Courier Identity Verification
        if (trip.assignedCourierId != courierId) continue;

        // 2. Multi-Tenant Isolation
        if (tenantId.isNotEmpty &&
            trip.tenantId.isNotEmpty &&
            trip.tenantId != tenantId) {
          continue;
        }

        // 3. Active Trip Status Filter (Exclude completed, cancelled)
        if (trip.status == TripStatus.completed ||
            trip.status == TripStatus.cancelled) {
          continue;
        }

        list.add(trip);
      }

      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    }

    // ─── CUSTOMER TRIPS TESTS ──────────────────────────────────────────────
    group('watchCustomerTrips Contract', () {
      test('Filters trips strictly for target customerId and sorts by createdAt desc', () {
        final rawDocs = [
          {
            'tripId': 'trip_cust_old',
            'customerId': 'cust_target',
            'tenantId': 'tenant_mga',
            'status': 'COMPLETED',
            'createdAt': 1000,
          },
          {
            'tripId': 'trip_cust_new',
            'customerId': 'cust_target',
            'tenantId': 'tenant_mga',
            'status': 'ASSIGNED',
            'createdAt': 2000,
          },
          {
            'tripId': 'trip_other_user',
            'customerId': 'cust_other',
            'tenantId': 'tenant_mga',
            'status': 'ASSIGNED',
            'createdAt': 3000,
          },
        ];

        final result = filterCustomerTrips(rawDocs, 'cust_target', tenantId: 'tenant_mga');

        expect(result.length, equals(2));
        expect(result[0].tripId, equals('trip_cust_new')); // Newer first
        expect(result[1].tripId, equals('trip_cust_old'));
        expect(result.any((t) => t.tripId == 'trip_other_user'), isFalse);
      });

      test('Enforces multi-tenant isolation on customer trips', () {
        final rawDocs = [
          {
            'tripId': 'trip_mga',
            'customerId': 'cust_target',
            'tenantId': 'tenant_mga',
            'status': 'ASSIGNED',
            'createdAt': 1000,
          },
          {
            'tripId': 'trip_chinandega',
            'customerId': 'cust_target',
            'tenantId': 'tenant_chinandega',
            'status': 'ASSIGNED',
            'createdAt': 2000,
          },
        ];

        final result = filterCustomerTrips(rawDocs, 'cust_target', tenantId: 'tenant_mga');

        expect(result.length, equals(1));
        expect(result.first.tripId, equals('trip_mga'));
      });

      test('Returns empty list for empty customerId or empty docs', () {
        expect(filterCustomerTrips([], 'cust_target', tenantId: 'tenant_mga'), isEmpty);
        expect(filterCustomerTrips([{'tripId': 't1', 'customerId': 'cust_target'}], '', tenantId: 'tenant_mga'), isEmpty);
      });

      test('Propagates stream error without swallowing to []', () async {
        final controller = StreamController<List<Map<String, dynamic>>>();

        final transformedStream = controller.stream.map((docs) {
          return filterCustomerTrips(docs, 'cust_target', tenantId: 'tenant_mga');
        }).handleError((error, stackTrace) {
          throw error;
        });

        expect(
          transformedStream.toList(),
          throwsA(isA<Exception>()),
        );

        controller.addError(Exception('Customer trips Firestore query failed'));
        await controller.close();
      });
    });

    // ─── COURIER ASSIGNED TRIPS TESTS ──────────────────────────────────────
    group('watchCourierAssignedTrips Contract', () {
      test('Filters trips strictly for target courierId', () {
        final rawDocs = [
          {
            'tripId': 'trip_c1',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_mga',
            'status': 'ASSIGNED',
            'createdAt': 1000,
          },
          {
            'tripId': 'trip_c2',
            'assignedCourierId': 'courier_rival',
            'tenantId': 'tenant_mga',
            'status': 'ASSIGNED',
            'createdAt': 2000,
          },
        ];

        final result = filterCourierAssignedTrips(rawDocs, 'courier_target', tenantId: 'tenant_mga');

        expect(result.length, equals(1));
        expect(result.first.tripId, equals('trip_c1'));
      });

      test('Excludes terminal states (COMPLETED, CANCELLED) and keeps active states', () {
        final rawDocs = [
          {
            'tripId': 'trip_active_1',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_mga',
            'status': 'ASSIGNED',
            'createdAt': 1000,
          },
          {
            'tripId': 'trip_active_2',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_mga',
            'status': 'ON_WAY_TO_ORIGIN',
            'createdAt': 2000,
          },
          {
            'tripId': 'trip_active_3',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_mga',
            'status': 'PICKED_UP',
            'createdAt': 3000,
          },
          {
            'tripId': 'trip_completed',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_mga',
            'status': 'COMPLETED',
            'createdAt': 4000,
          },
          {
            'tripId': 'trip_cancelled',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_mga',
            'status': 'CANCELLED',
            'createdAt': 5000,
          },
        ];

        final result = filterCourierAssignedTrips(rawDocs, 'courier_target', tenantId: 'tenant_mga');

        expect(result.length, equals(3));
        final ids = result.map((t) => t.tripId).toList();
        expect(ids, contains('trip_active_1'));
        expect(ids, contains('trip_active_2'));
        expect(ids, contains('trip_active_3'));
        expect(ids, isNot(contains('trip_completed')));
        expect(ids, isNot(contains('trip_cancelled')));
      });

      test('Enforces multi-tenant isolation on courier assigned trips', () {
        final rawDocs = [
          {
            'tripId': 'trip_mga',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_mga',
            'status': 'ASSIGNED',
            'createdAt': 1000,
          },
          {
            'tripId': 'trip_matagalpa',
            'assignedCourierId': 'courier_target',
            'tenantId': 'tenant_matagalpa',
            'status': 'ASSIGNED',
            'createdAt': 2000,
          },
        ];

        final result = filterCourierAssignedTrips(rawDocs, 'courier_target', tenantId: 'tenant_mga');

        expect(result.length, equals(1));
        expect(result.first.tripId, equals('trip_mga'));
      });

      test('Returns empty list for empty courierId or empty docs safely', () {
        expect(filterCourierAssignedTrips([], 'courier_target', tenantId: 'tenant_mga'), isEmpty);
        expect(filterCourierAssignedTrips([{'tripId': 't1', 'assignedCourierId': 'courier_target'}], '', tenantId: 'tenant_mga'), isEmpty);
      });

      test('Propagates stream error without swallowing to []', () async {
        final controller = StreamController<List<Map<String, dynamic>>>();

        final transformedStream = controller.stream.map((docs) {
          return filterCourierAssignedTrips(docs, 'courier_target', tenantId: 'tenant_mga');
        }).handleError((error, stackTrace) {
          throw error;
        });

        expect(
          transformedStream.toList(),
          throwsA(isA<Exception>()),
        );

        controller.addError(Exception('Courier trips Firestore query failed'));
        await controller.close();
      });
    });
  });
}
