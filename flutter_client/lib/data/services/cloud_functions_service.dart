/// BLUE SYSTEM DELIVERY ENTERPRISE — CLOUD FUNCTIONS CALLABLE CLIENT
/// Typesafe callable client for backend business logic.

import 'package:cloud_functions/cloud_functions.dart';

import '../../core/errors/app_exceptions.dart';
import '../../core/observability/app_logger.dart';

class CloudFunctionsService {
  final FirebaseFunctions _functions;

  CloudFunctionsService({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  /// Calls backend `switchActiveTenantContext` (EIAM v3)
  /// Backend strictly expects `targetMembershipId` under zero-trust contract.
  Future<Map<String, dynamic>> switchTenantContext({
    required String targetMembershipId,
  }) async {
    try {
      final callable = _functions.httpsCallable('switchActiveTenantContext');
      final result = await callable.call<Map<String, dynamic>>({
        'targetMembershipId': targetMembershipId,
      });
      return result.data;
    } on FirebaseFunctionsException catch (e) {
      AppLogger.error('CloudFunctionsService', 'switchActiveTenantContext failed', e);
      throw BlueSystemException(
        code: ErrorCode.permissionDenied,
        message: e.message ?? 'Error al cambiar contexto de tenant.',
        technicalDetails: e.code,
      );
    }
  }

  /// Validates a promotional coupon against authoritative backend engine
  Future<Map<String, dynamic>> validateCoupon({
    required String code,
    required String tenantId,
    required double orderTotal,
  }) async {
    try {
      final callable = _functions.httpsCallable('validateCouponCode');
      final result = await callable.call<Map<String, dynamic>>({
        'code': code,
        'tenantId': tenantId,
        'orderTotal': orderTotal,
      });
      return result.data;
    } on FirebaseFunctionsException catch (e) {
      AppLogger.warn('CloudFunctionsService', 'Coupon validation rejected: ${e.message}');
      throw BlueSystemException(
        code: ErrorCode.invalidArgument,
        message: e.message ?? 'Cupón inválido o expirado.',
        technicalDetails: e.code,
      );
    }
  }

  /// Calculates authoritative delivery route (Distance / Matrix)
  Future<Map<String, dynamic>> calculateDeliveryRoute({
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
    required String tenantId,
  }) async {
    try {
      final callable = _functions.httpsCallable('calculateDeliveryRouteCallable');
      final result = await callable.call<Map<String, dynamic>>({
        'origin': {'lat': originLat, 'lng': originLng},
        'destination': {'lat': destLat, 'lng': destLng},
        'tenantId': tenantId,
      });
      return result.data;
    } on FirebaseFunctionsException catch (e) {
      AppLogger.error('CloudFunctionsService', 'calculateDeliveryRoute failed', e);
      throw BlueSystemException(
        code: ErrorCode.serverInternalError,
        message: e.message ?? 'Error al calcular ruta de entrega.',
      );
    }
  }
}
