const fs = require('fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

async function testRules() {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    
    const testEnv = await initializeTestEnvironment({
        projectId: 'bluesystem-7c9af',
        firestore: {
            rules,
            host: '127.0.0.1',
            port: 8080
        }
    });

    console.log('Test environment initialized.');
}
