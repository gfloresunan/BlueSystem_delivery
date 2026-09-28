import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Store, 
  User, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Search, 
  Compass, 
  Activity, 
  Radio, 
  Maximize2, 
  ShieldCheck, 
  Info,
  Phone,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import { db } from '../shared/services/firebase';
import { collection, doc, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';

declare const L: any;

// ─── Interfaces y Modelos de Datos ────────────────────────────────────────────

export interface CourierProfile {
  uid: string;
  name?: string;
  phone?: string;
  plate?: string;
  code?: string;
  photoUrl?: string;
  active?: boolean;
  userType?: string;
  role?: string;
}

export interface ResolvedCourierIdentity {
  courierId: string;
  name: string;
  phone?: string;
  plate?: string;
  operationalCode?: string;
  photoUrl?: string;
  status: string;
  identitySource: 'USER_PROFILE' | 'ORDER_CANONICAL' | 'ORDER_LEGACY' | 'FALLBACK';
}

export interface DeliveryMonitorOrder {
  id: string;
  orderNumber: string;
  orderCode?: string;
  orderShortCode?: string;
  customerName: string;
  destinationAddress: string;
  status: string;
  courierPhase: number;
  courierId?: string;
  courierName?: string;
  courierPlate?: string;
  courierPhone?: string;
  branchId?: string;
  branchName?: string;
  fulfillmentType: string;
  total: number;
  createdAt?: any;
  branchLat: number | null;
  branchLng: number | null;
  customerLat: number | null;
  customerLng: number | null;
  etaMinutes: number | null;
}

export type GpsFreshness = 'ONLINE' | 'STALE' | 'OFFLINE';

export interface CourierLocation {
  courierId: string;
  lat: number;
  lng: number;
  bearing?: number;
  speed?: number;
  updatedAt: Date | null;
  status: string;
  freshness: GpsFreshness;
  ageMinutes: number;
}

export interface BranchOption {
  id: string;
  name: string;
}

export interface OperationalAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  orderId?: string;
  orderNumber?: string;
  courierName?: string;
  timestamp: Date;
}

// ─── Helpers de Identidad y Coordenadas ────────────────────────────────────────

/**
 * Resolver Canónico de Courier ID con prioridad estricta:
 * assignedCourierId > courierId > motorizadoId > driverId
 */
function resolveCourierId(data: Record<string, any>): string | undefined {
  if (data.assignedCourierId && typeof data.assignedCourierId === 'string' && data.assignedCourierId.trim() !== '') {
    return data.assignedCourierId.trim();
  }
  if (data.courierId && typeof data.courierId === 'string' && data.courierId.trim() !== '') {
    return data.courierId.trim();
  }
  if (data.motorizadoId && typeof data.motorizadoId === 'string' && data.motorizadoId.trim() !== '') {
    return data.motorizadoId.trim();
  }
  if (data.driverId && typeof data.driverId === 'string' && data.driverId.trim() !== '') {
    return data.driverId.trim();
  }
  return undefined;
}

/**
 * Extrae y valida coordenadas geográficas numéricas reales.
 * Retorna null si no existen coordenadas válidas (cero o NaN).
 */
function parseCoordinate(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || num === 0) return null;
  // Validación de rango latitud (-90 a 90) / longitud (-180 a 180)
  if (Math.abs(num) > 180) return null;
  return num;
}

/**
 * Parser resiliente para fechas y Timestamps de Firestore.
 * Soporta Timestamp de Firestore SDK (.toDate()), raw {seconds, nanoseconds},
 * cadenas ISO o numérico epoch ms.
 */
