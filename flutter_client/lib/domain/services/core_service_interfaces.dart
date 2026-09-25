/// BLUE SYSTEM DELIVERY ENTERPRISE — CORE SERVICE INTERFACES
/// Clean Architecture Domain Service Contracts consuming the Backend Core.

import '../../core/auth/auth_context.dart';
import '../../core/brand/brand_context.dart';
import '../../core/config/app_config.dart';
import '../../core/gatekeeper/gatekeeper.dart';
import '../../core/subscription/subscription_context.dart';
import '../../core/tenant/tenant_context.dart';
import '../entities/banner_entity.dart';
import '../entities/catalog_entity.dart';
import '../entities/courier_location_entity.dart';
import '../entities/order_entity.dart';
import '../entities/trip_entity.dart';
import '../entities/user_profile_entity.dart';

abstract class IBannerService {
  Stream<List<BannerEntity>> watchActiveBanners();
  Future<List<BannerEntity>> getActiveBanners();
}

abstract class IAuthService {
  Stream<UserProfileEntity?> get authStateChanges;
  Future<UserProfileEntity?> getCurrentUser();
  Future<CanonicalCustomClaimsV3?> getCustomClaims();
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password);
  Future<UserProfileEntity> registerWithEmailPassword({
    required String email,
    required String password,
    required String name,
    required String phone,
  });
  Future<UserProfileEntity> signInWithGoogleToken(String idToken, {String? accessToken});
  Future<UserProfileEntity> signInWithFacebookToken(String accessToken);
  Future<void> sendPasswordReset(String email);
  Future<void> signOut();
  Future<void> refreshIdToken();
}

abstract class ITenantService {
  Future<TenantEntity?> getTenantById(String tenantId);
  Stream<TenantEntity?> watchTenant(String tenantId);
}

abstract class IBrandService {
  Future<BrandEntity?> getBrandById(String brandId);
  Future<BrandEntity?> getPrimaryBrandForTenant(String tenantId);
  Stream<BrandEntity?> watchBrand(String brandId);
}

abstract class ISubscriptionService {
  Future<SubscriptionEntity?> getSubscriptionByTenantId(String tenantId);
  Stream<SubscriptionEntity?> watchSubscription(String tenantId);
}

abstract class IAppConfigService {
  Future<AppConfigEntity?> getAppConfigById(String configId);
  Future<AppConfigEntity?> resolveActiveConfig({
    required String tenantId,
    required String brandId,
    required PlatformType platform,
    required EnvironmentType environment,
  });
}

abstract class IGatekeeperService {
  AccessDecision evaluateAccess({
    required GatekeeperContext context,
    required String moduleKey,
  });
}

abstract class IOrderService {
  Future<OrderEntity?> getOrderById(String orderId);
  Stream<OrderEntity?> watchOrder(String orderId);
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId});
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId});
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId});
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId});
  Future<String> createOrder(Map<String, dynamic> orderData);
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName);
  Future<void> updateOrderStatus(String orderId, OrderStatus status);
}

abstract class ITripService {
  Future<TripEntity?> getTripById(String tripId);
  Stream<TripEntity?> watchTrip(String tripId);
  Stream<List<TripEntity>> watchCustomerTrips(String customerId, {required String tenantId});
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId});
  Stream<List<TripEntity>> watchEligibleTrips({required String tenantId});
  Future<String> createTrip(Map<String, dynamic> tripData);
  Future<bool> claimTripAtomically(String tripId, String courierId, String courierName);
  Future<void> updateTripStatus(String tripId, TripStatus status);
}

abstract class IFleetService {
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId});
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry);
}

abstract class IMerchantService {
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId});
  Stream<BusinessEntity?> watchBusiness(String businessId);
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId});
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId});
  Future<List<ProductEntity>> getProductsForBusiness(String businessId, {required String tenantId});
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId});
  Stream<List<CategoryEntity>> watchCategories({required String tenantId});
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId});
}

abstract class ILocationService {
  Future<LocationPoint> getCurrentDeviceLocation();
  Stream<LocationPoint> get livePositionStream;
  Future<bool> checkLocationPermission();
  Future<bool> requestLocationPermission();
}

abstract class INotificationService {
  Future<String?> getDeviceToken();
  Future<void> registerDeviceToken({
    required String uid,
    required String token,
    String? role,
    String? deviceId,
  });
  Stream<Map<String, dynamic>> get onNotificationReceived;
  void handleDeepLink(Map<String, dynamic> data);
}

abstract class IStorageService {
  Future<String> uploadFile({
    required String localPath,
    required String destinationPath,
    required String tenantId,
  });
}

abstract class IMapsService {
  Future<double> calculateRouteDistance(LocationPoint origin, LocationPoint destination);
  Future<List<LocationPoint>> getRoutePolyline(LocationPoint origin, LocationPoint destination);
}
