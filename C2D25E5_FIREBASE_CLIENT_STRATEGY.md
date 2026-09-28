# C2D.25E.5 — FIREBASE CLIENT STRATEGY & GOVERNANCE
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Estrategia de Conexión Firebase Multiplataforma

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE MULTI-PLATFORM CLIENT ARCHITECTURE              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Project: bluesystem-7c9af                                                   │
│ Auth: Firebase Authentication with EIAM v3 Custom Claims                    │
│ Database: Cloud Firestore (Default instance, Multi-Tenant Partitioning)     │
│ Functions: Firebase Cloud Functions (Region: us-central1)                   │
│ Storage: Google Cloud Storage (Bucket: bluesystem-7c9af.appspot.com)        │
│ Messaging: Firebase Cloud Messaging (FCM Topic + Direct Tokens)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Aislamiento y Gobernanza de Servicios

1. **Autenticación (`FirebaseAuthService`)**:
   - Flutter utiliza el SDK oficial `firebase_auth` conectándose al mismo backend Auth.
   - Los tokens JWT generados contienen exactamente los mismos claims: `role`, `tenantId`, `brandId`, `orgId`, `businessId`, `branchId`, `eiamVer: 3`.

2. **Firestore (`cloud_firestore`)**:
   - Respeta el 100% de las reglas en `firestore.rules`.
   - No se crean colecciones paralelas.
   - Las consultas de clientes se filtran obligatoriamente por `tenantId` en servidor (`where('tenantId', isEqualTo: tenantId)`).

3. **Cloud Functions (`cloud_functions`)**:
   - Invocación de Callables existentes sin mutación de API:
     - `switchActiveTenantContext`
     - `validateCouponCode`
     - `calculateDeliveryRouteCallable`
     - `submitMerchantApplication`
     - `initiateCourierDailyClosure`

4. **Requisitos de Aprovisionamiento Externo (Fuera de Alcance C2D.25E.5)**:
   - Registrar la aplicación Android de Flutter (`package: com.fitoni.express` o asignado) en Firebase Console.
   - Registrar la aplicación iOS de Flutter (`bundleId: com.fitoni.express.ios` o asignado) en Firebase Console y subir certificado APNs.
   - Descargar los archivos canónicos `google-services.json` y `GoogleService-Info.plist` cuando se autorice formalmente la fase de compilación.
