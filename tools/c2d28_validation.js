/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE C2D.28 VALIDATION SUITE
 * Protocol ID: BSD-C2D28-CONTROLLED-MULTIPLATFORM-EXTERNAL-PROVISIONING-BUILD-READINESS-001
 * 
 * Execution Mode: FORENSIC / CONTROLLED PROVISIONING / ZERO BUILD
 * Strictly verifies integrity, zero-build invariant, and external gap states.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('══════════════════════════════════════════════════════════════════════════════');
console.log('   BSD PHASE C2D.28 — CONTROLLED MULTI-PLATFORM PROVISIONING & READINESS');
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
// 1. ZERO ACCIDENTAL BUILD INVARIANT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D28-BLD-001: Zero Flutter build outputs & Zero IPA/AAB artifacts', () => {
  const flutterDir = path.join(rootDir, 'flutter_client');
  const flutterAndroid = path.join(flutterDir, 'android');
  const flutterIos = path.join(flutterDir, 'ios');
  const flutterBuild = path.join(flutterDir, 'build');

  assert(!fs.existsSync(flutterAndroid), 'flutter_client/android host must remain deferred (zero-build invariant)');
  assert(!fs.existsSync(flutterIos), 'flutter_client/ios host must remain deferred (zero-build invariant)');
  assert(!fs.existsSync(flutterBuild), 'flutter_client/build directory must not exist');
});

runTest('C2D28-BLD-002: Zero unauthorized APKs or release artifacts generated', () => {
  // Check that no IPA or AAB files exist anywhere in workspace
  function scanExt(dir, exts) {
    if (!fs.existsSync(dir)) return [];
    let hits = [];
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === 'node_modules' || f === '.git') continue;
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        hits = hits.concat(scanExt(fp, exts));
      } else {
        const ext = path.extname(f).toLowerCase();
        if (exts.includes(ext)) {
          hits.push(fp);
        }
      }
    }
    return hits;
  }

  const forbiddenFiles = scanExt(path.join(rootDir, 'flutter_client'), ['.apk', '.aab', '.ipa']);
  assert.strictEqual(forbiddenFiles.length, 0, 'No build outputs permitted in flutter_client');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRACK A ARCHITECTURAL PROTECTION
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D28-TRK-001: Track A native Android client protection & build file integrity', () => {
  const appGradle = path.join(rootDir, 'app', 'build.gradle.kts');
  const appManifest = path.join(rootDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  const appGoogleServices = path.join(rootDir, 'app', 'google-services.json');

  assert(fs.existsSync(appGradle), 'app/build.gradle.kts must exist');
  assert(fs.existsSync(appManifest), 'app Manifest must exist');
  assert(fs.existsSync(appGoogleServices), 'app google-services.json must exist');

  // Verify reference package in Track A
  const gsContent = JSON.parse(fs.readFileSync(appGoogleServices, 'utf8'));
  assert.strictEqual(gsContent.project_info.project_id, 'bluesystem-7c9af', 'Project ID must be bluesystem-7c9af');
  const clientPackages = gsContent.client.map(c => c.client_info.android_client_info.package_name);
  assert(clientPackages.includes('com.aistudio.delivery.djweq'), 'Reference package com.aistudio.delivery.djweq must be present');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. BLUE SYSTEM CORE & TENANT CEILING INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D28-COR-001: Firestore Rules & Cloud Functions SSOT protection', () => {
  const rulesPath = path.join(rootDir, 'firestore.rules');
  const fnPath = path.join(rootDir, 'functions', 'src', 'index.ts');

  assert(fs.existsSync(rulesPath), 'firestore.rules must exist');
  assert(fs.existsSync(fnPath), 'functions/src/index.ts must exist');

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  assert(rulesContent.includes('function getTenantId()'), 'Must contain getTenantId() helper');
  assert(rulesContent.includes('match /orders/{orderId}'), 'Must govern /orders collection');
  assert(rulesContent.includes('match /deliveryTrips/{tripId}'), 'Must govern /deliveryTrips collection');
});

