/// BLUE SYSTEM DELIVERY ENTERPRISE — ERROR DOMAIN & EXCEPTIONS
/// Standardized error codes and safe exception wrapping without PII leaks.

enum ErrorCode {
  unauthenticated,
  permissionDenied,
  tenantIsolationViolation,
  brandIsolationViolation,
  gatekeeperAccessDenied,
  subscriptionExpired,
  quotaExceeded,
  resourceNotFound,
  invalidArgument,
  networkUnavailable,
  serverInternalError,
  platformCapabilityUnavailable,
}

class BlueSystemException implements Exception {
  final ErrorCode code;
  final String message;
  final String? technicalDetails;
  final DateTime timestamp;

  BlueSystemException({
    required this.code,
    required this.message,
    this.technicalDetails,
  }) : timestamp = DateTime.now();

  @override
  String toString() => 'BlueSystemException [$code]: $message';
}

class TenantIsolationException extends BlueSystemException {
  TenantIsolationException({
    required String attemptedTenantId,
    required String activeTenantId,
  }) : super(
          code: ErrorCode.tenantIsolationViolation,
          message: 'Acceso denegado por aislamiento estricto de Tenant.',
          technicalDetails: 'Active: $activeTenantId, Attempted: $attemptedTenantId',
        );
}

class BrandIsolationException extends BlueSystemException {
  BrandIsolationException({
    required String brandId,
    required String tenantId,
  }) : super(
          code: ErrorCode.brandIsolationViolation,
          message: 'La marca no pertenece al tenant activo.',
          technicalDetails: 'Brand: $brandId, Tenant: $tenantId',
        );
}

class GatekeeperDeniedException extends BlueSystemException {
  final String moduleKey;
  final String reason;

  GatekeeperDeniedException({
    required this.moduleKey,
    required this.reason,
  }) : super(
          code: ErrorCode.gatekeeperAccessDenied,
          message: 'Acceso denegado al módulo por directiva de Gatekeeper ($moduleKey).',
          technicalDetails: 'Module: $moduleKey, Reason: $reason',
        );
}

class SubscriptionExpiredException extends BlueSystemException {
  SubscriptionExpiredException(String subscriptionId)
      : super(
          code: ErrorCode.subscriptionExpired,
          message: 'La suscripción del comercio ha expirado o se encuentra inactiva.',
          technicalDetails: 'SubId: $subscriptionId',
        );
}

class PlatformCapabilityException extends BlueSystemException {
  PlatformCapabilityException({
    required String capability,
    required String reason,
  }) : super(
          code: ErrorCode.platformCapabilityUnavailable,
          message: 'La funcionalidad de plataforma no está disponible ($capability).',
          technicalDetails: 'Capability: $capability, Reason: $reason',
        );
}
