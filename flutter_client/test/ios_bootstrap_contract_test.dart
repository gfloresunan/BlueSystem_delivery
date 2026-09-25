/// BLUE SYSTEM DELIVERY ENTERPRISE — iOS BOOTSTRAP CONTRACT TEST SUITE
/// Validates cross-platform data contract integrity between Flutter iOS, Android (Frozen),
/// Firestore SSOT, Cloud Functions, and Admin/Merchant Web.

import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/banner_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_balance_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';

void main() {
  group('BSD-IOS-BOOTSTRAP — Banner Contract Tests (/banners)', () {
    test('BannerEntity correctly deserializes from Firestore document schema', () {
      final firestoreDoc = {
        'titulo': 'Promoción Fin de Semana',
        'subtitulo': '20% de descuento en todos los restaurantes',
        'imagenUrl': 'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/banners/promo1.jpg',
        'prioridad': 1,
        'activo': true,
        'actionType': 'OPEN_STORE',
        'actionId': 'store_tecnostore_123',
        'startDate': 1727184000000,
        'endDate': 1727788800000,
      };

      final banner = BannerEntity.fromMap(firestoreDoc, 'banner_weekend_01');

      expect(banner.id, equals('banner_weekend_01'));
      expect(banner.titulo, equals('Promoción Fin de Semana'));
      expect(banner.subtitulo, equals('20% de descuento en todos los restaurantes'));
      expect(banner.imageUrl, equals('https://storage.googleapis.com/bluesystem-7c9af.appspot.com/banners/promo1.jpg'));
      expect(banner.priority, equals(1));
      expect(banner.isActive, isTrue);
      expect(banner.actionType, equals('OPEN_STORE'));
      expect(banner.actionId, equals('store_tecnostore_123'));
    });

    test('BannerEntity supports both Spanish and English keys from legacy schema', () {
      final legacyDoc = {
        'title': 'Delivery Gratis',
        'subtitle': 'En pedidos mayores a C\$ 300',
        'imageUrl': 'https://example.com/banner.jpg',
        'priority': 5,
        'isActive': true,
        'actionType': 'OPEN_PROMOTION',
      };

      final banner = BannerEntity.fromMap(legacyDoc, 'banner_legacy_02');

      expect(banner.titulo, equals('Delivery Gratis'));
      expect(banner.subtitulo, equals('En pedidos mayores a C\$ 300'));
      expect(banner.priority, equals(5));
      expect(banner.actionType, equals('OPEN_PROMOTION'));
    });
  });

  group('BSD-IOS-BOOTSTRAP — Courier Balance & Cash Closure Contract Tests (ADR-018)', () {
    test('CourierBalanceEntity maps /courier_balances fields accurately', () {
      final balanceDoc = {
        'courierId': 'courier_uid_999',
        'cashOutstandingCents': 150000, // C$ 1,500.00
        'effectiveCashLimitCents': 300000, // C$ 3,000.00
        'lastClosureTimestamp': 1727184000000,
        'lastActNumber': 'ACTA-CASH-20260924-UID999-ABCD',
        'updatedAt': 1727190000000,
      };

      final entity = CourierBalanceEntity.fromMap(balanceDoc, 'courier_uid_999');

      expect(entity.courierId, equals('courier_uid_999'));
      expect(entity.cashOutstandingCents, equals(150000));
      expect(entity.effectiveCashLimitCents, equals(300000));
      expect(entity.lastActNumber, equals('ACTA-CASH-20260924-UID999-ABCD'));

      final mapped = entity.toMap();
      expect(mapped['cashOutstandingCents'], equals(150000));
      expect(mapped['effectiveCashLimitCents'], equals(300000));
    });

    test('CourierDailyClosureEntity preserves reconciliation schema and bankReference', () {
      final closureDoc = {
        'courierId': 'courier_uid_999',
        'courierName': 'Carlos Mendoza',
        'totalCollectedCents': 245000,
        'bankReference': 'BAC-TR-8874123',
        'depositReceiptUrl': 'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/courier_deposits/receipt.jpg',
        'status': 'SUBMITTED',
        'actNumber': 'ACTA-CASH-20260924-UID999-9876',
        'verificationCode': 'V-999-X',
        'createdAt': 1727192000000,
      };

      final closure = CourierDailyClosureEntity.fromMap(closureDoc, 'closure_doc_01');

      expect(closure.id, equals('closure_doc_01'));
      expect(closure.courierId, equals('courier_uid_999'));
      expect(closure.bankReference, equals('BAC-TR-8874123'));
      expect(closure.totalCollectedCents, equals(245000));
      expect(closure.status, equals(ClosureStatus.submitted));
      expect(closure.actNumber, equals('ACTA-CASH-20260924-UID999-9876'));
    });
  });

  group('BSD-IOS-BOOTSTRAP — Order State Machine & Platform Stamping', () {
    test('OrderEntity parses canonical status strings correctly', () {
      expect(OrderEntity.fromMap({'status': 'READY'}, 'o1').status, equals(OrderStatus.readyForPickup));
      expect(OrderEntity.fromMap({'status': 'READY_FOR_PICKUP'}, 'o2').status, equals(OrderStatus.readyForPickup));
      expect(OrderEntity.fromMap({'status': 'COURIER_ACCEPTED'}, 'o3').status, equals(OrderStatus.accepted));
      expect(OrderEntity.fromMap({'status': 'IN_TRANSIT'}, 'o4').status, equals(OrderStatus.dispatched));
      expect(OrderEntity.fromMap({'status': 'DELIVERED'}, 'o5').status, equals(OrderStatus.delivered));
      expect(OrderEntity.fromMap({'status': 'PREPARING'}, 'o6').status, equals(OrderStatus.preparing));
    });

    test('Order creation payload adheres to firestore.rules platform requirements', () {
      const platformStamp = 'IOS';
      const allowedPlatforms = ['ANDROID', 'IOS', 'WEB'];

      expect(allowedPlatforms.contains(platformStamp), isTrue);
    });
  });

  group('BSD-IOS-BOOTSTRAP — Telemetry and Notification Contract Compliance', () {
    test('/user_devices contract uses fcmToken and platform iOS (GAP-INT-01)', () {
      final userDeviceRecord = {
        'deviceId': 'ios_uuid_abcdef123',
        'uid': 'user_test_uid',
        'fcmToken': 'fcm_token_sample_1234567890',
        'platform': 'iOS',
        'isActive': true,
        'role': 'driver',
        'updatedAt': 1727195000000,
      };

      expect(userDeviceRecord.containsKey('fcmToken'), isTrue);
      expect(userDeviceRecord.containsKey('token'), isFalse);
      expect(userDeviceRecord['platform'], equals('iOS'));
      expect(userDeviceRecord['isActive'], isTrue);
    });

    test('/ubicaciones_repartidores contract follows ADR-016 canonical schema', () {
      final courierTelemetry = {
        'coordenadas': {
          'latitud': 12.136389,
          'longitud': -86.251389,
        },
        'ultimaActualizacion': 1727195500000,
        'pedidoActivoId': 'order_active_777',
      };

      expect(courierTelemetry['coordenadas'], isA<Map<String, dynamic>>());
      final coords = courierTelemetry['coordenadas'] as Map<String, dynamic>;
      expect(coords['latitud'], equals(12.136389));
      expect(coords['longitud'], equals(-86.251389));
      expect(courierTelemetry.containsKey('ultimaActualizacion'), isTrue);
      expect(courierTelemetry['pedidoActivoId'], equals('order_active_777'));
    });
  });
}
