# C2D23 — CONFIGURATION SCHEMA
## Especificación de Esquema Canónico `/app_configs/{configId}`
**Protocol ID:** `C2D.23`  

---

### 1. Documento JSON / Firestore Schema

```json
{
  "configId": "config-fitoni-android-prod",
  "tenantId": "ten-live-commercial-01",
  "brandId": "brand-live-fitoni-01",
  "platform": "ANDROID",
  "environment": "PRODUCTION",
  "distribution": {
    "appName": "Fitoni Express",
    "shortName": "Fitoni",
    "applicationId": "com.fitoni.delivery",
    "bundleId": "com.fitoni.delivery",
    "versionName": "1.0.0",
    "buildNumber": 100
  },
  "providers": {
    "firebaseProjectId": "bluesystem-core",
    "firebaseAppId": "1:123456789:android:abcdef",
    "mapsApiKey": "AIzaSyCoreDefaultKey"
  },
  "featureFlags": {
    "orders": true,
    "catalog": true,
    "customers": true,
    "fleetCore": true,
    "gpsTracking": true,
    "controlTower": true,
    "xToYDelivery": true,
    "notifications": true
  },
  "status": "ACTIVE",
  "schemaVersion": "1.0",
  "createdAt": 1756641600000,
  "updatedAt": 1756641600000,
  "createdBy": "admin_system",
  "updatedBy": "admin_system"
}
```
