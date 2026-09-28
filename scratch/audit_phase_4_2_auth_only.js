const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/scratch/raw_snapshot_phase_4_0.json', 'utf8'));

const authUsers = raw.authUsers;
const firestoreUsers = raw.firestoreUsers;
const memberships = raw.memberships;
const employees = raw.employees;
const businesses = raw.businesses;
const branches = raw.branches;
const userDevices = raw.userDevices;
const legacyDevices = raw.legacyDevices;

const fsUserMap = new Map();
firestoreUsers.forEach(u => fsUserMap.set(u.id, u));

const authOnly = authUsers.filter(u => !fsUserMap.has(u.uid));

console.log(`Found ${authOnly.length} Auth-Only users.\n`);

const results = [];

authOnly.forEach((u, idx) => {
    const uid = u.uid;
    const email = u.email ? u.email.toLowerCase().trim() : null;

    console.log(`[TARGET ${idx + 1}] UID: ${uid} | Email: ${email}`);

    // Check direct /users
    const directUser = fsUserMap.get(uid);

    // Check indirect /users by email
    const usersByEmail = email ? firestoreUsers.filter(f => f.email && f.email.toLowerCase().trim() === email) : [];

    // Check /membership by uid or email
    const memByUid = memberships.filter(m => m.uid === uid || m.userId === uid);
    const memByEmail = email ? memberships.filter(m => m.email && m.email.toLowerCase().trim() === email) : [];

    // Check /employees by uid or email
    const empByUid = employees.filter(e => e.uid === uid || e.userId === uid);
    const empByEmail = email ? employees.filter(e => e.email && e.email.toLowerCase().trim() === email) : [];

    // Check /businesses by ownerId, createdBy, or email
    const bizByOwner = businesses.filter(b => b.ownerId === uid || b.userId === uid || b.createdBy === uid);
    const bizByEmail = email ? businesses.filter(b => (b.email && b.email.toLowerCase().trim() === email) || (b.contactEmail && b.contactEmail.toLowerCase().trim() === email)) : [];

    // Check /branches by managerId, createdBy
    const branchByOwner = branches.filter(br => br.managerId === uid || br.userId === uid || br.createdBy === uid);

    // Check /user_devices & /devices
    const uDevs = userDevices.filter(d => d.uid === uid || d.userId === uid);
    const legDevs = legacyDevices.filter(d => d.uid === uid || d.userId === uid);

    // Claims
    const claims = u.customClaims || {};

    // Analyze Identity History & Classification
    let classification = 'ORPHAN_AUTH';
    let risk = 'LOW';
    let confidence = 'HIGH';
    let primaryReason = '';
    let duplicateNote = 'NO_DUPLICATE';

    if (usersByEmail.length > 0) {
        classification = 'DUPLICATE_AUTH_ACCOUNT';
        risk = 'MEDIUM';
        confidence = 'HIGH';
        primaryReason = `User with email '${email}' exists under different Firestore document ID(s): [${usersByEmail.map(x => x.id).join(', ')}]`;
        duplicateNote = `POSSIBLE_DUPLICATE with ${usersByEmail.map(x => x.id).join(', ')}`;
    } else if (email && (email.includes('test') || email.includes('ecnocomp') || email.startsWith('admin@'))) {
        classification = 'TEST_AUTH_ONLY';
        risk = 'LOW';
        confidence = 'HIGH';
        primaryReason = `Typo or test registration pattern (e.g. '${email}') with 0 Firestore records.`;
    } else if (email && ['junior@gmail.com', 'aldrich@gmail.com', 'pcenteno@gmail.com', 'moises@gmail.com', 'fritoni@gmail.com'].includes(email)) {
        classification = 'LEGACY_TEST_SIGNUP';
        risk = 'MEDIUM';
        confidence = 'HIGH';
        primaryReason = `Test login created during development for email '${email}'. Production merchant/user operates under canonical UID.`;
        duplicateNote = `Development personal email for operator`;
    }

    const item = {
        uid,
        email,
        displayName: u.displayName,
        phoneNumber: u.phoneNumber,
        disabled: u.disabled,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        providers: u.providerData,
        customClaims: claims,
        evidence: {
            directUserExists: Boolean(directUser),
            usersByEmail: usersByEmail.map(x => ({ id: x.id, nombre: x.nombre || x.name, role: x.role, businessId: x.businessId })),
            membershipsByUid: memByUid,
            membershipsByEmail: memByEmail,
            employeesByUid: empByUid,
            employeesByEmail: empByEmail,
            businessesByOwner: bizByOwner.map(b => ({ id: b.id, name: b.name })),
            businessesByEmail: bizByEmail.map(b => ({ id: b.id, name: b.name })),
            branchesByOwner: branchByOwner.map(br => ({ id: br.id, name: br.name })),
            userDevices: uDevs,
            legacyDevices: legDevs
        },
        classification,
        risk,
        confidence,
        primaryReason,
        duplicateNote,
        futureRecommendation: classification === 'TEST_AUTH_ONLY' || classification === 'LEGACY_TEST_SIGNUP' ? 'CANDIDATE_FOR_DELETION' : 'MANUAL_REVIEW'
    };

    results.push(item);
});

fs.writeFileSync('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/scratch/processed_phase_4_2.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Saved scratch/processed_phase_4_2.json');
