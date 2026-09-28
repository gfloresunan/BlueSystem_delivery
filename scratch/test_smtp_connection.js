const { execSync } = require('child_process');

async function testSmtp() {
    console.log('=== TEST DE CONEXIÓN SMTP Y SECRET SERVICE ===');
    
    // Test Secret Manager via gcloud CLI
    try {
        console.log('Verificando acceso a Google Secret Manager...');
        const secretList = execSync('gcloud secrets list --project=bluesystem-7c9af').toString();
        console.log('Secrets encontrados en el proyecto:');
        console.log(secretList);
    } catch (e) {
        console.error('Error listando secrets con gcloud:', e.message);
    }

    // Test SmtpEmailTransport via functions build
    try {
        const { SmtpEmailTransport } = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/lib/services/emailService');
        const transport = new SmtpEmailTransport();
        console.log('Ejecutando verifyConnectionDetailed()...');
        const result = await transport.verifyConnectionDetailed();
        console.log('Resultado de verificación SMTP:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error ejecutando SmtpEmailTransport:', e.message);
    }
}

testSmtp().catch(console.error);
