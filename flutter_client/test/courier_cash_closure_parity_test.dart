import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/data/services/courier_cash_closure_service.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_balance_entity.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/courier/courier_cash_closure_screen.dart';

class MockCashClosureServiceForTest implements ICourierCashClosureService {
  final _balanceController = StreamController<CourierBalanceEntity?>.broadcast(sync: true);
  final _historyController = StreamController<List<CourierDailyClosureEntity>>.broadcast(sync: true);

  String? lastCourierId;
  String? lastBankReference;
  String? lastBankName;
  String? lastReceiptUrl;
  int? lastTotalCollectedCents;
  bool generateActCalled = false;
  bool initiateClosureCalled = false;

  void emitBalance(CourierBalanceEntity balance) {
    _balanceController.add(balance);
  }

  void emitHistory(List<CourierDailyClosureEntity> list) {
    _historyController.add(list);
  }

  @override
  Stream<CourierBalanceEntity?> watchCourierBalance(String courierId) => _balanceController.stream;

  @override
  Future<CourierBalanceEntity?> getCourierBalance(String courierId) async => null;

  @override
  Stream<List<CourierDailyClosureEntity>> watchClosureHistory(String courierId) => _historyController.stream;

  @override
  Future<String> uploadDepositReceipt({required String courierId, required File imageFile, String? closureId}) async =>
      'https://storage.googleapis.com/test_receipt.jpg';

  @override
  Future<Map<String, dynamic>> initiateDailyClosure({
    required String courierId,
    required String bankReference,
    required String receiptUrl,
    required int totalCollectedCents,
    String? bankName,
    String? businessDate,
    String? shift,
    String? notes,
  }) async {
    initiateClosureCalled = true;
    lastCourierId = courierId;
    lastBankReference = bankReference;
    lastBankName = bankName;
    lastReceiptUrl = receiptUrl;
    lastTotalCollectedCents = totalCollectedCents;
    return {
      'closureId': 'closure_test_123',
      'status': 'PENDING_ADMIN_VERIFICATION',
      'actNumber': 'ACTA-CASH-TEST-999',
    };
  }

  @override
  Future<Map<String, dynamic>> registerBankDepositReceipt({
    required String closureId,
    required String bankName,
    required String bankReference,
    required int depositAmountCents,
    required String receiptDownloadUrl,
    String? receiptStoragePath,
    String? depositDate,
    String? notes,
  }) async => {'success': true};

  @override
  Future<String> generateOfficialActDocument({
    required String courierId,
    required String courierName,
    required int totalCollectedCents,
    required String bankReference,
    required String depositReceiptUrl,
  }) async {
    generateActCalled = true;
    return '===============================\n'
        'ACTA OFICIAL DE ARQUEO DIARIO\n'
        'Número de Acta: ACTA-CASH-TEST-999\n'
        'Repartidor: $courierName ($courierId)\n'
        '===============================';
  }

  void dispose() {
    _balanceController.close();
    _historyController.close();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PASO 2: Paridad 1:1 CourierCashClosureScreen (iOS / Flutter)', () {
    late MockCashClosureServiceForTest mockService;

    setUp(() {
      mockService = MockCashClosureServiceForTest();
    });

    tearDown(() {
      mockService.dispose();
    });

    testWidgets('Renderiza balance en vivo, bancos oficiales de Nicaragua y envía cierre', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1200));

      await tester.pumpWidget(
        MaterialApp(
          home: CourierCashClosureScreen(
            courierId: 'courier_nic_01',
            courierName: 'Carlos Repartidor',
            cashClosureService: mockService,
          ),
        ),
      );

      // Emitir balance e historial inicial para evitar spinner infinito en transición de tab
      mockService.emitHistory([]);
      mockService.emitBalance(
        const CourierBalanceEntity(
          courierId: 'courier_nic_01',
          cashOutstandingCents: 185000, // C$ 1,850.00
          effectiveCashLimitCents: 300000,
        ),
      );
      await tester.pump();

      // Verificar Tarjeta de Balance
      expect(find.text('C\$ 1850.00'), findsOneWidget);
      expect(find.text('OPERATIVO'), findsOneWidget);
      expect(find.text('Límite asignable de efectivo: C\$ 3000.00'), findsOneWidget);

