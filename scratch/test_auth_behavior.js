const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function checkExistingUsers() {
    console.log("=== COMPROBANDO USUARIOS EN AUTH Y COMPORTAMIENTO DE sendOobCode ===");
    
    // List some users from Auth
    const listRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:batchGet?maxResults=10', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': 'bluesystem-7c9af'
        }
    });
    const listData = await listRes.json();
    console.log(`Usuarios en Auth (primeros ${listData.users?.length || 0}):`);
    if (listData.users) {
        listData.users.forEach(u => console.log(` - UID: ${u.localId}, Email: ${u.email}`));
    }

    if (listData.users && listData.users.length > 0) {
        const existingEmail = listData.users[0].email;
        console.log(`\nProbando sendOobCode para usuario EXISTENTE en Auth (${existingEmail})...`);
        const res1 = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:sendOobCode', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-goog-user-project': 'bluesystem-7c9af'
            },
            body: JSON.stringify({
                requestType: "PASSWORD_RESET",
                email: existingEmail,
                returnOobLink: true
            })
        });
        const data1 = await res1.json();
        console.log("Status existente:", res1.status);
        console.log("Data existente:", JSON.stringify(data1, null, 2));
    }

    console.log(`\nProbando sendOobCode para email INEXISTENTE en Auth (noexiste@test.com)...`);
    const res2 = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:sendOobCode', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: "noexiste@test.com",
            returnOobLink: true
        })
    });
    const data2 = await res2.json();
    console.log("Status inexistente:", res2.status);
    console.log("Data inexistente:", JSON.stringify(data2, null, 2));
}

checkExistingUsers().catch(console.error);
