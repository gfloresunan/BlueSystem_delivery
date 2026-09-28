const https = require('https');

https.get('https://bluesystem-7c9af.web.app/js/dashboard/deliveryExpress.js?v=6.1.1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Has v6.1.1:', data.includes('BlueSystem Delivery Enterprise v6.1.1'));
    console.log('Has .doc(\'global\'):', data.includes(".doc('global')"));
    console.log('Has .document(\'global\'):', data.includes(".document('global')"));
    console.log('Has .doc(courierId):', data.includes(".doc(courierId)"));
    console.log('Has .document(courierId):', data.includes(".document(courierId)"));
  });
});
