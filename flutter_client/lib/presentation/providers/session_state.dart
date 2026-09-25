/// BLUE SYSTEM DELIVERY ENTERPRISE — SESSION & APPLICATION STATE
/// Pure ChangeNotifier state container unifying Auth, Tenant, Brand, Subscription, and Gatekeeper.

import 'package:flutter/foundation.dart';

import '../../core/auth/auth_context.dart';
import '../../core/brand/brand_context.dart';
import '../../core/config/app_config.dart';
import '../../core/gatekeeper/gatekeeper.dart';
import '../../core/observability/app_logger.dart';
import '../../core/subscription/subscription_context.dart';
import '../../core/tenant/tenant_context.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

enum AuthStatus {
  uninitialized,
  authenticating,
  authenticated,
  unauthenticated,
  error,
}

class SessionState extends ChangeNotifier {
  final IAuthService _authService;
  final ITenantService _tenantService;
  final IBrandService _brandService;
  final ISubscriptionService _subscriptionService;
  final IAppConfigService _appConfigService;

  AuthStatus _status = AuthStatus.uninitialized;
  UserProfileEntity? _currentUser;
  CanonicalCustomClaimsV3? _claims;
  TenantEntity? _activeTenant;
  BrandEntity? _activeBrand;
  SubscriptionEntity? _activeSubscription;
  AppConfigEntity? _activeAppConfig;
  String? _errorMessage;
  bool _isOffline = false;

  SessionState({
    required IAuthService authService,
    required ITenantService tenantService,
    required IBrandService brandService,
    required ISubscriptionService subscriptionService,
    required IAppConfigService appConfigService,
  })  : _authService = authService,
        _tenantService = tenantService,
        _brandService = brandService,
        _subscriptionService = subscriptionService,
        _appConfigService = appConfigService;

  AuthStatus get status => _status;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  UserProfileEntity? get currentUser => _currentUser;
  CanonicalCustomClaimsV3? get claims => _claims;
  TenantEntity? get activeTenant => _activeTenant;
  BrandEntity? get activeBrand => _activeBrand;
  SubscriptionEntity? get activeSubscription => _activeSubscription;
  AppConfigEntity? get activeAppConfig => _activeAppConfig;
  String? get errorMessage => _errorMessage;
  bool get isOffline => _isOffline;
  bool get isGuestMode =>
      _currentUser == null ||
      _claims?.role == EiamRole.guest ||
      _status == AuthStatus.unauthenticated;

  GatekeeperContext? get gatekeeperContext {
    if (_currentUser == null || _claims == null) return null;
    return GatekeeperContext(
      uid: _currentUser!.uid,
      membershipId: _currentUser!.membershipId ?? '',
      tenantId: _claims!.tenantId ?? _activeTenant?.tenantId ?? '',
      brandId: _claims!.brandId ?? _activeBrand?.brandId,
      role: _claims!.role,
      subscription: _activeSubscription,
    );
  }

  void setOffline(bool offline) {
    if (_isOffline != offline) {
      _isOffline = offline;
      notifyListeners();
    }
  }

  Future<void> initializeSession() async {
    try {
      _status = AuthStatus.authenticating;
      notifyListeners();

      final user = await _authService.getCurrentUser();
      if (user != null) {
        await _hydrateSession(user);
      } else {
        _status = AuthStatus.unauthenticated;
        notifyListeners();
      }
    } catch (e, st) {
      AppLogger.error('SessionState', 'Failed initializing session', e, st);
      _status = AuthStatus.unauthenticated;
      notifyListeners();
    }
  }

