# C2D.25E.5 — FUNCTIONS CONTRACT SPECIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Catálogo de Cloud Functions HTTPS Callables Consumidas por Flutter

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUD FUNCTIONS CALLABLE CONTRACTS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. switchActiveTenantContext: Conmutación de tenant en sesión EIAM v3       │
│ 2. validateCouponCode: Validación de cupones contra el motor autoritativo   │
│ 3. calculateDeliveryRouteCallable: Cálculo de distancia y ruteo real        │
│ 4. submitMerchantApplication: Solicitud de onboarding de comercios          │
│ 5. initiateCourierDailyClosure: Inicio de cierre de caja diario de repartidor│
│ 6. customerAIGateway: Procesamiento de consultas al asistente de IA         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Contrato de Invocación Tipado en Flutter (`CloudFunctionsService`)

```dart
// Invocación segura y tipada en flutter_client/lib/data/services/cloud_functions_service.dart
final result = await cloudFunctionsService.switchTenantContext(
  targetTenantId: 'tenant_fitoni_001',
  targetBrandId: 'brand_fitoni_express',
);
```

Todas las invocaciones controlan excepciones de red, errores de autorización y códigos de retorno canónicos del backend.
