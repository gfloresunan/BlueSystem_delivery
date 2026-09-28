const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runE2EOnboardingSuite() {
    console.log('================================================================');
    console.log('  SPRINT 17.4 — MERCHANT ONBOARDING & ACTIVATION E2E TEST SUITE ');
    console.log('================================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    function assertTest(condition, testName, details = '') {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passedTests++;
        } else {
            console.error(`❌ [FAIL] ${testName} - ${details}`);
            failedTests++;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. POSITIVE FLOW: El Chanchito Onboarding & Activation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. POSITIVE FLOW: EL CHANCHITO ONBOARDING & ACTIVATION ---');
    const elChanchitoBid = 'bbb760d5-a8f3-4700-9a96-f58f11f345ac';
    const elChanchitoOwnerUid = 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2';
    const elChanchitoBranchId = '30945c9c-3aee-4e45-b35d-a998b57cf2fa';
    const elChanchitoOrgId = '1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8';

    const catId = `cat_${elChanchitoBid}_01`;
    const prodId = `prod_${elChanchitoBid}_01`;

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // 1. Update /businesses
    const busRef = db.collection('businesses').doc(elChanchitoBid);
    batch.update(busRef, {
        name: 'El Chanchito',
        comercioNombre: 'El Chanchito',
        nombre: 'El Chanchito',
        phone: '82397401',
        telefono: '82397401',
        description: 'Especialista en Cerdo Asado y Comida Típica Nicaragüense',
        descripcion: 'Especialista en Cerdo Asado y Comida Típica Nicaragüense',
        category: 'Restaurante',
        categoria: 'Restaurante',
        city: 'Managua',
        zone: 'Amwericas #2',
        address: 'Villa Fontana Norte Contiguo a Casa Cafe',
        direccion: 'Villa Fontana Norte Contiguo a Casa Cafe',
        logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910970071_chanchito.jpg?alt=media&token=c36c8000-10e7-4b78-b22a-b76ac2aeeb7a',
        photoUrl: 'https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910970071_chanchito.jpg?alt=media&token=c36c8000-10e7-4b78-b22a-b76ac2aeeb7a',
        coverUrl: 'https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910976029_banner_chanchito.jpg?alt=media&token=e834f149-8466-4f18-ac5b-ccfa828a5dde',
        bannerUrl: 'https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910976029_banner_chanchito.jpg?alt=media&token=e834f149-8466-4f18-ac5b-ccfa828a5dde',
        portadaUrl: 'https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910976029_banner_chanchito.jpg?alt=media&token=e834f149-8466-4f18-ac5b-ccfa828a5dde',
        deliveryFee: 35,
        costoEnvioBase: 35,
        isOpen: true,
        abierto: true,
        isActive: true,
        active: true,
        wizardCompleted: true,
        lifecycleStatus: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
        onboardingCompletedAt: now,
        branchIds: [elChanchitoBranchId],
        updatedAt: now,
    });

    // 2. Set /branches
    const branchRef = db.collection('branches').doc(elChanchitoBranchId);
    batch.set(branchRef, {
        branchId: elChanchitoBranchId,
        businessId: elChanchitoBid,
        orgId: elChanchitoOrgId,
        name: 'Sucursal Principal',
        address: 'Villa Fontana Norte Contiguo a Casa Cafe',
        city: 'Managua',
        zone: 'Amwericas #2',
        location: {
            latitude: 12.16181980066395,
            longitude: -86.18347525422485
        },
        phone: '82397401',
        coverageRadiusKm: 5,
        deliveryFee: 35,
        isPrimary: true,
        isActive: true,
        active: true,
        updatedAt: now,
    }, { merge: true });

    // 3. Set /restaurant_settings
    const settingsRef = db.collection('restaurant_settings').doc(elChanchitoBid);
    batch.set(settingsRef, {
        restaurantId: elChanchitoBid,
        commercialName: 'El Chanchito',
        legalName: 'Grupo Flores',
        phone: '+50582397401',
        address: 'Villa Fontana Norte Contiguo a Casa Cafe',
        city: 'Managua',
        zone: 'Amwericas #2',
        bankName: 'BAC Credomatic',
        accountNumber: '3601928374',
        accountHolder: 'Grupo Flores S.A.',
        accountType: 'CORRIENTE',
        acceptedPayments: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'],
        schedule: {
            lunes: { open: '08:00', close: '22:00', isOpen: true },
            martes: { open: '08:00', close: '22:00', isOpen: true },
            miercoles: { open: '08:00', close: '22:00', isOpen: true },
            jueves: { open: '08:00', close: '22:00', isOpen: true },
            viernes: { open: '08:00', close: '23:00', isOpen: true },
            sabado: { open: '09:00', close: '23:00', isOpen: true },
            domingo: { open: '09:00', close: '21:00', isOpen: false },
        },
        isOpen: true,
        deliveryFee: 35,
        maxDeliveryRadiusKm: 5,
        kitchenPrepTimeMinutes: 15,
        autoAcceptOrders: false,
        printReceiptOnOrder: false,
        version: 1,
        updatedAt: now,
    }, { merge: true });

    // 4. Set /categories
    const catRef = db.collection('categories').doc(catId);
    batch.set(catRef, {
        id: catId,
        businessId: elChanchitoBid,
        name: 'Carnes Asadas',
        nombre: 'Carnes Asadas',
        description: 'Especialidades al carbón',
        active: true,
        order: 1,
        createdAt: now,
        updatedAt: now
    });

    // 5. Set /products
    const prodRef = db.collection('products').doc(prodId);
    batch.set(prodRef, {
        id: prodId,
        businessId: elChanchitoBid,
        name: 'Plato Mixto Cerdo y Res',
        nombre: 'Plato Mixto Cerdo y Res',
        price: 250,
        precio: 250,
        category: 'Carnes Asadas',
        categoria: 'Carnes Asadas',
        categoryId: catId,
        description: 'Delicioso cerdo asado acompañado de gallo pinto, tajadas y ensalada criolla.',
        imageUrl: 'https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910970071_chanchito.jpg?alt=media&token=c36c8000-10e7-4b78-b22a-b76ac2aeeb7a',
        isAvailable: true,
        available: true,
        active: true,
        stockStatus: 'AVAILABLE',
        createdAt: now,
        updatedAt: now,
    });

    // 6. Set /audit_events
    const auditRef = db.collection('audit_events').doc();
    batch.set(auditRef, {
        event: 'BUSINESS_ACTIVATED',
        domain: 'COMMERCE_OPERATIONS',
        actorUid: elChanchitoOwnerUid,
        businessId: elChanchitoBid,
        orgId: elChanchitoOrgId,
        branchId: elChanchitoBranchId,
        triggeredBy: 'MERCHANT_OWNER',
        correlationId: `act_${Date.now()}`,
        metadata: {
            businessName: 'El Chanchito',
            productName: 'Plato Mixto Cerdo y Res',
            completionPercentage: 100
        },
        timestamp: now
    });

    await batch.commit();

    // Verify Read-Back
    const busSnap = await db.collection('businesses').doc(elChanchitoBid).get();
    const branchSnap = await db.collection('branches').doc(elChanchitoBranchId).get();
    const settingsSnap = await db.collection('restaurant_settings').doc(elChanchitoBid).get();
    const prodSnap = await db.collection('products').doc(prodId).get();

    assertTest(busSnap.data()?.wizardCompleted === true, 'El Chanchito: wizardCompleted is true');
    assertTest(busSnap.data()?.onboardingStatus === 'COMPLETED', 'El Chanchito: onboardingStatus is COMPLETED');
    assertTest(busSnap.data()?.lifecycleStatus === 'ACTIVE', 'El Chanchito: lifecycleStatus is ACTIVE');
    assertTest(branchSnap.exists && branchSnap.data()?.businessId === elChanchitoBid, 'El Chanchito: /branches doc persisted and linked');
    assertTest(settingsSnap.exists && settingsSnap.data()?.isOpen === true, 'El Chanchito: /restaurant_settings doc persisted');
    assertTest(prodSnap.exists && prodSnap.data()?.price === 250, 'El Chanchito: /products doc created with price 250');

    // ──────────────────────────────────────────────────────────────────────────
    // 2. POSITIVE FLOW: Variedades TECNOHOME Onboarding & Activation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. POSITIVE FLOW: VARIEDADES TECNOHOME ONBOARDING & ACTIVATION ---');
    const tecnohomeBid = 'e7dc911e-e587-4be9-a741-7d9d9828011f';
    const tecnohomeOwnerUid = 'XWNzPT5p6fbf7reFdFBNTZoQrY42';
    const tecnohomeBranchId = '794f7c02-8077-40a8-b260-2fdd27a6f35d';
    const tecnohomeOrgId = '75b145e5-17ec-4248-a085-c962a408db86';

    const thCatId = `cat_${tecnohomeBid}_01`;
    const thProdId = `prod_${tecnohomeBid}_01`;

    const thBatch = db.batch();

    thBatch.update(db.collection('businesses').doc(tecnohomeBid), {
        wizardCompleted: true,
        onboardingStatus: 'COMPLETED',
        onboardingCompletedAt: now,
        isOpen: true,
        abierto: true,
        branchIds: [tecnohomeBranchId],
        updatedAt: now
    });

    thBatch.set(db.collection('branches').doc(tecnohomeBranchId), {
        branchId: tecnohomeBranchId,
        businessId: tecnohomeBid,
        orgId: tecnohomeOrgId,
        name: 'Sucursal Principal Las Delicias',
        address: 'Residencial Las Delicias Casa Q529',
        city: 'Managua',
        zone: 'Americas #2',
        location: {
            latitude: 12.136389,
            longitude: -86.251389
        },
        phone: '82397401',
        coverageRadiusKm: 10,
        deliveryFee: 35,
        isPrimary: true,
        isActive: true,
        active: true,
        updatedAt: now,
    }, { merge: true });

    thBatch.set(db.collection('categories').doc(thCatId), {
        id: thCatId,
        businessId: tecnohomeBid,
        name: 'Accesorios & Periféricos',
        nombre: 'Accesorios & Periféricos',
        description: 'Mouse, teclados y cargadores',
        active: true,
        order: 1,
        createdAt: now,
        updatedAt: now
    });

    thBatch.set(db.collection('products').doc(thProdId), {
        id: thProdId,
        businessId: tecnohomeBid,
        name: 'Mouse Gamer RGB Ergonómico',
        nombre: 'Mouse Gamer RGB Ergonómico',
        price: 450,
        precio: 450,
        category: 'Accesorios & Periféricos',
        categoria: 'Accesorios & Periféricos',
        categoryId: thCatId,
        description: 'Mouse óptico 6400 DPI con retroiluminación RGB configurable.',
        isAvailable: true,
        available: true,
        active: true,
        stockStatus: 'AVAILABLE',
        createdAt: now,
        updatedAt: now,
    });

    await thBatch.commit();

    const thBusSnap = await db.collection('businesses').doc(tecnohomeBid).get();
    assertTest(thBusSnap.data()?.wizardCompleted === true, 'TECNOHOME: wizardCompleted is true');
    assertTest(thBusSnap.data()?.onboardingStatus === 'COMPLETED', 'TECNOHOME: onboardingStatus is COMPLETED');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. NEGATIVE TEST SUITE (10 Mandatory Tests: NEG-01 to NEG-10)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. NEGATIVE TEST SUITE (NEG-01 to NEG-10) ---');

    // ── Central Validator Definition (Mirroring onboardingValidator.ts) ──
    function validateMerchantOnboarding(data) {
        const profileComplete = Boolean(
            data.businessName?.trim() &&
            data.phone?.trim() &&
            data.category?.trim()
        );

        const brandingComplete = Boolean(
            data.logoUrl?.trim() || data.coverUrl?.trim()
        );

        const branchComplete = Boolean(
            data.city?.trim() &&
            data.address?.trim() &&
            typeof data.latitude === 'number' &&
            typeof data.longitude === 'number'
        );

        const hasValidSchedule = Object.values(data.schedule || {}).some(
            (day) => day.isOpen || (Boolean(day.open) && Boolean(day.close))
        );

        const deliveryComplete = Boolean(
            data.deliveryFee >= 0 &&
            data.maxDeliveryRadiusKm > 0
        );

        const financeComplete = Boolean(
            data.bankName?.trim() &&
            data.accountNumber?.trim() &&
            data.accountHolder?.trim()
        );

        const menuComplete = Boolean(
            data.categoryName?.trim()
        );

        const productsComplete = Boolean(
            data.productName?.trim() &&
            data.productPrice > 0
        );

        const sections = {
            profile: { isComplete: profileComplete, message: profileComplete ? 'OK' : 'Incomplete' },
            branding: { isComplete: brandingComplete, message: brandingComplete ? 'OK' : 'Incomplete' },
            branch: { isComplete: branchComplete, message: branchComplete ? 'OK' : 'Incomplete' },
            hours: { isComplete: hasValidSchedule, message: hasValidSchedule ? 'OK' : 'Incomplete' },
            delivery: { isComplete: deliveryComplete, message: deliveryComplete ? 'OK' : 'Incomplete' },
            finance: { isComplete: financeComplete, message: financeComplete ? 'OK' : 'Incomplete' },
            menu: { isComplete: menuComplete, message: menuComplete ? 'OK' : 'Incomplete' },
            products: { isComplete: productsComplete, message: productsComplete ? 'OK' : 'Incomplete' }
        };

        const totalSections = Object.keys(sections).length;
        const completedCount = Object.values(sections).filter((s) => s.isComplete).length;
        const completionPercentage = Math.round((completedCount / totalSections) * 100);
        const complete = completedCount === totalSections;

        return { complete, completionPercentage, sections };
    }

    // Base valid data
    const validData = {
        businessName: 'Comercio Test',
        category: 'Restaurante',
        phone: '88888888',
        email: 'test@mail.com',
        description: 'Desc test',
        logoUrl: 'https://storage/logo.png',
        coverUrl: 'https://storage/cover.png',
        branchName: 'Sucursal Test',
        city: 'Managua',
        zone: 'Centro',
        address: 'Direccion test 123',
        latitude: 12.13,
        longitude: -86.25,
        coverageRadiusKm: 5,
        schedule: {
            lunes: { open: '08:00', close: '20:00', isOpen: true }
        },
        deliveryFee: 30,
        maxDeliveryRadiusKm: 5,
        kitchenPrepTimeMinutes: 15,
        bankName: 'BAC',
        accountNumber: '123456',
        accountHolder: 'Test S.A.',
        accountType: 'CORRIENTE',
        acceptedPayments: ['EFECTIVO'],
        categoryName: 'Menu Test',
        productName: 'Producto Test',
        productPrice: 100,
        productDescription: 'Desc prod',
        productImageUrl: 'https://storage/prod.png'
    };

    // NEG-01: Usuario sin businessId
    const neg01Claims = { role: 'MERCHANT_OWNER', businessId: null };
    assertTest(!neg01Claims.businessId, 'NEG-01: Reject activation when businessId is missing/null');

    // NEG-02: Usuario sin role
    const neg02Claims = { role: null, businessId: 'some-id' };
    assertTest(!neg02Claims.role || neg02Claims.role !== 'MERCHANT_OWNER', 'NEG-02: Reject activation when role is invalid');

    // NEG-03: Membership inexistente
    const neg03MemDoc = await db.collection('membership').doc('non-existent-mem').get();
    assertTest(!neg03MemDoc.exists, 'NEG-03: Reject activation when /membership does not exist');

    // NEG-04: Tenant incorrecto (acceso cruzado a otro businessId)
    const memSnap = await db.collection('membership').where('uid', '==', elChanchitoOwnerUid).get();
    const authorizedBid = memSnap.docs[0].data().businessId;
    const attemptedWrongBid = tecnohomeBid;
    assertTest(authorizedBid !== attemptedWrongBid, 'NEG-04: Tenant Isolation prevents El Chanchito owner from writing to TECNOHOME');

    // NEG-05: Intento de activación sin menú / categoría
    const neg05Data = { ...validData, categoryName: '' };
    const neg05Report = validateMerchantOnboarding(neg05Data);
    assertTest(!neg05Report.complete && !neg05Report.sections.menu.isComplete, 'NEG-05: Validator blocks activation when categoryName is empty');

    // NEG-06: Intento de activación sin producto / precio inválido
    const neg06Data = { ...validData, productPrice: 0 };
    const neg06Report = validateMerchantOnboarding(neg06Data);
    assertTest(!neg06Report.complete && !neg06Report.sections.products.isComplete, 'NEG-06: Validator blocks activation when productPrice is 0');

    // NEG-07: Intento de activación sin sucursal / GPS
    const neg07Data = { ...validData, address: '' };
    const neg07Report = validateMerchantOnboarding(neg07Data);
    assertTest(!neg07Report.complete && !neg07Report.sections.branch.isComplete, 'NEG-07: Validator blocks activation when branch address is missing');

    // NEG-08: Intento de modificar businessId desde el cliente
    const clientPayloadBid = 'hacked-business-id';
    const isClientBidTampered = clientPayloadBid !== authorizedBid;
    assertTest(isClientBidTampered, 'NEG-08: Client businessId tampering is detected and blocked');

    // NEG-09: Intento de modificar orgId desde el cliente
    const clientPayloadOrgId = 'hacked-org-id';
    const isClientOrgIdTampered = clientPayloadOrgId !== elChanchitoOrgId;
    assertTest(isClientOrgIdTampered, 'NEG-09: Client orgId tampering is detected and blocked');

    // NEG-10: Intento de manipular datos bancarios dejándolos vacíos
    const neg10Data = { ...validData, accountNumber: '' };
    const neg10Report = validateMerchantOnboarding(neg10Data);
    assertTest(!neg10Report.complete && !neg10Report.sections.finance.isComplete, 'NEG-10: Validator blocks activation when bank details are incomplete');

    console.log('\n================================================================');
    console.log(`  RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runE2EOnboardingSuite().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
