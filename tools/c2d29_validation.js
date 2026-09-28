/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE C2D.29 VALIDATION SUITE
 * Protocol ID: BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001
 * 
 * Execution Mode: FORENSIC / CONTROLLED / FAIL-CLOSED
 * Target: com.bluesystem.delivery.client (iOS Commercial Client)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('══════════════════════════════════════════════════════════════════════════════');
console.log('   BSD PHASE C2D.29 — iOS EXTERNAL PROVISIONING & APPLE READINESS AUDIT');
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
// 1. ZERO BUILD & ZERO HOST GENERATION FIREWALL
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D29-BLD-001: Zero Flutter iOS host generation & Zero build outputs', () => {
  const flutterDir = path.join(rootDir, 'flutter_client');
  const flutterIos = path.join(flutterDir, 'ios');
  const flutterBuild = path.join(flutterDir, 'build');

  assert(!fs.existsSync(flutterIos), 'flutter_client/ios host directory must NOT exist yet (deferred to C2D.29.1)');
  assert(!fs.existsSync(flutterBuild), 'flutter_client/build directory must NOT exist');
});

runTest('C2D29-BLD-002: Zero compiled artifacts (.ipa, .app, .apk, .aab) in workspace', () => {
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

  const forbiddenFiles = scanExt(path.join(rootDir, 'flutter_client'), ['.ipa', '.app', '.apk', '.aab']);
  assert.strictEqual(forbiddenFiles.length, 0, 'No build outputs permitted in flutter_client');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRACK A & CORE BACKEND ARCHITECTURAL PROTECTION
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D29-TRK-001: Track A native Android client integrity (app/) intact', () => {
  const appGradle = path.join(rootDir, 'app', 'build.gradle.kts');
  const appManifest = path.join(rootDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  const appGoogleServices = path.join(rootDir, 'app', 'google-services.json');

  assert(fs.existsSync(appGradle), 'app/build.gradle.kts must exist');
  assert(fs.existsSync(appManifest), 'app Manifest must exist');
  assert(fs.existsSync(appGoogleServices), 'app google-services.json must exist');

  const gsContent = JSON.parse(fs.readFileSync(appGoogleServices, 'utf8'));
  assert.strictEqual(gsContent.project_info.project_id, 'bluesystem-7c9af');
  const clientPackages = gsContent.client.map(c => c.client_info.android_client_info.package_name);
  assert(clientPackages.includes('com.aistudio.delivery.djweq'), 'Reference package must remain present');
});

runTest('C2D29-COR-001: Core SSOT rules & backend intact', () => {
  const rulesPath = path.join(rootDir, 'firestore.rules');
  const fnPath = path.join(rootDir, 'functions', 'src', 'index.ts');

  assert(fs.existsSync(rulesPath), 'firestore.rules must exist');
  assert(fs.existsSync(fnPath), 'functions/src/index.ts must exist');

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  assert(rulesContent.includes('function getTenantId()'), 'Must contain getTenantId()');
  assert(rulesContent.includes('match /orders/{orderId}'), 'Must govern /orders');
  assert(rulesContent.includes('match /deliveryTrips/{tripId}'), 'Must govern /deliveryTrips');
});

runTest('C2D29-TNT-001: Tenant 04 strictly ABSENT and LOCKED', () => {
  const rulesContent = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');
  assert(!rulesContent.includes('tenant_04') && !rulesContent.includes('tenant-04'));

  const appConfigPath = path.join(rootDir, 'flutter_client', 'lib', 'core', 'config', 'app_config.dart');
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
  assert(!appConfigContent.includes('tenant_04'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SECURITY & SECRETS SCAN
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D29-SEC-001: Zero hardcoded secrets, private keys or .p8 in flutter_client', () => {
  function scanFiles(dir) {
    let hits = [];
    const entries = fs.readdirSync(dir);
    for (const e of entries) {
      const fp = path.join(dir, e);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        hits = hits.concat(scanFiles(fp));
      } else {
        if (e.endsWith('.p8') || e.endsWith('.keystore') || e.endsWith('.jks')) {
          hits.push(`Secret binary file: ${fp}`);
        }
        if (e.endsWith('.dart') || e.endsWith('.yaml')) {
          const content = fs.readFileSync(fp, 'utf8');
          if (/AIza[0-9A-Za-z-_]{35}/.test(content)) hits.push(`Google API Key in ${fp}`);
          if (/-----BEGIN PRIVATE KEY-----/.test(content)) hits.push(`PKCS8 Private Key in ${fp}`);
          if (/BEGIN RSA PRIVATE KEY/.test(content)) hits.push(`RSA Private Key in ${fp}`);
        }
      }
    }
    return hits;
  }

  const issues = scanFiles(path.join(rootDir, 'flutter_client'));
  assert.strictEqual(issues.length, 0, `Security scan failures: ${issues.join(', ')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLATFORM ADAPTERS & ARCHITECTURE AUDIT
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D29-ADA-001: GPS Platform Adapter fail-closed & permission evaluation', () => {
  const gpsPath = path.join(rootDir, 'flutter_client', 'lib', 'platform', 'gps', 'gps_adapter.dart');
  const content = fs.readFileSync(gpsPath, 'utf8');
  assert(content.includes('class PlatformGpsAdapter'), 'PlatformGpsAdapter must exist');
  assert(content.includes('checkLocationPermission()'), 'Must verify location permissions');
  assert(content.includes('LocationAccuracy.high'), 'Must configure high accuracy');
  assert(content.includes('distanceFilter: 10'), 'Must specify distanceFilter 10m');
});

runTest('C2D29-ADA-002: Map Platform Adapter Sentinel protection', () => {
  const mapPath = path.join(rootDir, 'flutter_client', 'lib', 'platform', 'maps', 'map_platform_adapter.dart');
  const content = fs.readFileSync(mapPath, 'utf8');
  assert(content.includes('class SentinelMapAdapter'), 'SentinelMapAdapter must exist as fail-safe');
});

runTest('C2D29-ADA-003: Notification Platform Adapter & Darwin/iOS config', () => {
  const notifPath = path.join(rootDir, 'flutter_client', 'lib', 'platform', 'notifications', 'notification_adapter.dart');
  const content = fs.readFileSync(notifPath, 'utf8');
  assert(content.includes('DarwinInitializationSettings'), 'DarwinInitializationSettings must be present');
  assert(content.includes("doc('${uid}_flutter')"), 'Canonical multi-device registration must be present');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. C2D.29 EVIDENCE PACKAGE AUDIT (21 MANDATORY DOCUMENTS)
// ─────────────────────────────────────────────────────────────────────────────
runTest('C2D29-EVD-001: Complete 21-document forensic evidence package exists', () => {
  const mandatoryDocs = [
    'C2D29_BASELINE.md',
    'C2D29_APPLE_DEVELOPER_AUDIT.md',
    'C2D29_BUNDLE_ID_AUDIT.md',
    'C2D29_FIREBASE_IOS_AUDIT.md',
    'C2D29_FIREBASE_IOS_CONFIG_AUDIT.md',
    'C2D29_MAPS_IOS_AUDIT.md',
    'C2D29_APNS_AUDIT.md',
    'C2D29_IOS_CAPABILITIES_MATRIX.md',
    'C2D29_INFO_PLIST_CONTRACT.md',
    'C2D29_ENTITLEMENTS_CONTRACT.md',
    'C2D29_GPS_IOS_READINESS.md',
    'C2D29_FCM_IOS_READINESS.md',
    'C2D29_SECURITY_SCAN.md',
    'C2D29_TRACK_A_PROTECTION.md',
    'C2D29_CORE_INTEGRITY.md',
    'C2D29_TENANT_ISOLATION.md',
    'C2D29_GAP_CLOSURE.md',
    'C2D29_GATE_MATRIX.md',
    'C2D29_BUILD_FIREWALL.md',
    'C2D29_DECISION_PACKAGE.md',
    'C2D29_FINAL_CERTIFICATION.md',
  ];

  for (const doc of mandatoryDocs) {
    const docPath = path.join(rootDir, doc);
    assert(fs.existsSync(docPath), `Missing mandatory evidence document: ${doc}`);
    const stat = fs.statSync(docPath);
    assert(stat.size > 200, `Document ${doc} is unexpectedly small or empty`);
  }
});

console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
console.log(`   BSD C2D.29 VALIDATION COMPLETE: ${passCount}/${totalTests} TESTS PASSED (100%)`);
console.log(`   STATUS: FAIL-CLOSED / READY_WITH_EXTERNAL_PREREQUISITES`);
console.log(`   ZERO HOSTS CREATED, ZERO BUILDS EXECUTED`);
console.log(`══════════════════════════════════════════════════════════════════════════════\n`);
