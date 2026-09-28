import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut,
  getIdTokenResult
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  query, 
  where, 
  getDocs, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export type CanonicalRole =
  | 'MERCHANT_OWNER'
  | 'OWNER'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'CASHIER'
  | 'COOK'
  | 'GUEST';

export type AuthErrorCategory =
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'TOKEN_ERROR'
  | 'CLAIMS_ERROR'
  | 'EIAM_ERROR'
  | 'MEMBERSHIP_ERROR'
  | 'PERMISSION_ERROR'
  | 'BUSINESS_ERROR'
  | 'PROVISIONING_ERROR'
  | 'UNKNOWN_ERROR';

export interface AuthErrorInfo {
  code: string;
  category: AuthErrorCategory;
  message: string;
  technicalDetails?: string;
}

export function classifyAuthError(err: any): AuthErrorInfo {
  const code = err?.code || '';
  const message = err?.message || String(err || '');
  const lowerMsg = message.toLowerCase();

  // 1. Network / Connectivity / STS transport failures
  if (
    code === 'auth/network-request-failed' ||
    lowerMsg.includes('network-request-failed') ||
    lowerMsg.includes('net::err_connection_closed') ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('unavailable') ||
    code === 'unavailable' ||
    code === 'auth/timeout'
  ) {
    return {
      code: code || 'NETWORK_ERROR',
      category: 'NETWORK_ERROR',
      message: 'Fallo de conectividad al contactar el servicio de autenticación (securetoken.googleapis.com). Verifica tu conexión a internet o reintenta.',
      technicalDetails: message
    };
  }

  // 2. Token expiration or revocation
  if (
    code === 'auth/id-token-expired' ||
    code === 'auth/id-token-revoked' ||
    lowerMsg.includes('token expired') ||
    lowerMsg.includes('token revoked')
  ) {
    return {
      code: code || 'TOKEN_ERROR',
      category: 'TOKEN_ERROR',
      message: 'La sesión de seguridad ha expirado. Por favor inicia sesión nuevamente.',
      technicalDetails: message
    };
  }

  // 3. Claims Error
  if (lowerMsg.includes('custom claims') || lowerMsg.includes('auth_error: custom claims')) {
    return {
      code: 'CLAIMS_MISSING_OR_INVALID',
      category: 'CLAIMS_ERROR',
      message: 'No se encontraron las credenciales de comercio requeridas en el token de seguridad.',
      technicalDetails: message
    };
  }

  // 4. Security / Mismatch / Membership Errors
  if (lowerMsg.includes('tenant claim mismatch') || lowerMsg.includes('security_error')) {
    return {
      code: 'TENANT_MISMATCH',
      category: 'EIAM_ERROR',
      message: 'Conflicto de identidad de comercio. El identificador asignado no coincide con la membresía.',
      technicalDetails: message
    };
  }

  if (lowerMsg.includes('no membership record found') || lowerMsg.includes('membership is currently inactive')) {
    return {
      code: 'MEMBERSHIP_INACTIVE_OR_NOT_FOUND',
      category: 'MEMBERSHIP_ERROR',
      message: 'No tienes una membresía activa asignada para este comercio.',
      technicalDetails: message
    };
  }

  // 5. Firestore / Permission Errors
  if (code === 'permission-denied' || lowerMsg.includes('permission-denied') || lowerMsg.includes('access denied')) {
    return {
      code: 'PERMISSION_DENIED',
      category: 'PERMISSION_ERROR',
      message: 'Permisos insuficientes para acceder a los recursos del comercio.',
      technicalDetails: message
    };
  }

  // 6. Provisioning / Business Document Errors
  if (lowerMsg.includes('business document does not exist') || lowerMsg.includes('business_error')) {
    return {
      code: 'BUSINESS_NOT_PROVISIONED',
      category: 'PROVISIONING_ERROR',
      message: 'El comercio asignado no existe o aún no ha completado el aprovisionamiento.',
      technicalDetails: message
    };
  }

  return {
    code: code || 'UNKNOWN',
    category: 'UNKNOWN_ERROR',
    message: message,
    technicalDetails: message
  };
}

