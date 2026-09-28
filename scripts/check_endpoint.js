const https = require('https');

function checkEndpoint(endpointName) {
  return new Promise((resolve) => {
    const url = `https://us-central1-bluesystem-7c9af.cloudfunctions.net/${endpointName}`;
    console.log(`\n--- Testing OPTIONS on ${url} ---`);
    
    const req = https.request(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://admin.bluesystemdelivery.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization,x-firebase-appcheck',
      },
      timeout: 10000,
    }, (res) => {
      console.log(`Status Code: ${res.statusCode} ${res.statusMessage}`);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (body) console.log('Body:', body.substring(0, 300));
        resolve({ endpointName, statusCode: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', (err) => {
      console.error(`Request error on ${endpointName}:`, err.message);
      resolve({ endpointName, error: err.message });
    });

    req.on('timeout', () => {
      console.error(`Request timeout on ${endpointName}`);
      req.destroy();
      resolve({ endpointName, error: 'TIMEOUT' });
    });

    req.end();
  });
}

async function run() {
  await checkEndpoint('adminGetEmailTemplates');
  await checkEndpoint('adminVerifySmtpConnection');
  await checkEndpoint('registerTenantDomain');
}

run();
