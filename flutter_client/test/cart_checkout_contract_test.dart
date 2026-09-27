import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';

void main() {
  group('GAP-DOM-01 / GATE-01 & GATE-02: Commerce Delivery Fee & Order Contract Tests', () {
    test('GATE-01: BusinessEntity defaults deliveryFee to C\$ 45.0, NEVER C\$ 35.0', () {
      final defaultBiz = BusinessEntity.fromMap({
        'name': 'Restaurante El Güegüense',
        'status': 'ACTIVE',
      }, 'biz_test_1');

      expect(defaultBiz.deliveryFee, equals(45.0));
      expect(defaultBiz.deliveryFee, isNot(equals(35.0)));
    });

    test('GATE-01: BusinessEntity parses custom deliveryFee from Firestore document', () {
      final customBiz = BusinessEntity.fromMap({
        'name': 'Fritanga Doña Tania',
        'status': 'ACTIVE',
        'deliveryFee': 60.0,
      }, 'biz_test_2');

      expect(customBiz.deliveryFee, equals(60.0));

      final legacyBiz = BusinessEntity.fromMap({
        'name': 'Comidería Popular',
        'status': 'ACTIVE',
        'costoEnvio': 50.0,
      }, 'biz_test_3');

      expect(legacyBiz.deliveryFee, equals(50.0));
    });

    test('GATE-02: Canonical Order payload matches Android CustomerHomeViewModel schema', () {
      const product = ProductEntity(
        productId: 'prod_101',
        tenantId: 'tenant_mga',
        businessId: 'biz_01',
        businessName: 'Pizza Hut Centroamérica',
        name: 'Pizza Suprema Mediana',
        description: 'Deliciosa pizza con queso y vegetales',
        price: 320.0,
        category: 'Pizzas',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      );

      final orderItem = {
        'productId': product.productId,
        'productName': product.name,
        'price': product.price,
        'basePrice': product.price,
        'quantity': 2,
        'subtotal': product.price * 2,
        'imageUrl': product.imageUrl,
        'selectedOptions': <Map<String, dynamic>>[],
      };

      const bizDeliveryFee = 45.0; // Canonical SSOT fallback
      final subtotal = product.price * 2; // 640.0
      final total = subtotal + bizDeliveryFee; // 685.0

      final payload = <String, dynamic>{
        'customerId': 'user_customer_test',
        'clienteId': 'user_customer_test',
        'userId': 'user_customer_test',
        'uid': 'user_customer_test',
        'customerName': 'Carlos Gómez',
        'customerPhone': '+50588889999',
        'businessId': product.businessId,
        'businessName': product.businessName,
        'branchId': '',
        'tenantId': product.tenantId,
        'commercialTenantId': product.tenantId,
        'municipalityId': 'MANAGUA',
        'municipalityName': 'Managua',
        'cityId': 'MANAGUA',
        'city': 'Managua',
        'cityName': 'Managua',
        'items': [orderItem],
        'subtotal': subtotal,
        'merchantGrossSales': subtotal,
        'deliveryFee': bizDeliveryFee,
        'total': total,
        'customerTotal': total,
        'valoresMonetarios': {
          'subtotal': subtotal,
          'costoEnvio': bizDeliveryFee,
          'total': total,
          'customerTotal': total,
          'metodoPago': 'efectivo',
        },
        'status': 'pending',
        'estado': 'pendiente',
        'paymentMethod': 'efectivo',
        'paymentStatus': 'pending',
        'paymentVerified': false,
        'address': 'Colonia Centroamérica, Managua',
        'deliveryAddress': 'Colonia Centroamérica, Managua',
        'latitude': 12.1364,
        'longitude': -86.2514,
        'orderCodePrefix': 'PIZ',
        'platform': 'IOS',
        'courierPhase': 1,
        'hasBeenRated': false,
      };

      // Verify financial integrity
      expect(payload['deliveryFee'], equals(45.0));
      expect(payload['deliveryFee'], isNot(equals(35.0)));
      expect(payload['subtotal'], equals(640.0));
      expect(payload['total'], equals(685.0));
      expect(payload['platform'], equals('IOS'));

      // Verify bi-directional OrderEntity parsing from canonical payload
      final orderEntity = OrderEntity.fromMap(payload, 'order_test_doc_id');

      expect(orderEntity.orderId, equals('order_test_doc_id'));
      expect(orderEntity.customerId, equals('user_customer_test'));
      expect(orderEntity.businessId, equals('biz_01'));
      expect(orderEntity.deliveryFee, equals(45.0));
      expect(orderEntity.subtotal, equals(640.0));
      expect(orderEntity.total, equals(685.0));
      expect(orderEntity.status, equals(OrderStatus.pending));
      expect(orderEntity.items.length, equals(1));
      expect(orderEntity.items.first.title, equals('Pizza Suprema Mediana'));
      expect(orderEntity.items.first.unitPrice, equals(320.0));
      expect(orderEntity.items.first.quantity, equals(2));
      expect(orderEntity.items.first.subtotal, equals(640.0));
    });

    test('GATE-02: OrderItemEntity and OrderEntity parse both Android and Flutter fields', () {
      // Android payload simulation
      final androidPayload = {
        'pedidoId': 'android_order_999',
        'clienteId': 'user_android_123',
        'customerName': 'María López',
        'businessId': 'biz_tipitapa_1',
        'address': 'Barrio San Sebastián, Tipitapa',
        'latitude': 12.1983,
        'longitude': -86.0964,
        'deliveryFee': 55.0,
        'subtotal': 400.0,
        'total': 455.0,
        'status': 'PENDING',
        'items': [
          {
            'productId': 'prod_carne_asada',
            'productName': 'Carne Asada Completa',
            'price': 200.0,
            'quantity': 2,
            'subtotal': 400.0,
          }
        ]
      };

      final parsed = OrderEntity.fromMap(androidPayload, 'android_order_999');

      expect(parsed.orderId, equals('android_order_999'));
      expect(parsed.customerId, equals('user_android_123'));
      expect(parsed.deliveryAddress, equals('Barrio San Sebastián, Tipitapa'));
      expect(parsed.deliveryLat, equals(12.1983));
      expect(parsed.deliveryLng, equals(-86.0964));
      expect(parsed.deliveryFee, equals(55.0));
      expect(parsed.items.first.title, equals('Carne Asada Completa'));
      expect(parsed.items.first.unitPrice, equals(200.0));
      expect(parsed.items.first.quantity, equals(2));
      expect(parsed.items.first.subtotal, equals(400.0));
    });
  });
}
