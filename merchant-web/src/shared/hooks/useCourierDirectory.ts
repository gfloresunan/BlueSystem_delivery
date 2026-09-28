import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  CourierOption, 
  registerCouriersInCache, 
  isCanonicalCourier, 
  resolveEiamRole 
} from '../utils/courierIdentityResolver';

/**
 * Hook to load and synchronize active couriers into memory.
 * Conforms strictly to BSD-COURIER-ELIGIBILITY-SOURCE-OF-TRUTH-FORENSIC-001.
 */
export const useCourierDirectory = (businessId?: string, tenantId?: string) => {
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadCouriers = async () => {
      try {
        const couriersMap = new Map<string, CourierOption>();

        // Fetch /users and /couriers concurrently
        const [usersSnap, couriersColSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'couriers'))
        ]);

        const usersDataMap = new Map<string, any>();
        usersSnap.docs.forEach((d) => usersDataMap.set(d.id, { id: d.id, ...d.data() }));

        const couriersDataMap = new Map<string, any>();
        couriersColSnap.docs.forEach((d) => couriersDataMap.set(d.id, { id: d.id, ...d.data() }));

        // Unify all candidate IDs
        const candidateIds = new Set<string>([...couriersDataMap.keys()]);
        usersDataMap.forEach((u, uid) => {
          if (resolveEiamRole(u) === 'DRIVER') {
            candidateIds.add(uid);
          }
        });

        // Evaluate each candidate strictly through the canonical resolver
        for (const cid of candidateIds) {
          const cData = couriersDataMap.get(cid) || null;
          const uData = usersDataMap.get(cid) || null;

          const check = isCanonicalCourier(cData, uData);
          if (!check.isEligible) continue;

          const d = { ...(uData || {}), ...(cData || {}) };
          const courierTenant = String(d.tenantId || d.activeTenantId || '');

          // Multi-tenant filtering when applicable
          if (tenantId && courierTenant && tenantId !== courierTenant) continue;

          const name = d.name || d.nombre || d.displayName || 'Motorizado';
          const driverId = d.driverId || d.codigoOperativo || (`DRV-${cid.substring(0, 4).toUpperCase()}`);
          const plate = d.licensePlate || d.placa || (d.vehicle && d.vehicle.plate) || 'M-Oficial';
          const status = d.status || d.shiftState || d.courierState || 'Disponible';
          const isAvailable = !d.activeOrderId && d.status !== 'SUSPENDED';

          couriersMap.set(cid, {
            id: cid,
            name,
            driverId,
            plate,
            status,
            isAvailable,
            tenantId: courierTenant,
            cityId: String(d.municipalityId || d.cityId || d.city || '').trim().toUpperCase(),
            departmentId: String(d.departmentId || '').trim().toUpperCase(),
            municipalityId: d.municipalityId || d.cityId || '',
            cityName: d.municipalityName || d.city || ''
          });
        }

        const couriersList = Array.from(couriersMap.values());
        registerCouriersInCache(couriersList);

        if (isMounted) {
          setCouriers(couriersList);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[useCourierDirectory] Failed to load directory:', e);
        if (isMounted) setIsLoading(false);
      }
    };

    loadCouriers();

    return () => {
      isMounted = false;
    };
  }, [businessId, tenantId]);

  return { couriers, isLoading };
};
