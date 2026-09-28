const https = require('https');

const endpoints = [
  'adminGetEmailTemplates',
  'adminVerifySmtpConnection',
  'adminUpdateUser',
  'submitMerchantApplication',
  'calculateDeliveryRouteCallable',
  'registerTenantDomain'
];

function check(name) {
  return new Promise((res) => {
    const url = `https://us-central1-bluesystem-7c9af.cloudfunctions.net/${name}`;
    const req = https.request(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://admin.bluesystemdelivery.com',
        'Access-Control-Request-Method': 'POST',
      },
      timeout: 5000,
    }, (response) => {
      console.log(`Endpoint: ${name.padEnd(30)} -> Status: ${response.statusCode} ${response.statusMessage}`);
      res();
    });
    req.on('error', (e) => {
      console.log(`Endpoint: ${name.padEnd(30)} -> Error: ${e.message}`);
      res();
    });
    req.end();
  });
}

async function main() {
  for (const ep of endpoints) {
    await check(ep);
  }
}
main();