      // Verificar Formulario y Bancos
      expect(find.byKey(const Key('cash_closure_bank_selector')), findsOneWidget);
      expect(find.byKey(const Key('cash_closure_ref_input')), findsOneWidget);
      expect(find.byKey(const Key('cash_closure_receipt_input')), findsOneWidget);
      expect(find.byKey(const Key('cash_closure_notes_input')), findsOneWidget);
      expect(find.byKey(const Key('cash_closure_submit_button')), findsOneWidget);

      // Llenar formulario
      await tester.enterText(find.byKey(const Key('cash_closure_ref_input')), 'MINUTA-BAC-445566');
      await tester.enterText(find.byKey(const Key('cash_closure_notes_input')), 'Depósito realizado en Metrocentro');
      await tester.pump();

      // Enviar
      final submitBtn = find.byKey(const Key('cash_closure_submit_button'));
      await tester.tap(submitBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      // Verificar llamadas al servicio con banco de Nicaragua
      expect(mockService.generateActCalled, isTrue);
      expect(mockService.initiateClosureCalled, isTrue);
      expect(mockService.lastCourierId, equals('courier_nic_01'));
      expect(mockService.lastBankReference, equals('MINUTA-BAC-445566'));
      expect(mockService.lastBankName, equals('BAC Credomatic'));
      expect(mockService.lastTotalCollectedCents, equals(185000));
    });

    testWidgets('Pestaña de Historial de Cierres renderiza estados canónicos y acta oficial', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1200));

      await tester.pumpWidget(
        MaterialApp(
          home: CourierCashClosureScreen(
            courierId: 'courier_nic_01',
            courierName: 'Carlos Repartidor',
            cashClosureService: mockService,
          ),
        ),
      );

      // Emitir historial antes de cambiar de tab para que el stream tenga datos
      mockService.emitHistory([
        const CourierDailyClosureEntity(
          closureId: 'cls_01',
          courierId: 'courier_nic_01',
          courierName: 'Carlos Repartidor',
          totalCollectedCents: 250000,
          bankName: 'Banpro Grupo Promerica',
          bankReference: 'MINUTA-BP-9911',
          depositReceiptUrl: 'https://storage.googleapis.com/v1.jpg',
          status: ClosureStatus.approved,
          rawStatus: 'APPROVED',
          createdAt: 1711800000000,
          businessDate: '2026-09-30',
          actNumber: 'ACTA-CASH-20260930-NIC-9911',
        ),
        const CourierDailyClosureEntity(
          closureId: 'cls_02',
          courierId: 'courier_nic_01',
          courierName: 'Carlos Repartidor',
          totalCollectedCents: 120000,
          bankName: 'Banco LAFISE Bancentro',
          bankReference: 'MINUTA-LAF-3322',
          depositReceiptUrl: 'https://storage.googleapis.com/v2.jpg',
          status: ClosureStatus.pendingApproval,
          rawStatus: 'PENDING_ADMIN_VERIFICATION',
          createdAt: 1711700000000,
          businessDate: '2026-09-29',
          actNumber: 'ACTA-CASH-20260929-NIC-3322',
        ),
      ]);

      // Cambiar a la pestaña de Historial
      await tester.tap(find.text('Historial de Cierres'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Re-emitir para asegurar llegada al StreamBuilder activo
      mockService.emitHistory([
        const CourierDailyClosureEntity(
          closureId: 'cls_01',
          courierId: 'courier_nic_01',
          courierName: 'Carlos Repartidor',
          totalCollectedCents: 250000,
          bankName: 'Banpro Grupo Promerica',
          bankReference: 'MINUTA-BP-9911',
          depositReceiptUrl: 'https://storage.googleapis.com/v1.jpg',
          status: ClosureStatus.approved,
          rawStatus: 'APPROVED',
          createdAt: 1711800000000,
          businessDate: '2026-09-30',
          actNumber: 'ACTA-CASH-20260930-NIC-9911',
        ),
        const CourierDailyClosureEntity(
          closureId: 'cls_02',
          courierId: 'courier_nic_01',
          courierName: 'Carlos Repartidor',
          totalCollectedCents: 120000,
          bankName: 'Banco LAFISE Bancentro',
          bankReference: 'MINUTA-LAF-3322',
          depositReceiptUrl: 'https://storage.googleapis.com/v2.jpg',
          status: ClosureStatus.pendingApproval,
          rawStatus: 'PENDING_ADMIN_VERIFICATION',
          createdAt: 1711700000000,
          businessDate: '2026-09-29',
          actNumber: 'ACTA-CASH-20260929-NIC-3322',
        ),
      ]);
      await tester.pump();

      // Verificar que se visualizan ambos cierres con sus badges canónicos
      expect(find.text('VERIFICADO Y LIQUIDADO'), findsOneWidget);
      expect(find.text('PENDIENTE DE VERIFICACIÓN'), findsOneWidget);
      expect(find.text('C\$ 2500.00'), findsOneWidget);
      expect(find.text('C\$ 1200.00'), findsOneWidget);
      expect(find.text('Ref: MINUTA-BP-9911'), findsOneWidget);
      expect(find.text('Banpro Grupo Promerica'), findsOneWidget);
      expect(find.text('Acta: ACTA-CASH-20260930-NIC-9911'), findsOneWidget);
    });

    testWidgets('PASO 3: Apertura y visualización interactiva del Acta Oficial PDF (ADR-018) y compartición', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1200));

      await tester.pumpWidget(
        MaterialApp(
          home: CourierCashClosureScreen(
            courierId: 'courier_nic_01',
            courierName: 'Carlos Repartidor',
            cashClosureService: mockService,
          ),
        ),
      );

      // Emitir historial inicial
      mockService.emitHistory([
        const CourierDailyClosureEntity(
          closureId: 'cls_01',
          courierId: 'courier_nic_01',
          courierName: 'Carlos Repartidor',
          totalCollectedCents: 250000,
          bankName: 'Banpro Grupo Promerica',
          bankReference: 'MINUTA-BP-9911',
          depositReceiptUrl: 'https://storage.googleapis.com/v1.jpg',
          status: ClosureStatus.approved,
          rawStatus: 'APPROVED',
          createdAt: 1711800000000,
          businessDate: '2026-09-30',
          actNumber: 'ACTA-CASH-20260930-NIC-9911',
        ),
      ]);

      // Cambiar a Historial y esperar fin de transición
      await tester.tap(find.text('Historial de Cierres'));
      await tester.pumpAndSettle();

      mockService.emitHistory([
        const CourierDailyClosureEntity(
          closureId: 'cls_01',
          courierId: 'courier_nic_01',
          courierName: 'Carlos Repartidor',
          totalCollectedCents: 250000,
          bankName: 'Banpro Grupo Promerica',
          bankReference: 'MINUTA-BP-9911',
          depositReceiptUrl: 'https://storage.googleapis.com/v1.jpg',
          status: ClosureStatus.approved,
          rawStatus: 'APPROVED',
          createdAt: 1711800000000,
          businessDate: '2026-09-30',
          actNumber: 'ACTA-CASH-20260930-NIC-9911',
        ),
      ]);
      await tester.pump();

      // Abrir Acta Oficial
      final viewActBtn = find.byKey(const Key('view_act_button_cls_01'));
      expect(viewActBtn, findsOneWidget);
      await tester.ensureVisible(viewActBtn);
      await tester.pumpAndSettle();
      await tester.tap(viewActBtn);
      await tester.pumpAndSettle();

      // Verificar modal de Acta Oficial ADR-018
      expect(find.text('Acta Oficial PDF (ADR-018)'), findsOneWidget);
      expect(find.text('ACTA-CASH-20260930-NIC-9911'), findsWidgets);
      expect(find.text('Conciliación Financiera (4 Capas):'), findsOneWidget);
      expect(find.text('1. Total Recaudado:'), findsOneWidget);
      expect(find.text('2. Arqueo Físico en Mesa:'), findsOneWidget);
      expect(find.text('3. Depósito Bancario:'), findsOneWidget);
      expect(find.text('4. Saldo Vivo Pendiente:'), findsOneWidget);
      expect(find.text('Copiar Texto Acta'), findsOneWidget);
      expect(find.text('Compartir'), findsOneWidget);

      // Copiar acta al portapapeles
      await tester.tap(find.text('Copiar Texto Acta'));
      await tester.pump();

      // Verificar SnackBar de confirmación
      expect(find.text('📋 Acta Oficial copiada al portapapeles.'), findsOneWidget);
    });
  });
}
