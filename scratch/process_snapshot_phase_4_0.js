const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/scratch/raw_snapshot_phase_4_0.json', 'utf8'));

const authUsers = raw.authUsers;
const firestoreUsers = raw.firestoreUsers;
const memberships = raw.memberships;
const employees = raw.employees;
const businesses = raw.businesses;
const branches = raw.branches;
const userDevices = raw.userDevices;
const legacyDevices = raw.legacyDevices;

console.log('=== FORENSIC ANALYSIS OF PRODUCTION IDENTITY SNAPSHOT ===\n');

// 1. Map Auth and Firestore UIDs
const authMap = new Map();
authUsers.forEach(u => authMap.set(u.uid, u));

const fsMap = new Map();
firestoreUsers.forEach(u => fsMap.set(u.id, u));

// 2. Reconciliation UID Auth <-> Users
const allUids = Array.from(new Set([...authMap.keys(), ...fsMap.keys()]));
let matchedCount = 0;
let authOnlyCount = 0;
let fsOnlyCount = 0;

const matchedList = [];
const authOnlyList = [];
const fsOnlyList = [];

allUids.forEach(uid => {
    const inAuth = authMap.has(uid);
    const inFs = fsMap.has(uid);
    if (inAuth && inFs) {
        matchedCount++;
        matchedList.push(uid);
    } else if (inAuth && !inFs) {
        authOnlyCount++;
        authOnlyList.push(uid);
    } else if (!inAuth && inFs) {
        fsOnlyCount++;
        fsOnlyList.push(uid);
    }
});

console.log(`TOTAL ALL IDENTITIES = ${allUids.length}`);
console.log(`TOTAL AUTH USERS = ${authUsers.length}`);
console.log(`TOTAL FIRESTORE USERS = ${firestoreUsers.length}`);
console.log(`MATCHED AUTH <-> USERS = ${matchedCount}`);
console.log(`AUTH ONLY = ${authOnlyCount}`);
console.log(`FIRESTORE ONLY = ${fsOnlyCount}`);

// 3. Role Reconciliation
function resolveEiamRole(doc) {
    if (!doc) return 'CLIENT';
    const raw = (doc.role || doc.eiamRole || doc.rol || doc.userType || '').toString().toLowerCase().trim();
    const map = {
        super_admin: 'SUPER_ADMIN', superadmin: 'SUPER_ADMIN', gerente_general: 'SUPER_ADMIN',
        admin: 'ADMIN', administrator: 'ADMIN', auditor: 'AUDITOR', support: 'SUPPORT', soporte: 'SUPPORT',
        owner: 'OWNER', business: 'OWNER', comercio: 'OWNER', merchant: 'OWNER', negocio: 'OWNER', empresa: 'OWNER',
        propietario: 'OWNER', business_owner: 'OWNER', merchant_owner: 'OWNER',
        manager: 'MANAGER', gerente: 'MANAGER', supervisor: 'SUPERVISOR',
        cashier: 'CASHIER', cajero: 'CASHIER', caja: 'CASHIER', seller: 'CASHIER',
        cook: 'COOK', cocinero: 'COOK', cocina: 'COOK', kitchen: 'COOK',
        driver: 'DRIVER', motorizado: 'DRIVER', courier: 'DRIVER', repartidor: 'DRIVER', deliverer: 'DRIVER',
        client: 'CLIENT', customer: 'CLIENT', cliente: 'CLIENT', user: 'CLIENT', usuario: 'CLIENT',
        guest: 'GUEST', anonymous: 'GUEST', invitado: 'GUEST'
    };
    return map[raw] || 'CLIENT';
}

function resolveStatus(doc) {
    if (!doc) return 'ACTIVE';
    if (doc.status && typeof doc.status === 'string') {
        const s = doc.status.toUpperCase().trim();
        if (['ACTIVE', 'PENDING', 'BLOCKED', 'SUSPENDED', 'TERMINATED'].includes(s)) return s;
    }
    if (doc.isActive === false || doc.active === false) return 'BLOCKED';
    return 'ACTIVE';
}

let canonicalRoleClean = 0;
let roleLegacyCompatible = 0;
let roleConflicts = 0;
let unknownRoles = 0;

let statusConsistent = 0;
let statusConflicts = 0;
let authDisabledConflicts = 0;

let claimsSynced = 0;
let claimsStale = 0;
let claimsMissing = 0;
let claimsCritical = 0;

const identityAuditList = [];
const proposals = [];

