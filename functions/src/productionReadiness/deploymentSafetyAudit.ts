/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.7 PRODUCTION READINESS CERTIFICATION
 * Deployment Safety Audit
 *
 * PURPOSE: Classifies all known deployment paths as SAFE, GUARDED, DANGEROUS,
 *          or UNCONTROLLED. Any UNCONTROLLED path is an immediate NO-GO.
 *
 * MODE: LOCAL / IN-MEMORY / SIMULATED / ZERO-PRODUCTION
 */

export type DeploymentSafetyRating = 'SAFE' | 'GUARDED' | 'DANGEROUS' | 'UNCONTROLLED';

export interface DeploymentPath {
  id: string;
  name: string;
  command: string;
  target: string;
  rating: DeploymentSafetyRating;
  guard: string;
  notes: string;
}

export interface DeploymentSafetyReport {
  paths: DeploymentPath[];
  summary: Record<DeploymentSafetyRating, number>;
  uncontrolledPaths: DeploymentPath[];
  hasBlockers: boolean;
  status: 'SAFE' | 'NO-GO';
}

export class DeploymentSafetyAudit {
  /**
   * Returns the complete deployment path audit.
   * Based on static analysis of .github/workflows/backend-ci-cd.yml,
   * package.json scripts, and firebase.json deployment targets.
   */
  static auditDeploymentPaths(): DeploymentSafetyReport {
    const paths: DeploymentPath[] = [
      // ─── GitHub Actions ──────────────────────────────────────────────────────
      {
        id: 'CI-01',
        name: 'GitHub Actions — Deploy Staging',
        command: 'FirebaseExtended/action-hosting-deploy@v0',
        target: 'bluesystem-7c9af-staging',
        rating: 'GUARDED',
        guard: 'Branch guard: if: github.ref == refs/heads/staging. Requires push to staging branch.',
        notes: 'Deploys to STAGING project only. Uses FIREBASE_SERVICE_ACCOUNT_BLUESYSTEM_STAGING secret. No production exposure.',
      },
      {
        id: 'CI-02',
        name: 'GitHub Actions — Deploy Production Functions+Rules',
        command: 'npx firebase-tools deploy --only functions,firestore:rules,storage:rules',
        target: 'PRODUCTION',
        rating: 'GUARDED',
        guard: 'Branch guard: if: github.ref == refs/heads/main. environment: production — requires GitHub Environment approval gate.',
        notes: 'DANGEROUS if environment protection rules are not configured on GitHub. Requires FIREBASE_TOKEN secret. Manual approval gate must be active.',
      },
      {
        id: 'CI-03',
        name: 'GitHub Actions — Validate & Test',
        command: 'npm run build (tsc only)',
        target: 'LOCAL/CI',
        rating: 'SAFE',
        guard: 'Type check only. No deployment. Runs on all branches.',
        notes: 'Zero production impact. Local compilation validation.',
      },

      // ─── npm scripts (functions/package.json) ────────────────────────────────
      {
        id: 'NPM-01',
        name: 'npm run build',
        command: 'tsc',
        target: 'LOCAL',
        rating: 'SAFE',
        guard: 'TypeScript compiler only. No deployment artifact pushed.',
        notes: 'Safe — compiles to lib/. No production contact.',
      },
      {
        id: 'NPM-02',
        name: 'npm run serve',
        command: 'npm run build && firebase emulators:start --only functions',
        target: 'LOCAL_EMULATOR',
        rating: 'SAFE',
        guard: 'Emulator only. No real Firebase project.',
        notes: 'Runs against local Firebase Emulator Suite.',
      },
      {
        id: 'NPM-03',
        name: 'npm run deploy',
        command: 'firebase deploy --only functions',
        target: 'PRODUCTION',
        rating: 'DANGEROUS',
        guard: 'No automated guard in package.json. Requires CLI authentication and manual intent.',
        notes: 'DANGEROUS: Requires firebase login with production credentials. No ADR-014 enforcement at npm script level. Must not be executed during C2D.7.',
      },
      {
        id: 'NPM-04',
        name: 'npm run shell',
        command: 'npm run build && firebase functions:shell',
        target: 'LOCAL_EMULATOR',
        rating: 'SAFE',
        guard: 'Local shell only. No production deployment.',
        notes: 'Interactive shell against local emulator.',
      },

      // ─── Firebase CLI (manual) ────────────────────────────────────────────────
      {
        id: 'CLI-01',
        name: 'firebase deploy --only firestore:rules',
        command: 'firebase deploy --only firestore:rules',
        target: 'PRODUCTION',
        rating: 'DANGEROUS',
        guard: 'No automated guard. Requires authenticated CLI session against production project.',
        notes: 'DANGEROUS: Would deploy Rules to production Firestore. Must NOT be executed during C2D.7.',
      },
      {
        id: 'CLI-02',
        name: 'firebase deploy (full)',
        command: 'firebase deploy',
        target: 'PRODUCTION',
        rating: 'DANGEROUS',
        guard: 'No automated guard. Full deployment including functions, hosting, rules.',
        notes: 'DANGEROUS: Full production deployment. Absolutely prohibited during C2D.7.',
      },
      {
        id: 'CLI-03',
        name: 'firebase emulators:start',
        command: 'firebase emulators:start',
        target: 'LOCAL_EMULATOR',
        rating: 'SAFE',
        guard: 'Local emulator only. Isolated from production.',
        notes: 'Safe — local emulator suite.',
      },

      // ─── Gradle / Android ────────────────────────────────────────────────────
      {
        id: 'GRADLE-01',
        name: 'gradle assembleDebug',
        command: './gradlew assembleDebug',
        target: 'LOCAL_APK',
        rating: 'SAFE',
        guard: 'Debug build. No production signing. No Play Store upload.',
        notes: 'Safe — debug APK for development testing.',
      },
      {
        id: 'GRADLE-02',
        name: 'gradle assembleRelease',
        command: './gradlew assembleRelease',
        target: 'RELEASE_APK',
        rating: 'DANGEROUS',
        guard: 'Production signing required. No automated guard against production publishing.',
        notes: 'DANGEROUS: Release APK. Must not be built during C2D.7 without explicit authorization.',
      },
      {
        id: 'GRADLE-03',
        name: 'gradle bundleRelease (AAB)',
        command: './gradlew bundleRelease',
        target: 'PLAY_STORE',
        rating: 'DANGEROUS',
        guard: 'No automated guard. Requires Play Store publishing credentials.',
        notes: 'DANGEROUS: Production bundle. Prohibited during C2D.7.',
      },

      // ─── Web / Hosting ────────────────────────────────────────────────────────
      {
        id: 'WEB-01',
        name: 'npm run dev (merchant-web)',
        command: 'vite --mode development',
        target: 'LOCAL_DEV_SERVER',
        rating: 'SAFE',
        guard: 'Local dev server only.',
        notes: 'Safe — local development environment.',
      },
      {
        id: 'WEB-02',
        name: 'npm run build (merchant-web)',
        command: 'tsc && vite build',
        target: 'LOCAL_DIST',
        rating: 'SAFE',
        guard: 'Local build artifact only. Not deployed without additional firebase deploy command.',
        notes: 'Safe — builds dist/ locally. No production contact.',
      },
    ];

    const summary: Record<DeploymentSafetyRating, number> = {
      SAFE: 0,
      GUARDED: 0,
      DANGEROUS: 0,
      UNCONTROLLED: 0,
    };

    for (const p of paths) {
      summary[p.rating]++;
    }

    const uncontrolledPaths = paths.filter(p => p.rating === 'UNCONTROLLED');
    const hasBlockers = uncontrolledPaths.length > 0;

    return {
      paths,
      summary,
      uncontrolledPaths,
      hasBlockers,
      status: hasBlockers ? 'NO-GO' : 'SAFE',
    };
  }

  /**
   * Checks whether a specific command string matches any dangerous or uncontrolled path.
   */
  static classifyCommand(command: string): { rating: DeploymentSafetyRating; reason: string } {
    const dangerous = ['firebase deploy', 'firebase-tools deploy', 'gradle publish', 'bundleRelease', 'assembleRelease'];
    const uncontrolled: string[] = []; // None identified in current audit
    const safe = ['tsc', 'vite', 'emulators:start', 'assembleDebug', 'npm run build', 'npm run dev', 'npm run serve'];

    if (uncontrolled.some(u => command.includes(u))) {
      return { rating: 'UNCONTROLLED', reason: 'Command reaches production without any explicit barrier.' };
    }
    if (dangerous.some(d => command.includes(d))) {
      return { rating: 'DANGEROUS', reason: 'Command can reach production. Requires explicit human authorization and authenticated credentials.' };
    }
    if (safe.some(s => command.includes(s))) {
      return { rating: 'SAFE', reason: 'Command operates locally. No production contact.' };
    }
    return { rating: 'GUARDED', reason: 'Command behavior depends on environment configuration and authentication state.' };
  }
}
