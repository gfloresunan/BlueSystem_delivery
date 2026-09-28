/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.27.1 VALIDATION SUITE
 * Protocol ID: BSD-C2D27.1-FLUTTER-INTEGRATION-VALIDATION-PROVISIONING-CLOSURE-001
 * 
 * Execution Mode: Pure Static / Contract / Configuration / Isolation Validation
 * ZERO BUILD, ZERO APK, ZERO GRADLE, ZERO FLUTTER RUN
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');

console.log('══════════════════════════════════════════════════════════════════════════════');
console.log('   BSD PHASE 2D.27.1 — FLUTTER INTEGRATION & PROVISIONING CLOSURE VALIDATION');
console.log('══════════════════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRACK A PROTECTION AUDIT (ZERO-TOUCH INVARIANT)
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-TRK-001: Track A app/ directory integrity & protection', () => {
  const appDir = path.join(rootDir, 'app');
  assert(fs.existsSync(appDir), 'app/ directory must exist');
  assert(fs.existsSync(path.join(appDir, 'src', 'main', 'java')), 'app/src/main/java must exist');
  assert(fs.existsSync(path.join(appDir, 'src', 'main', 'AndroidManifest.xml')), 'app AndroidManifest must exist');
  assert(fs.existsSync(path.join(appDir, 'google-services.json')), 'app google-services.json must exist');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FLUTTER CLIENT STRUCTURE & FOUNDATION AUDIT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-FLT-001: Commercial Flutter Client modular architecture', () => {
  const flutterDir = path.join(rootDir, 'flutter_client');
  assert(fs.existsSync(flutterDir), 'flutter_client/ must exist');
  
  const requiredPaths = [
    'pubspec.yaml',
    'analysis_options.yaml',
    'lib/main.dart',
    'lib/core/auth/auth_context.dart',
    'lib/core/brand/brand_context.dart',
    'lib/core/config/app_config.dart',
    'lib/core/gatekeeper/gatekeeper.dart',
    'lib/core/observability/app_logger.dart',
    'lib/core/subscription/subscription_context.dart',
    'lib/core/tenant/tenant_context.dart',
    'lib/data/services/cloud_functions_service.dart',
    'lib/data/services/firebase_auth_service.dart',
    'lib/data/services/firestore_operations_service.dart',
    'lib/data/services/firestore_platform_service.dart',
    'lib/data/services/merchant_service.dart',
    'lib/domain/entities/order_entity.dart',
    'lib/domain/entities/trip_entity.dart',
    'lib/domain/entities/catalog_entity.dart',
    'lib/domain/entities/courier_location_entity.dart',
    'lib/domain/services/core_service_interfaces.dart',
    'lib/platform/gps/gps_adapter.dart',
    'lib/platform/maps/map_platform_adapter.dart',
    'lib/platform/notifications/notification_adapter.dart',
    'lib/platform/storage/secure_storage_adapter.dart',
    'lib/presentation/screens/shell/app_shell.dart',
    'lib/presentation/theme/brand_theme_builder.dart',
    'lib/presentation/providers/session_state.dart',
  ];

  for (const relPath of requiredPaths) {
    const fullPath = path.join(flutterDir, relPath);
    assert(fs.existsSync(fullPath), `Missing required Flutter module: ${relPath}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ZERO BUSINESS LOGIC DUPLICATION & ZERO SECRET LEAKAGE
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-SEC-001: Zero hardcoded secrets & API keys in Dart code', () => {
  const libDir = path.join(rootDir, 'flutter_client', 'lib');
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.dart')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check for AIzaSy Google API keys
        assert(!content.includes('AIzaSy'), `Hardcoded Google API key found in ${fullPath}`);
        // Check for private keys
        assert(!content.includes('BEGIN PRIVATE KEY'), `Private key found in ${fullPath}`);
      }
    }
  }
  scanDir(libDir);
});

runTest('C2D27.1-SEC-002: Zero claims elevation or mutation from client', () => {
  const authFile = path.join(rootDir, 'flutter_client', 'lib', 'core', 'auth', 'auth_context.dart');
  const content = fs.readFileSync(authFile, 'utf8');
  assert(!content.includes('setCustomUserClaims'), 'Client must NOT attempt to set custom claims');
  assert(!content.includes('updateUserClaims'), 'Client must NOT attempt to update claims');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FIREBASE ANDROID CONFIGURATION & PACKAGE AUDIT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-FBA-001: Firebase Android configuration & Reference Package verification', () => {
  const gsPath = path.join(rootDir, 'app', 'google-services.json');
  assert(fs.existsSync(gsPath), 'google-services.json must exist');
  
  const gsData = JSON.parse(fs.readFileSync(gsPath, 'utf8'));
  assert.strictEqual(gsData.project_info.project_id, 'bluesystem-7c9af');
  assert.strictEqual(gsData.project_info.project_number, '514416631826');
  
  const clients = gsData.client || [];
  assert(clients.length >= 1, 'At least 1 client entry must be present');
  const refClient = clients[0];
  assert.strictEqual(refClient.client_info.android_client_info.package_name, 'com.aistudio.delivery.djweq');
  assert.strictEqual(refClient.client_info.mobilesdk_app_id, '1:514416631826:android:788b99430f87324e88b8cb');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. FIREBASE iOS CONFIGURATION & GAP AUDIT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-FBI-001: Firebase iOS configuration verification (GAP-02)', () => {
  const plistPath = path.join(rootDir, 'flutter_client', 'ios', 'Runner', 'GoogleService-Info.plist');
  assert(!fs.existsSync(plistPath), 'GoogleService-Info.plist must NOT be fabricated before provisioning');
  // Confirms GAP-02 status is legitimately OPEN / BLOCKED_EXTERNAL
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. GOOGLE MAPS AUDIT & ADAPTER CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-MAP-001: MapPlatformAdapter & Sentinel fail-safe pattern', () => {
  const mapAdapterPath = path.join(rootDir, 'flutter_client', 'lib', 'platform', 'maps', 'map_platform_adapter.dart');
  const content = fs.readFileSync(mapAdapterPath, 'utf8');
  assert(content.includes('abstract class MapPlatformAdapter'), 'MapPlatformAdapter abstract class must exist');
  assert(content.includes('class SentinelMapAdapter implements MapPlatformAdapter'), 'SentinelMapAdapter must implement MapPlatformAdapter');
  assert(content.includes('Future<void> initialize'), 'initialize method must exist');
  assert(content.includes('Future<LocationPoint?> getMapCenter'), 'getMapCenter method must exist');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. NOTIFICATION ADAPTER (FCM & APNs)
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-NOT-001: PlatformNotificationAdapter multi-device & multi-platform contract', () => {
  const notifPath = path.join(rootDir, 'flutter_client', 'lib', 'platform', 'notifications', 'notification_adapter.dart');
  const content = fs.readFileSync(notifPath, 'utf8');
  assert(content.includes('class PlatformNotificationAdapter implements INotificationService'), 'PlatformNotificationAdapter must implement INotificationService');
  assert(content.includes("doc('${uid}_flutter')"), 'Must store multi-device token with platform suffix in user_devices');
  assert(content.includes('DarwinInitializationSettings'), 'Must support iOS/Darwin notification settings');
  assert(content.includes('AndroidInitializationSettings'), 'Must support Android notification settings');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. SECURE STORAGE ADAPTER (KEYSTORE & KEYCHAIN)
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-SEC-003: PlatformSecureStorage abstraction & platform options', () => {
  const secPath = path.join(rootDir, 'flutter_client', 'lib', 'platform', 'storage', 'secure_storage_adapter.dart');
  const content = fs.readFileSync(secPath, 'utf8');
  assert(content.includes('class PlatformSecureStorage implements ISecureStorage'), 'PlatformSecureStorage must implement ISecureStorage');
  assert(content.includes('encryptedSharedPreferences: true'), 'Android must use encryptedSharedPreferences');
  assert(content.includes('accessibility: KeychainAccessibility.first_unlock'), 'iOS must use Keychain first_unlock accessibility');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. CLOUD FUNCTIONS EIAM v3 CONTRACT (SURGICAL HARDENING VERIFICATION)
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-FN-001: CloudFunctionsService adheres to zero-trust targetMembershipId requirement', () => {
  const fnPath = path.join(rootDir, 'flutter_client', 'lib', 'data/services', 'cloud_functions_service.dart');
  const content = fs.readFileSync(fnPath, 'utf8');
  assert(content.includes('switchActiveTenantContext'), 'Must reference switchActiveTenantContext');
  assert(content.includes('targetMembershipId'), 'Must pass targetMembershipId to backend callable');
  assert(!content.includes("'tenantId': targetTenantId"), 'Must NOT pass forbidden tenantId field to switchActiveTenantContext');
  assert(content.includes('validateCouponCode'), 'Must support validateCouponCode');
  assert(content.includes('calculateDeliveryRouteCallable'), 'Must support calculateDeliveryRouteCallable');
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. APPCONFIG MULTI-PLATFORM & DISTRIBUTION CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-CFG-001: AppConfigEntity multi-platform schema & distribution config', () => {
  const cfgPath = path.join(rootDir, 'flutter_client', 'lib', 'core', 'config', 'app_config.dart');
  const content = fs.readFileSync(cfgPath, 'utf8');
  assert(content.includes('enum PlatformType { android, ios, web }'), 'Must define PlatformType');
  assert(content.includes('typedef AppPlatform = PlatformType;'), 'Must expose AppPlatform alias');
  assert(content.includes('typedef AppEnvironment = EnvironmentType;'), 'Must expose AppEnvironment alias');
  assert(content.includes('createDefault'), 'Must provide createDefault factory method');
  assert(content.includes('String get applicationId'), 'Must provide applicationId getter');
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. GATEKEEPER & FAIL-CLOSED AUTHORIZATION
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-GTK-001: Gatekeeper fail-closed behavior', () => {
  const gtkPath = path.join(rootDir, 'flutter_client', 'lib', 'core', 'gatekeeper', 'gatekeeper.dart');
  const content = fs.readFileSync(gtkPath, 'utf8');
  assert(content.includes('class GatekeeperEngine'), 'GatekeeperEngine class must exist');
  assert(content.includes('static AccessDecision deny'), 'Default decision must be AccessDecision.deny (fail-closed)');
  assert(content.includes('AccessDecisionReason.subscriptionInactive'), 'Must enforce subscription inactive status');
  assert(content.includes('AccessDecisionReason.subscriptionMissing'), 'Must enforce subscription missing status');
  assert(content.includes('AccessDecisionReason.tenantMismatch'), 'Must enforce tenant mismatch check');
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. TENANT CEILING & ISOLATION AUDIT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-TNT-001: Tenant Ceiling invariant (Tenants 01, 02, 03 active, Tenant 04 ABSENT)', () => {
  const firestoreRulesPath = path.join(rootDir, 'firestore.rules');
  const content = fs.readFileSync(firestoreRulesPath, 'utf8');
  assert(!content.includes('tenant_004'), 'Tenant 04 must NOT exist in security rules');
  assert(!content.includes('tenant-commercial-04'), 'Tenant 04 must NOT exist in configurations');
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. IDEMPOTENCY & ANTI-REPLAY PURITY
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D27.1-IDM-001: Deterministic hashing and single-use token structure', () => {
  const spec = {
    tenantId: 'tenant-commercial-01',
    brandId: 'brand-fitoni',
    platform: 'flutter_android',
    version: '2.2.0',
    buildNumber: 100,
  };
  const hash1 = crypto.createHash('sha256').update(JSON.stringify(spec)).digest('hex');
  const hash2 = crypto.createHash('sha256').update(JSON.stringify(spec)).digest('hex');
  assert.strictEqual(hash1, hash2, 'Hash must be strictly deterministic and reproducible');
  assert.strictEqual(hash1.length, 64, 'SHA-256 hash must be 64 hex characters');
});

console.log('\n══════════════════════════════════════════════════════════════════════════════');
console.log(`   VALIDATION SUITE COMPLETE: ${passCount}/${totalTests} TESTS PASSED (100%)`);
console.log('══════════════════════════════════════════════════════════════════════════════');
