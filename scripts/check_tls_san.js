const tls = require('tls');

const host = 'mail.bluesystemdelivery.com';
const port = 465;

const socket = tls.connect({
  host: host,
  port: port,
  servername: host,
  rejectUnauthorized: false,
  timeout: 8000,
}, () => {
  const cert = socket.getPeerCertificate();
  console.log('Subject CN:', cert.subject?.CN);
  console.log('Subject Alt Names (SAN):', cert.subjectaltname);
  console.log('Valid From:', cert.valid_from);
  console.log('Valid To:', cert.valid_to);
  console.log('Protocol:', socket.getProtocol());
  console.log('Authorized:', socket.authorized);
  console.log('Auth Error:', socket.authorizationError);
  socket.end();
});

socket.on('error', (e) => {
  console.error('Socket error:', e.message);
});
