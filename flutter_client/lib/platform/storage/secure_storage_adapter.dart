/// BLUE SYSTEM DELIVERY ENTERPRISE — SECURE STORAGE ADAPTER
/// Encrypted keystore storage for tokens, session credentials and active tenant.

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/observability/app_logger.dart';

abstract class ISecureStorage {
  Future<void> write(String key, String value);
  Future<String?> read(String key);
  Future<void> delete(String key);
  Future<void> deleteAll();
}

class PlatformSecureStorage implements ISecureStorage {
  final FlutterSecureStorage _storage;

  PlatformSecureStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
        );

  @override
  Future<void> write(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (e, st) {
      AppLogger.error('PlatformSecureStorage', 'Error writing key: $key', e, st);
    }
  }

  @override
  Future<String?> read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e, st) {
      AppLogger.error('PlatformSecureStorage', 'Error reading key: $key', e, st);
      return null;
    }
  }

  @override
  Future<void> delete(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (e, st) {
      AppLogger.error('PlatformSecureStorage', 'Error deleting key: $key', e, st);
    }
  }

  @override
  Future<void> deleteAll() async {
    try {
      await _storage.deleteAll();
    } catch (e, st) {
      AppLogger.error('PlatformSecureStorage', 'Error clearing storage', e, st);
    }
  }
}