allUids.forEach(uid => {
    const authUser = authMap.get(uid);
    const fsUser = fsMap.get(uid);

    const resolvedRole = fsUser ? resolveEiamRole(fsUser) : (authUser && authUser.customClaims && authUser.customClaims.role ? authUser.customClaims.role : 'CLIENT');
    const resolvedStatus = fsUser ? resolveStatus(fsUser) : 'ACTIVE';
    const authDisabled = authUser ? authUser.disabled : false;
    const expectedDisabled = resolvedStatus !== 'ACTIVE' && resolvedStatus !== 'PENDING';

    // Role classification
    let roleClass = 'R0'; // Clean
    let roleConflictDesc = 'CLEAN';
    if (fsUser) {
        const hasRole = Boolean(fsUser.role);
        const hasLegacy = Boolean(fsUser.eiamRole || fsUser.rol || fsUser.userType);
        const rawRoleVal = fsUser.role || '';
        const isUpperEiam = ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPPORT', 'OWNER', 'MANAGER', 'SUPERVISOR', 'CASHIER', 'COOK', 'DRIVER', 'CLIENT', 'GUEST'].includes(rawRoleVal);

        if (isUpperEiam && !hasLegacy) {
            roleClass = 'R0';
            canonicalRoleClean++;
        } else if (isUpperEiam && hasLegacy) {
            roleClass = 'R1';
            roleLegacyCompatible++;
            roleConflictDesc = 'CANONICAL_ROLE + LEGACY_FIELDS';
        } else if (!isUpperEiam && hasRole) {
            roleClass = 'R1';
            roleLegacyCompatible++;
            roleConflictDesc = `LEGACY_STRING (${rawRoleVal}) -> ${resolvedRole}`;
        } else if (!hasRole && hasLegacy) {
            roleClass = 'R2';
            roleConflicts++;
            roleConflictDesc = 'MISSING_CANONICAL_ROLE';
        } else {
            roleClass = 'R6';
            roleLegacyCompatible++;
            roleConflictDesc = 'DEFAULT_FALLBACK_CLIENT';
        }
    } else {
        roleClass = 'R6';
        roleConflictDesc = 'AUTH_ONLY_IDENTITY';
    }

    // Status classification
    let statusClass = 'S0';
    let statusConflictDesc = 'CONSISTENT';
    if (authDisabled !== expectedDisabled) {
        statusClass = authDisabled ? 'S1' : 'S2';
        authDisabledConflicts++;
        statusConflicts++;
        statusConflictDesc = authDisabled ? 'AUTH_DISABLED_BUT_FIRESTORE_ACTIVE' : 'FIRESTORE_BLOCKED_BUT_AUTH_ENABLED';
    } else {
        statusConsistent++;
    }

    // Claims classification
    const claims = authUser ? authUser.customClaims : null;
    let claimsClass = 'C0';
    let claimsResult = 'MATCH';
    const expectedBusiness = fsUser ? (fsUser.businessId || null) : null;
    const expectedBranch = fsUser ? (fsUser.branchId || null) : null;

    if (!authUser) {
        claimsClass = 'C7';
        claimsResult = 'NO_AUTH_RECORD';
    } else if (!claims || Object.keys(claims).length === 0) {
        claimsClass = 'C6';
        claimsMissing++;
        claimsResult = 'CLAIMS_MISSING';
    } else {
        const roleMatches = claims.role === resolvedRole;
        const bizMatches = (claims.businessId || null) === expectedBusiness;
        const branchMatches = (claims.branchId || null) === expectedBranch;

        if (roleMatches && bizMatches && branchMatches) {
            claimsClass = 'C0';
            claimsSynced++;
            claimsResult = 'CLAIMS_SYNCED';
        } else if (!roleMatches && bizMatches) {
            claimsClass = 'C1';
            claimsStale++;
            claimsResult = `ROLE_CLAIM_STALE (Claims: ${claims.role} vs Exp: ${resolvedRole})`;
        } else if (!bizMatches) {
            claimsClass = 'C2';
            claimsStale++;
            claimsCritical++;
            claimsResult = `BUSINESS_CLAIM_STALE (Claims: ${claims.businessId} vs Exp: ${expectedBusiness})`;
        } else {
            claimsClass = 'C8';
            claimsStale++;
            claimsResult = 'MULTIPLE_DIFFERENCES';
        }
    }

    // Memberships for this UID
    const userMems = memberships.filter(m => m.uid === uid);
    // Devices for this UID
    const userDevs = userDevices.filter(d => d.uid === uid);

    // Identity overall classification
    let overallSeverity = 'CLEAN';
    if (statusClass !== 'S0' || claimsClass === 'C2' || roleClass === 'R4' || roleClass === 'R5') {
        overallSeverity = 'CRITICAL';
    } else if (roleClass === 'R2' || claimsClass === 'C1' || claimsClass === 'C6' || !fsUser) {
        overallSeverity = 'MIGRATION_REQUIRED';
    } else if (roleClass === 'R1' || (fsUser && !fsUser.status)) {
        overallSeverity = 'LEGACY_COMPATIBLE';
    }

    // Build proposal if migration required or legacy compatible
    if (overallSeverity !== 'CLEAN') {
        proposals.push({
            uid,
            email: (fsUser && fsUser.email) || (authUser && authUser.email) || null,
            severity: overallSeverity,
            roleProposal: {
                current: {
                    role: fsUser ? fsUser.role : null,
                    eiamRole: fsUser ? fsUser.eiamRole : null,
                    rol: fsUser ? fsUser.rol : null,
                    userType: fsUser ? fsUser.userType : null
                },
                proposed: { role: resolvedRole }
            },
            statusProposal: {
                current: {
                    status: fsUser ? fsUser.status : null,
                    isActive: fsUser ? fsUser.isActive : null,
                    authDisabled
                },
                proposed: {
                    status: resolvedStatus,
                    authDisabled: expectedDisabled
                }
            },
            claimsProposal: {
                current: claims,
                proposed: {
                    role: resolvedRole,
                    businessId: expectedBusiness,
                    branchId: expectedBranch,
                    orgId: fsUser ? (fsUser.orgId || null) : null
                }
            }
        });
    }

    identityAuditList.push({
        uid,
        email: (fsUser && fsUser.email) || (authUser && authUser.email) || 'N/A',
        nombre: fsUser ? (fsUser.nombre || fsUser.name || 'N/A') : 'N/A',
        inAuth: Boolean(authUser),
        inFs: Boolean(fsUser),
        role: fsUser ? fsUser.role : 'N/A',
        eiamRole: fsUser ? fsUser.eiamRole : 'N/A',
        rol: fsUser ? fsUser.rol : 'N/A',
        userType: fsUser ? fsUser.userType : 'N/A',
        resolvedRole,
        roleClass,
        roleConflictDesc,
        status: fsUser ? fsUser.status : 'N/A',
        isActive: fsUser ? fsUser.isActive : 'N/A',
        authDisabled,
        resolvedStatus,
        statusClass,
        statusConflictDesc,
        claims: claims || {},
        claimsClass,
        claimsResult,
        membershipCount: userMems.length,
        deviceCount: userDevs.length,
        businessId: expectedBusiness,
        branchId: expectedBranch,
        severity: overallSeverity
    });
});