function normalizeCanonicalRole(rawRole: string | undefined): CanonicalRole | null {
  if (!rawRole) return null;
  const str = String(rawRole).toLowerCase().trim();
  if (['owner', 'business', 'comercio', 'merchant', 'propietario', 'business_owner', 'merchant_owner'].includes(str)) {
    return 'OWNER';
  }
  if (['manager', 'gerente'].includes(str)) return 'MANAGER';
  if (['supervisor'].includes(str)) return 'SUPERVISOR';
  if (['cashier', 'cajero', 'caja', 'seller'].includes(str)) return 'CASHIER';
  if (['cook', 'cocinero', 'cocina', 'kitchen'].includes(str)) return 'COOK';
  if (['guest', 'invitado', 'anonymous'].includes(str)) return 'GUEST';
  return null;
}

export interface MerchantIdentityContext {
  uid: string;
  email: string;
  orgId: string;
  businessId: string;
  restaurantId: string;
  branchId: string;
  membershipId: string;
  role: CanonicalRole;
  permissions: string[];
  lifecycleStatus: string;
  wizardCompleted: boolean;
}


// Type helper for the auth state context
interface AuthContextType {
  user: User | null;
  identity: MerchantIdentityContext | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  errorInfo: AuthErrorInfo | null;
  retryAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  identity: null,
  loading: true,
  isAuthenticated: false,
  error: null,
  errorInfo: null,
  retryAuth: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [identity, setIdentity] = useState<MerchantIdentityContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Keep track of active listeners to unsubscribe on logout
  const [activeUnsubscribes, setActiveUnsubscribes] = useState<(() => void)[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setError(null);
      setErrorInfo(null);
      
      // Clean up previous listeners
      activeUnsubscribes.forEach(unsub => unsub());
      setActiveUnsubscribes([]);

      if (!currentUser) {
        setUser(null);
        setIdentity(null);
        setLoading(false);
        return;
      }

      try {
        // Step 1: Fetch ID Token Result to inspect Custom Claims
        let isTokenRefreshed = false;
        let tokenResult = await getIdTokenResult(currentUser, false);
        let claims = tokenResult.claims;

        let rawRole = claims.role as string | undefined;
        let claimBusinessId = claims.businessId as string | undefined;
        let resolvedRole = normalizeCanonicalRole(rawRole);

        // Controlled Refresh: Force refresh ONCE if crucial claims are missing or un-normalized
        if (!claimBusinessId || !resolvedRole) {
          console.warn('[AuthContext] Claims missing or legacy on cached token. Attempting controlled refresh once...');
          tokenResult = await getIdTokenResult(currentUser, true);
          claims = tokenResult.claims;
          rawRole = claims.role as string | undefined;
          claimBusinessId = claims.businessId as string | undefined;
          resolvedRole = normalizeCanonicalRole(rawRole);
          isTokenRefreshed = true;
        }

        const claimOrgId = claims.orgId as string | undefined;
        const claimBranchId = claims.branchId as string | undefined;
        const claimTenantId = claims.tenantId as string | undefined;

        // Diagnostic Log as required by Section 11 & IAC Audit Specification
        console.log(`[MERCHANT_IAC_CLAIMS]\n\nUID:\n${currentUser.uid}\n\nRole:\n${resolvedRole || 'null'}\n\nBusinessId:\n${claimBusinessId || 'null'}\n\nBranchId:\n${claimBranchId || 'null'}\n\nOrgId:\n${claimOrgId || 'null'}\n\nTenantId:\n${claimTenantId || 'null'}\n\nTokenFresh:\n${isTokenRefreshed || !!tokenResult.issuedAtTime}\n\nResolution:\n${resolvedRole ? 'CANONICAL' : 'FAIL_CLOSED'}`);

        // EIAM Resolution: Fail Closed if crucial claims are missing or invalid
        if (!claimBusinessId || !resolvedRole) {
          throw new Error('AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid.');
        }

        const claimRole: CanonicalRole = resolvedRole;

        // Step 2: Validate EIAM Membership in Firestore (1 User -> N Memberships canonical model)
        const membershipQuery = query(
          collection(db, 'membership'),
          where('uid', '==', currentUser.uid),
          where('businessId', '==', claimBusinessId),
          limit(1)
        );
        let membershipSnap = await getDocs(membershipQuery);

        // Fallback: Si no encuentra por businessId exacto (migración/legacy), buscar por uid
        if (membershipSnap.empty) {
          const fallbackQuery = query(
            collection(db, 'membership'),
            where('uid', '==', currentUser.uid),
            limit(1)
          );
          membershipSnap = await getDocs(fallbackQuery);
        }

        if (membershipSnap.empty) {
          throw new Error('AUTHORIZATION_ERROR: No membership record found for this user identity.');
        }

        const membershipDoc = membershipSnap.docs[0];
        const membershipData = membershipDoc.data();

        if (membershipData.status !== 'ACTIVE') {
          throw new Error('AUTHORIZATION_ERROR: The membership is currently inactive.');
        }

        if (membershipData.businessId !== claimBusinessId) {
          throw new Error('SECURITY_ERROR: Tenant claim mismatch. Mapped businessId does not match membership record.');
        }

        const resolvedOrgId = claimOrgId || membershipData.orgId;
        if (!resolvedOrgId) {
          throw new Error('EIAM_ERROR: Missing orgId in Custom Claims and membership record.');
        }

        const resolvedBranchId = claimBranchId || membershipData.branchId;
        if (!resolvedBranchId) {
          throw new Error('EIAM_ERROR: Missing branchId in Custom Claims and membership record.');
        }

        if (membershipData.permissions === undefined || membershipData.permissions === null) {
          throw new Error('AUTHORIZATION_ERROR: Missing permissions field in membership record.');
        }
        const permissions = Array.isArray(membershipData.permissions) ? membershipData.permissions : [];

        const membershipId = membershipDoc.id;

        // Step 3: Listen to Business Document to determine onboarding status and lifecycle status in real time
        const bizRef = doc(db, 'businesses', claimBusinessId);
        const unsubBiz = onSnapshot(bizRef, (bizSnap) => {
          if (!bizSnap.exists()) {
            setUser(null);
            setIdentity(null);
            const errDetails = classifyAuthError(new Error('BUSINESS_ERROR: The provisioned business document does not exist in the database.'));
            setError(errDetails.message);
            setErrorInfo(errDetails);
            setLoading(false);
            return;
          }

          const bizData = bizSnap.data();
          const lifecycleStatus = bizData.lifecycleStatus || 'ONBOARDING';
          const wizardCompleted = bizData.wizardCompleted === true;

          // Assemble the canonical identity context
          const resolvedIdentity: MerchantIdentityContext = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            orgId: resolvedOrgId,
            businessId: claimBusinessId,
            restaurantId: claimBusinessId, // Parity Rule: restaurantId is identical to businessId
            branchId: resolvedBranchId,
            membershipId,
            role: claimRole,
            permissions,
            lifecycleStatus,
            wizardCompleted
          };

          setUser(currentUser);
          setIdentity(resolvedIdentity);
          setError(null);
          setErrorInfo(null);
          setLoading(false);
        }, (err) => {
          console.error('Error listening to business details:', err);
          const classified = classifyAuthError(err);
          setError(classified.message);
          setErrorInfo(classified);
          setLoading(false);
        });

        setActiveUnsubscribes(prev => [...prev, unsubBiz]);

      } catch (err: any) {
        console.error('EIAM Resolution failed:', err.message || err);
        const classified = classifyAuthError(err);
        setError(classified.message);
        setErrorInfo(classified);
        setUser(null);
        setIdentity(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      activeUnsubscribes.forEach(unsub => unsub());
    };
  }, [retryTrigger]);

  const retryAuth = async () => {
    setLoading(true);
    setError(null);
    setErrorInfo(null);
    setRetryTrigger(prev => prev + 1);
  };

  const logout = async () => {
    setLoading(true);
    try {
      // 1. Cancel active listeners
      activeUnsubscribes.forEach(unsub => unsub());
      setActiveUnsubscribes([]);

      // 2. Sign out from Firebase Auth
      await signOut(auth);

      // 3. Clear identity contexts
      setUser(null);
      setIdentity(null);
      setError(null);
      setErrorInfo(null);

      // 4. Remove merchant-specific keys from local/session storage
      localStorage.removeItem('bluesystem_active_merchant_id');
      localStorage.removeItem('bluesystem_merchant_dashboard_widgets_v1');
      localStorage.removeItem('bluesystem_merchant_tab_states_v1');
      localStorage.removeItem('bluesystem_merchant_active_module');
      sessionStorage.clear();
      
      // Let modules handle their local caches
      console.log('[AuthContext] Session cleared successfully.');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = user !== null && identity !== null;

  return (
    <AuthContext.Provider value={{ user, identity, loading, isAuthenticated, error, errorInfo, retryAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
