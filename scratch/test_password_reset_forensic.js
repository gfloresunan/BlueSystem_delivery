const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

async function testPasswordReset() {
    console.log("=== DIAGNÓSTICO FORENSE: PASSWORD RESET LINK ===");
    const targetUid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2";
    const expectedEmail = "tecnostore@bluesystemdelivery.com";

    try {
        console.log(`1. Obteniendo usuario Auth para UID: ${targetUid}`);
        const userRecord = await admin.auth().getUser(targetUid);
        console.log("UserRecord Auth encontrado:", {
            uid: userRecord.uid,
            email: userRecord.email,
            emailVerified: userRecord.emailVerified,
            disabled: userRecord.disabled,
            providerData: userRecord.providerData.map(p => ({ providerId: p.providerId, email: p.email })),
            customClaims: userRecord.customClaims
        });

        console.log(`2. Intentando generatePasswordResetLink sin ActionCodeSettings para ${userRecord.email}...`);
        try {
            const link1 = await admin.auth().generatePasswordResetLink(userRecord.email);
            console.log("Link generado con éxito (sin settings):", link1 ? "SI (longitud " + link1.length + ")" : "NO");
        } catch (err1) {
            console.error("Error al generar sin settings:", {
                code: err1.code,
                message: err1.message,
                stack: err1.stack
            });
        }

        console.log(`3. Intentando generatePasswordResetLink con ActionCodeSettings...`);
        const actionCodeSettings = {
            url: 'https://bluesystem-7c9af.web.app',
            handleCodeInApp: false
        };
        try {
            const link2 = await admin.auth().generatePasswordResetLink(userRecord.email, actionCodeSettings);
            console.log("Link generado con éxito (con settings):", link2 ? "SI (longitud " + link2.length + ")" : "NO");
        } catch (err2) {
            console.error("Error al generar con settings:", {
                code: err2.code,
                message: err2.message,
                stack: err2.stack
            });
        }

    } catch (e) {
        console.error("Error fatal en diagnóstico:", e);
    }
}

testPasswordReset().then(() => console.log("Fin diagnóstico")).catch(console.error);