runTest('C2D28-TNT-001: Tenant 04 strictly ABSENT and LOCKED across system', () => {
  const rulesContent = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');
  assert(!rulesContent.includes('tenant_04') && !rulesContent.includes('tenant-04'), 'Tenant 04 must never be referenced in rules');

  const appConfigPath = path.join(rootDir, 'flutter_client', 'lib', 'core', 'config', 'app_config.dart');
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
  assert(!appConfigContent.includes('tenant_04'), 'Tenant 04 must not be in app_config.dart');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FLUTTER TRACK B ARCHITECTURE & SECURITY
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D28-FLT-001: Multiplatform Clean Architecture in flutter_client/lib', () => {
  const requiredModules = [
    'core/auth/auth_context.dart',
    'core/brand/brand_context.dart',
    'core/config/app_config.dart',
    'core/gatekeeper/gatekeeper.dart',
    'core/observability/app_logger.dart',
    'core/subscription/subscription_context.dart',
    'core/tenant/tenant_context.dart',
    'data/services/cloud_functions_service.dart',
    'data/services/firestore_operations_service.dart',
    'domain/entities/order_entity.dart',
    'domain/entities/trip_entity.dart',
    'platform/gps/gps_adapter.dart',
    'platform/maps/map_platform_adapter.dart',
    'platform/notifications/notification_adapter.dart',
    'platform/storage/secure_storage_adapter.dart',
  ];

  for (const mod of requiredModules) {
    const fullPath = path.join(rootDir, 'flutter_client', 'lib', mod);
    assert(fs.existsSync(fullPath), `Module flutter_client/lib/${mod} must exist`);
  }
});

runTest('C2D28-SEC-001: Zero hardcoded secrets, API keys or signing keys in Dart codebase', () => {
  function scanDartFiles(dir) {
    let files = [];
    const entries = fs.readdirSync(dir);
    for (const e of entries) {
      const fp = path.join(dir, e);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        files = files.concat(scanDartFiles(fp));
      } else if (e.endsWith('.dart')) {
        files.push(fp);
      }
    }
    return files;
  }

  const dartFiles = scanDartFiles(path.join(rootDir, 'flutter_client', 'lib'));
  const keyRegex = /AIza[0-9A-Za-z-_]{35}/;
  const p8Regex = /-----BEGIN PRIVATE KEY-----/;

  for (const df of dartFiles) {
    const content = fs.readFileSync(df, 'utf8');
    assert(!keyRegex.test(content), `Found hardcoded Google API Key in ${df}`);
    assert(!p8Regex.test(content), `Found private key content in ${df}`);
    assert(!content.includes('BEGIN RSA PRIVATE KEY'), `Found RSA private key in ${df}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXTERNAL PROVISIONING GAPS FORENSIC VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D28-GAP-001: Forensic status verification of external gaps (Fail-Closed)', () => {
  // GAP-01: Secondary packages not in google-services.json
  const gsContent = JSON.parse(fs.readFileSync(path.join(rootDir, 'app', 'google-services.json'), 'utf8'));
  const packages = gsContent.client.map(c => c.client_info.android_client_info.package_name);
  assert(!packages.includes('com.bluesystem.delivery'), 'com.bluesystem.delivery must not be artificially injected');
  assert(!packages.includes('com.fitoni.delivery'), 'com.fitoni.delivery must not be artificially injected');

  // GAP-02: GoogleService-Info.plist must NOT exist synthetically
  const plistPath = path.join(rootDir, 'flutter_client', 'GoogleService-Info.plist');
  const iosPlistPath = path.join(rootDir, 'flutter_client', 'ios', 'Runner', 'GoogleService-Info.plist');
  assert(!fs.existsSync(plistPath), 'GoogleService-Info.plist must not be synthetically injected in flutter_client root');
  assert(!fs.existsSync(iosPlistPath), 'GoogleService-Info.plist must not be synthetically injected in flutter_client/ios');

  // GAP-MAPS-02: MapPlatformAdapter must have SentinelMapAdapter fail-safe
  const mapsAdapterPath = path.join(rootDir, 'flutter_client', 'lib', 'platform', 'maps', 'map_platform_adapter.dart');
  const mapsContent = fs.readFileSync(mapsAdapterPath, 'utf8');
  assert(mapsContent.includes('class SentinelMapAdapter'), 'SentinelMapAdapter must exist as fail-safe');
});

console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
console.log(`   BSD C2D.28 VALIDATION COMPLETE: ${passCount}/${totalTests} TESTS PASSED (100%)`);
console.log(`   BUILD INVARIANT CERTIFIED: ZERO BUILDS, ZERO ARTIFACTS`);
console.log(`══════════════════════════════════════════════════════════════════════════════\n`);
