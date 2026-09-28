"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION RESPONSIBILITY MATRIX
 *
 * PURPOSE: Defines explicit RACI/Responsibility assignments (Owner, Approver,
 *          Executor, Observer) for all activation critical paths.
 *          Unassigned roles are strictly marked UNDEFINED (governance gaps).
 *
 * GOVERNANCE: Non-assumptive governance model. Gaps must be surfaced explicitly.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationResponsibilityMatrixBuilder = void 0;
class ActivationResponsibilityMatrixBuilder {
    /**
     * Constructs the formal responsibility matrix for controlled activation.
     */
    static buildMatrix(assignments) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23;
        const now = Date.now();
        const defaultEntries = [
            {
                responsibility: 'Activation',
                owner: (_b = (_a = assignments === null || assignments === void 0 ? void 0 : assignments['Activation']) === null || _a === void 0 ? void 0 : _a.owner) !== null && _b !== void 0 ? _b : 'LEAD_ARCHITECT',
                approver: (_d = (_c = assignments === null || assignments === void 0 ? void 0 : assignments['Activation']) === null || _c === void 0 ? void 0 : _c.approver) !== null && _d !== void 0 ? _d : 'SYSTEM_OWNER',
                executor: (_f = (_e = assignments === null || assignments === void 0 ? void 0 : assignments['Activation']) === null || _e === void 0 ? void 0 : _e.executor) !== null && _f !== void 0 ? _f : 'RELEASE_ENGINEER',
                observer: (_h = (_g = assignments === null || assignments === void 0 ? void 0 : assignments['Activation']) === null || _g === void 0 ? void 0 : _g.observer) !== null && _h !== void 0 ? _h : 'SECURITY_AUDITOR',
            },
            {
                responsibility: 'Deployment',
                owner: (_k = (_j = assignments === null || assignments === void 0 ? void 0 : assignments['Deployment']) === null || _j === void 0 ? void 0 : _j.owner) !== null && _k !== void 0 ? _k : 'DEVOPS_LEAD',
                approver: (_m = (_l = assignments === null || assignments === void 0 ? void 0 : assignments['Deployment']) === null || _l === void 0 ? void 0 : _l.approver) !== null && _m !== void 0 ? _m : 'SYSTEM_OWNER',
                executor: (_p = (_o = assignments === null || assignments === void 0 ? void 0 : assignments['Deployment']) === null || _o === void 0 ? void 0 : _o.executor) !== null && _p !== void 0 ? _p : 'CI_CD_SERVICE_ACTOR',
                observer: (_r = (_q = assignments === null || assignments === void 0 ? void 0 : assignments['Deployment']) === null || _q === void 0 ? void 0 : _q.observer) !== null && _r !== void 0 ? _r : 'SECURITY_AUDITOR',
            },
            {
                responsibility: 'Claims',
                owner: (_t = (_s = assignments === null || assignments === void 0 ? void 0 : assignments['Claims']) === null || _s === void 0 ? void 0 : _s.owner) !== null && _t !== void 0 ? _t : 'SECURITY_LEAD',
                approver: (_v = (_u = assignments === null || assignments === void 0 ? void 0 : assignments['Claims']) === null || _u === void 0 ? void 0 : _u.approver) !== null && _v !== void 0 ? _v : 'SYSTEM_OWNER',
                executor: (_x = (_w = assignments === null || assignments === void 0 ? void 0 : assignments['Claims']) === null || _w === void 0 ? void 0 : _w.executor) !== null && _x !== void 0 ? _x : 'CLAIMS_ENGINE_SERVICE',
                observer: (_z = (_y = assignments === null || assignments === void 0 ? void 0 : assignments['Claims']) === null || _y === void 0 ? void 0 : _y.observer) !== null && _z !== void 0 ? _z : 'AUDIT_LOG_COLLECTOR',
            },
            {
                responsibility: 'Migration',
                owner: (_1 = (_0 = assignments === null || assignments === void 0 ? void 0 : assignments['Migration']) === null || _0 === void 0 ? void 0 : _0.owner) !== null && _1 !== void 0 ? _1 : 'DATABASE_LEAD',
                approver: (_3 = (_2 = assignments === null || assignments === void 0 ? void 0 : assignments['Migration']) === null || _2 === void 0 ? void 0 : _2.approver) !== null && _3 !== void 0 ? _3 : 'SYSTEM_OWNER',
                executor: (_5 = (_4 = assignments === null || assignments === void 0 ? void 0 : assignments['Migration']) === null || _4 === void 0 ? void 0 : _4.executor) !== null && _5 !== void 0 ? _5 : 'MIGRATION_RUNNER',
                observer: (_7 = (_6 = assignments === null || assignments === void 0 ? void 0 : assignments['Migration']) === null || _6 === void 0 ? void 0 : _6.observer) !== null && _7 !== void 0 ? _7 : 'DATA_AUDITOR',
            },
            {
                responsibility: 'Rollback',
                owner: (_9 = (_8 = assignments === null || assignments === void 0 ? void 0 : assignments['Rollback']) === null || _8 === void 0 ? void 0 : _8.owner) !== null && _9 !== void 0 ? _9 : 'INCIDENT_COMMANDER',
                approver: (_11 = (_10 = assignments === null || assignments === void 0 ? void 0 : assignments['Rollback']) === null || _10 === void 0 ? void 0 : _10.approver) !== null && _11 !== void 0 ? _11 : 'LEAD_ARCHITECT',
                executor: (_13 = (_12 = assignments === null || assignments === void 0 ? void 0 : assignments['Rollback']) === null || _12 === void 0 ? void 0 : _12.executor) !== null && _13 !== void 0 ? _13 : 'AUTOMATED_ROLLBACK_ENGINE',
                observer: (_15 = (_14 = assignments === null || assignments === void 0 ? void 0 : assignments['Rollback']) === null || _14 === void 0 ? void 0 : _14.observer) !== null && _15 !== void 0 ? _15 : 'ALL_STAKEHOLDERS',
            },
            {
                responsibility: 'Security',
                owner: (_17 = (_16 = assignments === null || assignments === void 0 ? void 0 : assignments['Security']) === null || _16 === void 0 ? void 0 : _16.owner) !== null && _17 !== void 0 ? _17 : 'SECURITY_OFFICER',
                approver: (_19 = (_18 = assignments === null || assignments === void 0 ? void 0 : assignments['Security']) === null || _18 === void 0 ? void 0 : _18.approver) !== null && _19 !== void 0 ? _19 : 'SYSTEM_OWNER',
                executor: (_21 = (_20 = assignments === null || assignments === void 0 ? void 0 : assignments['Security']) === null || _20 === void 0 ? void 0 : _20.executor) !== null && _21 !== void 0 ? _21 : 'SECURITY_AGENT',
                observer: (_23 = (_22 = assignments === null || assignments === void 0 ? void 0 : assignments['Security']) === null || _22 === void 0 ? void 0 : _22.observer) !== null && _23 !== void 0 ? _23 : 'COMPLIANCE_OFFICER',
            },
        ];
        const entries = defaultEntries.map(entry => {
            var _a, _b, _c, _d;
            const custom = assignments === null || assignments === void 0 ? void 0 : assignments[entry.responsibility];
            if (!custom)
                return entry;
            return {
                responsibility: entry.responsibility,
                owner: (_a = custom.owner) !== null && _a !== void 0 ? _a : entry.owner,
                approver: (_b = custom.approver) !== null && _b !== void 0 ? _b : entry.approver,
                executor: (_c = custom.executor) !== null && _c !== void 0 ? _c : entry.executor,
                observer: (_d = custom.observer) !== null && _d !== void 0 ? _d : entry.observer,
            };
        });
        const governanceGaps = [];
        for (const entry of entries) {
            const roles = [
                ['owner', entry.owner],
                ['approver', entry.approver],
                ['executor', entry.executor],
                ['observer', entry.observer],
            ];
            for (const [roleName, actor] of roles) {
                if (actor === 'UNDEFINED' || !actor || actor.trim().length === 0) {
                    governanceGaps.push(`${entry.responsibility}.${roleName} is UNDEFINED`);
                }
            }
        }
        return {
            matrixId: `resp-matrix-${now}`,
            entries,
            governanceGaps,
            timestamp: now,
        };
    }
}
exports.ActivationResponsibilityMatrixBuilder = ActivationResponsibilityMatrixBuilder;
//# sourceMappingURL=activationResponsibilityMatrix.js.map