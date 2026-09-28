const { GoogleAuth } = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/google-auth-library');

async function listLiveFunctions() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const projectId = 'bluesystem-7c9af';

    try {
        const res = await client.request({
            url: `https://cloudfunctions.googleapis.com/v1/projects/${projectId}/locations/us-central1/functions`
        });
        const functions = (res.data.functions || []).map(f => f.name.split('/').pop());
        console.log(`Total live functions in us-central1: ${functions.length}`);
        console.log('Functions list:\n', functions.sort().join('\n'));
        console.log('\nContains adminGetHeatmapData?', functions.includes('adminGetHeatmapData'));
        console.log('Contains onSupportTicketCreated?', functions.includes('onSupportTicketCreated'));
        console.log('Contains onSupportTicketMessageCreated?', functions.includes('onSupportTicketMessageCreated'));
    } catch (err) {
        console.error('Error listing functions:', err.message);
    }
}

listLiveFunctions().catch(console.error);
