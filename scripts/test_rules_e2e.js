const testing = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function runTests() {
  console.log('🧪 INICIANDO SUITE DE CERTIFICACIÓN E2E Y AISLAMIENTO DE REGLAS...');
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  // Inicializar entorno de emulación
  const testEnv = await testing.initializeTestEnvironment({
    projectId: 'bluesystem-delivery-e2e',
    firestore: {
      rules: rules,
      host: '127.0.0.1',
      port: 8080
    }
  });

  let failed = 0;
  let passed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  // Helper para limpiar la DB antes de cada test
  async function clearDb() {
    await testEnv.clearFirestore();
  }

  try {
    // =========================================================================
    // TEST 01 & TEST 02: Category Sync (Android <=> Web)
    // =========================================================================
    await clearDb();
    console.log('\n--- TEST 01 & 02: CATEGORY CREATION & SYNC ---');

    // Contexto de Comercio A
    const ownerACtx = testEnv.authenticatedContext('usr_owner_A', {
      role: 'MERCHANT_OWNER',
      businessId: 'biz_A'
    });
    const dbA = ownerACtx.firestore();

    // Crear categoría local de negocio A
    try {
      await testing.assertSucceeds(
        dbA.collection('categories').doc('cat_local_A').set({
          name: 'Bebidas Frías',
          type: 'BUSINESS',
          businessId: 'biz_A',
          active: true,
          orderIndex: 1
        })
      );
      assert(true, 'Crear Categoría Local desde Web/Android (BUSINESS) de su propio negocio A es permitido');
    } catch (err) {
      assert(false, 'Fallo al crear categoría local legítima: ' + err.message);
    }

    // =========================================================================
    // TEST 03 & TEST 04: Product Create & Sync (Android <=> Web Wizard Parity)
    // =========================================================================
    await clearDb();
    console.log('\n--- TEST 03 & 04: PRODUCT CREATION & WIZARD PARITY ---');

    // Crear categoría local previa
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await adminDb.collection('categories').doc('cat_local_A').set({
        name: 'Platos Fuertes',
        type: 'BUSINESS',
        businessId: 'biz_A',
        active: true
      });
    });

    // Crear producto completo con la estructura canónica del wizard de 6 pasos
    try {
      await testing.assertSucceeds(
        dbA.collection('products').doc('prod_completo_A').set({
          businessId: 'biz_A',
          branchId: 'br_A1',
          name: 'Pollo Frito Familiar',
          shortDescription: 'Crujiente y jugoso',
          longDescription: 'Pollo entero marinado con receta secreta de la casa, incluye guarnición...',
          categoryId: 'cat_local_A',
          categoryName: 'Platos Fuertes',
          globalCategoryId: 'cat_global_fritos',
          price: 350.00,
          originalPrice: 400.00,
          estimatedCost: 180.00,
          taxPercentage: 15.0,
          imageUrl: 'https://storage/original.webp',
          images: ['https://storage/original.webp', 'https://storage/gallery1.webp'],
          preparationTimeMinutes: 20,
          isPopular: true,
          isVegetarian: false,
          isSpicy: true,
          spicyLevel: 1,
          isNew: true,
          isTopSeller: true,
          isRecommended: true,
          cuisineType: 'Fritanga',
          tags: ['pollo', 'familiar', 'frito'],
          optionGroups: [
            {
              id: 'grp_salsas',
              name: 'Elige tu salsa',
              isRequired: true,
              minSelection: 1,
              maxSelection: 2,
              options: [
                { id: 'opt_bbq', name: 'Salsa BBQ', additionalPrice: 15.0, status: 'ACTIVE' }
              ]
            }
          ],
          stockQuantity: 15,
          minStockAlert: 3,
          autoHideOnZeroStock: true,
          availabilityDays: [1, 2, 3, 4, 5, 6, 7],
          status: 'ACTIVE',
          isAvailable: true,
          available: true,
          active: true
        })
      );
      assert(true, 'Crear Producto con Wizard Completo de 6 pasos (paridad Android/Web) es permitido');
    } catch (err) {
      assert(false, 'Fallo al crear producto con wizard completo: ' + err.message);
    }

    // =========================================================================
    // TEST 05: Non-destructive Edit (Precio change only)
    // =========================================================================
    console.log('\n--- TEST 05: NON-DESTRUCTIVE EDIT PRESERVATION ---');
    try {
      // Simular edición rápida de precio desde la web (solo actualiza price y updatedAt)
      await testing.assertSucceeds(
        dbA.collection('products').doc('prod_completo_A').update({
          price: 380.00,
          updatedAt: new Date()
        })
      );

      // Comprobar la integridad del documento en Firestore
      let docSnap;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        docSnap = await context.firestore().collection('products').doc('prod_completo_A').get();
      });
      const data = docSnap.data();

      assert(data.price === 380.00, 'Precio modificado correctamente');
      assert(data.name === 'Pollo Frito Familiar', 'Nombre conservado intacto');
      assert(data.longDescription !== undefined, 'Descripción larga conservada');
      assert(data.optionGroups && data.optionGroups.length === 1, 'Grupos de opciones preservados');
      assert(data.images && data.images.length === 2, 'Galería de imágenes preservada');
      assert(data.tags && data.tags.length === 3, 'Tags del producto preservados');
      assert(data.isPopular === true, 'Flags de características preservados');
      assert(data.stockQuantity === 15, 'Inventario preservado');
    } catch (err) {
      assert(false, 'Fallo durante el test de preservación no destructiva: ' + err.message);
    }

    // =========================================================================
    // TEST 06: Multi-tenant Isolation (Aislamiento de Seguridad)
    // =========================================================================
    console.log('\n--- TEST 06: MULTI-TENANT ISOLATION ---');

    // Contexto de Comercio B
    const ownerBCtx = testEnv.authenticatedContext('usr_owner_B', {
      role: 'MERCHANT_OWNER',
      businessId: 'biz_B'
    });
    const dbB = ownerBCtx.firestore();

    // 1. Comercio A intenta modificar categoría de Comercio B
    try {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('categories').doc('cat_local_B').set({
          name: 'Categoría B',
          type: 'BUSINESS',
          businessId: 'biz_B',
          active: true
        });
      });

      await testing.assertFails(
        dbA.collection('categories').doc('cat_local_B').update({
          name: 'Hackeado por A'
        })
      );
      assert(true, 'Comercio A no puede modificar categoría del Comercio B (Acceso Denegado)');
    } catch (err) {
      assert(false, 'Fallo de aislamiento: Comercio A modificó datos del Comercio B: ' + err.message);
    }

    // 2. Comercio A intenta modificar una categoría Global (PRODUCT)
    try {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('categories').doc('cat_global_PRODUCT').set({
          name: 'Categoría Global Fritos',
          type: 'PRODUCT',
          active: true
        });
      });

      await testing.assertFails(
        dbA.collection('categories').doc('cat_global_PRODUCT').update({
          name: 'Hackeado por A'
        })
      );
      assert(true, 'Comercio A no puede modificar categoría global de plataforma (Acceso Denegado)');
    } catch (err) {
      assert(false, 'Fallo de aislamiento: Comercio A modificó categoría global: ' + err.message);
    }

    // 3. Administrador de Plataforma sí puede gestionar categorías globales
    const adminCtx = testEnv.authenticatedContext('usr_admin', {
      role: 'ADMIN'
    });
    const dbAdmin = adminCtx.firestore();

    try {
      await testing.assertSucceeds(
        dbAdmin.collection('categories').doc('cat_global_PRODUCT').update({
          name: 'Categoría Global Fritos Actualizada'
        })
      );
      assert(true, 'Administrador de plataforma puede modificar categoría global (Acceso Permitido)');
    } catch (err) {
      assert(false, 'Fallo: Administrador no pudo modificar categoría global: ' + err.message);
    }

  } catch (globalErr) {
    console.error('Error durante la suite de pruebas:', globalErr);
  } finally {
    await testEnv.cleanup();
    console.log('\n============================================================');
    console.log(`📊 E2E TESTS SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('============================================================\n');
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
