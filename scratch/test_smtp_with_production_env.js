process.env.NODE_ENV = 'production';
process.env.GCP_PROJECT = 'bluesystem-7c9af';

async function run() {
    const { SmtpEmailTransport } = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/lib/services/emailService');
    const transport = new SmtpEmailTransport();
    console.log('Testing verifyConnectionDetailed with NODE_ENV=production...');
    const result = await transport.verifyConnectionDetailed();
    console.log('Verification result:', JSON.stringify(result, null, 2));
}

run().catch(console.error);
