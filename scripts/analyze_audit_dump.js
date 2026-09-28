const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'governance_audit_dump.json');
const rawData = fs.readFileSync(dumpPath, 'utf8');
const dump = JSON.parse(rawData);

console.log("===============================================================================");
console.log("             FASE A — MATRIZ DE DIAGNÓSTICO DE DATOS Y RELACIONES             ");
console.log("===============================================================================\n");

console.log("1. ORGANIZACIONES (Total:", dump.organizations.length, ")");
dump.organizations.forEach(o => {
    console.log(` - ID: ${o.id} | Name: "${o.nombre || o.name || 'N/A'}" | Status: ${o.status}`);
});

console.log("\n2. COMERCIOS / BUSINESSES (Total:", dump.businesses.length, ")");
dump.businesses.forEach((b, idx) => {
    console.log(`\n [Business #${idx + 1}] ID: ${b.id}`);
    console.log(`   - comercioNombre: "${b.comercioNombre}"`);
    console.log(`   - nombre: "${b.nombre}"`);
    console.log(`   - name: "${b.name}"`);
    console.log(`   - businessName: "${b.businessName}"`);
    console.log(`   - orgId: "${b.orgId}"`);
    console.log(`   - status / lifecycleStatus / active: "${b.status}" / "${b.lifecycleStatus}" / ${b.active}`);
    console.log(`   - applicationId: "${b.applicationId}"`);
    console.log(`   - ownerUid / managerUid: "${b.ownerUid}" / "${b.managerUid}"`);
    console.log(`   - category / categoria: "${b.categoria || b.category}"`);
});

console.log("\n3. SUCURSALES / BRANCHES (Total:", dump.branches.length, ")");
dump.branches.forEach((br, idx) => {
    console.log(`\n [Branch #${idx + 1}] ID: ${br.id}`);
    console.log(`   - nombre: "${br.nombre}"`);
    console.log(`   - name: "${br.name}"`);
    console.log(`   - branchName: "${br.branchName}"`);
    console.log(`   - businessId: "${br.businessId}"`);
    console.log(`   - comercioId: "${br.comercioId}"`);
    console.log(`   - merchantId: "${br.merchantId}"`);
    console.log(`   - orgId: "${br.orgId}"`);
    console.log(`   - direccion / address: "${br.direccion || br.address}"`);
    console.log(`   - locationGPS:`, JSON.stringify(br.locationGPS || { lat: br.lat, lng: br.lng }));
    console.log(`   - radioCoberturaKm / coverageRadiusKm: ${br.radioCoberturaKm || br.coverageRadiusKm}`);
    console.log(`   - managerUid: "${br.managerUid}"`);
});

console.log("\n4. SOLICITUDES ADR-011 / MERCHANT_APPLICATIONS (Total:", dump.merchant_applications.length, ")");
dump.merchant_applications.forEach((ma, idx) => {
    console.log(`\n [Application #${idx + 1}] Doc ID: ${ma.id} | appId: "${ma.appId}"`);
    console.log(`   - businessName: "${ma.businessName}"`);
    console.log(`   - legalName: "${ma.legalName}"`);
    console.log(`   - status: "${ma.status}"`);
    console.log(`   - email: "${ma.email}"`);
    console.log(`   - ruc: "${ma.ruc}"`);
    console.log(`   - generatedOrgId: "${ma.organizationId || ma.generatedOrgId || ma.orgId}"`);
    console.log(`   - generatedBusinessId: "${ma.businessId || ma.generatedBusinessId}"`);
    console.log(`   - generatedBranchId: "${ma.branchId || ma.generatedBranchId}"`);
});

console.log("\n5. USUARIOS CON ROL/DATOS DE COMERCIO (Total:", dump.users_with_business_role.length, ")");
dump.users_with_business_role.forEach((u, idx) => {
    console.log(`\n [User #${idx + 1}] UID: ${u.id}`);
    console.log(`   - nombre / name: "${u.nombre || u.name}"`);
    console.log(`   - comercioNombre: "${u.comercioNombre}"`);
    console.log(`   - role / rol / userType / eiamRole: "${u.role}" / "${u.rol}" / "${u.userType}" / "${u.eiamRole}"`);
    console.log(`   - businessId: "${u.businessId}"`);
    console.log(`   - orgId: "${u.orgId}"`);
    console.log(`   - branchId: "${u.branchId}"`);
});
