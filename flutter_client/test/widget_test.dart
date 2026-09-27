/// BLUE SYSTEM DELIVERY ENTERPRISE — UI WIDGET SMOKE TESTS
/// Standardized UI state views testing: LoadingView, EmptyView, ErrorView, OfflineBanner.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/presentation/theme/brand_theme_builder.dart';
import 'package:bluesystem_delivery_flutter/presentation/widgets/state_views.dart';

void main() {
  final testTheme = BrandThemeBuilder.buildTheme(BrandVisualConfig.fallback);

  group('BlueSystem Standard UI Widgets Smoke Test', () {
    testWidgets('LoadingView renders message and progress indicator', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: testTheme,
          home: const Scaffold(
            body: LoadingView(message: 'Cargando órdenes...'),
          ),
        ),
      );

      expect(find.text('Cargando órdenes...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('EmptyView renders title, message and icon', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: testTheme,
          home: const Scaffold(
            body: EmptyView(
              title: 'Sin pedidos',
              message: 'No hay pedidos activos en este momento',
              icon: Icons.inbox,
            ),
          ),
        ),
      );

      expect(find.text('Sin pedidos'), findsOneWidget);
      expect(find.text('No hay pedidos activos en este momento'), findsOneWidget);
      expect(find.byIcon(Icons.inbox), findsOneWidget);
    });

    testWidgets('ErrorView renders error message and handles retry callback', (WidgetTester tester) async {
      var retryClicked = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: testTheme,
          home: Scaffold(
            body: ErrorView(
              title: 'Error de Red',
              message: 'No se pudo conectar al servidor',
              onRetry: () {
                retryClicked = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Error de Red'), findsOneWidget);
      expect(find.text('No se pudo conectar al servidor'), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);

      await tester.tap(find.text('Reintentar'));
      await tester.pump();

      expect(retryClicked, isTrue);
    });

    testWidgets('OfflineBanner renders offline indicator', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: testTheme,
          home: const Scaffold(
            body: OfflineBanner(),
          ),
        ),
      );

      expect(find.text('Modo sin conexión — Operando con caché local'), findsOneWidget);
      expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
    });
  });
}

