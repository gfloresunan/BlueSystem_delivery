const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function inspectOrderDoc() {
    const projectId = 'bluesystem-7c9af';
    const orderId = 'BS2KwLtLRKQAwUALZMEE';
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${orderId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': projectId
        }
    });
    const docData = await res.json();
    console.log('FULL ORDER DOCUMENT IN FIRESTORE:');
    console.log(JSON.stringify(docData, null, 2));
}

inspectOrderDoc().catch(console.error);
