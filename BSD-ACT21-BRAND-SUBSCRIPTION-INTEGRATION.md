# BSD-ACT21-BRAND-SUBSCRIPTION-INTEGRATION
## Integración de Suscripciones (Read-Only / Validate / Display)
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Delimitación Estricta de Alcance
En estricto cumplimiento con la revisión de gobernanza humana:
- **No es Subscription Manager:** Queda prohibida la creación, edición, eliminación o mutación de planes y suscripciones en esta actividad.
- **Acceso Exclusivo de Lectura:** El módulo Brand Manager consulta `/subscriptions` únicamente para:
  1. Mostrar el nombre y nivel del plan comercial activo (`planName`, `planTier`).
  2. Validar que el Tenant asociado cuente con una suscripción válida.

### 2. Regla Firestore Aplicada
```
match /subscriptions/{subscriptionId} {
  allow read: if isAuthenticated() && (isPlatformAdmin() || isTenantMember(resource.data.get("tenantId", null)));
  allow create, update, delete: if isSuperAdmin() || isPlatformAdmin();
}
```
Garantiza lectura controlada sin abrir mutaciones desatendidas.
