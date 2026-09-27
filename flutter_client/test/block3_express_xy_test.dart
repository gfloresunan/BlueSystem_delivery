/// BLUE SYSTEM DELIVERY ENTERPRISE — BLOQUE 3 TEST SUITE (X→Y EXPRESS DELIVERY)
/// Validates:
/// 1. Mathematical Invariants & Pricing Engine (ADR-026: C$35 base + C$10/km)
/// 2. SolicitarEnvioScreen Point X & Y Selection, Validation, and Firestore /deliveryTrips persistence
/// 3. TripLiveTrackingScreen Status Stepper and Courier GPS Telemetry
/// 4. TripsScreen Real-Time Stream, C$ formatting, and Navigation

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/engine/x_to_y_pricing_engine.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/core/utils/geo_utils.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_location_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/saved_address_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/trip_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/trips/solicitar_envio_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/trips/trip_live_tracking_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/trips/trips_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';

// ─── MOCKS ───────────────────────────────────────────────────────────────────

class MockTripService implements ITripService {
  final List<TripEntity> _trips;
  final StreamController<List<TripEntity>> _tripsController =
      StreamController<List<TripEntity>>.broadcast();
  final StreamController<TripEntity?> _singleTripController =
      StreamController<TripEntity?>.broadcast();

  Map<String, dynamic>? lastCreatedPayload;
  String? lastUpdatedTripId;
  TripStatus? lastUpdatedStatus;

  MockTripService({List<TripEntity>? initialTrips})
      : _trips = initialTrips != null ? List.from(initialTrips) : [] {
    _tripsController.add(_trips);
  }

  @override
  Future<TripEntity?> getTripById(String tripId) async {
    return _trips.firstWhere((t) => t.tripId == tripId, orElse: () => _trips.first);
  }

  @override
  Stream<TripEntity?> watchTrip(String tripId) async* {
    final existing = _trips.where((t) => t.tripId == tripId).firstOrNull;
    if (existing != null) {
      yield existing;
    }
    yield* _singleTripController.stream;
  }

  @override
  Stream<List<TripEntity>> watchCustomerTrips(String customerId, {required String tenantId}) async* {
    yield _trips;
    yield* _tripsController.stream;
  }

  @override
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId}) {
    return Stream.value(_trips);
  }

  @override
  Stream<List<TripEntity>> watchEligibleTrips({required String tenantId}) {
    return Stream.value(_trips);
  }

  @override
  Future<String> createTrip(Map<String, dynamic> tripData) async {
    lastCreatedPayload = tripData;
    const generatedId = 'TRIP-EXP-777';
    final newTrip = TripEntity.fromMap(tripData, generatedId);
    _trips.insert(0, newTrip);
    _tripsController.add(_trips);
    _singleTripController.add(newTrip);
    return generatedId;
  }

  @override
  Future<bool> claimTripAtomically(String tripId, String courierId, String courierName) async => true;

  @override
  Future<void> updateTripStatus(String tripId, TripStatus status) async {
    lastUpdatedTripId = tripId;
    lastUpdatedStatus = status;
    final idx = _trips.indexWhere((t) => t.tripId == tripId);
    if (idx != -1) {
      final old = _trips[idx];
      final updated = TripEntity(
        tripId: old.tripId,
        tenantId: old.tenantId,
        customerId: old.customerId,
        assignedCourierId: old.assignedCourierId,
        origin: old.origin,
        destination: old.destination,
        distanceKm: old.distanceKm,
        basePrice: old.basePrice,
        distancePrice: old.distancePrice,
        totalPrice: old.totalPrice,
        status: status,
        packageDescription: old.packageDescription,
        createdAt: old.createdAt,
        updatedAt: DateTime.now().millisecondsSinceEpoch,
      );
      _trips[idx] = updated;
      _tripsController.add(_trips);
      _singleTripController.add(updated);
    }
  }

  void emitTrip(TripEntity trip) => _singleTripController.add(trip);

  void dispose() {
    _tripsController.close();
    _singleTripController.close();
  }
}

