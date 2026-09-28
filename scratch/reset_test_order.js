const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function resetOrder() {
    const projectId = 'bluesystem-7c9af';
    const orderId = 'BS2KwLtLRKQAwUALZMEE';
    
    // We update via REST API with gcloud auth
    const patchBody = {
        fields: {
            assignedCourierId: { nullValue: null },
            motorizadoId: { nullValue: null },
            status: { stringValue: 'ready' },
            estado: { stringValue: 'listo' },
            courierPhase: { integerValue: '1' }
        }
    };

    const updateMask = 'updateMask.fieldPaths=assignedCourierId&updateMask.fieldPaths=motorizadoId&updateMask.fieldPaths=status&updateMask.fieldPaths=estado&updateMask.fieldPaths=courierPhase';
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${orderId}?${updateMask}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': projectId
        },
        body: JSON.stringify(patchBody)
    });

    console.log('Order reset HTTP status:', res.status);
    console.log('✅ Test order BS2KwLtLRKQAwUALZMEE is now reset to status: ready, unassigned!');
}

resetOrder().catch(console.error);
