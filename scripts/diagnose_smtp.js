const dns = require('dns');
const net = require('net');
const tls = require('tls');
const nodemailer = require('../functions/node_modules/nodemailer');

const host = 'mail.bluesystemdelivery.com';
const port = 465;
const user = 'noreply@bluesystemdelivery.com';
const pass = process.env.SMTP_PASSWORD; // Must be provided via environment or Secret Manager
console.log('============================================================');
console.log('DIAGNÓSTICO FORENSE DE CONEXIÓN SMTP CORPORATIVO');
console.log('============================================================');
console.log(`Target Host: ${host}`);
console.log(`Target Port: ${port}`);
console.log(`Target User: ${user}`);
console.log(`Password Configured: ${pass ? 'PRESENT (Length: ' + pass.length + ')' : 'MISSING'}`);
console.log('------------------------------------------------------------');

async function testDns() {
  return new Promise((resolve) => {
    console.log('\n[FASE 1] Verificando Resolución DNS...');
    dns.lookup(host, (err, address, family) => {
      if (err) {
        console.error('❌ DNS FAILED:', err.code, err.message);
        resolve({ success: false, error: err });
      } else {
        console.log(`✅ DNS PASS: Host resolvió a IP ${address} (IPv${family})`);
        resolve({ success: true, ip: address });
      }
    });
  });
}

async function testTlsSocket(ip) {
  return new Promise((resolve) => {
    console.log('\n[FASE 2 & 3] Verificando Conexión TCP y Handshake TLS (Puerto 465)...');
    const startTime = Date.now();
    const socket = tls.connect({
      host: host,
      port: port,
      servername: host,
      rejectUnauthorized: false,
      timeout: 10000,
    }, () => {
      const elapsed = Date.now() - startTime;
      console.log(`✅ TCP & TLS PASS: Handshake completado en ${elapsed}ms`);
      console.log(`   Protocolo: ${socket.getProtocol()}`);
      console.log(`   Cipher: ${JSON.stringify(socket.getCipher())}`);
      const cert = socket.getPeerCertificate();
      console.log(`   Certificado Subject:`, cert?.subject?.CN || 'N/A');
      console.log(`   Certificado Issuer:`, cert?.issuer?.O || cert?.issuer?.CN || 'N/A');
      console.log(`   Certificado Válido Hasta:`, cert?.valid_to || 'N/A');
      
      let greeting = '';
      socket.on('data', (d) => {
        greeting += d.toString();
        if (greeting.includes('220')) {
          console.log(`✅ [FASE 4] SMTP Greeting Recibido: ${greeting.trim()}`);
          socket.end();
          resolve({ success: true });
        }
      });
    });

    socket.on('error', (err) => {
      console.error('❌ TLS / TCP FAILED:', err.code, err.message);
      resolve({ success: false, error: err.message });
    });

    socket.on('timeout', () => {
      console.error('❌ TIMEOUT: Socket timed out tras 10s');
      socket.destroy();
      resolve({ success: false, error: 'ETIMEDOUT' });
    });
  });
}

async function testNodemailer() {
  return new Promise(async (resolve) => {
    console.log('\n[FASE 5 & 6] Verificando Autenticación SMTP vía Nodemailer...');
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: true,
      auth: {
        user: user,
        pass: pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });

    try {
      await transporter.verify();
      console.log('✅ [FASE 6] SMTP VERIFY SUCCESS: Servidor SMTP listo para recibir mensajes!');
      resolve({ success: true });
    } catch (err) {
      console.error('❌ SMTP VERIFY FAILED:');
      console.error(`   Error Code: ${err.code || 'N/A'}`);
      console.error(`   Response Code: ${err.responseCode || 'N/A'}`);
      console.error(`   Command: ${err.command || 'N/A'}`);
      console.error(`   Message: ${err.message}`);
      resolve({ success: false, error: err });
    }
  });
}

async function run() {
  const dnsRes = await testDns();
  if (dnsRes.success) {
    await testTlsSocket(dnsRes.ip);
    await testNodemailer();
  }
}

run();