const totalClean = identityAuditList.filter(i => i.severity === 'CLEAN').length;
const totalLegacyCompat = identityAuditList.filter(i => i.severity === 'LEGACY_COMPATIBLE').length;
const totalMigRequired = identityAuditList.filter(i => i.severity === 'MIGRATION_REQUIRED').length;
const totalCritical = identityAuditList.filter(i => i.severity === 'CRITICAL').length;
const migrationReadiness = ((totalClean + totalLegacyCompat) / identityAuditList.length * 100).toFixed(2);

console.log(`\n=== METRICS SUMMARY ===`);
console.log(`CANONICAL ROLE CLEAN = ${canonicalRoleClean}`);
console.log(`ROLE LEGACY COMPATIBLE = ${roleLegacyCompatible}`);
console.log(`ROLE CONFLICTS = ${roleConflicts}`);
console.log(`UNKNOWN ROLES = ${unknownRoles}`);
console.log(`STATUS CONSISTENT = ${statusConsistent}`);
console.log(`STATUS CONFLICTS = ${statusConflicts}`);
console.log(`AUTH DISABLED CONFLICTS = ${authDisabledConflicts}`);
console.log(`CLAIMS SYNCED = ${claimsSynced}`);
console.log(`CLAIMS STALE = ${claimsStale}`);
console.log(`CLAIMS MISSING = ${claimsMissing}`);
console.log(`CLAIMS CRITICAL = ${claimsCritical}`);
console.log(`TOTAL CLEAN = ${totalClean}`);
console.log(`TOTAL LEGACY COMPATIBLE = ${totalLegacyCompat}`);
console.log(`TOTAL MIGRATION REQUIRED = ${totalMigRequired}`);
console.log(`TOTAL CRITICAL = ${totalCritical}`);
console.log(`MIGRATION READINESS SCORE = ${migrationReadiness}%`);

// Super Admin Check
const superAdmins = identityAuditList.filter(i => i.resolvedRole === 'SUPER_ADMIN');
console.log(`\nSUPER_ADMIN COUNT = ${superAdmins.length}`);
superAdmins.forEach(sa => {
    console.log(`  UID: ${sa.uid} | Email: ${sa.email} | Claims Role: ${sa.claims.role} | Status: ${sa.resolvedStatus} | Severity: ${sa.severity}`);
});

// Write analysis out
fs.writeFileSync('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/scratch/processed_audit_phase_4_0.json', JSON.stringify({
    summary: {
        totalIdentities: identityAuditList.length,
        authUsersCount: authUsers.length,
        firestoreUsersCount: firestoreUsers.length,
        matchedCount,
        authOnlyCount,
        fsOnlyCount,
        canonicalRoleClean,
        roleLegacyCompatible,
        roleConflicts,
        unknownRoles,
        statusConsistent,
        statusConflicts,
        authDisabledConflicts,
        claimsSynced,
        claimsStale,
        claimsMissing,
        claimsCritical,
        membershipsCount: memberships.length,
        employeesCount: employees.length,
        businessesCount: businesses.length,
        branchesCount: branches.length,
        userDevicesCount: userDevices.length,
        legacyDevicesCount: legacyDevices.length,
        totalClean,
        totalLegacyCompat,
        totalMigRequired,
        totalCritical,
        migrationReadiness: `${migrationReadiness}%`
    },
    superAdmins,
    identityAuditList,
    proposals
}, null, 2), 'utf8');

console.log('\nProcessed audit saved to scratch/processed_audit_phase_4_0.json');
