# ADR-004: Architecture Freeze EIAM v2.2 y Gobernanza

## Estado
**Aceptado** - *Agosto 2026*

## Contexto
El módulo EIAM (Enterprise Identity & Access Management) de BlueSystem Delivery ha alcanzado un estado estable tras su refactorización arquitectónica profunda (v2.2). Se han unificado los modelos de dominio (`EiamRole`, `Permission`, `Employee`, `Branch`, `Invitation`, `IdentityEvent`), se han blindado los contratos de deserialización mediante `@Keep` y reglas ProGuard explícitas, y se ha estabilizado la capa de `UseCases` y `Engines` garantizando un flujo limpio sin errores de compilación ni warnings de lint (aislados mediante baseline).

Sin embargo, alcanzar una "Arquitectura Terminada" no equivale a un "Producto Certificado". Para proteger la integridad del módulo EIAM frente al desarrollo de nuevas características mientras se avanza hacia la certificación E2E, es imperativo establecer una política estricta de gobernanza y un congelamiento arquitectónico (Architecture Freeze).

## Decisión

Se declara formalmente el **Architecture Freeze v2.2** para el módulo EIAM. A partir de este hito, se establece una etapa estricta de Gobernanza Arquitectónica estructurada en 5 pilares inmutables:

### 1. Architecture Freeze (Congelamiento General)
Quedan estrictamente congelados todos los cimientos del módulo:
- Modelos de dominio y estructura organizacional.
- Contratos públicos y SDK.
- Colecciones de Firestore y esquemas de eventos.
- **Regla:** Cualquier cambio futuro transversal deberá pasar obligatoriamente por un Architecture Decision Record (ADR).

### 2. API Freeze (Estabilidad de Servicios)
Se congelan definitivamente las interfaces de los motores principales:
- `IdentityService`
- `GovernanceService`
- `SecurityPolicyEngine`
- `PermissionEngine`
- `RiskEngine`
- **Regla:** A partir de aquí, está prohibido romper la compatibilidad hacia atrás. Los contratos solo pueden **extenderse**.

### 3. Event Freeze (Eventos de Auditoría e Identidad)
Se congelan todos los identificadores y payloads de los eventos (ej: `USER_CREATED`, `ROLE_CHANGED`, `CLAIMS_SYNCED`, `SESSION_REVOKED`, `BUSINESS_CREATED`, `BRANCH_TRANSFERRED`).
- **Regla:** No se pueden cambiar los nombres de los eventos ni alterar sus payloads existentes. Cualquier modificación requiere **versionar** el evento (ej: `USER_CREATED_V2`).

### 4. Firestore Freeze (Bases de Datos)
Se congelan los esquemas de las siguientes colecciones core:
- `organizations`, `businesses`, `branches`
- `employees`, `membership`
- `sessions`, `devices`, `audit_events`
- **Regla:** Queda terminantemente prohibida la edición directa del código para alterar estas estructuras. Cualquier cambio futuro requerirá una **migración de datos** formal y planificada.

### 5. Cloud Functions Freeze (Backend Serverless)
Se congelan los contratos de entrada/salida de las Cloud Functions críticas:
- `adminUpdateUser`, `syncClaims`, `revokeSession`, `createInvitation`, `riskResponse`
- **Regla:** Sus firmas y contratos son estables. Se debe mantener el versionado de la API y garantizar la estabilidad para no romper a los clientes de Android o Web que ya las consumen.

---

## Certificaciones Pendientes (Requisitos para "Producto Certificado")

Para que EIAM v2.2 sea considerado un producto completamente certificado para producción, se deberán completar y auditar con éxito las siguientes 4 fases, documentadas independientemente:

### 1. Certificación de Firestore Security Rules
- **Validación de Paridad:** Demostrar que las `firestore.rules` producen **exactamente la misma decisión** que el `PermissionEngine` en cliente.
- **Flujo Requerido:** `Firestore Rules -> Permission Engine -> ABAC -> Claims -> Resultado Consistente`.
- No se admite lógica de autorización en cliente que difiera del servidor.

### 2. Certificación Cloud Functions
- **Funciones Críticas:** Validar `updateUser`, `syncClaims`, `revokeSession`, `createInvitation`, `activateEmployee`.
- **Criterios de Éxito:** Demostrar idempotencia, manejo robusto de errores, retries seguros, trazas de logs (AuditLogger) y seguridad estricta (validación de claims de Admin/System).

### 3. Certificación Android QA E2E
- **Flujos de Prueba Reales:** Validación funcional integral sin excepciones.
- **Escenarios Requeridos:**
  - Login y Manejo Offline.
  - Creación de empresa y sucursal.
  - Ciclo de vida de invitaciones (crear, enviar, aceptar).
  - Cambio y revocación de permisos/sesiones.
  - Transferencia/eliminación de empleados.
  - Auditoría de eventos correcta.

### 4. Certificación Merchant Web
- **Aislamiento Multi-Tenant:** Validar que el comerciante visualice *únicamente* su organización (`orgId`).
- **Seguridad en Consultas:** Asegurar la imposibilidad técnica de consultar datos transversales (otra empresa).
- **Aplicación de Roles:** Los permisos web deben respetarse estrictamente acorde al rol EIAM asignado (Admin, Owner, Manager, etc.).
