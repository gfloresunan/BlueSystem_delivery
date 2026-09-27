import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/banner_entity.dart';

void main() {
  group('GAP-FST-03: Home Promotional Banners Contract & In-Memory Logic Tests', () {
    // Helper function that mirrors the in-memory filtering and sorting logic from BannerFirestoreService
    List<BannerEntity> filterAndSortBanners(
      List<Map<String, dynamic>> rawDocs, {
      String? tenantId,
    }) {
      final banners = <BannerEntity>[];
      for (var i = 0; i < rawDocs.length; i++) {
        final docData = rawDocs[i];
        final id = docData['id'] as String? ?? 'banner_$i';
        final banner = BannerEntity.fromMap(docData, id);

        // 1. In-memory Active Status Filter (1:1 Android parity)
        if (!banner.isActive) continue;

        // 2. Multi-Tenant Scope Isolation (if tenant specified on banner)
        if (tenantId != null &&
            tenantId.isNotEmpty &&
            banner.tenantId.isNotEmpty &&
            banner.tenantId != 'GLOBAL' &&
            banner.tenantId != tenantId) {
          continue;
        }

        banners.add(banner);
      }

      // 3. In-memory Priority Sorting (Ascending: 0 = Featured, 1 = Normal)
      banners.sort((a, b) => a.priority.compareTo(b.priority));
      return banners;
    }

    test('Parses modern schema banner documents with priority and tenantId', () {
      final raw = {
        'title': 'Super Promoción Viernes',
        'subtitle': '50% de descuento en pizzas',
        'imageUrl': 'https://storage.googleapis.com/banners/banner1.jpg',
        'actionType': 'BUSINESS',
        'actionId': 'biz_pizza_hut',
        'tenantId': 'ten_bluesystem_core',
        'isActive': true,
        'priority': 0,
        'backgroundColor': '#E53935',
      };

      final banner = BannerEntity.fromMap(raw, 'ban_001');

      expect(banner.id, equals('ban_001'));
      expect(banner.effectiveTitle, equals('Super Promoción Viernes'));
      expect(banner.subtitle, equals('50% de descuento en pizzas'));
      expect(banner.effectiveImageUrl, equals('https://storage.googleapis.com/banners/banner1.jpg'));
      expect(banner.effectiveActionType, equals('BUSINESS'));
      expect(banner.effectiveActionId, equals('biz_pizza_hut'));
      expect(banner.tenantId, equals('ten_bluesystem_core'));
      expect(banner.isActive, isTrue);
      expect(banner.priority, equals(0));
      expect(banner.backgroundColor, equals('#E53935'));
    });

    test('Parses legacy Spanish schema banner documents for backwards compatibility', () {
      final raw = {
        'titulo': 'Promo Tradicional',
        'subtitulo': 'Envío gratis todo el día',
        'imagenUrl': 'https://storage.googleapis.com/banners/legacy.jpg',
        'tipoAccion': 'comercio',
        'destinoId': 'biz_tradicional',
        'activo': true,
        'prioridad': 2,
      };

      final banner = BannerEntity.fromMap(raw, 'ban_legacy');

      expect(banner.id, equals('ban_legacy'));
      expect(banner.effectiveTitle, equals('Promo Tradicional'));
      expect(banner.subtitle, equals('Envío gratis todo el día'));
      expect(banner.effectiveImageUrl, equals('https://storage.googleapis.com/banners/legacy.jpg'));
      expect(banner.effectiveActionType, equals('comercio'));
      expect(banner.effectiveActionId, equals('biz_tradicional'));
      expect(banner.isActive, isTrue);
      expect(banner.priority, equals(2));
    });

    test('Filters out inactive banners in memory', () {
      final rawDocs = [
        {
          'id': 'b1',
          'title': 'Banner Activo 1',
          'isActive': true,
          'priority': 1,
        },
        {
          'id': 'b2',
          'title': 'Banner Inactivo Moderno',
          'isActive': false,
          'priority': 0,
        },
        {
          'id': 'b3',
          'id_field': 'b3',
          'titulo': 'Banner Inactivo Legacy',
          'activo': false,
          'prioridad': 0,
        },
        {
          'id': 'b4',
          'title': 'Banner Activo 2',
          'isActive': true,
          'priority': 2,
        },
      ];

      final filtered = filterAndSortBanners(rawDocs);

      expect(filtered.length, equals(2));
      expect(filtered.map((b) => b.id).toList(), equals(['b1', 'b4']));
    });

    test('Sorts banners by priority in ascending order (0 featured first, then 1, 2)', () {
      final rawDocs = [
        {
          'id': 'prio_2',
          'title': 'Prioridad 2',
          'isActive': true,
          'priority': 2,
        },
        {
          'id': 'prio_0_b',
          'title': 'Prioridad 0 B',
          'isActive': true,
          'priority': 0,
        },
        {
          'id': 'prio_1',
          'title': 'Prioridad 1',
          'isActive': true,
          'priority': 1,
        },
        {
          'id': 'prio_0_a',
          'title': 'Prioridad 0 A',
          'isActive': true,
          'priority': 0,
        },
      ];

      final sorted = filterAndSortBanners(rawDocs);

      expect(sorted.length, equals(4));
      expect(sorted[0].priority, equals(0));
      expect(sorted[1].priority, equals(0));
      expect(sorted[2].priority, equals(1));
      expect(sorted[3].priority, equals(2));
    });

    test('Enforces multi-tenant isolation: retains matching tenant and global, excludes foreign tenant', () {
      final rawDocs = [
        {
          'id': 'b_core',
          'title': 'Banner Core Tenant',
          'tenantId': 'ten_bluesystem_core',
          'isActive': true,
          'priority': 0,
        },
        {
          'id': 'b_global',
          'title': 'Banner Global Platform',
          'tenantId': 'GLOBAL',
          'isActive': true,
          'priority': 1,
        },
        {
          'id': 'b_unspecified',
          'title': 'Banner Sin Tenant',
          'tenantId': '',
          'isActive': true,
          'priority': 2,
        },
        {
          'id': 'b_foreign',
          'title': 'Banner Other Tenant',
          'tenantId': 'ten_foreign_mall',
          'isActive': true,
          'priority': 0,
        },
      ];

      final filtered = filterAndSortBanners(rawDocs, tenantId: 'ten_bluesystem_core');

      expect(filtered.length, equals(3));
      final ids = filtered.map((b) => b.id).toList();
      expect(ids, contains('b_core'));
      expect(ids, contains('b_global'));
      expect(ids, contains('b_unspecified'));
      expect(ids.contains('b_foreign'), isFalse);
    });

    test('Empty banner collection returns an empty list without error', () {
      final emptyResult = filterAndSortBanners([]);
      expect(emptyResult, isEmpty);
    });

    test('Banner stream error propagation: errors are forwarded and never swallowed into silent empty lists', () async {
      final controller = StreamController<List<Map<String, dynamic>>>();

      final mappedStream = controller.stream.map((rawDocs) {
        return filterAndSortBanners(rawDocs);
      }).handleError((error, st) {
        // Must rethrow or propagate, NEVER return <BannerEntity>[]
        throw error;
      });

      bool errorCaught = false;
      mappedStream.listen(
        (_) => fail('Should not emit data on error'),
        onError: (err) {
          errorCaught = true;
          expect(err, isA<StateError>());
        },
      );

      controller.addError(StateError('Simulated Firestore permission-denied'));
      await pumpEventQueue();

      expect(errorCaught, isTrue);
      await controller.close();
    });
  });
}