class MockFleetService implements IFleetService {
  final StreamController<CourierLocationEntity?> _courierController =
      StreamController<CourierLocationEntity?>.broadcast();

  void emitLocation(CourierLocationEntity loc) => _courierController.add(loc);

  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) => _courierController.stream;

  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) => Stream.value([]);

  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {}

  void dispose() => _courierController.close();
}

class MockUserService implements IUserService {
  final List<SavedAddressEntity> _addresses;

  MockUserService({List<SavedAddressEntity>? addresses}) : _addresses = addresses ?? [];

  @override
  Stream<UserProfileEntity?> watchProfile(String uid) => Stream.value(null);
  @override
  Future<void> updateProfile(String uid, {required String displayName, String? phoneNumber}) async {}
  @override
  Stream<List<SavedAddressEntity>> watchAddresses(String uid) => Stream.value(_addresses);
  @override
  Future<void> saveAddress(String uid, SavedAddressEntity address) async {}
  @override
  Future<void> setDefaultAddress(String uid, String addressId) async {}
  @override
  Future<void> deleteAddress(String uid, String addressId) async {}
}

class DummySessionState extends SessionState {
  final UserProfileEntity? _user;
  final CanonicalCustomClaimsV3? _claims;

  DummySessionState({UserProfileEntity? user, CanonicalCustomClaimsV3? claims})
      : _user = user,
        _claims = claims,
        super(
          authService: _StubAuthService(),
          tenantService: _StubPlatformService(),
          brandService: _StubPlatformService(),
          subscriptionService: _StubPlatformService(),
          appConfigService: _StubPlatformService(),
        );

  @override
  UserProfileEntity? get currentUser => _user;
  @override
  CanonicalCustomClaimsV3? get claims => _claims;
  @override
  bool get isAuthenticated => true;
  @override
  bool get isGuestMode => false;
}

class _StubAuthService implements IAuthService {
  @override
  Stream<UserProfileEntity?> get authStateChanges => Stream.value(null);
  @override
  Future<UserProfileEntity?> getCurrentUser() async => null;
  @override
  Future<CanonicalCustomClaimsV3?> getCustomClaims() async => null;
  @override
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> registerWithEmailPassword({required String email, required String password, required String name, required String phone}) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithGoogleToken(String idToken, {String? accessToken}) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithFacebookToken(String accessToken) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithGoogle() async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithFacebook() async => throw UnimplementedError();
  @override
  Future<void> sendPasswordReset(String email) async {}
  @override
  Future<void> signOut() async {}
  @override
  Future<void> refreshIdToken() async {}
}

class _StubPlatformService implements ITenantService, IBrandService, ISubscriptionService, IAppConfigService {
  @override
  Future<TenantEntity?> getTenantById(String tenantId) async => null;
  @override
  Stream<TenantEntity?> watchTenant(String tenantId) => Stream.value(null);
  @override
  Future<BrandEntity?> getBrandById(String brandId) async => null;
  @override
  Future<BrandEntity?> getPrimaryBrandForTenant(String tenantId) async => null;
  @override
  Stream<BrandEntity?> watchBrand(String brandId) => Stream.value(null);
  @override
  Future<SubscriptionEntity?> getSubscriptionByTenantId(String tenantId) async => null;
  @override
  Stream<SubscriptionEntity?> watchSubscription(String tenantId) => Stream.value(null);
  @override
  Future<AppConfigEntity?> getAppConfigById(String configId) async => null;
  @override
  Future<AppConfigEntity?> resolveActiveConfig({required String tenantId, required String brandId, required PlatformType platform, required EnvironmentType environment}) async => null;
}

// ─── MAIN TEST SUITE ─────────────────────────────────────────────────────────

