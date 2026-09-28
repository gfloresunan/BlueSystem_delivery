/**
 * BlueSystem Delivery — Multi-Brand Build Factory
 * Module: Brand Asset Resolver & Overlay Generator
 * Protocol ID: BSD-C2D25E2-MULTI-BRAND-PROVISIONING-HARDENING-CLOSURE-001
 * 
 * Purpose:
 * Prepares temporary, build-scoped Android resource overlays for white-label / commercial brands
 * in `build/generated/res/brandAssets/res/` without modifying canonical source files in `app/src/main/res/`.
 * 
 * Architecture Rules:
 * - Fail-Closed: Missing or invalid assets abort preparation immediately.
 * - Zero Source Mutation: Never touches `app/src/main/res/`.
 * - Multi-Tenant Segregation: Strictly enforces tenantId + brandId isolation.
 * - Anti-Contamination: Transient overlay is cleaned post-build.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_ASSETS = ['launcherIcon', 'splashIcon', 'splashBackground'];
const ALLOWED_MIME_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];

class BrandAssetResolver {
  /**
   * Validate brand assets metadata and contract integrity
   * @param {Object} brandContext 
   * @param {string} brandContext.tenantId
   * @param {string} brandContext.brandId
   * @param {string} brandContext.appConfigId
   * @param {Object} brandContext.assets
   * @returns {boolean}
   */
  static validateBrandAssetPackage(brandContext) {
    if (!brandContext) {
      throw new Error('ERR_INVALID_CONTEXT: brandContext is required');
    }

    const { tenantId, brandId, appConfigId, assets } = brandContext;

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new Error('ERR_TENANT_ID_REQUIRED: tenantId is missing or empty');
    }

    if (!brandId || typeof brandId !== 'string' || brandId.trim() === '') {
      throw new Error('ERR_BRAND_ID_REQUIRED: brandId is missing or empty');
    }

    if (!appConfigId || typeof appConfigId !== 'string' || appConfigId.trim() === '') {
      throw new Error('ERR_APP_CONFIG_ID_REQUIRED: appConfigId is missing or empty');
    }

    if (!assets || typeof assets !== 'object') {
      throw new Error('ERR_MISSING_ASSETS: brand assets definition is missing');
    }

    // Check required asset keys
    for (const key of REQUIRED_ASSETS) {
      if (!assets[key]) {
        throw new Error(`ERR_MISSING_REQUIRED_ASSET: Required brand asset "${key}" is missing for brand "${brandId}"`);
      }
    }

    // Validate splash background color (hex format)
    if (assets.splashBackground && !/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(assets.splashBackground)) {
      throw new Error(`ERR_INVALID_COLOR_FORMAT: splashBackground "${assets.splashBackground}" is not a valid hex color`);
    }

    return true;
  }

  /**
   * Generates the temporary resource overlay directory structure for a specific brand
   * @param {string} projectRootDir - Absolute path to project root
   * @param {Object} brandContext - Validated brand context
   * @returns {string} Path to generated overlay
   */
  static generateBrandOverlay(projectRootDir, brandContext) {
    this.validateBrandAssetPackage(brandContext);

    const overlayResDir = path.join(projectRootDir, 'app', 'build', 'generated', 'res', 'brandAssets', 'res');
    const valuesDir = path.join(overlayResDir, 'values');
    const drawableDir = path.join(overlayResDir, 'drawable');
    const mipmapAnyDpiDir = path.join(overlayResDir, 'mipmap-anydpi-v26');

    // Create directories
    fs.mkdirSync(valuesDir, { recursive: true });
    fs.mkdirSync(drawableDir, { recursive: true });
    fs.mkdirSync(mipmapAnyDpiDir, { recursive: true });

    // 1. Generate values/brand_colors.xml override
    const colorsXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated Brand Resource Overlay for Brand: ${brandContext.brandId} (Tenant: ${brandContext.tenantId}) -->
<!-- DO NOT EDIT - THIS FILE IS TEMPORARY AND WILL BE OVERWRITTEN/CLEANED -->
<resources>
    <color name="splash_background">${brandContext.assets.splashBackground || '#0242B6'}</color>
    <color name="brand_primary">${brandContext.assets.primaryColor || '#0242B6'}</color>
    <color name="brand_secondary">${brandContext.assets.secondaryColor || '#FF6200'}</color>
</resources>
`;
    fs.writeFileSync(path.join(valuesDir, 'brand_colors.xml'), colorsXmlContent, 'utf8');

    // 2. Generate Adaptive Icon XML definitions in mipmap-anydpi-v26
    const adaptiveIconContent = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated Adaptive Icon for Brand: ${brandContext.brandId} -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/splash_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
    fs.writeFileSync(path.join(mipmapAnyDpiDir, 'ic_launcher.xml'), adaptiveIconContent, 'utf8');
    fs.writeFileSync(path.join(mipmapAnyDpiDir, 'ic_launcher_round.xml'), adaptiveIconContent, 'utf8');

    // 3. Write metadata descriptor
    const metadata = {
      tenantId: brandContext.tenantId,
      brandId: brandContext.brandId,
      appConfigId: brandContext.appConfigId,
      generatedAt: new Date().toISOString(),
      source: 'BrandAssetResolver v1.0 Enterprise'
    };
    fs.writeFileSync(
      path.join(projectRootDir, 'app', 'build', 'generated', 'res', 'brandAssets', 'brand_overlay_manifest.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    return overlayResDir;
  }

  /**
   * Cleans and deletes all transient overlay resources post-build
   * @param {string} projectRootDir 
   */
  static cleanBrandOverlay(projectRootDir) {
    const overlayBaseDir = path.join(projectRootDir, 'app', 'build', 'generated', 'res', 'brandAssets');
    if (fs.existsSync(overlayBaseDir)) {
      fs.rmSync(overlayBaseDir, { recursive: true, force: true });
    }
  }
}

module.exports = BrandAssetResolver;
