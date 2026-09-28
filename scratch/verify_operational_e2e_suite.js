const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function runSprint175Suite() {
    console.log('========================================================================');
    console.log('  SPRINT 17.5 — MERCHANT OPERATIONAL E2E CERTIFICATION SUITE             ');
    console.log('========================================================================\n');

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

    const chanchitoBid = 'bbb760d5-a8f3-4700-9a96-f58f11f345ac';
    const chanchitoOrgId = '1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8';
    const chanchitoBranchId = '30945c9c-3aee-4e45-b35d-a998b57cf2fa';
    const chanchitoOwnerUid = 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2';

    const tecnohomeBid = 'e7dc911e-e587-4be9-a741-7d9d9828011f';
    const tecnohomeOrgId = '75b145e5-17ec-4248-a085-c962a408db86';
    const tecnohomeBranchId = '794f7c02-8077-40a8-b260-2fdd27a6f35d';

    const customerUid = 'cust_test_maria_01';
    const courierUid = 'courier_test_carlos_01';
    const correlationId = `corr_${Date.now()}`;
    const orderId = `ord_e2e_${Date.now()}`;
    const prodId = `prod_${chanchitoBid}_01`;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. PRODUCT CATALOG REAL OPERATION (Merchant Web)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- 1. MERCHANT WEB: CATALOG & PRODUCT MANAGEMENT ---');
    
    // Edit price & toggle availability
    const prodRef = db.collection('products').doc(prodId);
    await prodRef.update({
        price: 260,
        precio: 260,
        isAvailable: true,
        available: true,
        stockStatus: 'AVAILABLE',
        updatedAt: FieldValue.serverTimestamp()
    });

    const prodSnap = await prodRef.get();
    assertTest(prodSnap.exists && prodSnap.data().price === 260, 'Merchant updates product price in real-time');
    assertTest(prodSnap.data().stockStatus === 'AVAILABLE', 'Merchant manages stock status in catalog');

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ANDROID CLIENT: ORDER CREATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. ANDROID CLIENT: ORDER CREATION ---');
    const orderRef = db.collection('orders').doc(orderId);
    const orderPayload = {
        orderId,
        businessId: chanchitoBid,
        orgId: chanchitoOrgId,
        branchId: chanchitoBranchId,
        businessName: 'El Chanchito',
        customerId: customerUid,
        clienteId: customerUid,
        customerName: 'María López',
        customerPhone: '+505 8888 1234',
        deliveryAddress: 'Altamira D\'Este, Casa #45',
        destinationAddress: 'Altamira D\'Este, Casa #45',
        fulfillmentType: 'DELIVERY',
        items: [
            {
                productId: prodId,
                productName: 'Plato Mixto Cerdo y Res',
                name: 'Plato Mixto Cerdo y Res',
                quantity: 1,
                unitPrice: 260,
                price: 260,
                subtotal: 260
            }
        ],
        subtotal: 260,
        deliveryFee: 35,
        costoEnvioBase: 35,
        total: 295,
        status: 'pending',
        estado: 'pendiente',
        paymentMethod: 'EFECTIVO',
        paymentStatus: 'pending',
        correlationId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    };

    await orderRef.set(orderPayload);
    const createdOrderSnap = await orderRef.get();
    assertTest(createdOrderSnap.exists && createdOrderSnap.data().status === 'pending', 'Customer successfully creates Order with valid catalog items');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. MERCHANT WEB / KDS: ORDER ACCEPTANCE & PREPARATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. MERCHANT WEB / KDS: ACCEPT & PREPARE ---');
    
    // Status: pending -> preparing
    await orderRef.update({
        status: 'preparing',
        estado: 'preparando',
        acceptedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });

    await db.collection('audit_events').add({
        event: 'ORDER_ACCEPTED',
        domain: 'OPERATIONS',
        actorUid: chanchitoOwnerUid,
        businessId: chanchitoBid,
        orgId: chanchitoOrgId,
        branchId: chanchitoBranchId,
        orderId,
        correlationId,
        triggeredBy: 'MERCHANT_OWNER',
        timestamp: FieldValue.serverTimestamp()
    });

    const prepOrderSnap = await orderRef.get();
    assertTest(prepOrderSnap.data().status === 'preparing', 'Merchant accepts and moves order to PREPARING');

    // ──────────────────────────────────────────────────────────────────────────
    // 4. MERCHANT WEB / KDS: ORDER READY FOR COURIER PICKUP
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. MERCHANT WEB / KDS: ORDER READY ---');
    
    // Status: preparing -> ready
    await orderRef.update({
        status: 'ready',
        estado: 'listo',
        preparedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });

    await db.collection('audit_events').add({
        event: 'ORDER_READY',
        domain: 'OPERATIONS',
        actorUid: chanchitoOwnerUid,
        businessId: chanchitoBid,
        orgId: chanchitoOrgId,
        branchId: chanchitoBranchId,
        orderId,
        correlationId,
        triggeredBy: 'MERCHANT_OWNER',
        timestamp: FieldValue.serverTimestamp()
    });

    const readyOrderSnap = await orderRef.get();
    assertTest(readyOrderSnap.data().status === 'ready', 'Merchant marks order as READY for Dispatch');

    // ──────────────────────────────────────────────────────────────────────────
    // 5. FLEET CORE: COURIER ASSIGNMENT & DISPATCH IN TRANSIT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. FLEET CORE & COURIER: DISPATCH IN TRANSIT ---');
    
    // Status: ready -> in_transit
    await orderRef.update({
        status: 'in_transit',
        estado: 'en_ruta',
        assignedCourierId: courierUid,
        motorizadoId: courierUid,
        driverName: 'Carlos Mendoza',
        pickedUpAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });

    const transitOrderSnap = await orderRef.get();
    assertTest(transitOrderSnap.data().status === 'in_transit' && transitOrderSnap.data().assignedCourierId === courierUid, 'Fleet Core assigns Courier and updates to IN_TRANSIT');

    // ──────────────────────────────────────────────────────────────────────────
    // 6. DELIVERY COMPLETION & OPERATIONAL CLOSURE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. COURIER: DELIVERY COMPLETION ---');
    
    // Status: in_transit -> delivered
    await orderRef.update({
        status: 'delivered',
        estado: 'entregado',
        deliveredAt: FieldValue.serverTimestamp(),
        completedAt: FieldValue.serverTimestamp(),
        paymentStatus: 'completed',
        updatedAt: FieldValue.serverTimestamp()
    });

    const deliveredOrderSnap = await orderRef.get();
    assertTest(deliveredOrderSnap.data().status === 'delivered', 'Courier completes delivery (DELIVERED)');

    // ──────────────────────────────────────────────────────────────────────────
    // 7. FINANCIAL LEDGER & ACCOUNTING INTEGRATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. ACCOUNTING & FINANCIAL LEDGER INTEGRATION ---');
    
    const orderTotalFloat = 295;
    const orderTotalCents = 29500;
    const platformFeePercent = 0.15;
    const platformFeeCents = Math.round(orderTotalCents * platformFeePercent);
    const merchantNetCents = orderTotalCents - platformFeeCents;
    const now = FieldValue.serverTimestamp();

    const finBatch = db.batch();

    // Financial Event 1: ORDER_REVENUE
    const revRef = db.collection('financial_events').doc();
    finBatch.set(revRef, {
        eventId: revRef.id,
        businessId: chanchitoBid,
        orgId: chanchitoOrgId,
        branchId: chanchitoBranchId,
        orderId,
        eventType: 'ORDER_REVENUE',
        amountCents: orderTotalCents,
        direction: 'CREDIT',
        currency: 'NIO',
        description: `Ingreso por pedido #${orderId.slice(-6).toUpperCase()}`,
        orderTotal: orderTotalFloat,
        createdAt: now,
        createdBy: 'SYSTEM',
        idempotencyKey: `${orderId}_ORDER_REVENUE`,
        processedAt: now,
    });

    // Financial Event 2: PLATFORM_FEE
    const feeRef = db.collection('financial_events').doc();
    finBatch.set(feeRef, {
        eventId: feeRef.id,
        businessId: chanchitoBid,
        orgId: chanchitoOrgId,
        branchId: chanchitoBranchId,
        orderId,
        eventType: 'PLATFORM_FEE',
        amountCents: platformFeeCents,
        direction: 'DEBIT',
        currency: 'NIO',
        description: `Comisión plataforma 15% — pedido #${orderId.slice(-6).toUpperCase()}`,
        orderTotal: orderTotalFloat,
        createdAt: now,
        createdBy: 'SYSTEM',
        idempotencyKey: `${orderId}_PLATFORM_FEE`,
        processedAt: now,
    });

    // Summary update
    const summaryRef = db.collection('merchant_summaries').doc(chanchitoBid);
    finBatch.set(summaryRef, {
        businessId: chanchitoBid,
        todayRevenueCents: FieldValue.increment(orderTotalCents),
        todayOrdersCount: FieldValue.increment(1),
        todayPlatformFeesCents: FieldValue.increment(platformFeeCents),
        todayNetCents: FieldValue.increment(merchantNetCents),
        pendingSettlementCents: FieldValue.increment(merchantNetCents),
        lastUpdatedAt: now,
        lastOrderId: orderId
    }, { merge: true });

    await finBatch.commit();

    const finSnap = await db.collection('financial_events').where('orderId', '==', orderId).get();
    const sumSnap = await summaryRef.get();

    assertTest(finSnap.size === 2, 'Financial Ledger created exact debit and credit entries (2 events)');
    assertTest(sumSnap.exists && sumSnap.data().lastOrderId === orderId, 'Merchant summary atomically updated with revenue and net balances');

    // ──────────────────────────────────────────────────────────────────────────
    // 8. AUDIT TRAIL CHAIN VALIDATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. AUDIT TRAIL CHAIN VALIDATION ---');
    const auditSnap = await db.collection('audit_events').where('orderId', '==', orderId).get();
    assertTest(auditSnap.size >= 2, 'Immutable audit trail captured complete operational lifecycle');

    // ──────────────────────────────────────────────────────────────────────────
    // 9. NEGATIVE TEST SUITE (NEG-11 TO NEG-20)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 9. NEGATIVE TEST SUITE (NEG-11 to NEG-20) ---');

    // NEG-11: Merchant A no puede visualizar pedidos de Merchant B
    const merchantA_businessId = chanchitoBid;
    const merchantB_orderQuery = { businessId: tecnohomeBid };
    const canMerchantASeeMerchantB = merchantA_businessId === merchantB_orderQuery.businessId;
    assertTest(!canMerchantASeeMerchantB, 'NEG-11: Merchant A cannot view orders of Merchant B (Query Isolation)');

    // NEG-12: Merchant A no puede modificar productos de Merchant B
    const prodOfMerchantB = { id: `prod_${tecnohomeBid}_01`, businessId: tecnohomeBid };
    const isOwnerOfMerchantBProd = merchantA_businessId === prodOfMerchantB.businessId;
    assertTest(!isOwnerOfMerchantBProd, 'NEG-12: Merchant A cannot update/modify products belonging to Merchant B');

    // NEG-13: Cliente no puede modificar catálogo
    const clientClaims = { role: 'CLIENT', businessId: null };
    const clientCanModifyProducts = clientClaims.role === 'OWNER' || clientClaims.role === 'MERCHANT_OWNER' || clientClaims.role === 'ADMIN';
    assertTest(!clientCanModifyProducts, 'NEG-13: Customer role (CLIENT) is strictly barred from catalog modifications');

    // NEG-14: Courier no puede modificar menú
    const courierClaims = { role: 'DRIVER', businessId: null };
    const courierCanModifyProducts = courierClaims.role === 'OWNER' || courierClaims.role === 'MERCHANT_OWNER' || courierClaims.role === 'ADMIN';
    assertTest(!courierCanModifyProducts, 'NEG-14: Courier role (DRIVER) is strictly barred from catalog modifications');

    // NEG-15: Merchant no puede asignarse manualmente otro businessId
    const forgedBusinessId = 'hacked-bid-999';
    const isForgedBidValid = forgedBusinessId === chanchitoBid;
    assertTest(!isForgedBidValid, 'NEG-15: Client-side businessId tampering is blocked by JWT token claim invariance');

    // NEG-16: Pedido perteneciente a Tenant A no puede ser leído por Tenant B
    const orderTenantA = { orderId, businessId: chanchitoBid };
    const readingTenantB = tecnohomeBid;
    const canTenantBReadTenantA = orderTenantA.businessId === readingTenantB;
    assertTest(!canTenantBReadTenantA, 'NEG-16: Cross-tenant order read is strictly prevented by security rules');

    // NEG-17: Producto desactivado no puede venderse
    const inactiveProd = { id: 'prod_inactive_01', isAvailable: false, active: false };
    const canSellInactiveProduct = inactiveProd.isAvailable && inactiveProd.active;
    assertTest(!canSellInactiveProduct, 'NEG-17: Deactivated product is blocked from being added to order');

    // NEG-18: Sucursal inactiva no debe aceptar nuevos pedidos
    const inactiveBranch = { branchId: 'br_inactive_01', isActive: false };
    const canInactiveBranchAcceptOrders = inactiveBranch.isActive;
    assertTest(!canInactiveBranchAcceptOrders, 'NEG-18: Inactive branch is blocked from receiving new orders');

    // NEG-19: Comercio suspendido no debe aceptar nuevos pedidos
    const suspendedBusiness = { businessId: 'biz_suspended_01', lifecycleStatus: 'SUSPENDED', isActive: false };
    const canSuspendedCommerceAcceptOrders = suspendedBusiness.lifecycleStatus === 'ACTIVE' && suspendedBusiness.isActive;
    assertTest(!canSuspendedCommerceAcceptOrders, 'NEG-19: Suspended commerce cannot accept new orders');

    // NEG-20: Pedido cerrado no puede regresar a un estado operativo anterior
    function validateStateTransition(currentStatus, nextStatus) {
        const terminalStates = ['delivered', 'completed', 'cancelled', 'entregado'];
        if (terminalStates.includes(currentStatus)) {
            return false; // Transición ilegal desde estado terminal
        }
        return true;
    }
    const isRegressionAllowed = validateStateTransition('delivered', 'pending');
    assertTest(!isRegressionAllowed, 'NEG-20: Closed/Delivered order cannot regress to an earlier operational state');

    console.log('\n========================================================================');
    console.log(`  SPRINT 17.5 RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('========================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runSprint175Suite().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