void main() {
  group('BLOQUE 3 — Subtask 1: Mathematical Invariants & Pricing Engine (ADR-026)', () {
    test('Calculates canonical fee strictly conforming to ADR-026 (C\$35 + C\$10/km)', () {
      // Base fee (0 km)
      expect(XToYPricingEngine.calculateFee(0.0), equals(35.0));

      // 5 km
      expect(XToYPricingEngine.calculateFee(5.0), equals(85.0));

      // 10 km
      expect(XToYPricingEngine.calculateFee(10.0), equals(135.0));

      // Certified Benchmark ADR-026 / Case #20846B (14.91 km -> C$ 184.10)
      expect(XToYPricingEngine.calculateFee(14.91), equals(184.10));
    });

    test('Validates customer custom offers against ADR-026 base fee boundary', () {
      const calculatedFee = 135.0; // for 10 km
      // Below C$35 base fee is REJECTED
      expect(XToYPricingEngine.isValidOffer(34.99, calculatedFee), isFalse);
      expect(XToYPricingEngine.isValidOffer(20.0, calculatedFee), isFalse);
      expect(XToYPricingEngine.isValidOffer(0.0, calculatedFee), isFalse);

      // At or above base fee C$35 is ACCEPTED
      expect(XToYPricingEngine.isValidOffer(35.0, calculatedFee), isTrue);
      expect(XToYPricingEngine.isValidOffer(150.0, calculatedFee), isTrue);
    });

    test('Builds authoritative pricing snapshot dictionary matching Firestore schema', () {
      final snapshot = XToYPricingEngine.buildPricingSnapshot(
        distanceKm: 14.91,
        calculatedAmount: 184.10,
      );

      expect(snapshot['baseFee'], equals(35.0));
      expect(snapshot['perKmRate'], equals(10.0));
      expect(snapshot['pricePerKm'], equals(10.0));
      expect(snapshot['calculatedAmount'], equals(184.10));
      expect(snapshot['currency'], equals('NIO'));
      expect(snapshot['calculationPolicy'], equals('ADR-026_SSOT_FAIL_CLOSED'));
      expect(snapshot['configVersion'], equals('v2.0'));
      expect(snapshot['distanceKm'], equals(14.91));
      expect(snapshot['routeDistanceMeters'], equals(14910));
    });

    test('Calculates Haversine distance correctly with GeoUtils', () {
      // Metrocentro (12.1364, -86.2514) to Invercasa (12.1150, -86.2710)
      final distance = GeoUtils.calculateDistance(12.1364, -86.2514, 12.1150, -86.2710);
      expect(distance, greaterThan(3.0));
      expect(distance, lessThan(4.0));
    });
  });

  group('BLOQUE 3 — Subtask 2: SolicitarEnvioScreen Point X/Y & Persistence', () {
    testWidgets('Populates route, opens map picker, validates offer, and submits trip', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const customer = UserProfileEntity(
        uid: 'cust_xy_001',
        email: 'cliente@bsd.com',
        displayName: 'Roberto Carlos',
        phoneNumber: '88887777',
        role: EiamRole.client,
        isVerified: true,
        createdAt: 0,
        updatedAt: 0,
      );

      final savedAddresses = [
        const SavedAddressEntity(
          id: 'addr_trabajo_xy',
          userId: 'cust_xy_001',
          label: 'Trabajo',
          fullAddress: 'Edificio Invercasa, Managua',
          latitude: 12.1150,
          longitude: -86.2710,
          createdAt: 0,
          updatedAt: 0,
        ),
      ];

      final mockTripService = MockTripService();
      final mockUserService = MockUserService(addresses: savedAddresses);
      String? createdTripId;

      await tester.pumpWidget(
        MaterialApp(
          home: SolicitarEnvioScreen(
            tripService: mockTripService,
            userService: mockUserService,
            currentUser: customer,
            tenantId: 'ten_core',
            onBack: () {},
            onTripCreated: (id) => createdTripId = id,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Header and initial Origin
      expect(find.text('Solicitar Envío Express'), findsOneWidget);
      expect(find.text('Punto a Punto X→Y (ADR-026 Oficial)'), findsOneWidget);

      // Apply saved address for Destination Y via quick chip
      final chipFinder = find.byKey(const Key('trip_quick_addr_addr_trabajo_xy'));
      expect(chipFinder, findsOneWidget);
      await tester.tap(chipFinder);
      await tester.pumpAndSettle();

      // Destination address should now be populated
      final destField = tester.widget<TextField>(find.byKey(const Key('trip_dest_address_field')));
      expect(destField.controller?.text, equals('Edificio Invercasa, Managua'));

      // Test Map Picker dialog on Destination
      await tester.tap(find.byKey(const Key('dest_map_picker_btn')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('map_picker_dialog')), findsOneWidget);
      expect(find.text('Seleccionar Punto Y (Destino)'), findsOneWidget);

      // Tap GPS center in map picker
      await tester.tap(find.byKey(const Key('map_picker_gps_sync_btn')));
      await tester.pumpAndSettle();

      // Confirm point in map picker
      await tester.tap(find.byKey(const Key('map_picker_confirm_button')));
      await tester.pumpAndSettle();

      // Verify distance and fee are calculated according to ADR-026
      expect(find.text('Tarifa Canónica ADR-026'), findsOneWidget);
      expect(find.text('Tarifa base oficial:'), findsOneWidget);
      expect(find.text('C\$ 35.00'), findsOneWidget);

      // Open custom offer dialog
      await tester.tap(find.byKey(const Key('open_offer_dialog_btn')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('custom_offer_dialog')), findsOneWidget);

      // Enter valid offer C$ 95
      await tester.enterText(find.byKey(const Key('custom_offer_amount_field')), '95');
      await tester.tap(find.byKey(const Key('custom_offer_confirm_button')));
      await tester.pumpAndSettle();

      expect(find.text('C\$ 95.00'), findsOneWidget);

      // Fill in recipient and package details
      await tester.enterText(find.byKey(const Key('trip_package_desc_field')), 'Documentos legales');
      await tester.enterText(find.byKey(const Key('trip_recipient_name_field')), 'Dra. María González');
      await tester.enterText(find.byKey(const Key('trip_recipient_phone_field')), '89991234');
      await tester.pumpAndSettle();

      // Submit trip request
      await tester.tap(find.byKey(const Key('submit_trip_request_button')));
      await tester.pumpAndSettle();

      // Verify trip created
      expect(createdTripId, equals('TRIP-EXP-777'));
      expect(mockTripService.lastCreatedPayload, isNotNull);
      final payload = mockTripService.lastCreatedPayload!;
      expect(payload['serviceType'], equals('X_TO_Y_DELIVERY'));
      expect(payload['totalPrice'], equals(95.0));
      expect(payload['packageDescription'], equals('Documentos legales'));
      expect(payload['recipientPhone'], equals('89991234'));
      expect(payload['pricingSnapshot'], isNotNull);
      expect(payload['pricingSnapshot']['baseFee'], equals(35.0));
      expect(payload['pricingSnapshot']['pricePerKm'], equals(10.0));

      mockTripService.dispose();
    });
  });

  group('BLOQUE 3 — Subtask 3: TripLiveTrackingScreen Stepper & GPS Telemetry', () {
    testWidgets('Renders status stepper, courier card, and live GPS telemetry', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const trip = TripEntity(
        tripId: 'TRIP-TRACK-101',
        tenantId: 'ten_core',
        customerId: 'cust_01',
        assignedCourierId: 'courier_007',
        origin: LocationPoint(
          address: 'Metrocentro Managua',
          latitude: 12.1364,
          longitude: -86.2514,
        ),
        destination: LocationPoint(
          address: 'Invercasa Managua',
          latitude: 12.1150,
          longitude: -86.2710,
        ),
        distanceKm: 3.5,
        basePrice: 35.0,
        distancePrice: 35.0,
        totalPrice: 70.0,
        status: TripStatus.assigned,
        packageDescription: 'Caja con medicamentos',
        createdAt: 1000,
        updatedAt: 1000,
      );

      final mockTripService = MockTripService(initialTrips: [trip]);
      final mockFleetService = MockFleetService();

      await tester.pumpWidget(
        MaterialApp(
          home: TripLiveTrackingScreen(
            tripId: 'TRIP-TRACK-101',
            tripService: mockTripService,
            fleetService: mockFleetService,
            initialTrip: trip,
            onBack: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Header, Stepper, and Addresses
      expect(find.text('Progreso del Envío'), findsOneWidget);
      expect(find.text('Metrocentro Managua'), findsOneWidget);
      expect(find.text('Invercasa Managua'), findsOneWidget);
      expect(find.text('Tarifa ADR-026 Oficial'), findsOneWidget);
      expect(find.text('C\$ 70.00'), findsOneWidget);
      expect(find.text('Motorizado Asignado'), findsOneWidget);

      // Emit live courier location telemetry
      mockFleetService.emitLocation(
        const CourierLocationEntity(
          courierId: 'courier_007',
          latitude: 12.1300,
          longitude: -86.2550,
          speed: 10.0, // 36 km/h
          timestamp: 2000,
          isOnline: true,
        ),
      );
      await tester.pumpAndSettle();

      // Verify live telemetry rendered
      expect(find.byKey(const Key('courier_coordinates_badge')), findsOneWidget);
      expect(find.text('Coordenadas: 12.1300, -86.2550'), findsOneWidget);
      expect(find.text('36 km/h'), findsOneWidget);

      mockTripService.dispose();
      mockFleetService.dispose();
    });
  });

  group('BLOQUE 3 — Subtask 4: TripsScreen List, C\$ Formatting & Navigation', () {
    testWidgets('Lists trips with C\$ currency, allows tap to track and FAB to request', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const customer = UserProfileEntity(
        uid: 'user_cust_trips',
        email: 'cust@bsd.com',
        displayName: 'Elena Rostrán',
        role: EiamRole.client,
        isVerified: true,
        createdAt: 0,
        updatedAt: 0,
      );

      final sessionState = DummySessionState(
        user: customer,
        claims: const CanonicalCustomClaimsV3(role: EiamRole.client, tenantId: 'ten_core'),
      );

      const existingTrip = TripEntity(
        tripId: 'TRIP-HIST-01',
        tenantId: 'ten_core',
        customerId: 'user_cust_trips',
        assignedCourierId: 'courier_007',
        origin: LocationPoint(address: 'Galerías Santo Domingo', latitude: 12.105, longitude: -86.248),
        destination: LocationPoint(address: 'Plaza España', latitude: 12.132, longitude: -86.280),
        distanceKm: 4.8,
        basePrice: 35.0,
        distancePrice: 48.0,
        totalPrice: 83.0,
        status: TripStatus.goodsPickedUp,
        createdAt: 1000,
        updatedAt: 1000,
      );

      final mockTripService = MockTripService(initialTrips: [existingTrip]);
      final mockFleetService = MockFleetService();
      final mockUserService = MockUserService();

      await tester.pumpWidget(
        MaterialApp(
          home: TripsScreen(
            sessionState: sessionState,
            tripService: mockTripService,
            fleetService: mockFleetService,
            userService: mockUserService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify trip card rendered with canonical C$ currency
      expect(find.text('Envíos X→Y'), findsOneWidget);
      expect(find.text('Galerías Santo Domingo'), findsOneWidget);
      expect(find.text('Plaza España'), findsOneWidget);
      expect(find.text('C\$ 83.00'), findsOneWidget);

      // Verify FAB to request new trip is present
      expect(find.byKey(const Key('create_new_trip_fab')), findsOneWidget);

      // Tap trip card to navigate to TripLiveTrackingScreen
      await tester.tap(find.byKey(const Key('trip_card_TRIP-HIST-01')));
      await tester.pumpAndSettle();

      expect(find.text('Progreso del Envío'), findsOneWidget);
      expect(find.text('Motorizado Asignado'), findsOneWidget);

      mockTripService.dispose();
      mockFleetService.dispose();
    });
  });
}
