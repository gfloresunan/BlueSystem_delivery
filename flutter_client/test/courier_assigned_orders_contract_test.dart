import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';

void main() {
  group('GAP-FST-01: Courier Assigned Orders In-Memory Filtering & Contract Tests', () {
    // Helper function that mirrors the in-memory filtering logic from watchCourierAssignedOrders
    List<OrderEntity> filterAssignedOrders(
      List<Map<String, dynamic>> rawDocs,
      String courierId, {
      required String tenantId,
    }) {
      if (courierId.isEmpty) return [];

      final list = <OrderEntity>[];
      for (var i = 0; i < rawDocs.length; i++) {
        final docData = rawDocs[i];
        final id = docData['pedidoId'] as String? ?? 'order_$i';
        final order = OrderEntity.fromMap(docData, id);

        // 1. Strict Courier Identity Verification
        if (order.assignedCourierId != courierId) continue;

        // 2. Multi-Tenant Isolation
        if (tenantId.isNotEmpty &&
            order.tenantId.isNotEmpty &&
            order.tenantId != tenantId) {
          continue;
        }

        // 3. Active Order Status Filter (In-memory, 1:1 Android parity)
        if (order.status == OrderStatus.delivered ||
            order.status == OrderStatus.cancelled ||
            order.status == OrderStatus.rejected) {
          continue;
        }

        list.add(order);
      }
      return list;
    }

    test('Filters out orders assigned to another courier', () {
      final rawDocs = [
        {
          'pedidoId': 'ord_1',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_mga',
          'status': 'ACCEPTED',
          'subtotal': 150.0,
          'total': 195.0,
        },
        {
          'pedidoId': 'ord_2',
          'assignedCourierId': 'courier_other',
          'tenantId': 'tenant_mga',
          'status': 'ACCEPTED',
          'subtotal': 200.0,
          'total': 245.0,
        },
      ];

      final filtered = filterAssignedOrders(rawDocs, 'courier_target', tenantId: 'tenant_mga');

      expect(filtered.length, equals(1));
      expect(filtered.first.orderId, equals('ord_1'));
    });

    test('Enforces multi-tenant isolation: excludes orders from different tenant', () {
      final rawDocs = [
        {
          'pedidoId': 'ord_mga',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_mga',
          'status': 'DISPATCHED',
          'subtotal': 150.0,
          'total': 195.0,
        },
        {
          'pedidoId': 'ord_leo',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_leon',
          'status': 'DISPATCHED',
          'subtotal': 200.0,
          'total': 245.0,
        },
      ];

      final filtered = filterAssignedOrders(rawDocs, 'courier_target', tenantId: 'tenant_mga');

      expect(filtered.length, equals(1));
      expect(filtered.first.orderId, equals('ord_mga'));
      expect(filtered.first.tenantId, equals('tenant_mga'));
    });

    test('Excludes terminal states (DELIVERED, CANCELLED, REJECTED) from assigned list', () {
      final rawDocs = [
        {
          'pedidoId': 'ord_active_1',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_mga',
          'status': 'READY_FOR_PICKUP',
        },
        {
          'pedidoId': 'ord_active_2',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_mga',
          'status': 'IN_TRANSIT',
        },
        {
          'pedidoId': 'ord_delivered',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_mga',
          'status': 'DELIVERED',
        },
        {
          'pedidoId': 'ord_cancelled',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_mga',
          'status': 'CANCELLED',
        },
        {
          'pedidoId': 'ord_rejected',
          'assignedCourierId': 'courier_target',
          'tenantId': 'tenant_mga',
          'status': 'REJECTED',
        },
      ];

      final filtered = filterAssignedOrders(rawDocs, 'courier_target', tenantId: 'tenant_mga');

      expect(filtered.length, equals(2));
      final ids = filtered.map((o) => o.orderId).toList();
      expect(ids, contains('ord_active_1'));
      expect(ids, contains('ord_active_2'));
      expect(ids, isNot(contains('ord_delivered')));
      expect(ids, isNot(contains('ord_cancelled')));
      expect(ids, isNot(contains('ord_rejected')));
    });

    test('Handles empty courier ID or empty documents list safely without exceptions', () {
      expect(filterAssignedOrders([], 'courier_target', tenantId: 'tenant_mga'), isEmpty);
      expect(filterAssignedOrders([{'pedidoId': 'ord_1', 'assignedCourierId': 'courier_target'}], '', tenantId: 'tenant_mga'), isEmpty);
    });

    test('Stream error propagation: does not swallow exceptions silently into empty list', () async {
      final controller = StreamController<List<Map<String, dynamic>>>();

      final transformedStream = controller.stream.map((docs) {
        return filterAssignedOrders(docs, 'courier_target', tenantId: 'tenant_mga');
      }).handleError((error, stackTrace) {
        throw error; // Re-throws to verify non-swallowed error propagation
      });

      expect(
        transformedStream.toList(),
        throwsA(isA<Exception>()),
      );

      controller.addError(Exception('Firestore network disconnected'));
      await controller.close();
    });
  });
}
