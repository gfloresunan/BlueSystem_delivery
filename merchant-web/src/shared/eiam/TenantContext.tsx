/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 WEB INTEGRATION (FASE 2C.8)
 * TenantContext: React Context & State Store para EIAM v3 (Carril B Aislado).
 * 
 * 🔒 REGLA DE NO-BLOQUEO:
 * TenantContext es un contexto paralelo que consume `useAuth()` sin mutarlo.
 * Si la resolución EIAM falla o está pendiente, el Merchant Web legacy (Carril A)
 * continúa operando al 100% de forma ininterrumpida.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  WebActiveTenantContext,
  WebMembershipOption,
  WebResolutionStatus,
  WebTenantSettings
} from './models';
import {
  WebDualReadMembershipResolver,
  WebMembershipDataSource
} from './dualReadResolver';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export interface TenantContextType {
  activeContext: WebActiveTenantContext | null;
  activeTenant: WebActiveTenantContext | null;
  settings: WebTenantSettings | null;
  status: WebResolutionStatus;
  availableMemberships: WebMembershipOption[];
  isEiamV3Active: boolean;
  isLoading: boolean;
  error: string | null;
  switchActiveTenant: (targetMembershipId: string) => Promise<boolean>;
}

const TenantContext = createContext<TenantContextType>({
  activeContext: null,
  activeTenant: null,
  settings: null,
  status: 'UNINITIALIZED',
  availableMemberships: [],
  isEiamV3Active: false,
  isLoading: false,
  error: null,
  switchActiveTenant: async () => false,
});

/**
 * Datasource de Firestore para Producción Web (Read-Only)
 */
class FirestoreWebMembershipDataSource implements WebMembershipDataSource {
  async getV3MembershipsByUid(uid: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'memberships'), where('uid', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ membershipId: d.id, ...d.data() }));
    } catch {
      return [];
    }
  }

  async getLegacyMembershipsByUid(uid: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'membership'), where('uid', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ membershipId: d.id, ...d.data() }));
    } catch {
      return [];
    }
  }

  async resolveBusinessTenantMapping(businessId: string): Promise<{ tenantId?: string; brandId?: string; organizationId?: string; isAmbiguous?: boolean } | null> {
    if (!businessId) return null;
    try {
      const bizDoc = await getDoc(doc(db, 'businesses', businessId));
      if (!bizDoc.exists()) return null;
      const data = bizDoc.data();
      return {
        tenantId: data?.tenantId || data?.orgId || undefined,
        brandId: data?.brandId || undefined,
        organizationId: data?.orgId || undefined,
        isAmbiguous: false
      };
    } catch {
      return null;
    }
  }
}

interface TenantProviderProps {
  children: React.ReactNode;
  customDataSource?: WebMembershipDataSource;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children, customDataSource }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeContext, setActiveContext] = useState<WebActiveTenantContext | null>(null);
  const [settings, setSettings] = useState<WebTenantSettings | null>(null);
  const [status, setStatus] = useState<WebResolutionStatus>('UNINITIALIZED');
  const [availableMemberships, setAvailableMemberships] = useState<WebMembershipOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resolver = useMemo(() => {
    return new WebDualReadMembershipResolver(customDataSource || new FirestoreWebMembershipDataSource());
  }, [customDataSource]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setActiveContext(null);
      setSettings(null);
      setStatus('LOGGED_OUT');
      setAvailableMemberships([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setStatus('LOADING');

    resolver.resolveForUser(user.uid)
      .then(res => {
        if (!isMounted) return;
        setStatus(res.status);
        setActiveContext(res.context);
        setAvailableMemberships(res.availableMemberships);
        setError(res.error || null);

        if (res.context) {
          // Construir TenantSettings básico para UI
          setSettings({
            tenantId: res.context.tenantId,
            brandId: res.context.brandId,
            displayName: res.context.tenantId.replace('ten_', '').replace('_', ' ').toUpperCase(),
            currency: 'USD'
          });
        } else {
          setSettings(null);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        // Fallo seguro y no bloqueante
        setStatus('LEGACY_ONLY');
        setError(err.message || 'Error al resolver contexto EIAM.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid, isAuthenticated, resolver]);

  const switchActiveTenant = async (targetMembershipId: string): Promise<boolean> => {
    if (!user?.uid || !targetMembershipId) return false;
    setIsLoading(true);

    try {
      const res = await resolver.resolveForUser(user.uid, targetMembershipId);
      if (res.context) {
        setActiveContext(res.context);
        setStatus(res.status);
        setSettings({
          tenantId: res.context.tenantId,
          brandId: res.context.brandId,
          displayName: res.context.tenantId.replace('ten_', '').replace('_', ' ').toUpperCase(),
          currency: 'USD'
        });
        setIsLoading(false);
        return true;
      } else {
        setError(res.error || 'No se pudo conmutar la membresía.');
        setIsLoading(false);
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Error en conmutación de contexto.');
      setIsLoading(false);
      return false;
    }
  };

  const isEiamV3Active = status === 'RESOLVED_V3' || status === 'RESOLVED_LEGACY';

  return (
    <TenantContext.Provider
      value={{
        activeContext,
        activeTenant: activeContext,
        settings,
        status,
        availableMemberships,
        isEiamV3Active,
        isLoading,
        error,
        switchActiveTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = (): TenantContextType => {
  return useContext(TenantContext);
};

export const useTenant = useTenantContext;