  Future<void> signIn(String email, String password) async {
    try {
      _status = AuthStatus.authenticating;
      _errorMessage = null;
      notifyListeners();

      final user = await _authService.signInWithEmailPassword(email, password);
      await _hydrateSession(user);
    } catch (e, st) {
      AppLogger.error('SessionState', 'Sign in failed for $email', e, st);
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String name,
    required String phone,
  }) async {
    try {
      _status = AuthStatus.authenticating;
      _errorMessage = null;
      notifyListeners();

      final user = await _authService.registerWithEmailPassword(
        email: email,
        password: password,
        name: name,
        phone: phone,
      );
      await _hydrateSession(user);
    } catch (e, st) {
      AppLogger.error('SessionState', 'Registration failed for $email', e, st);
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signInWithGoogle(String idToken, {String? accessToken}) async {
    try {
      _status = AuthStatus.authenticating;
      _errorMessage = null;
      notifyListeners();

      final user = await _authService.signInWithGoogleToken(idToken, accessToken: accessToken);
      await _hydrateSession(user);
    } catch (e, st) {
      AppLogger.error('SessionState', 'Google sign in failed', e, st);
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signInWithFacebook(String accessToken) async {
    try {
      _status = AuthStatus.authenticating;
      _errorMessage = null;
      notifyListeners();

      final user = await _authService.signInWithFacebookToken(accessToken);
      await _hydrateSession(user);
    } catch (e, st) {
      AppLogger.error('SessionState', 'Facebook sign in failed', e, st);
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> sendPasswordReset(String email) async {
    await _authService.sendPasswordReset(email);
  }

  void requireLogin() {
    _status = AuthStatus.unauthenticated;
    _currentUser = null;
    _claims = null;
    notifyListeners();
  }

  Future<void> signOut() async {
    try {
      await _authService.signOut();
      _currentUser = null;
      _claims = null;
      _activeTenant = null;
      _activeBrand = null;
      _activeSubscription = null;
      _activeAppConfig = null;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
    } catch (e, st) {
      AppLogger.error('SessionState', 'Sign out error', e, st);
      _status = AuthStatus.unauthenticated;
      notifyListeners();
    }
  }

  void continueAsGuest() {
    _currentUser = null;
    _claims = const CanonicalCustomClaimsV3(
      role: EiamRole.guest,
      tenantId: 'ten_bluesystem_core',
    );
    _status = AuthStatus.authenticated;
    _errorMessage = null;
    AppLogger.info('SessionState', 'Continuing as Guest/Invitado in Commercial catalog');
    notifyListeners();
  }

  Future<void> _hydrateSession(UserProfileEntity user) async {
    _currentUser = user;
    final customClaims = await _authService.getCustomClaims();
    
    // Resolve effective role: Custom claims takes precedence, then Firestore user profile, then guest
    final effectiveRole = (customClaims?.role != null && customClaims!.role != EiamRole.guest)
        ? customClaims.role
        : (user.role != EiamRole.guest ? user.role : EiamRole.guest);

    final effectiveTenantId = customClaims?.tenantId ?? user.tenantId ?? 'ten_bluesystem_core';

    _claims = customClaims != null
        ? CanonicalCustomClaimsV3(
            role: effectiveRole,
            tenantId: effectiveTenantId,
            brandId: customClaims.brandId ?? user.brandId,
            orgId: customClaims.orgId,
            businessId: customClaims.businessId,
            branchId: customClaims.branchId,
            status: customClaims.status,
            eiamVer: customClaims.eiamVer,
          )
        : CanonicalCustomClaimsV3(
            role: effectiveRole,
            tenantId: effectiveTenantId,
            brandId: user.brandId,
          );

    final tenantId = _claims?.tenantId ?? effectiveTenantId;

    if (tenantId.isNotEmpty) {
      // 1. Hydrate Tenant
      _activeTenant = await _tenantService.getTenantById(tenantId);

      // 2. Hydrate Subscription
      _activeSubscription = await _subscriptionService.getSubscriptionByTenantId(tenantId);

      // 3. Hydrate Brand
      final brandId = _claims?.brandId;
      if (brandId != null && brandId.isNotEmpty) {
        _activeBrand = await _brandService.getBrandById(brandId);
      } else {
        _activeBrand = await _brandService.getPrimaryBrandForTenant(tenantId);
      }

      // 4. Hydrate AppConfig
      if (_activeBrand != null) {
        _activeAppConfig = await _appConfigService.resolveActiveConfig(
          tenantId: tenantId,
          brandId: _activeBrand!.brandId,
          platform: defaultTargetPlatform == TargetPlatform.iOS
              ? PlatformType.ios
              : PlatformType.android,
          environment: EnvironmentType.production,
        );
      }
    }

    _status = AuthStatus.authenticated;
    AppLogger.info('SessionState', 'Session hydrated successfully for UID: ${user.uid}, Role: ${_claims?.role.name}, Tenant: $tenantId');
    notifyListeners();
  }

  bool canAccess(String moduleKey) {
    final ctx = gatekeeperContext;
    if (ctx == null) return false;
    final decision = GatekeeperEngine.canAccessModule(
      context: ctx,
      moduleKey: moduleKey,
    );
    return decision.allowed;
  }
}
