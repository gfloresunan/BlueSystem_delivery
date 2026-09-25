/// BLUE SYSTEM DELIVERY ENTERPRISE — FLUTTER CLIENT ENTRYPOINT v2.2 (C2D.26)
/// Commercial Multi-Platform Client Layer over BlueSystem Core.

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';

import 'core/brand/brand_context.dart';
import 'core/observability/app_logger.dart';
import 'data/services/firestore_operations_service.dart';
import 'data/services/firebase_auth_service.dart';
import 'data/services/firestore_platform_service.dart';
import 'data/services/merchant_service.dart';
import 'data/services/banner_service.dart';
import 'data/services/courier_cash_closure_service.dart';
import 'presentation/providers/session_state.dart';
import 'presentation/screens/shell/app_shell.dart';
import 'presentation/theme/brand_theme_builder.dart';

import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  AppLogger.info('Main', 'Initializing BlueSystem Delivery Commercial Flutter Client v2.2 (Track B iOS/Multiplatform)');

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    AppLogger.info('Main', 'Firebase initialized successfully for platform');
  } catch (e) {
    AppLogger.error('Main', 'Firebase initialization failed', e);
  }

  runApp(const BlueSystemDeliveryApp());
}

class BlueSystemDeliveryApp extends StatefulWidget {
  const BlueSystemDeliveryApp({super.key});

  @override
  State<BlueSystemDeliveryApp> createState() => _BlueSystemDeliveryAppState();
}

class _BlueSystemDeliveryAppState extends State<BlueSystemDeliveryApp> {
  late final FirestoreOperationsService _firestoreOps;
  late final FirebaseAuthService _authService;
  late final FirestorePlatformService _platformService;
  late final MerchantFirestoreService _merchantService;
  late final BannerFirestoreService _bannerService;
  late final CourierCashClosureService _cashClosureService;
  late final SessionState _sessionState;

  @override
  void initState() {
    super.initState();

    _firestoreOps = FirestoreOperationsService();
    _authService = FirebaseAuthService();
    _platformService = FirestorePlatformService();
    _merchantService = MerchantFirestoreService();
    _bannerService = BannerFirestoreService();
    _cashClosureService = CourierCashClosureService();

    _sessionState = SessionState(
      authService: _authService,
      tenantService: _platformService,
      brandService: _platformService,
      subscriptionService: _platformService,
      appConfigService: _platformService,
    );

    // Restore session on startup
    _sessionState.initializeSession();
  }

  @override
  void dispose() {
    _sessionState.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Dynamic brand theme — updates reactively when brand is hydrated
    return ListenableBuilder(
      listenable: _sessionState,
      builder: (context, _) {
        final visualConfig = _sessionState.activeBrand?.visual ?? BrandVisualConfig.fallback;
        final theme = BrandThemeBuilder.buildTheme(visualConfig);
        final darkTheme = BrandThemeBuilder.buildDarkTheme(visualConfig);

        return MaterialApp(
          title: _sessionState.activeBrand?.displayName ?? 'BlueSystem Delivery',
          debugShowCheckedModeBanner: false,
          theme: theme,
          darkTheme: darkTheme,
          themeMode: ThemeMode.light,
          home: AppShell(
            sessionState: _sessionState,
            orderService: _firestoreOps,
            tripService: _firestoreOps,
            fleetService: _firestoreOps,
            merchantService: _merchantService,
            bannerService: _bannerService,
            cashClosureService: _cashClosureService,
          ),
        );
      },
    );
  }
}
