process.env.NODE_ENV = 'production';
process.env.GCP_PROJECT = 'bluesystem-7c9af';

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function testRealEmailDelivery() {
    console.log('================================================================');
    console.log('TEST DE DESPACHO DE EMAIL REAL CON PLANTILLA staff_invitation');
    console.log('================================================================\n');

    const { EmailService } = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/lib/services/emailService');

    const recipient = 'videoflorescenteno@gmail.com';
    const testToken = `inv_test_${Date.now()}`;
    const activationLink = `https://comercio.bluesystemdelivery.com/accept-invite?token=${testToken}`;
    const eventId = `staff_inv_test_${Date.now()}`;

    console.log(`Enviando invitación por correo corporativo SMTP a: ${recipient}`);
    console.log(`Activation Link: ${activationLink}`);
    console.log(`Event ID: ${eventId}\n`);

    const result = await EmailService.sendTransactionalEmail({
        eventId,
        eventType: 'STAFF_INVITATION_SENT',
        recipient,
        recipientUid: 'test_uid_verification',
        templateId: 'staff_invitation',
        tenantId: 'ten_bluesystem_core',
        entityType: 'USER',
        entityId: 'test_uid_verification',
        variables: {
            employeeName: 'Carlos Gómez (Prueba Certificación)',
            businessName: 'TECNOSTORE',
            branchName: 'Sucursal Principal',
            roleTitle: 'Cocinero / Operador KDS',
            email: recipient,
            activationLink,
        },
    });

    console.log('Resultado de EmailService:', JSON.stringify(result, null, 2));

    // Verificar en /email_events
    const eventDoc = await db.collection('email_events').doc(eventId).get();
    console.log('\nRegistro en Firestore /email_events:');
    console.log({
        exists: eventDoc.exists,
        status: eventDoc.data()?.status,
        providerMessageId: eventDoc.data()?.providerMessageId,
        sentAt: eventDoc.data()?.sentAt ? eventDoc.data().sentAt.toDate() : null,
        error: eventDoc.data()?.error
    });

    if (result.success && result.status === 'SENT') {
        console.log('\n🟢 CORREO REAL ENTREGADO Y ACEPTADO POR EL PROVEEDOR SMTP: SUCCESS!');
    } else {
        console.log('\n🔴 FALLO EN DESPACHO DE CORREO:', result.error);
        process.exit(1);
    }
}

testRealEmailDelivery().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
