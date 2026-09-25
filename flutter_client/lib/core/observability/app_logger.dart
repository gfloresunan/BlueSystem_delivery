/// BLUE SYSTEM DELIVERY ENTERPRISE — OBSERVABILITY & AUDIT LOGGER
/// Structured, safe, PII-sanitized logging abstraction for Flutter.

import 'dart:developer' as developer;

enum LogLevel { debug, info, warning, error, audit }

class AppLogger {
  static bool enableDebug = true;

  static void log({
    required LogLevel level,
    required String tag,
    required String message,
    Map<String, dynamic>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    if (level == LogLevel.debug && !enableDebug) return;

    final sanitizedContext = _sanitizeContext(context);
    final logPayload = {
      'level': level.name.toUpperCase(),
      'tag': tag,
      'message': message,
      'timestamp': DateTime.now().toIso8601String(),
      if (sanitizedContext.isNotEmpty) 'context': sanitizedContext,
      if (error != null) 'error': error.toString(),
    };

    developer.log(
      '[$tag] ${level.name.toUpperCase()}: $message | $logPayload',
      name: 'BlueSystemFlutter',
      error: error,
      stackTrace: stackTrace,
    );
  }

  static void debug(String tag, String message, [Map<String, dynamic>? ctx]) =>
      log(level: LogLevel.debug, tag: tag, message: message, context: ctx);

  static void info(String tag, String message, [Map<String, dynamic>? ctx]) =>
      log(level: LogLevel.info, tag: tag, message: message, context: ctx);

  static void warn(String tag, String message, [Map<String, dynamic>? ctx]) =>
      log(level: LogLevel.warning, tag: tag, message: message, context: ctx);

  static void warning(String tag, String message, [Map<String, dynamic>? ctx]) =>
      warn(tag, message, ctx);

  static void error(String tag, String message, [Object? err, StackTrace? st, Map<String, dynamic>? ctx]) =>
      log(level: LogLevel.error, tag: tag, message: message, context: ctx, error: err, stackTrace: st);

  static void audit(String tag, String action, {required String tenantId, required String uid, Map<String, dynamic>? ctx}) =>
      log(
        level: LogLevel.audit,
        tag: tag,
        message: 'AUDIT: $action',
        context: {
          'tenantId': tenantId,
          'uid': uid,
          if (ctx != null) ...ctx,
        },
      );

  static Map<String, dynamic> _sanitizeContext(Map<String, dynamic>? ctx) {
    if (ctx == null) return {};
    final sanitized = <String, dynamic>{};
    final sensitiveKeys = {'password', 'token', 'secret', 'apikey', 'cardnumber', 'cvv', 'pin'};

    ctx.forEach((key, value) {
      if (sensitiveKeys.contains(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }
}
