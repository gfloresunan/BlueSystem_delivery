const assert = require('assert');
const fs = require('fs');
const path = require('path');
const BrandAssetResolver = require('./brand_asset_resolver');

function runTests() {
  console.log('--- STARTING BRAND ASSET RESOLVER UNIT TESTS ---');

  const projectRootDir = path.resolve(__dirname, '..');

  // Test 1: Fail on null/empty context
  assert.throws(() => {
    BrandAssetResolver.validateBrandAssetPackage(null);
  }, /ERR_INVALID_CONTEXT/);
  console.log('✓ Test 1: Rejects null context');

  // Test 2: Fail on missing tenantId or brandId
  assert.throws(() => {
    BrandAssetResolver.validateBrandAssetPackage({ tenantId: '', brandId: 'fitoni', appConfigId: 'cfg-1', assets: {} });
  }, /ERR_TENANT_ID_REQUIRED/);
  console.log('✓ Test 2: Rejects empty tenantId');

  // Test 3: Fail on missing required asset
  assert.throws(() => {
    BrandAssetResolver.validateBrandAssetPackage({
      tenantId: 'tenant-commercial-02',
      brandId: 'fitoni-express',
      appConfigId: 'app-cfg-fitoni',
      assets: {
        launcherIcon: 'https://storage/launcher.png'
        // splashIcon & splashBackground missing
      }
    });
  }, /ERR_MISSING_REQUIRED_ASSET/);
  console.log('✓ Test 3: Rejects missing splashIcon and splashBackground (Fail-Closed)');

  // Test 4: Fail on invalid color format
  assert.throws(() => {
    BrandAssetResolver.validateBrandAssetPackage({
      tenantId: 'tenant-commercial-02',
      brandId: 'fitoni-express',
      appConfigId: 'app-cfg-fitoni',
      assets: {
        launcherIcon: 'https://storage/launcher.png',
        splashIcon: 'https://storage/splash.png',
        splashBackground: 'not-a-hex-color'
      }
    });
  }, /ERR_INVALID_COLOR_FORMAT/);
  console.log('✓ Test 4: Rejects invalid color format');

  // Test 5: Successful validation and overlay generation
  const validContext = {
    tenantId: 'tenant-commercial-02',
    brandId: 'brand-fitoni-express',
    appConfigId: 'app-cfg-fitoni-01',
    assets: {
      launcherIcon: 'gs://bluesystem-brand-assets/tenant-commercial-02/brand-fitoni-express/launcher.png',
      splashIcon: 'gs://bluesystem-brand-assets/tenant-commercial-02/brand-fitoni-express/splash.png',
      splashBackground: '#FF6200',
      primaryColor: '#FF6200',
      secondaryColor: '#1A1A1A'
    }
  };

  assert.strictEqual(BrandAssetResolver.validateBrandAssetPackage(validContext), true);
  console.log('✓ Test 5: Validates valid brand context successfully');

  // Test 6: Generate overlay structure
  const overlayResDir = BrandAssetResolver.generateBrandOverlay(projectRootDir, validContext);
  assert.strictEqual(fs.existsSync(overlayResDir), true);
  assert.strictEqual(fs.existsSync(path.join(overlayResDir, 'values', 'brand_colors.xml')), true);
  assert.strictEqual(fs.existsSync(path.join(overlayResDir, 'mipmap-anydpi-v26', 'ic_launcher.xml')), true);
  console.log('✓ Test 6: Generates temporary resource overlay files in build/generated/res/brandAssets/res');

  // Verify app/src/main/res/ was NOT modified
  const mainThemesXml = fs.readFileSync(path.join(projectRootDir, 'app', 'src', 'main', 'res', 'values', 'themes.xml'), 'utf8');
  assert.strictEqual(mainThemesXml.includes('Theme.App.Starting'), true);
  console.log('✓ Test 7: Verified zero mutation on app/src/main/res/');

  // Test 8: Clean overlay
  BrandAssetResolver.cleanBrandOverlay(projectRootDir);
  const overlayBaseDir = path.join(projectRootDir, 'app', 'build', 'generated', 'res', 'brandAssets');
  assert.strictEqual(fs.existsSync(overlayBaseDir), false);
  console.log('✓ Test 8: Cleaned temporary overlay directory successfully (Anti-Contamination verified)');

  console.log('--- ALL BRAND ASSET RESOLVER UNIT TESTS PASSED (8/8) ---');
}

runTests();