function parseTimestamp(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val.toDate === 'function') {
    const d = val.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val.seconds === 'number') {
    const d = new Date(val.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Calcula la frescura del GPS según la antigüedad de la última transmisión.
 * ONLINE: <= 2 min | STALE: >2 a 10 min | OFFLINE: > 10 min
 */
function calculateGpsFreshness(updatedAt: Date | null): { freshness: GpsFreshness; ageMinutes: number } {
  if (!updatedAt || isNaN(updatedAt.getTime())) {
    return { freshness: 'OFFLINE', ageMinutes: 999 };
  }
  const now = Date.now();
  const diffMs = Math.max(0, now - updatedAt.getTime());
  const ageMinutes = Math.floor(diffMs / 60000);

  if (ageMinutes <= 2) {
    return { freshness: 'ONLINE', ageMinutes };
  } else if (ageMinutes <= 10) {
    return { freshness: 'STALE', ageMinutes };
  } else {
    return { freshness: 'OFFLINE', ageMinutes };
  }
}

/**
 * Resolución Canónica de Identidad del Motorizado con Prioridad y Fallback Seguro:
 * 1. Perfil en tiempo real de /users/{courierId}
 * 2. Campos canónicos desnormalizados de la orden
 * 3. Campos legacy de la orden
 * 4. Fallback seguro con diagnóstico interno
 */
function resolveCourierIdentity(
  courierId: string | undefined,
  orderData?: {
    assignedCourierName?: string;
    assignedCourierPhone?: string;
    assignedCourierPlate?: string;
    motorizadoNombre?: string;
    motorizadoTelefono?: string;
    motorizadoPlaca?: string;
    driverName?: string;
    driverPhone?: string;
    courierName?: string;
  },
  profile?: CourierProfile | null
): ResolvedCourierIdentity {
  if (!courierId) {
    return {
      courierId: '',
      name: 'Sin Motorizado Asignado',
      status: 'UNASSIGNED',
      identitySource: 'FALLBACK'
    };
  }

  // Prioridad 1: Perfil de usuario en /users/{courierId}
  if (profile && (profile.name || profile.phone || profile.plate)) {
    const name = profile.name || orderData?.assignedCourierName || orderData?.driverName || orderData?.motorizadoNombre || `Motorizado (${courierId.substring(0, 6)})`;
    const phone = profile.phone || orderData?.assignedCourierPhone || orderData?.driverPhone || orderData?.motorizadoTelefono;
    const plate = profile.plate || orderData?.assignedCourierPlate || orderData?.motorizadoPlaca;
    const code = profile.code || `MOT-${courierId.substring(0, 4).toUpperCase()}`;

    return {
      courierId,
      name,
      phone,
      plate,
      operationalCode: code,
      photoUrl: profile.photoUrl,
      status: profile.active !== false ? 'ACTIVE' : 'INACTIVE',
      identitySource: 'USER_PROFILE'
    };
  }

  // Prioridad 2: Campos canónicos desnormalizados del pedido
  if (orderData?.assignedCourierName || orderData?.assignedCourierPhone || orderData?.assignedCourierPlate) {
    return {
      courierId,
      name: orderData.assignedCourierName || `Motorizado (${courierId.substring(0, 6)})`,
      phone: orderData.assignedCourierPhone,
      plate: orderData.assignedCourierPlate,
      operationalCode: `MOT-${courierId.substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
      identitySource: 'ORDER_CANONICAL'
    };
  }

  // Prioridad 3: Campos legacy del pedido
  if (orderData?.motorizadoNombre || orderData?.motorizadoTelefono || orderData?.motorizadoPlaca || orderData?.driverName || orderData?.driverPhone || orderData?.courierName) {
    return {
      courierId,
      name: orderData.motorizadoNombre || orderData.driverName || orderData.courierName || `Motorizado (${courierId.substring(0, 6)})`,
      phone: orderData.motorizadoTelefono || orderData.driverPhone,
      plate: orderData.motorizadoPlaca,
      operationalCode: `MOT-${courierId.substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
      identitySource: 'ORDER_LEGACY'
    };
  }

  // Fallback seguro con registro
  return {
    courierId,
    name: `Motorizado (${courierId.substring(0, 6)})`,
    operationalCode: `MOT-${courierId.substring(0, 4).toUpperCase()}`,
    status: 'UNKNOWN',
    identitySource: 'FALLBACK'
  };
}

// ─── Componente Principal: DeliveryControlTowerModule ─────────────────────────

export const DeliveryControlTowerModule: React.FC = () => {
  const { identity } = useAuth();
  const businessId = identity?.businessId || '';

  // Estados Principales
  const [activeOrders, setActiveOrders] = useState<DeliveryMonitorOrder[]>([]);
  const [courierLocations, setCourierLocations] = useState<Map<string, CourierLocation>>(new Map());
  const [courierProfiles, setCourierProfiles] = useState<Map<string, CourierProfile>>(new Map());
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState<'CONNECTED' | 'RECONNECTING' | 'ERROR'>('RECONNECTING');

  // Filtros y Búsqueda
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterGps, setFilterGps] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales y Selección Operacional
  const [selectedModalOrder, setSelectedModalOrder] = useState<DeliveryMonitorOrder | null>(null);
  const [selectedCourierDetail, setSelectedCourierDetail] = useState<{
    courierId: string;
    courierName: string;
    courierPlate?: string;
    courierPhone?: string;
    operationalCode?: string;
    location: CourierLocation | null;
    currentOrder?: DeliveryMonitorOrder;
    identitySource?: string;
  } | null>(null);

  // Modos de Visualización del Mapa
  const [followCourierId, setFollowCourierId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [mapProvider, setMapProvider] = useState<'OPENFREEMAP' | 'OSM_FALLBACK' | 'INITIALIZING'>('INITIALIZING');

  // Referencias para Leaflet Engine y Listeners Realtime
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const courierMarkersRef = useRef<Map<string, any>>(new Map());
  const activeGpsListenersRef = useRef<Map<string, Unsubscribe>>(new Map());
  const activeProfileListenersRef = useRef<Map<string, Unsubscribe>>(new Map());

  // 1. Obtener lista de sucursales autorizadas del comercio
  useEffect(() => {
    if (!businessId) return;

    const branchesQuery = query(
      collection(db, 'branches'),
      where('businessId', '==', businessId)
    );

    const unsubBranches = onSnapshot(branchesQuery, (snap) => {
      const list: BranchOption[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || docSnap.data().nombre || `Sucursal ${docSnap.id.substring(0, 4)}`
      }));
      setBranches(list);
    }, (err) => {
      console.warn('[CONTROL_TOWER] Error fetching branches:', err);
    });

    return () => unsubBranches();
  }, [businessId]);

  // 2. Suscripción Realtime a Pedidos del Comercio (Aislamiento Tenant / BusinessId)
  useEffect(() => {
    if (!businessId) {
      setIsLoadingOrders(false);
      setRealtimeConnected('ERROR');
      return;
    }

    setRealtimeConnected('RECONNECTING');

    const ordersQuery = query(
      collection(db, 'orders'),
      where('businessId', '==', businessId)
    );

    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      setRealtimeConnected('CONNECTED');

      const list: DeliveryMonitorOrder[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();

        // Extracción y resolución rigurosa de coordenadas reales (sin fallbacks hardcodeados)
        const branchLat = parseCoordinate(d.branchLat ?? d.comercioLat ?? (d.origen?.coordenadas?.latitud));
        const branchLng = parseCoordinate(d.branchLng ?? d.comercioLng ?? (d.origen?.coordenadas?.longitud));
        const customerLat = parseCoordinate(d.customerLat ?? d.clienteLat ?? (d.destino?.coordenadas?.latitud));
        const customerLng = parseCoordinate(d.customerLng ?? d.clienteLng ?? (d.destino?.coordenadas?.longitud));

        // Resolver ID de repartidor según prioridad canónica
        const courierId = resolveCourierId(d);
        const resolvedIdentity = resolveCourierIdentity(courierId, d, courierId ? courierProfiles.get(courierId) : null);

        const statusStr = (d.status || d.estado || 'PENDING').toUpperCase();

        let etaMinutes: number | null = null;
        if (d.etaMinutes !== undefined && d.etaMinutes !== null) {
          etaMinutes = Number(d.etaMinutes);
        } else if (d.estimatedDurationMinutes !== undefined && d.estimatedDurationMinutes !== null) {
          etaMinutes = Number(d.estimatedDurationMinutes);
        } else if (d.route?.durationMinutes !== undefined && d.route?.durationMinutes !== null) {
          etaMinutes = Number(d.route.durationMinutes);
        }

        const rawCode = (d.orderCode || d.orderNumber || '').toString().trim();
        const resolvedOrderCode = rawCode || docSnap.id.substring(0, 8).toUpperCase();
        const resolvedShortCode = (d.orderShortCode || '').toString().trim() || (rawCode ? rawCode.slice(-4) : docSnap.id.substring(Math.max(0, docSnap.id.length - 4)).toUpperCase());

        return {
          id: docSnap.id,
          orderNumber: resolvedOrderCode,
          orderCode: resolvedOrderCode,
          orderShortCode: resolvedShortCode,
          customerName: d.customerName || d.nombreCliente || d.clienteNombre || 'Cliente',
          destinationAddress: d.destinationAddress || d.direccionDestino || d.clienteDireccion || 'Dirección de Entrega',
          status: statusStr,
          courierPhase: Number(d.courierPhase) || 1,
          courierId,
          courierName: resolvedIdentity.name,
          courierPlate: resolvedIdentity.plate,
          courierPhone: resolvedIdentity.phone,
          branchId: d.branchId || d.sucursalId || '',
          branchName: d.branchName || d.nombreSucursal || d.businessName || 'Sucursal Principal',
          fulfillmentType: (d.fulfillmentType || 'DELIVERY').toUpperCase(),
          total: Number(d.total) || 0,
          createdAt: d.createdAt,
          branchLat,
          branchLng,
          customerLat,
          customerLng,
          etaMinutes
        };
      });

      // Ordenar por fecha o ID
      setActiveOrders(list);
      setIsLoadingOrders(false);
    }, (err) => {
      console.error('[CONTROL_TOWER_ORDERS] Error listening to orders:', err);
      setRealtimeConnected('ERROR');
      setIsLoadingOrders(false);
    });

    return () => {
      unsubOrders();
    };
  }, [businessId, courierProfiles]);

  // 3. Suscripción Dinámica a Perfiles de Motorizados (/users/{courierId})
  // Tenant Isolated: Solo escucha perfiles de motorizados asignados a pedidos de este comercio
  useEffect(() => {
    const relevantCourierIds = new Set<string>();
    activeOrders.forEach((ord) => {
      if (ord.courierId) {
        relevantCourierIds.add(ord.courierId);
      }
    });

    const activeProfileListeners = activeProfileListenersRef.current;

    // A. Desuscribir perfiles que ya no son relevantes
    activeProfileListeners.forEach((unsub, courierId) => {
      if (!relevantCourierIds.has(courierId)) {
        unsub();
        activeProfileListeners.delete(courierId);
        setCourierProfiles((prev) => {
          const next = new Map(prev);
          next.delete(courierId);
          return next;
        });
      }
    });

    // B. Suscribir individualmente a nuevos perfiles de couriers
    relevantCourierIds.forEach((courierId) => {
      if (!activeProfileListeners.has(courierId)) {
        const userDocRef = doc(db, 'users', courierId);
        const unsub = onSnapshot(userDocRef, (docSnap) => {
          if (!docSnap.exists()) return;

          const data = docSnap.data();
          const profile: CourierProfile = {
            uid: docSnap.id,
            name: data.nombre || data.name || data.fullName,
            phone: data.telefono || data.phone || data.celular,
            plate: data.placa || data.detallesVehiculo?.placa || data.vehiclePlate,
            code: data.codigoOperativo || data.code || `MOT-${docSnap.id.substring(0, 4).toUpperCase()}`,
            photoUrl: data.photoUrl || data.photo,
            active: data.active !== false && data.isActive !== false,
            userType: data.userType,
            role: data.role || data.rol
          };

          setCourierProfiles((prev) => {
            const next = new Map(prev);
            next.set(courierId, profile);
            return next;
          });
        }, (err) => {
          console.warn(`[CONTROL_TOWER_PROFILE] Error reading profile for courier ${courierId}:`, err);
        });

        activeProfileListeners.set(courierId, unsub);
      }
    });
  }, [activeOrders]);

  // 4. Administrador Dinámico de Suscripciones GPS (Diffing de Listeners por Courier)
  // Cumple con Tenant Isolation y ADR-003: no escucha la colección global completa
  useEffect(() => {
    // Extraer conjunto de couriers únicos relevantes de las órdenes activas en entrega
    const relevantCourierIds = new Set<string>();
    activeOrders.forEach((ord) => {
      const st = ord.status;
      const isDelivering = ord.fulfillmentType !== 'PICKUP' && 
        ['READY', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERING', 'ASIGNADO', 'EN_RUTA'].includes(st);
      
      if (isDelivering && ord.courierId) {
        relevantCourierIds.add(ord.courierId);
      }
    });

    const activeListeners = activeGpsListenersRef.current;

    // A. Desuscribir couriers que ya no tienen órdenes activas para este comercio
    activeListeners.forEach((unsub, courierId) => {
      if (!relevantCourierIds.has(courierId)) {
        unsub();
        activeListeners.delete(courierId);
        setCourierLocations((prev) => {
          const next = new Map(prev);
          next.delete(courierId);
          return next;
        });
      }
    });

    // B. Suscribir individualmente a nuevos couriers
    relevantCourierIds.forEach((courierId) => {
      if (!activeListeners.has(courierId)) {
        const docRef = doc(db, 'ubicaciones_repartidores', courierId);
        const unsub = onSnapshot(docRef, (docSnap) => {
          if (!docSnap.exists()) {
            setCourierLocations((prev) => {
              const next = new Map(prev);
              next.set(courierId, {
                courierId,
                lat: 0,
                lng: 0,
                updatedAt: null,
                status: 'offline',
                freshness: 'OFFLINE',
                ageMinutes: 999
              });
              return next;
            });
            return;
          }

          const d = docSnap.data();
          const lat = parseCoordinate(d.coordenadas?.latitud ?? d.latitud ?? d.lat);
          const lng = parseCoordinate(d.coordenadas?.longitud ?? d.longitud ?? d.lng);
          const bearing = d.bearing !== undefined ? Number(d.bearing) : undefined;
          const speed = d.speed !== undefined ? Number(d.speed) : undefined;

          // Parsing robusto de Timestamp Firestore / Date
          const updatedAt = parseTimestamp(d.ultimaActualizacion ?? d.timestamp ?? d.updatedAt);
          const { freshness, ageMinutes } = calculateGpsFreshness(updatedAt);

          if (lat !== null && lng !== null) {
            setCourierLocations((prev) => {
              const next = new Map(prev);
              next.set(courierId, {
                courierId,
                lat,
                lng,
                bearing,
                speed,
                updatedAt,
                status: d.estadoDisponibilidad || d.status || d.estado || 'en_ruta',
                freshness,
                ageMinutes
              });
              return next;
            });
          }
        }, (err) => {
          console.warn(`[CONTROL_TOWER_GPS] Error listening to courier ${courierId}:`, err);
        });

        activeListeners.set(courierId, unsub);
      }
    });
  }, [activeOrders]);

  // Limpieza total de listeners GPS y perfiles al desmontar el componente
  useEffect(() => {
    return () => {
      activeGpsListenersRef.current.forEach((unsub) => unsub());
      activeGpsListenersRef.current.clear();
      activeProfileListenersRef.current.forEach((unsub) => unsub());
      activeProfileListenersRef.current.clear();
    };
  }, []);

  // 4. Inicialización Resiliente de Leaflet Engine (0 Maps Cost)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    let initTimer: any = null;
    let fallbackTimeoutTimer: any = null;
    let glLayerInstance: any = null;

    const tryInitMap = () => {
      if (typeof L === 'undefined') {
        initTimer = setTimeout(tryInitMap, 200);
        return;
      }

      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        // Centro inicial de Managua (referencia por defecto de la región)
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false
        }).setView([12.1364, -86.2514], 13);

        let baseLayerLoaded = false;
        let fallbackTriggered = false;

        const triggerOsmFallback = (reason: string) => {
          if (fallbackTriggered) return;
          fallbackTriggered = true;
          console.warn(`[CONTROL_TOWER_MAP] OpenFreeMap fallback activated (${reason}). Loading OSM Standard.`);
          
          if (fallbackTimeoutTimer) {
            clearTimeout(fallbackTimeoutTimer);
            fallbackTimeoutTimer = null;
          }

          if (glLayerInstance) {
            try {
              const glMap = typeof glLayerInstance.getMaplibreMap === 'function' ? glLayerInstance.getMaplibreMap() : null;
              if (glMap) {
                glMap.off('error');
              }
              map.removeLayer(glLayerInstance);
            } catch (_) {}
            glLayerInstance = null;
          }

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          }).addTo(map);

          setMapProvider('OSM_FALLBACK');
        };

        // Opción C: OpenFreeMap Liberty Vector Basemap (0 Maps API Cost, Clean Aesthetics - ADR-013 Enterprise)
        if (typeof L.maplibreGL === 'function' && typeof (window as any).maplibregl !== 'undefined') {
          try {
            const glLayer = L.maplibreGL({
              style: 'https://tiles.openfreemap.org/styles/liberty',
              attribution: '&copy; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
            });

            glLayer.addTo(map);
            glLayerInstance = glLayer;
            baseLayerLoaded = true;
            setMapProvider('OPENFREEMAP');

            const glMap = typeof glLayer.getMaplibreMap === 'function' ? glLayer.getMaplibreMap() : null;
            if (glMap) {
              // Cancelar timeout preventivo tan pronto el estilo base sea recibido
              glMap.once('styledata', () => {
                if (fallbackTimeoutTimer) {
                  clearTimeout(fallbackTimeoutTimer);
                  fallbackTimeoutTimer = null;
                }
              });

              glMap.once('load', () => {
                if (fallbackTimeoutTimer) {
                  clearTimeout(fallbackTimeoutTimer);
                  fallbackTimeoutTimer = null;
                }
              });

              // Detección de fallos críticos de inicialización (error 404/500 en descarga del style.json raíz)
              glMap.on('error', (e: any) => {
                const isCriticalRootError = !glMap.isStyleLoaded() && (e && e.error && (e.error.status === 404 || e.error.status >= 500));
                if (isCriticalRootError && !fallbackTriggered) {
                  triggerOsmFallback(e?.error?.message || 'Style Load Failure');
                }
              });

              // Timeout de seguridad amplio (10s) exclusivamente para caídas totales de red
              fallbackTimeoutTimer = setTimeout(() => {
                fallbackTimeoutTimer = null;
                if (!glMap.isStyleLoaded() && !fallbackTriggered) {
                  triggerOsmFallback('Style load timeout exceeded (10s)');
                }
              }, 10000);
            }
          } catch (glErr: any) {
            console.warn('[CONTROL_TOWER_MAP] MapLibre GL init error, invoking fallback:', glErr);
            triggerOsmFallback('MapLibre GL exception: ' + glErr?.message);
          }
        }

        if (!baseLayerLoaded) {
          triggerOsmFallback('MapLibre GL not available');
        }

        const layerGroup = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;
        setMapReady(true);

        // Invalidate size forzado tras montaje inicial en layout CSS
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 250);

      } catch (e) {
        console.error('[CONTROL_TOWER_MAP] Leaflet initialization error:', e);
      }
    };

    tryInitMap();

    // Observador de redimensionamiento del contenedor para evitar distorsión o pantalla negra
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (fallbackTimeoutTimer) clearTimeout(fallbackTimeoutTimer);
      if (glLayerInstance) {
        try {
          const glMap = typeof glLayerInstance.getMaplibreMap === 'function' ? glLayerInstance.getMaplibreMap() : null;
          if (glMap) glMap.off('error');
        } catch (_) {}
      }
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
        courierMarkersRef.current.clear();
        setMapReady(false);
      }
    };
  }, []);

  // 5. Reconciliación Cartográfica Dinámica (Orders ↔ Courier ↔ GPS ↔ Polyline)
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !mapReady) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();
    courierMarkersRef.current.clear();

    // Filtrar órdenes por sucursal seleccionada
    const filteredOrders = activeOrders.filter((ord) => {
      if (selectedBranchId !== 'ALL' && ord.branchId !== selectedBranchId) return false;
      return true;
    });

    // Órdenes que requieren representación cartográfica activa
    const activeRouteOrders = filteredOrders.filter((ord) => {
      if (ord.fulfillmentType === 'PICKUP') return false;
      const st = ord.status;
      return ['READY', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERING', 'ASIGNADO', 'EN_RUTA', 'PREPARING', 'PREPARANDO'].includes(st);
    });

    const validBoundsPoints: [number, number][] = [];

    // A. Marcadores de Sucursal (Store 🏪) - Solo si tienen coordenadas reales
    const processedBranches = new Set<string>();
    filteredOrders.forEach((ord) => {
      if (ord.branchLat !== null && ord.branchLng !== null && !processedBranches.has(ord.branchName || 'default')) {
        processedBranches.add(ord.branchName || 'default');
        validBoundsPoints.push([ord.branchLat, ord.branchLng]);

        const storeIcon = L.divIcon({
          className: 'custom-store-icon',
          html: `<div class="bg-indigo-600 text-white p-2 rounded-xl shadow-2xl border-2 border-white/80 text-sm flex items-center justify-center font-bold">🏪</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const storeMarker = L.marker([ord.branchLat, ord.branchLng], { icon: storeIcon })
          .bindPopup(`<div class="p-1.5 text-xs text-slate-900 font-sans"><b>🏪 ${ord.branchName}</b><br><span class="text-slate-500">Sucursal Operativa</span></div>`);
        
        layerGroup.addLayer(storeMarker);
      }
    });

    // B. Marcadores de Cliente Destino (📍) y Courier en Ruta (🛵)
    activeRouteOrders.forEach((ord) => {
      // Marcador de Cliente Destino (Solo si tiene coordenadas válidas)
      if (ord.customerLat !== null && ord.customerLng !== null) {
        validBoundsPoints.push([ord.customerLat, ord.customerLng]);

        const customerIcon = L.divIcon({
          className: 'custom-customer-icon',
          html: `<div class="bg-rose-500 text-white p-1.5 rounded-full shadow-xl border-2 border-white text-xs flex items-center justify-center font-bold hover:scale-110 transition">📍</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const customerMarker = L.marker([ord.customerLat, ord.customerLng], { icon: customerIcon })
          .bindPopup(`
            <div class="p-2 space-y-1 text-xs text-slate-900 font-sans">
              <p class="font-bold text-rose-600">📍 Destino Cliente</p>
              <p class="font-semibold">${ord.customerName}</p>
              <p class="text-slate-600 text-[11px]">${ord.destinationAddress}</p>
              <p class="text-indigo-600 font-bold">Pedido #${ord.orderNumber}</p>
            </div>
          `);
        
        layerGroup.addLayer(customerMarker);
      }

      // Marcador de Courier en tiempo real (🛵 Enterprise Courier Marker)
      const courierId = ord.courierId;
      const gpsLocation = courierId ? courierLocations.get(courierId) : null;

      if (gpsLocation && gpsLocation.lat !== 0 && gpsLocation.lng !== 0) {
        validBoundsPoints.push([gpsLocation.lat, gpsLocation.lng]);

        const freshness = gpsLocation.freshness;
        const bearing = gpsLocation.bearing !== undefined ? Math.round(gpsLocation.bearing) : undefined;
        const speed = gpsLocation.speed !== undefined && gpsLocation.speed > 0 ? Math.round(gpsLocation.speed) : null;

        // Estilos de badge y anillos de estado
        const ringColor = freshness === 'ONLINE' 
          ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.45)]' 
          : (freshness === 'STALE' ? 'border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.35)]' : 'border-slate-500 opacity-80');
        
        const dotBg = freshness === 'ONLINE' ? 'bg-emerald-400' : (freshness === 'STALE' ? 'bg-amber-400' : 'bg-slate-400');
        const radarPulse = freshness === 'ONLINE' ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400/40 animate-ping"></span>' : '';
        const bearingRotation = bearing !== undefined ? `transform: rotate(${bearing}deg);` : '';

        const courierIcon = L.divIcon({
          className: 'custom-courier-icon',
          html: `
            <div class="relative flex flex-col items-center justify-center cursor-pointer select-none" style="width: 44px; height: 44px;">
              <!-- Outer Enterprise Badge (Fijo, No Rotado) -->
              <div class="w-10 h-10 rounded-2xl bg-slate-900 border-2 ${ringColor} flex items-center justify-center relative shadow-2xl transition-all duration-300">
                <!-- Inner Motorcycle Icon (Rotación Aislada de Orientación) -->
                <div class="flex items-center justify-center text-xl transition-transform duration-300" style="${bearingRotation} transform-origin: center center;">
                  🛵
                </div>

                <!-- Radar / Status Dot -->
                ${radarPulse}
                <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${dotBg}"></span>
              </div>

              <!-- Speed Chip Flotante si el courier está en movimiento -->
              ${speed !== null ? `
                <div class="absolute -bottom-2 bg-slate-950/90 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-lg whitespace-nowrap">
                  ${speed} km/h
                </div>
              ` : ''}
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        const courierMarker = L.marker([gpsLocation.lat, gpsLocation.lng], { icon: courierIcon });

        // Evento Click: Abrir Driver Card / Panel Detallado del Motorizado
        courierMarker.on('click', () => {
          setSelectedCourierDetail({
            courierId: gpsLocation.courierId,
            courierName: ord.courierName || 'Motorizado en Operación',
            courierPlate: ord.courierPlate,
            courierPhone: ord.courierPhone,
            location: gpsLocation,
            currentOrder: ord
          });
        });

        courierMarker.bindPopup(`
          <div class="p-2 space-y-1.5 text-xs text-slate-900 font-sans min-w-[200px]">
            <div class="flex items-center justify-between border-b pb-1">
              <strong class="text-emerald-700 font-bold flex items-center gap-1">🛵 ${ord.courierName}</strong>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${freshness === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : (freshness === 'STALE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800')}">
                ${freshness} (${gpsLocation.ageMinutes}m)
              </span>
            </div>
            <p class="text-slate-700"><b>Placa:</b> ${ord.courierPlate || 'En Trámite'}</p>
            ${ord.courierPhone ? `<p class="text-slate-700"><b>Teléfono:</b> ${ord.courierPhone}</p>` : ''}
            <p class="text-indigo-600"><b>Pedido:</b> #${ord.orderNumber}</p>
            <p class="text-slate-600 text-[11px]"><b>Cliente:</b> ${ord.customerName}</p>
            ${speed !== null ? `<p class="text-emerald-600 font-bold"><b>Velocidad:</b> ${speed} km/h</p>` : ''}
            ${bearing !== undefined ? `<p class="text-slate-500 text-[10px]"><b>Rumbo:</b> ${bearing}&deg;</p>` : ''}
            ${ord.etaMinutes !== null ? `<p class="text-amber-600 font-bold"><b>ETA:</b> ${ord.etaMinutes} min</p>` : ''}
          </div>
        `);

        layerGroup.addLayer(courierMarker);
        if (courierId) {
          courierMarkersRef.current.set(courierId, courierMarker);
        }

        // C. Polilínea de Ruta Operacional (Sucursal -> Courier -> Destino) - Solo con puntos válidos reales
        const routePoints: [number, number][] = [];
        if (ord.branchLat !== null && ord.branchLng !== null) {
          routePoints.push([ord.branchLat, ord.branchLng]);
        }
        routePoints.push([gpsLocation.lat, gpsLocation.lng]);
        if (ord.customerLat !== null && ord.customerLng !== null) {
          routePoints.push([ord.customerLat, ord.customerLng]);
        }

        if (routePoints.length >= 2) {
          const polyline = L.polyline(routePoints, {
            color: freshness === 'ONLINE' ? '#6366f1' : '#f59e0b',
            weight: 3.5,
            opacity: 0.85,
            dashArray: '6, 8'
          });
          layerGroup.addLayer(polyline);
        }
      }
    });

    // Modo Follow Courier (centrado continuo)
    if (followCourierId && courierLocations.has(followCourierId)) {
      const loc = courierLocations.get(followCourierId);
      if (loc && loc.lat !== 0 && loc.lng !== 0) {
        mapInstanceRef.current.panTo([loc.lat, loc.lng], { animate: true, duration: 0.8 });
      }
    } else if (validBoundsPoints.length > 0 && !followCourierId) {
      // Ajustar límites solo si no estamos en Follow Mode
      try {
        const bounds = L.latLngBounds(validBoundsPoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (e) {
        // Ignorar error de límites singulares
      }
    }
  }, [activeOrders, courierLocations, selectedBranchId, mapReady, followCourierId]);

  // Actualización fluida de posición de Marker sin redibujar toda la capa
  useEffect(() => {
    courierLocations.forEach((loc, courierId) => {
      const marker = courierMarkersRef.current.get(courierId);
      if (marker && loc.lat && loc.lng) {
        marker.setLatLng([loc.lat, loc.lng]);
      }
    });
  }, [courierLocations]);

  // Acción: Ajustar Vista Operación Completa (Fit Bounds con Coordenadas Reales)
  const handleFitOperationBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    setFollowCourierId(null);

    const points: [number, number][] = [];
    activeOrders.forEach((ord) => {
      if (selectedBranchId !== 'ALL' && ord.branchId !== selectedBranchId) return;
      if (ord.branchLat !== null && ord.branchLng !== null) points.push([ord.branchLat, ord.branchLng]);
      if (ord.customerLat !== null && ord.customerLng !== null) points.push([ord.customerLat, ord.customerLng]);
      if (ord.courierId && courierLocations.has(ord.courierId)) {
        const loc = courierLocations.get(ord.courierId);
        if (loc && loc.lat !== 0 && loc.lng !== 0) points.push([loc.lat, loc.lng]);
      }
    });

    if (points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (e) {
        // Fallback
      }
    } else {
      mapInstanceRef.current.setView([12.1364, -86.2514], 13);
    }
  }, [activeOrders, courierLocations, selectedBranchId]);

  // ─── Generador de Alertas Operacionales Cruzadas Inteligentes ────────────────

  const operationalAlerts = useMemo<OperationalAlert[]>(() => {
    const alerts: OperationalAlert[] = [];

    activeOrders.forEach((ord) => {
      if (selectedBranchId !== 'ALL' && ord.branchId !== selectedBranchId) return;
      if (ord.fulfillmentType === 'PICKUP') return;

      const st = ord.status;
      const courierId = ord.courierId;
      const gps = courierId ? courierLocations.get(courierId) : null;

      // Caso 1: Pedido READY sin courier asignado
      if ((st === 'READY' || st === 'LISTO') && !courierId) {
        alerts.push({
          id: `alert-ready-no-courier-${ord.id}`,
          severity: 'WARNING',
          title: 'Pedido Listo sin Courier Asignado',
          description: `El pedido #${ord.orderNumber} está listo para despacho pero no tiene motorizado asignado.`,
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          timestamp: new Date()
        });
      }

      // Caso 2: Pedido EN RUTA
      if (['IN_TRANSIT', 'DELIVERING', 'EN_RUTA'].includes(st)) {
        if (!courierId) {
          alerts.push({
            id: `alert-intransit-no-courier-${ord.id}`,
            severity: 'CRITICAL',
            title: 'Inconsistencia: En Ruta sin Motorizado',
            description: `El pedido #${ord.orderNumber} figura en ruta pero carece de assignedCourierId.`,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            timestamp: new Date()
          });
        } else if (gps && gps.lat !== 0 && gps.lng !== 0) {
          if (gps.freshness === 'STALE') {
            alerts.push({
              id: `alert-intransit-gps-stale-${ord.id}`,
              severity: 'WARNING',
              title: 'GPS Desactualizado en Ruta',
              description: `El motorizado ${ord.courierName} no actualiza su ubicación desde hace ${gps.ageMinutes} min.`,
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              courierName: ord.courierName,
              timestamp: gps.updatedAt || new Date()
            });
          } else if (gps.freshness === 'OFFLINE') {
            alerts.push({
              id: `alert-intransit-courier-offline-${ord.id}`,
              severity: 'CRITICAL',
              title: 'Courier Desconectado / Offline',
              description: `El motorizado ${ord.courierName} asignado al pedido #${ord.orderNumber} está offline (>10 min).`,
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              courierName: ord.courierName,
              timestamp: gps.updatedAt || new Date()
            });
          }
        } else if (!isLoadingOrders) {
          alerts.push({
            id: `alert-intransit-no-gps-${ord.id}`,
            severity: 'CRITICAL',
            title: 'Atención: Pedido en Ruta sin GPS',
            description: `El pedido #${ord.orderNumber} está en ruta con ${ord.courierName}, pero el dispositivo no transmite señal GPS.`,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            courierName: ord.courierName,
            timestamp: new Date()
          });
        }
      }

      // Caso 3: Pedido ASSIGNED con Courier Offline
      if (['ASSIGNED', 'ASIGNADO'].includes(st) && courierId && gps && gps.freshness === 'OFFLINE') {
        alerts.push({
          id: `alert-assigned-offline-${ord.id}`,
          severity: 'WARNING',
          title: 'Motorizado Asignado Fuera de Línea',
          description: `El pedido #${ord.orderNumber} está asignado a ${ord.courierName} quien figura offline.`,
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          courierName: ord.courierName,
          timestamp: gps.updatedAt || new Date()
        });
      }
    });

    return alerts;
  }, [activeOrders, courierLocations, selectedBranchId, isLoadingOrders]);

  // ─── Métricas y KPIs Operacionales ──────────────────────────────────────────

  const filteredDisplayOrders = useMemo(() => {
    return activeOrders.filter((ord) => {
      if (selectedBranchId !== 'ALL' && ord.branchId !== selectedBranchId) return false;

      // Filtro de Estado
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'PREPARING' && !['PREPARING', 'PREPARANDO', 'PENDING'].includes(ord.status)) return false;
        if (filterStatus === 'READY' && !['READY', 'LISTO'].includes(ord.status)) return false;
        if (filterStatus === 'ASSIGNED' && !['ASSIGNED', 'ASIGNADO'].includes(ord.status)) return false;
        if (filterStatus === 'IN_TRANSIT' && !['IN_TRANSIT', 'DELIVERING', 'EN_RUTA', 'PICKED_UP'].includes(ord.status)) return false;
        if (filterStatus === 'DELIVERED' && !['DELIVERED', 'ENTREGADO', 'COMPLETED'].includes(ord.status)) return false;
      }

      // Filtro de GPS
      if (filterGps !== 'ALL') {
        const gps = ord.courierId ? courierLocations.get(ord.courierId) : null;
        const freshness = gps ? gps.freshness : 'OFFLINE';
        if (filterGps !== freshness) return false;
      }

      // Búsqueda en memoria
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchNum = (ord.orderCode || ord.orderNumber).toLowerCase().includes(q) ||
          (ord.orderShortCode || '').toLowerCase().includes(q) ||
          ord.id.toLowerCase().includes(q);
        const matchCust = ord.customerName.toLowerCase().includes(q);
        const matchCour = (ord.courierName || '').toLowerCase().includes(q);
        const matchPlate = (ord.courierPlate || '').toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchCour && !matchPlate) return false;
      }

      return true;
    });
  }, [activeOrders, selectedBranchId, filterStatus, filterGps, searchQuery, courierLocations]);

  const kpis = useMemo(() => {
    const branchOrders = activeOrders.filter(o => selectedBranchId === 'ALL' || o.branchId === selectedBranchId);
    
    const activeCount = branchOrders.filter(o => !['DELIVERED', 'ENTREGADO', 'COMPLETED', 'CANCELLED'].includes(o.status)).length;
    const preparingCount = branchOrders.filter(o => ['PREPARING', 'PREPARANDO', 'PENDING', 'ACCEPTED'].includes(o.status)).length;
    const readyCount = branchOrders.filter(o => ['READY', 'LISTO'].includes(o.status)).length;
    const inTransitCount = branchOrders.filter(o => ['IN_TRANSIT', 'DELIVERING', 'EN_RUTA', 'PICKED_UP', 'ASSIGNED', 'ASIGNADO'].includes(o.status)).length;
    const deliveredCount = branchOrders.filter(o => ['DELIVERED', 'ENTREGADO', 'COMPLETED'].includes(o.status)).length;
    const unassignedReadyCount = branchOrders.filter(o => ['READY', 'LISTO'].includes(o.status) && !o.courierId).length;

    // Flota de Couriers
    const relevantCourierSet = new Set<string>();
    branchOrders.forEach(o => {
      if (o.courierId) relevantCourierSet.add(o.courierId);
    });

    let couriersOnline = 0;
    let couriersStale = 0;
    let couriersOffline = 0;

    relevantCourierSet.forEach((cId) => {
      const loc = courierLocations.get(cId);
      if (!loc || loc.freshness === 'OFFLINE') couriersOffline++;
      else if (loc.freshness === 'STALE') couriersStale++;
      else if (loc.freshness === 'ONLINE') couriersOnline++;
    });

    return {
      activeCount,
      preparingCount,
      readyCount,
      inTransitCount,
      deliveredCount,
      unassignedReadyCount,
      totalCouriers: relevantCourierSet.size,
      couriersOnline,
      couriersStale,
      couriersOffline
    };
  }, [activeOrders, selectedBranchId, courierLocations]);

  return (
    <div className="space-y-6">
      {/* ─── Header Bar con Filtro Multi-Sucursal y Estado Realtime ─────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 backdrop-blur p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-indigo-400 rotate-45" /> Delivery Control Tower Enterprise
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v2.2 Enterprise
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-semibold">
              <span className={`w-2 h-2 rounded-full ${
                realtimeConnected === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : (realtimeConnected === 'RECONNECTING' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500')
              }`}></span>
              <span className={realtimeConnected === 'CONNECTED' ? 'text-emerald-400' : (realtimeConnected === 'RECONNECTING' ? 'text-amber-400' : 'text-rose-400')}>
                {realtimeConnected === 'CONNECTED' ? 'GPS Firestore Conectado' : (realtimeConnected === 'RECONNECTING' ? 'Reconectando Realtime...' : 'Desconectado')}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervisión cartográfica en tiempo real de flota, telemetría GPS e integridad operacional de entregas.
          </p>
        </div>

        {/* Acciones de Cabecera: Sucursal y Diagnóstico */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {branches.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Store className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-400 font-semibold">Sucursal:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-white px-2.5 py-1 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="ALL">🏢 TODAS LAS SUCURSALES ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>🏪 {b.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              showDiagnostics ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Diagnóstico Operacional"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Diagnóstico</span>
          </button>
        </div>
      </div>

      {/* ─── Panel Ocultable de Diagnóstico Interno ────────────────────────── */}
      {showDiagnostics && (
        <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 text-xs font-mono text-slate-300 space-y-2 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Control Tower Forensic Diagnostics
            </span>
            <span className="text-[10px] text-slate-500">Aislamiento Tenant: ACTIVO</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Business ID:</span>
              <strong className="text-white text-xs truncate block">{businessId || 'SIN_AUTENTICAR'}</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Órdenes Totales / Activas:</span>
              <strong className="text-emerald-400 text-xs">{activeOrders.length} / {kpis.activeCount}</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Listeners GPS Individuales:</span>
              <strong className="text-indigo-400 text-xs">{activeGpsListenersRef.current.size} Activos</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Leaflet Engine:</span>
              <strong className={mapReady ? 'text-emerald-400 text-xs' : 'text-amber-400 text-xs'}>
                {mapReady ? `ONLINE (${mapProvider === 'OPENFREEMAP' ? 'OpenFreeMap 4K' : 'OSM Fallback'})` : 'CARGANDO'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* ─── KPIs Operacionales Profesionales ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Activos Totales</span>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xl font-black text-white">{kpis.activeCount}</p>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">En Cocina</span>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xl font-black text-blue-400">{kpis.preparingCount}</p>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Listos para Envío</span>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xl font-black text-amber-400">{kpis.readyCount}</p>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">En Ruta Motorizado</span>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xl font-black text-indigo-400">{kpis.inTransitCount}</p>
            <Truck className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">GPS Flota Online</span>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xl font-black text-emerald-400">{kpis.couriersOnline}<span className="text-xs text-slate-500 font-normal">/{kpis.totalCouriers}</span></p>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sin Asignar</span>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xl font-black ${kpis.unassignedReadyCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {kpis.unassignedReadyCount}
            </p>
            <AlertCircle className={`w-4 h-4 ${kpis.unassignedReadyCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
        </div>
      </div>

      {/* ─── Alertas Operacionales Cruzadas en Tiempo Real ────────────────── */}
      {operationalAlerts.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-2.5 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4" /> Alertas Operacionales Críticas ({operationalAlerts.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {operationalAlerts.slice(0, 4).map((alert) => (
              <div 
                key={alert.id} 
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  alert.severity === 'CRITICAL' ? 'bg-rose-950/40 border-rose-800/80 text-rose-200' : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`} />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <strong className="font-bold">{alert.title}</strong>
                    {alert.orderNumber && <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">#{alert.orderNumber}</span>}
                  </div>
                  <p className="text-[11px] opacity-90">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Canvas Cartográfico Leaflet Engine con Controles Operacionales ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-200">Mapa Operacional de Entregas del Comercio</h3>
          </div>

          {/* Controles de Vista de Mapa */}
          <div className="flex items-center gap-2 flex-wrap">
            {followCourierId && (
              <button
                onClick={() => setFollowCourierId(null)}
                className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-amber-500/30 transition"
              >
                <X className="w-3.5 h-3.5" /> Dejar de Seguir
              </button>
            )}

            <button
              onClick={handleFitOperationBounds}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" /> Ver Operación Completa
            </button>

            <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-full text-[10px] text-slate-400 font-semibold hidden md:inline-block">
              Leaflet Engine (0 Maps Cost)
            </span>
          </div>
        </div>

        {/* Contenedor del Mapa - SIEMPRE montado para evitar que el ref sea null */}
        <div className="relative w-full rounded-xl overflow-hidden border border-slate-800" style={{ height: '420px', minHeight: '380px' }}>
          <div 
            ref={mapContainerRef} 
            className="w-full h-full bg-slate-950 z-0" 
          />

          {/* Overlay de Carga Inicial si las órdenes aún están conectando */}
          {isLoadingOrders && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-300 font-semibold">Sincronizando operaciones realtime del comercio...</p>
            </div>
          )}

          {/* Overlay de Alerta si no hay datos cartográficos disponibles */}
          {!isLoadingOrders && activeOrders.length === 0 && (
            <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-xl max-w-xs text-xs text-slate-400">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" /> No hay entregas activas
              </p>
              <p className="text-[11px] mt-0.5">El mapa se actualizará automáticamente cuando ingrese un nuevo pedido.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Barra de Filtros y Búsqueda Operacional ───────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-md">
        {/* Búsqueda */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar #orden, cliente, motorizado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        {/* Filtros de Estado y GPS */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Filtro Estado */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">📋 Todos los Estados</option>
            <option value="PREPARING">🍳 En Cocina</option>
            <option value="READY">📦 Listos</option>
            <option value="ASSIGNED">🛵 Asignados</option>
            <option value="IN_TRANSIT">🛣️ En Ruta</option>
            <option value="DELIVERED">✅ Entregados</option>
          </select>

          {/* Filtro GPS */}
          <select
            value={filterGps}
            onChange={(e) => setFilterGps(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">📡 Toda la Telemetría</option>
            <option value="ONLINE">🟢 GPS Online (&le;2m)</option>
            <option value="STALE">🟡 GPS Stale (2-10m)</option>
            <option value="OFFLINE">🔴 GPS Offline (&gt;10m)</option>
          </select>
        </div>
      </div>

      {/* ─── Listado de Tarjetas de Órdenes con Estado Cruzado ─────────────── */}
      {filteredDisplayOrders.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-10 text-center text-slate-400 text-xs space-y-2">
          <p className="text-sm font-bold text-slate-300">No hay órdenes coincidentes con los filtros aplicados.</p>
          <p className="text-slate-500 text-[11px]">Ajusta la búsqueda o selecciona otra sucursal para visualizar entregas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDisplayOrders.map((ord) => {
            const gps = ord.courierId ? courierLocations.get(ord.courierId) : null;
            const freshness = gps ? gps.freshness : 'OFFLINE';
            const isDelivering = ord.fulfillmentType === 'DELIVERY';
            const isFollowingThis = followCourierId === ord.courierId;

            return (
              <div 
                key={ord.id} 
                onClick={() => setSelectedModalOrder(ord)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg hover:border-indigo-500/50 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                      #{ord.orderNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        ord.fulfillmentType === 'PICKUP' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {ord.fulfillmentType === 'PICKUP' ? '🏪 PICKUP' : '🛵 DELIVERY'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {ord.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs mt-2.5">
                    <p className="font-bold text-slate-200">{ord.customerName}</p>
                    <p className="text-slate-400 flex items-start gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" /> 
                      <span className="truncate">{ord.destinationAddress}</span>
                    </p>
                    <p className="text-slate-500 text-[10px]">Sucursal: <span className="text-slate-300">{ord.branchName}</span></p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="text-slate-400 text-[11px] flex items-center gap-1">
                        Motorizado: <strong className="text-indigo-300 font-semibold">{ord.courierName || 'Sin Asignar'}</strong>
                      </p>
                      {isDelivering && ord.courierId && (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                          <span className={`w-2 h-2 rounded-full ${freshness === 'ONLINE' ? 'bg-emerald-400' : (freshness === 'STALE' ? 'bg-amber-400' : 'bg-rose-400')}`}></span>
                          <span className={freshness === 'ONLINE' ? 'text-emerald-400' : (freshness === 'STALE' ? 'text-amber-400' : 'text-rose-400')}>
                            GPS {freshness} ({gps ? `${gps.ageMinutes}m` : 'Sin Señal'})
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="font-black text-emerald-400 text-sm">C$ {ord.total.toFixed(2)}</span>
                  </div>

                  {/* Acciones Rápidas en Tarjeta */}
                  {ord.courierId && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ord.courierId) {
                            setFollowCourierId(isFollowingThis ? null : ord.courierId);
                            if (!isFollowingThis && gps && gps.lat && gps.lng && mapInstanceRef.current) {
                              mapInstanceRef.current.setView([gps.lat, gps.lng], 16);
                            }
                          }
                        }}
                        className={`w-full py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 border ${
                          isFollowingThis 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <Compass className="w-3 h-3 text-indigo-400" />
                        {isFollowingThis ? 'Siguiendo en Vivo' : 'Seguir Motorizado'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal Operacional Sanitizado de Detalle de Pedido ─────────────── */}
      {selectedModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedModalOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
                📦
              </div>
              <div>
                <h3 className="text-base font-black text-white">Detalle Operacional de Entrega</h3>
                <p className="text-xs text-indigo-400 font-bold">Pedido #{selectedModalOrder.orderNumber}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <p className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> Conductor: <strong className="text-white">{selectedModalOrder.courierName || 'Sin Asignar'}</strong>
                </p>
                <p className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" /> Placa Vehículo: <strong className="text-white">{selectedModalOrder.courierPlate || 'En Trámite'}</strong>
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <p className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-400" /> Cliente: <strong className="text-white">{selectedModalOrder.customerName}</strong>
                </p>
                <p className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> Dirección: <strong className="text-slate-200">{selectedModalOrder.destinationAddress}</strong>
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <p className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-amber-400" /> Sucursal: <strong className="text-white">{selectedModalOrder.branchName}</strong>
                </p>
                <p className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Modalidad: <strong className="text-white">{selectedModalOrder.fulfillmentType}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl">
                  <p className="text-[10px] text-indigo-300 font-bold uppercase">Estado Actual</p>
                  <p className="text-sm font-black text-indigo-400">{selectedModalOrder.status}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                  <p className="text-[10px] text-amber-300 font-bold uppercase">ETA Estimado</p>
                  <p className="text-sm font-black text-amber-400">
                    {selectedModalOrder.etaMinutes !== null ? `${selectedModalOrder.etaMinutes} min` : 'No Disponible'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedModalOrder(null)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Sanitizado de Detalle del Courier (Driver Card / Telemetría) ─── */}
      {selectedCourierDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedCourierDetail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Motorizado */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-3xl shadow-lg relative shrink-0 overflow-hidden">
                🛵
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block">
                  🛵 Motorizado Asignado
                </span>
                <h3 className="text-base font-black text-white truncate">
                  {selectedCourierDetail.courierName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span>Placa: <strong className="text-white">{selectedCourierDetail.courierPlate || 'En Trámite'}</strong></span>
                  {selectedCourierDetail.operationalCode && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">
                      {selectedCourierDetail.operationalCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Teléfono y Comunicación Segura */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Teléfono Operativo:</span>
                    <strong className="text-slate-200 text-xs">
                      {selectedCourierDetail.courierPhone || 'No registrado'}
                    </strong>
                  </div>
                </div>
                {selectedCourierDetail.courierPhone && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${selectedCourierDetail.courierPhone}`}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow"
                    >
                      <PhoneCall className="w-3 h-3" /> Llamar
                    </a>
                  </div>
                )}
              </div>

              {/* Telemetría GPS en Vivo */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                  Telemetría GPS en Vivo
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Estado de Conexión:</span>
                    <strong className={`text-xs font-bold ${
                      selectedCourierDetail.location?.freshness === 'ONLINE' 
                        ? 'text-emerald-400' 
                        : (selectedCourierDetail.location?.freshness === 'STALE' ? 'text-amber-400' : 'text-slate-400')
                    }`}>
                      {selectedCourierDetail.location?.freshness || 'OFFLINE'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Última Señal:</span>
                    <strong className="text-slate-200 text-xs">
                      {selectedCourierDetail.location?.updatedAt 
                        ? `Hace ${selectedCourierDetail.location.ageMinutes} min` 
                        : 'Sin Señal'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Velocidad:</span>
                    <strong className="text-emerald-400 text-xs">
                      {selectedCourierDetail.location?.speed !== undefined && selectedCourierDetail.location.speed > 0 
                        ? `${Math.round(selectedCourierDetail.location.speed)} km/h` 
                        : '0 km/h (Detenido)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Rumbo / Bearing:</span>
                    <strong className="text-slate-300 text-xs">
                      {selectedCourierDetail.location?.bearing !== undefined 
                        ? `${Math.round(selectedCourierDetail.location.bearing)}°` 
                        : 'N/D'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Entrega en Curso */}
              {selectedCourierDetail.currentOrder && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                    Entrega en Curso
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="text-indigo-400 font-bold">Pedido #{selectedCourierDetail.currentOrder.orderNumber}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {selectedCourierDetail.currentOrder.status}
                    </span>
                  </div>
                  <p className="text-slate-300 font-semibold text-[11px]">Cliente: {selectedCourierDetail.currentOrder.customerName}</p>
                  <p className="text-slate-400 text-[11px] truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">{selectedCourierDetail.currentOrder.destinationAddress}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setFollowCourierId(selectedCourierDetail.courierId);
                  if (selectedCourierDetail.location && mapInstanceRef.current) {
                    mapInstanceRef.current.setView([selectedCourierDetail.location.lat, selectedCourierDetail.location.lng], 16);
                  }
                  setSelectedCourierDetail(null);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <Compass className="w-4 h-4" /> Seguir en Mapa
              </button>
              <button
                onClick={() => setSelectedCourierDetail(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
