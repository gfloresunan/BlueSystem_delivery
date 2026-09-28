# C2D25 — TEST PLAN
## Plan de Pruebas de Certificación de Arquitectura (BUILD-01 a BUILD-20)
**Protocol ID:** `C2D.25`  

---

### 1. Batería de Pruebas

| Test ID | Área | Criterio de Verificación |
|---|---|---|
| BUILD-01 | Build Request | Validación de campos obligatorios en `BuildRequestEntity` |
| BUILD-02 | Autorización | Validación de firma y estado `AUTHORIZED` |
| BUILD-03 | Expiración | Aborto automático si el token de autorización ha expirado |
| BUILD-04 | Replay Attack | Aborto si el token ya se encuentra en estado `CONSUMED` |
| BUILD-05 | Tenant Isolation | Aborto si `BuildRequest.tenantId` no coincide con la autorización |
| BUILD-06 | Brand Isolation | Aborto si la marca no pertenece al Tenant |
| BUILD-07 | Application ID | Validación de formato y coincidencia con `google-services.json` |
| BUILD-08 | Firebase Config | Validación de `firebaseAppId` contra el cliente provisionado |
| BUILD-09 | Flavor Contamination | Compilación usando el `sourceSet` y propiedades correctas |
| BUILD-10 | Cross-Tenant | Cero acceso a datos o assets de otros tenants en el build |
| BUILD-11 | Unauthorized Build | Bloqueo absoluto de compilaciones sin autorización humana previa |
| BUILD-12 | Mass Build | Bloqueo de solicitudes masivas concurrentes desatendidas |
| BUILD-13 | Release Bypass | Verificación de que `BUILD_SUCCESS` no dispara publicación a tiendas |
| BUILD-14 | Signing Protection | Credenciales de firma protegidas fuera del código fuente |
| BUILD-15 | Secret Leakage | Cero secretos en `BuildRequest`, `audit_events` o logs |
| BUILD-16 | Artifact Integrity | Verificación de hash SHA-256 en almacenamiento seguro |
| BUILD-17 | Idempotencia | Mismo request genera la misma referencia sin duplicar artefactos |
| BUILD-18 | Auditoría | Registro sanitizado completo en `/audit_events` |
| BUILD-19 | Rollback | Capacidad de cancelar o archivar un `BuildRequest` de forma atómica |
| BUILD-20 | Kill Switch | Capacidad de suspender el Build Engine inmediatamente |
