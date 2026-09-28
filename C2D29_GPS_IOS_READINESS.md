# C2D.29 — GPS iOS READINESS & PERMISSIONS AUDIT
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Module:** `PlatformGpsAdapter` (`flutter_client/lib/platform/gps/gps_adapter.dart`)  
**Date:** 2026-09-14  

---

## 1. Auditoría del Código Fuente de GPS
Se realizó una inspección forense de la implementación de `PlatformGpsAdapter`:
- **Librería Subyacente:** `geolocator: ^10.1.0`.
- **Verificación de Permisos:**
  - `checkLocationPermission()` evalúa `LocationPermission.always` o `LocationPermission.whileInUse`.
  - `requestLocationPermission()` solicita permiso si el estado actual es `LocationPermission.denied`.
- **Comportamiento Fail-Closed ante Denegación:**
  - Si el usuario rechaza la solicitud de permisos, el método `getCurrentDeviceLocation()` lanza inmediatamente `PlatformCapabilityException(capability: 'GPS_LOCATION', reason: 'Permisos de ubicación denegados por el usuario.')`.
- **Filtro de Distancia y Precisión:**
  - Precisión configurada: `LocationAccuracy.high`.
  - Timeout en llamada puntual: 10 segundos.
  - Stream de ubicación reactiva: `distanceFilter: 10` metros.

---

## 2. Compatibilidad Específica con Plataforma iOS
- **Compatibilidad CoreLocation:** El adapter consume la API unificada de geolocator, la cual se mapea de forma nativa a `CLLocationManager` en iOS.
- **Permiso Requerido en iOS:** `NSLocationWhenInUseUsageDescription`.
- **Cero Modificaciones en Core:** La abstracción de GPS en Flutter no altera en ningún aspecto el motor de geolocalización de Track A Android ni los cálculos geoespaciales en backend (Haversine en Cloud Functions).

---

## 3. Veredicto de GPS iOS
```
GPS_ADAPTER_STATUS        = VERIFIED_AND_FAIL_CLOSED
BACKGROUND_LEAK_RISK      = ZERO (Foreground only)
CORE_IMPACT               = ZERO
PERMISSIONS_CONTRACT      = PASS
```
