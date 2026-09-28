"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.7 PRODUCTION READINESS CERTIFICATION
 * Configuration Drift Audit
 *
 * PURPOSE: Computes and verifies SHA-256 hashes of critical configuration files
 *          against the C2D.6 certified baseline. Any unexplained drift is flagged.
 *
 * MODE: LOCAL / IN-MEMORY / SIMULATED / ZERO-PRODUCTION
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationDriftAudit = exports.C2D6_BASELINE_HASHES = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// C2D.6 Certified Baseline Hashes (computed and verified in C2D.6 Checkpoint #1)
exports.C2D6_BASELINE_HASHES = {
    'firestore.rules': '6D23B743E208DF2F7AFA257B7FF20B782DBD037E765A4A72868506926125A27B',
    'firestore.indexes.json': '0BC7DB7DAA3201CADC467945CC21067ADC1CBBD7B12B2B451DB11CBFB1D572FC',
    'firebase.json': '9DD203F8D6DE32AFCE9C42B660C770EFFA4FE332303DD24CEEDFBF5BF039782F',
};
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
class ConfigurationDriftAudit {
    /**
     * Computes the SHA-256 hash of a file's contents.
     */
    static computeFileHash(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
        }
        catch (_a) {
            return null;
        }
    }
    /**
     * Runs the full drift audit against the C2D.6 baseline.
     */
    static runDriftAudit(repoRoot) {
        const root = repoRoot !== null && repoRoot !== void 0 ? repoRoot : REPO_ROOT;
        const auditedAt = new Date().toISOString();
        const files = Object.entries(exports.C2D6_BASELINE_HASHES).map(([filename, baselineHash]) => {
            const filePath = path.join(root, filename);
            const currentHash = this.computeFileHash(filePath);
            if (!currentHash) {
                return {
                    filename,
                    relativePath: filename,
                    baselineHash,
                    currentHash: 'HASH_UNAVAILABLE',
                    drift: true,
                    driftPercentage: 'N/A',
                    status: 'FILE_NOT_FOUND',
                    notes: `File not found or unreadable at path: ${filePath}`,
                };
            }
            const drift = currentHash !== baselineHash;
            return {
                filename,
                relativePath: filename,
                baselineHash,
                currentHash,
                drift,
                driftPercentage: drift ? '>0%' : '0.00%',
                status: drift ? 'DRIFT_DETECTED' : 'PASS',
                notes: drift
                    ? `DRIFT: Current hash differs from C2D.6 baseline. Documented reason and impact analysis required before production.`
                    : `VERIFIED: Matches C2D.6 certified baseline exactly.`,
            };
        });
        const driftCount = files.filter(f => f.drift).length;
        const passCount = files.filter(f => !f.drift).length;
        return {
            auditedAt,
            baseline: 'C2D.6',
            files,
            totalFiles: files.length,
            driftCount,
            passCount,
            overallStatus: driftCount === 0 ? 'PASS' : driftCount === files.length ? 'DRIFT_DETECTED' : 'PARTIAL',
        };
    }
    /**
     * Verifies a specific file's hash matches the C2D.6 baseline.
     */
    static verifyFileHash(filename, repoRoot) {
        const root = repoRoot !== null && repoRoot !== void 0 ? repoRoot : REPO_ROOT;
        const expected = exports.C2D6_BASELINE_HASHES[filename];
        if (!expected) {
            return { filename, expected: 'NOT_IN_BASELINE', actual: null, matches: false };
        }
        const actual = this.computeFileHash(path.join(root, filename));
        return { filename, expected, actual, matches: actual === expected };
    }
    /**
     * Provides a simulated drift audit result for test environments where
     * the actual files may not be in the expected relative path.
     */
    static simulatedDriftAudit() {
        const files = [
            {
                filename: 'firestore.rules',
                relativePath: 'firestore.rules',
                baselineHash: exports.C2D6_BASELINE_HASHES['firestore.rules'],
                currentHash: exports.C2D6_BASELINE_HASHES['firestore.rules'], // Simulated match
                drift: false,
                driftPercentage: '0.00%',
                status: 'PASS',
                notes: 'SIMULATED: Matches C2D.6 baseline. No drift detected.',
            },
            {
                filename: 'firestore.indexes.json',
                relativePath: 'firestore.indexes.json',
                baselineHash: exports.C2D6_BASELINE_HASHES['firestore.indexes.json'],
                currentHash: exports.C2D6_BASELINE_HASHES['firestore.indexes.json'],
                drift: false,
                driftPercentage: '0.00%',
                status: 'PASS',
                notes: 'SIMULATED: Matches C2D.6 baseline. No drift detected.',
            },
            {
                filename: 'firebase.json',
                relativePath: 'firebase.json',
                baselineHash: exports.C2D6_BASELINE_HASHES['firebase.json'],
                currentHash: exports.C2D6_BASELINE_HASHES['firebase.json'],
                drift: false,
                driftPercentage: '0.00%',
                status: 'PASS',
                notes: 'SIMULATED: Matches C2D.6 baseline. No drift detected.',
            },
        ];
        return {
            auditedAt: new Date().toISOString(),
            baseline: 'C2D.6',
            files,
            totalFiles: files.length,
            driftCount: 0,
            passCount: files.length,
            overallStatus: 'PASS',
        };
    }
}
exports.ConfigurationDriftAudit = ConfigurationDriftAudit;
//# sourceMappingURL=configurationDriftAudit.js.map