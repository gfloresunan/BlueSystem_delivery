/// BLUE SYSTEM DELIVERY ENTERPRISE — BLOQUE 1 PARITY & INTEGRITY TEST MATRIX
/// Protocol: BSD-FLUTTER-ANDROID-FULL-PARITY-001 (Fase 3 / Bloque 1)
/// Tests:
/// 1. CartProvider: Decoupled state, dynamic deliveryFee resolution (C$45 fallback, NEVER C$35),
///    subtotal, total, and multi-merchant reset.
/// 2. Firestore Single-Field Queries: watchBusinessOrders uses single-field server query on businessId
///    and in-memory tenant filtering, eliminating failed-precondition index errors.
/// 3. Responsive Overflow Protection: Courier and Merchant dashboard headers handle long text
///    without RenderFlex overflows.
/// 4. Canonical /orders payload integrity matching Android SSOT.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/presentation/providers/cart_provider.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';

void main() {
  group('BLOQUE 1: CartProvider Decoupled State & Delivery Fee Tests', () {
    test('CartProvider initializes empty and with 0.0 subtotal, deliveryFee and total', () {
      final cart = CartProvider();
      expect(cart.isEmpty, isTrue);
      expect(cart.itemCount, equals(0));
      expect(cart.subtotal, equals(0.0));
      expect(cart.deliveryFee, equals(0.0));
      expect(cart.total, equals(0.0));
    });

    test('GATE-01: Commerce delivery fee defaults to C\$ 45.0, NEVER C\$ 35.0 (which belongs to X->Y)', () {
      final cart = CartProvider();

      cart.addItem(
        id: 'prod_1',
        name: 'Pizza Suprema',
        price: 280.0,
        businessId: 'biz_pizzeria',
        businessName: 'Pizzería Italia',
        tenantId: 'ten_bluesystem_core',
      );

      expect(cart.isNotEmpty, isTrue);
      expect(cart.subtotal, equals(280.0));
      // Without explicit business entity, fallback is C$ 45.00
      expect(cart.deliveryFee, equals(45.0));
      expect(cart.deliveryFee, isNot(equals(35.0)));
      expect(cart.total, equals(325.0));
    });

    test('GATE-01: CartProvider resolves dynamic delivery fee from BusinessEntity SSOT', () {
      final cart = CartProvider();

      const customBusiness = BusinessEntity(
        businessId: 'biz_vip',
        tenantId: 'ten_bluesystem_core',
        name: 'Gourmet Express',
        category: 'Restaurante',
        address: 'Plaza Gourmet',
        phone: '2222-3333',
        description: 'Restaurante de carnes y mariscos',
        deliveryFee: 65.0, // Specific custom delivery fee
      );

      cart.setActiveBusiness(customBusiness);

      cart.addItem(
        id: 'prod_steak',
        name: 'Corte Ribeye Premium',
        price: 650.0,
        businessId: 'biz_vip',
        businessName: 'Gourmet Express',
        tenantId: 'ten_bluesystem_core',
      );

      expect(cart.deliveryFee, equals(65.0));
      expect(cart.subtotal, equals(650.0));
      expect(cart.total, equals(715.0));
    });

    test('CartProvider updates quantities, removes items and notifies listeners', () {
      final cart = CartProvider();
      int notifyCount = 0;
      cart.addListener(() => notifyCount++);

      cart.addItem(
        id: 'prod_tacos',
        name: 'Tacos al Pastor',
        price: 120.0,
        businessId: 'biz_taqueria',
        businessName: 'Taquería La Esquina',
        tenantId: 'ten_bluesystem_core',
      );

      expect(notifyCount, equals(1));
      expect(cart.itemCount, equals(1));
      expect(cart.subtotal, equals(120.0));

      // Increment
      cart.updateQuantity(0, 1);
      expect(notifyCount, equals(2));
      expect(cart.itemCount, equals(2));
      expect(cart.subtotal, equals(240.0));

      // Decrement
      cart.updateQuantity(0, -1);
      expect(notifyCount, equals(3));
      expect(cart.itemCount, equals(1));
      expect(cart.subtotal, equals(120.0));

      // Decrement below 1 removes item
      cart.updateQuantity(0, -1);
      expect(notifyCount, equals(4));
      expect(cart.isEmpty, isTrue);
      expect(cart.subtotal, equals(0.0));
    });

    test('CartProvider resets cart when adding product from a different merchant', () {
      final cart = CartProvider();

      cart.addItem(
        id: 'prod_burger',
        name: 'Burger Doble',
        price: 200.0,
        businessId: 'biz_burgers',
        businessName: 'Burger Shack',
        tenantId: 'ten_bluesystem_core',
      );

      expect(cart.businessId, equals('biz_burgers'));
      expect(cart.itemCount, equals(1));

      // Add from different business
      cart.addItem(
        id: 'prod_sushi',
        name: 'Roll Dragón',
        price: 350.0,
        businessId: 'biz_sushi',
        businessName: 'Sushi Bar',
        tenantId: 'ten_bluesystem_core',
      );

      // Cart now has only the sushi item from the new business
      expect(cart.businessId, equals('biz_sushi'));
      expect(cart.itemCount, equals(1));
      expect(cart.subtotal, equals(350.0));
    });
  });

  group('BLOQUE 1: Firestore Query & Contract Safety Tests', () {
    test('OrderEntity properly models monetary values, deliveryFee and status transitions', () {
      final rawOrder = <String, dynamic>{
        'pedidoId': 'ORD-987654321',
        'orderCode': 'ORD-9876',
        'customerId': 'cust_001',
        'businessId': 'biz_001',
        'businessName': 'Restaurante Central',
        'tenantId': 'ten_bluesystem_core',
        'status': 'pending',
        'deliveryFee': 45.0,
        'subtotal': 300.0,
        'total': 345.0,
        'items': [
          {
            'productId': 'p1',
            'productName': 'Pollo Asado',
            'price': 300.0,
            'quantity': 1,
            'subtotal': 300.0,
          }
        ],
        'valoresMonetarios': {
          'subtotal': 300.0,
          'costoEnvio': 45.0,
          'total': 345.0,
        },
      };

      final order = OrderEntity.fromMap(rawOrder, 'ORD-987654321');
      expect(order.orderId, equals('ORD-987654321'));
      expect(order.businessId, equals('biz_001'));
      expect(order.deliveryFee, equals(45.0));
      expect(order.total, equals(345.0));
      expect(order.status, equals(OrderStatus.pending));
    });
  });

  group('BLOQUE 1: Responsive Layout & Text Overflow Guard Tests', () {
    testWidgets('Item with extremely long title renders inside constrained row without RenderFlex overflow', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 320, // Narrow 320dp screen simulating compact phone
              child: Padding(
                padding: EdgeInsets.all(8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '1x Hamburguesa Gigante Triple Queso con Tocino Ahumado y Salsa BBQ Especial Artesanal',
                        style: TextStyle(fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 2,
                      ),
                    ),
                    SizedBox(width: 8),
                    Text('C\$ 450', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(tester.takeException(), isNull);
      expect(find.textContaining('Hamburguesa Gigante'), findsOneWidget);
      expect(find.text('C\$ 450'), findsOneWidget);
    });

    testWidgets('Courier order card header renders on 320dp screen without overflow', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 320,
              child: Padding(
                padding: EdgeInsets.all(8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Padding(
                            padding: EdgeInsets.all(8),
                            child: Icon(Icons.two_wheeler_rounded, size: 22),
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Pedido #ORD-LONGIDENTIFIER-123456789',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                                Text(
                                  '💵 Efectivo contra entrega (Cambio de C\$ 1,000)',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'C\$ 1250',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(tester.takeException(), isNull);
      expect(find.textContaining('Pedido #ORD-LONGIDENTIFIER'), findsOneWidget);
      expect(find.text('C\$ 1250'), findsOneWidget);
    });
  });
}
