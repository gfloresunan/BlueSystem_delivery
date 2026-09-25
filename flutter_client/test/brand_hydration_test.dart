/// BLUE SYSTEM DELIVERY ENTERPRISE — BRAND & APP CONFIG UNIT TESTS
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';

void main() {
  group('Brand Context and Hydration Tests', () {
    test('Hydrates BrandVisualConfig with safe fallbacks when fields are missing or invalid', () {
      final config = BrandVisualConfig.fromMap({
        'primaryColor': 'invalid_color',
        'secondaryColor': '#2979FF',
      });

      expect(config.primaryColor, BrandVisualConfig.fallback.primaryColor);
      expect(config.secondaryColor, '#2979FF');
      expect(config.backgroundColor, BrandVisualConfig.fallback.backgroundColor);
      expect(config.fontFamily, 'Inter');
    });

    test('Serializes and deserializes BrandEntity accurately', () {
      const brand = BrandEntity(
        brandId: 'brand_fitoni',
        tenantId: 'tenant_001',
        displayName: 'Fitoni Express',
        shortName: 'Fitoni',
        slug: 'fitoni-express',
        visual: BrandVisualConfig.fallback,
        metadata: BrandMetadata(
          supportEmail: 'fitoni@example.com',
          supportPhone: '+525512345678',
        ),
        status: BrandStatus.active,
        schemaVersion: '1.0',
        createdAt: 123456,
        updatedAt: 123456,
        createdBy: 'admin',
        updatedBy: 'admin',
      );

      final map = brand.toMap();
      final deserialized = BrandEntity.fromMap(map);

      expect(deserialized.brandId, 'brand_fitoni');
      expect(deserialized.tenantId, 'tenant_001');
      expect(deserialized.displayName, 'Fitoni Express');
      expect(deserialized.status, BrandStatus.active);
    });
  });

  group('AppConfig Entity Tests', () {
    test('Parses AppConfigEntity accurately from backend Firestore payload', () {
      final map = {
        'configId': 'cfg_001',
        'tenantId': 'tenant_001',
        'brandId': 'brand_001',
        'platform': 'ANDROID',
        'environment': 'PRODUCTION',
        'distribution': {
          'appName': 'Fitoni Delivery',
          'shortName': 'Fitoni',
          'applicationId': 'com.fitoni.delivery',
          'versionName': '2.2.0',
          'buildNumber': 100,
        },
        'providers': {
          'firebaseProjectId': 'bluesystem-7c9af',
          'firebaseAppId': '1:12345:android:67890',
          'mapsApiKey': 'AIzaSyTestKey123',
        },
        'featureFlags': {
          'enableAiAssistant': true,
          'enableRealRouting': true,
        },
        'status': 'ACTIVE',
        'schemaVersion': '1.0',
        'createdAt': 1000,
        'updatedAt': 2000,
      };

      final config = AppConfigEntity.fromMap(map);

      expect(config.configId, 'cfg_001');
      expect(config.platform, PlatformType.android);
      expect(config.environment, EnvironmentType.production);
      expect(config.distribution.applicationId, 'com.fitoni.delivery');
      expect(config.providers.firebaseProjectId, 'bluesystem-7c9af');
      expect(config.featureFlags['enableAiAssistant'], isTrue);
      expect(config.status, AppConfigStatus.active);
    });
  });
}
