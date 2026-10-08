/// BLUE SYSTEM DELIVERY ENTERPRISE — SCHEDULED COMMERCE & SERVICE EXPLORER PARITY TESTS
/// Validates 1:1 parity with Android Scheduled Commerce (ADR-030/031/034/037) & Service Explorer (ADR-036).

import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/core/engine/app_update_resolver.dart';
import 'package:bluesystem_delivery_flutter/core/engine/scheduled_commerce_engine.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/home_service_category_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/promotional_popup_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/scheduled_order_entity.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/cart_provider.dart';

void main() {
  group('DOMINIO 1: Scheduled Commerce & Gifting Engine (1:1 Android Parity)', () {
    const testBusiness = BusinessEntity(
      businessId: 'biz_floristeria_01',
      tenantId: 'ten_core',
      name: 'Floristería Las Rosas',
      category: 'Flores y Regalos',
      address: 'Altamira, Managua',
      phone: '2270-5555',
      description: 'Floristería premium',
      deliveryFee: 60.0,
      weeklySchedule: {
        'lunes': {'isOpen': true, 'openTime': '08:00', 'closeTime': '18:00'},
        'martes': {'isOpen': true, 'openTime': '08:00', 'closeTime': '18:00'},
        'miércoles': {'isOpen': true, 'openTime': '08:00', 'closeTime': '18:00'},
        'jueves': {'isOpen': true, 'openTime': '08:00', 'closeTime': '18:00'},
        'viernes': {'isOpen': true, 'openTime': '08:00', 'closeTime': '18:00'},
        'sábado': {'isOpen': true, 'openTime': '08:00', 'closeTime': '14:00'},
        'domingo': {'isOpen': false},
      },
    );

    test('getAvailableDays returns days in advance respecting business schedule and blocklist', () {
      final baseDate = DateTime(2026, 10, 6, 9, 0); // Martes
      final days = ScheduledCommerceEngine.getAvailableDays(
        business: testBusiness,
        now: baseDate,
      );

      expect(days.length, equals(7)); // 7 days in advance
      expect(days[0].isToday, isTrue);
      expect(days[0].isAvailable, isTrue);
      expect(days[0].dateStr, equals('2026-10-06'));

      // Domingo (offset 5 -> Oct 11) should be closed
      final sunday = days.firstWhere((d) => d.dateStr == '2026-10-11');
      expect(sunday.isAvailable, isFalse);
      expect(sunday.reason, equals('Cerrado este día'));
    });

    test('getAvailableSlots computes slots with lead time and prep buffer', () {
      final now = DateTime(2026, 10, 6, 9, 0); // 09:00 AM
      final slots = ScheduledCommerceEngine.getAvailableSlots(
        business: testBusiness,
        selectedDate: now,
        now: now,
      );

      expect(slots.isNotEmpty, isTrue);
      // Earliest available slot must be after 09:00 + 60m lead + 30m prep = 10:30 AM
      final availableSlots = slots.where((s) => s.isAvailable).toList();
      for (final slot in availableSlots) {
        expect(slot.windowStartAt.isAfter(now.add(const Duration(minutes: 90))), isTrue);
      }
    });

    test('Greeting card templates contains 4 canonical templates matching Android SSOT', () {
      const templates = ScheduledCommerceEngine.defaultCardTemplates;
      expect(templates.length, equals(4));
      expect(templates.map((t) => t.id), containsAll([
        'CARD_CLASSIC_ELEGANT',
        'CARD_ROSES_ROMANTIC',
        'CARD_BIRTHDAY_CELEBRATION',
        'CARD_CONGRATULATIONS',
      ]));
    });
  });

  group('DOMINIO 1: OrderEntity Scheduled & Gift Serialization Parity', () {
    test('OrderEntity correctly serializes and deserializes fulfillment timing and gift metadata', () {
      final windowStart = DateTime(2026, 10, 7, 10, 0);
      final windowEnd = DateTime(2026, 10, 7, 11, 0);
      final order = OrderEntity(
        orderId: 'ORD-TEST-SCHED-01',
        tenantId: 'ten_core',
        customerId: 'user_cust_01',
        customerName: 'Geraldo',
        customerPhone: '8888-0000',
        businessId: 'biz_01',
        businessName: 'Floristería',
        deliveryAddress: 'Altamira, Managua',
        status: OrderStatus.pending,
        items: const [],
        subtotal: 440.0,
        deliveryFee: 60.0,
        discount: 0.0,
        total: 500.0,
        paymentMethod: PaymentMethod.cash,
        isPaid: false,
        createdAt: 1728200000000,
        updatedAt: 1728200000000,
        orderCode: 'SCH-1001',
        orderCodePrefix: 'SCH',
        fulfillmentTiming: FulfillmentTimingEntity(
          mode: 'SCHEDULED',
          windowStartAt: windowStart,
          windowEndAt: windowEnd,
          timezone: 'America/Managua',
        ),
        recipient: const RecipientInfoEntity(
          isThirdParty: true,
          name: 'María González',
          phone: '8999-7777',
          deliveryInstructions: 'Timbre blanco al fondo',
        ),
        giftDetails: const GiftDetailsEntity(
          isGift: true,
          senderName: 'Tu Hijo Geraldo',
          message: '¡Feliz día mamá! Te amo mucho.',
          cardTemplateId: 'amor',
        ),
        specialHandling: const SpecialHandlingEntity(
          type: 'FLOWERS',
          fragile: true,
          keepUpright: true,
          temperatureSensitive: false,
          handlingNote: 'Manejar con cuidado floral',
        ),
      );

      expect(order.isScheduledOrder, isTrue);
      expect(order.isThirdPartyRecipient, isTrue);
      expect(order.isGiftOrder, isTrue);
      expect(order.requiresSpecialHandling, isTrue);
      expect(order.displayOrderCode, equals('SCH-1001'));

      final map = order.toMap();
      final reconstructed = OrderEntity.fromMap(map, 'ORD-TEST-SCHED-01');

      expect(reconstructed.isScheduledOrder, isTrue);
      expect(reconstructed.fulfillmentTiming?.mode, equals('SCHEDULED'));
      expect(reconstructed.fulfillmentTiming?.windowStartAt, equals(windowStart));
      expect(reconstructed.recipient?.name, equals('María González'));
      expect(reconstructed.recipient?.phone, equals('8999-7777'));
      expect(reconstructed.giftDetails?.isGift, isTrue);
      expect(reconstructed.giftDetails?.senderName, equals('Tu Hijo Geraldo'));
      expect(reconstructed.specialHandling?.keepUpright, isTrue);
    });
  });

  group('DOMINIO 2: Service Explorer & 18 Canonical Dashboard Blocks', () {
    test('DashboardConfigEntity contains 18 blocks including SERVICE_EXPLORER and EDITORIAL_ADS', () {
      const config = DashboardConfigEntity(
        showServiceExplorer: true,
        blockTitles: {'SERVICE_EXPLORER': 'Explora nuestros servicios'},
      );

      expect(config.showServiceExplorer, isTrue);
      expect(config.blockTitles['SERVICE_EXPLORER'], equals('Explora nuestros servicios'));
      expect(DashboardConfigEntity.canonicalDefaultSectionOrder.length, equals(18));
      expect(DashboardConfigEntity.canonicalDefaultSectionOrder, contains('SERVICE_EXPLORER'));
      expect(DashboardConfigEntity.canonicalDefaultSectionOrder, contains('EDITORIAL_ADS'));
    });

    test('HomeServiceCategoryEntity correctly maps default canonical properties', () {
      final cat = HomeServiceCategoryEntity.fromMap({
        'id': 'srv_restaurantes',
        'name': 'Restaurantes',
        'slug': 'restaurantes',
        'icon': '🍔',
        'row': 1,
        'position': 1,
        'isActive': true,
        'navigationType': 'CATEGORY_LANDING',
      }, 'srv_restaurantes');

      expect(cat.id, equals('srv_restaurantes'));
      expect(cat.effectiveDisplayTitle, equals('Restaurantes'));
      expect(cat.effectiveEmoji, equals('🍔'));
      expect(cat.navigationType, equals('CATEGORY_LANDING'));
      expect(cat.row, equals(1));
    });
  });

  group('DOMINIO 3: Promotional Popups & Frequency Gating', () {
    test('PromotionalPopupEntity correctly parses display mode and target dates', () {
      final now = DateTime.now();
      final popup = PromotionalPopupEntity.fromMap({
        'id': 'pop_special_promo',
        'title': '¡Gran Descuento 30%!',
        'description': 'Solo por hoy en restaurantes seleccionados',
        'imageUrl': 'https://example.com/promo.jpg',
        'actionType': 'CATEGORY',
        'actionTarget': 'restaurantes',
        'frequency': 'ONCE_PER_DAY',
        'cooldownMinutes': 1440,
        'startDate': now.subtract(const Duration(hours: 1)).toIso8601String(),
        'endDate': now.add(const Duration(hours: 23)).toIso8601String(),
        'active': true,
      }, 'pop_special_promo');

      expect(popup.id, equals('pop_special_promo'));
      expect(popup.frequency, equals('ONCE_PER_DAY'));
      expect(popup.cooldownMinutes, equals(1440));
      expect(popup.actionType, equals('CATEGORY'));
      expect(popup.isEffectivelyActive, isTrue);
    });
  });

  group('DOMINIO 4: CartProvider State Integration with Scheduled Commerce', () {
    test('CartProvider handles scheduled checkout toggles and gift metadata', () {
      final cart = CartProvider();

      expect(cart.isScheduled, isFalse);

      final testDay = ScheduledDay(
        date: DateTime(2026, 10, 7),
        dateStr: '2026-10-07',
        dayOfWeekLabel: 'MIÉ',
        dayNumberLabel: '7',
        monthLabel: 'OCT',
        isAvailable: true,
        isToday: false,
        reason: '',
      );

      final testSlot = ScheduledSlot(
        slotKey: '2026-10-07_1000_1100',
        label: '10:00 AM - 11:00 AM',
        windowStartAt: DateTime(2026, 10, 7, 10, 0),
        windowEndAt: DateTime(2026, 10, 7, 11, 0),
        isAvailable: true,
        remainingCapacity: 4,
        reason: '',
      );

      cart.setDeliveryMode(scheduled: true);
      cart.setScheduledDay(testDay);
      cart.setScheduledSlot(testSlot);

      expect(cart.isScheduled, isTrue);
      expect(cart.selectedScheduledDay?.dateStr, equals('2026-10-07'));
      expect(cart.selectedScheduledSlot?.slotKey, equals('2026-10-07_1000_1100'));

      cart.setGiftDetails(
        const GiftDetailsEntity(
          isGift: true,
          senderName: 'Carlos',
          message: 'Felicidades',
          cardTemplateId: 'CARD_BIRTHDAY_CELEBRATION',
        ),
      );

      expect(cart.giftDetails?.isGift, isTrue);
      expect(cart.giftDetails?.senderName, equals('Carlos'));
      expect(cart.giftDetails?.cardTemplateId, equals('CARD_BIRTHDAY_CELEBRATION'));

      cart.setSpecialHandling(
        const SpecialHandlingEntity(
          type: 'CAKE',
          fragile: true,
          keepUpright: true,
          temperatureSensitive: true,
          handlingNote: 'Cuidado con el pastel',
        ),
      );

      expect(cart.specialHandling?.fragile, isTrue);
      expect(cart.specialHandling?.temperatureSensitive, isTrue);
      expect(cart.specialHandling?.keepUpright, isTrue);
      expect(cart.specialHandling?.handlingNote, equals('Cuidado con el pastel'));
    });
  });

  group('DOMINIO 5: AppUpdateResolver & Strictest-Wins Evaluation (ADR-038 Pillar 13)', () {
    test('compareSemVer correctly sorts version strings', () {
      expect(AppUpdateResolver.compareSemVer('1.0.0', '1.0.1'), equals(-1));
      expect(AppUpdateResolver.compareSemVer('2.0.0', '1.9.9'), equals(1));
      expect(AppUpdateResolver.compareSemVer('1.5.0', '1.5.0'), equals(0));
    });

    test('resolve returns ForcedUpdateResolution when installed is below minimumVersion', () {
      const config = AppUpdateConfigEntity(
        enabled: true,
        minimumVersion: '1.2.0',
        latestVersion: '1.3.0',
        forceUpdate: false,
        updateType: 'OPTIONAL',
        storeUrl: 'https://apps.apple.com/app/tuanigo',
      );

      final res = AppUpdateResolver.resolve(
        installedVersion: '1.1.0',
        config: config,
        currentPlatform: 'IOS',
      );

      expect(res, isA<ForcedUpdateResolution>());
      final forced = res as ForcedUpdateResolution;
      expect(forced.minimumVersion, equals('1.2.0'));
      expect(forced.currentVersion, equals('1.1.0'));
    });

    test('resolve returns OptionalUpdateResolution when installed is between min and latest', () {
      const config = AppUpdateConfigEntity(
        enabled: true,
        minimumVersion: '1.0.0',
        latestVersion: '1.2.0',
        forceUpdate: false,
        updateType: 'OPTIONAL',
        storeUrl: 'https://apps.apple.com/app/tuanigo',
      );

      final res = AppUpdateResolver.resolve(
        installedVersion: '1.1.0',
        config: config,
        currentPlatform: 'IOS',
      );

      expect(res, isA<OptionalUpdateResolution>());
      final opt = res as OptionalUpdateResolution;
      expect(opt.latestVersion, equals('1.2.0'));
      expect(opt.allowDismiss, isTrue);
    });

    test('resolve applies Strictest-Wins for role policies', () {
      final config = AppUpdateConfigEntity.fromMap({
        'enabled': true,
        'minimumVersion': '1.0.0',
        'latestVersion': '1.5.0',
        'forceUpdate': false,
        'rolePolicies': {
          'courier': {
            'enabled': true,
            'minimumVersion': '1.4.0',
            'latestVersion': '1.5.0',
            'forceUpdate': true,
          }
        }
      });

      // Customer on 1.2.0 receives optional update
      final customerRes = AppUpdateResolver.resolve(
        installedVersion: '1.2.0',
        config: config,
        userRole: 'customer',
      );
      expect(customerRes, isA<OptionalUpdateResolution>());

      // Courier on 1.2.0 receives forced update due to role policy
      final courierRes = AppUpdateResolver.resolve(
        installedVersion: '1.2.0',
        config: config,
        userRole: 'courier',
      );
      expect(courierRes, isA<ForcedUpdateResolution>());
    });
  });
}
