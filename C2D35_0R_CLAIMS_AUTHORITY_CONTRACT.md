# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — CONTRATO DE AUTORIDAD DE CUSTOM CLAIMS VS SUBSCRIPTION SSOT
**Claims Subordination, Token Staleness Safety & Commercial Authority Hierarchy**

- **Protocolo Oficial:** `BSD-C2D35.0R-CLAIMS-AUTHORITY-CONTRACT-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** DEC-01, DEC-04, DEC-05, DEC-14 de C2D.34A
- **Modo:** `READ-ONLY ARCHITECTURAL SPECIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. PRINCIPIO DE AUTORIDAD (RF-03)

### 1.1 Jerarquía Canónica de Decisión
Queda terminantemente ratificado que los **Custom Claims de Firebase Auth NO SON la autoridad comercial dinámica** del sistema.  
La cadena de autoridad es unidireccional y subordinada:

```
Firebase Auth Custom Claims (JWT)
         │
         ▼  (Contexto de identidad, pertenencia y optimización de UI)
Backend Gatekeeper Runtime
         │
         ▼  (Lectura transaccional o cached-with-invalidation)
Subscription SSOT (/subscriptions/{tenantId})
         │
         ▼
VEREDICTO COMERCIAL AUTORITATIVO (ALLOW / DENY)
```

---

## 2. CONTENIDO PERMITIDO Y PROHIBIDO EN CUSTOM CLAIMS

### 2.1 Qué SÍ pueden contener los Claims
Los Custom Claims deben mantenerse ligeros ($\le 1,000$ bytes para respetar el límite de 1,000 bytes impuesto por Firebase Auth) y acotarse exclusivamente a contexto de autenticación y ruteo:
1. `uid`: Identificador de usuario.
2. `tenantId`: Identificador del tenant al que pertenece el usuario.
3. `role`: Rol administrativo u operacional (`PLATFORM_ADMIN`, `BUSINESS_ADMIN`, `STAFF`, `COURIER`, `CUSTOMER`).
4. `membershipId`: Identificador de membresía en `/tenant_memberships`.
5. `businessId`: Identificador del comercio asignado (si aplica).
6. `subStatus`: **Bandera gruesa de optimización de lectura de UI** (`ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`).

### 2.2 Qué está ESTRICTAMENTE PROHIBIDO en los Claims
1. ❌ **Cuotas de consumo:** Jamás almacenar `ordersCount`, `ordersRemaining` o `storageUsed` en los Claims.
2. ❌ **Límites dinámicos:** Jamás almacenar contadores variables.
3. ❌ **Overrides de funciones:** Las banderas de `enabledFeatures` o `disabledFeatures` residen en el contrato de suscripción, no en el token JWT.
4. ❌ **Autorización comercial vinculante:** Ningún endpoint transaccional del backend puede tomar una decisión de mutación basándose en `context.auth.token.subStatus`.

---

## 3. TEST DEL TOKEN CADUCADO / ESTANCADO (STALE TOKEN TEST)

### 3.1 Escenario Forense de Seguridad
1. **$T_0$:** El comercio tiene `Subscription = ACTIVE`. El usuario obtiene un JWT de Firebase Auth con `claims.subStatus = 'ACTIVE'`. El token es criptográficamente válido durante 60 minutos (comportamiento estándar de Firebase Auth).
2. **$T_1$ ($T_0 + 5\text{ min}$):** La suscripción del comercio pasa a estado `SUSPENDED` (por impago, agotamiento de gracia o acción de SuperAdmin). El documento en Firestore `/subscriptions/{tenantId}` se actualiza a `status = 'SUSPENDED'`.
3. **$T_2$ ($T_0 + 10\text{ min}$):** El usuario emite una petición comercial de mutación (e.g. invoca `createAuthoritativeOrder` o `addProduct`). El token JWT que viaja en el header de autorización aún dice `subStatus = 'ACTIVE'`.

### 3.2 Comportamiento Seguro Garantizado por Contrato
```
[CLIENT REQUEST con JWT "subStatus = ACTIVE"]
                    │
                    ▼
          [CALLABLE ENTRYPOINT]
                    │
                    ▼
          [GATEKEEPER RUNTIME ADAPTER]
                    │
                    ▼
  [READ /subscriptions/{tenantId} EN VIVO]
                    │
                    ▼
         Estado en BD: SUSPENDED
                    │
                    ▼
    [EVALUACIÓN DE GATEKEEPER]
  • status !== 'ACTIVE' && status !== 'PAST_DUE_IN_GRACE'
  • Inbound Lock activado
                    │
                    ▼
     ❌ PETICIÓN RECHAZADA (DENY)
     Error: "COMMERCIAL_MUTATION_DENIED: TENANT_SUSPENDED"
```

**Resultado:** El token estancado (*stale token*) es completamente incapaz de perforar la seguridad comercial. La autoridad del Gatekeeper server-side neutraliza cualquier desincronización del cliente.

---

## 4. CICLO DE VIDA Y REFRESCO DE CLAIMS (CLAIM REFRESH)

### 4.1 Eventos que Disparan Actualización de Claims
Cuando el Callable `adminMutateSubscription` altera el ciclo de vida de un comercio:
1. **En SUSPENDED / CANCELLED:**
   - Se actualiza el documento `/subscriptions/{tenantId}` (SSOT).
   - Se actualiza la proyección `/tenants/{tenantId}.status`.
   - Se invoca `admin.auth().setCustomUserClaims(uid, { ...claims, subStatus: 'SUSPENDED' })` para todos los administradores y staff del tenant.
   - **Revocación Inmediata:** Se invoca `admin.auth().revokeRefreshTokens(uid)`. Esto fuerza a las aplicaciones cliente a renovar el token en su próxima llamada o a cerrar sesión.
2. **En REACTIVATION / PLAN UPGRADE:**
   - Se actualiza `/subscriptions/{tenantId}` a `ACTIVE`.
   - Se re-emiten los claims actualizados.

### 4.2 Ventana de Desincronización y Tolerancia
- Un cliente Web o Android puede tardar hasta que el SDK detecte la revocación o expire la sesión local (máximo 60 minutos en el peor caso de red desconectada).
- Durante esta ventana, la UI local puede mostrar elementos activos, pero **cualquier intento de escribir o mutar datos será rechazado de raíz por el backend Gatekeeper**.

---

## 5. MATRIZ DE ASIGNACIÓN DE RESPONSABILIDADES

| Operación de la Plataforma | ¿Depende de Custom Claims? | ¿Depende de Subscription SSOT? | Justificación Técnica |
| :--- | :---: | :---: | :--- |
| **Ruteo de UI en Frontend** | ✅ SÍ (Optimización) | ❌ NO | Evita llamadas de red innecesarias en navegación básica. |
| **Filtro Perimetral Firestore Rules** | ✅ SÍ (Perímetro) | ❌ NO | Rules valida pertenencia de `tenantId` y `role`. |
| **Creación de Pedido (Order Creation)** | ❌ NO | ✅ SÍ (Obligatorio) | Debe validar estado vivo y cuota de pedidos en shards. |
| **Creación de Sucursal / Empleado** | ❌ NO | ✅ SÍ (Obligatorio) | Debe validar `maxBranches` y `maxUsers` en shards. |
| **Modificación de Suscripción** | ❌ NO | ✅ SÍ (Obligatorio) | Requiere verificación de `version` contra Firestore. |
| **Despacho de Repartidores** | ❌ NO | 🟡 Aguas arriba | Despacho excluye comercios suspendidos en backend. |

---

## 6. CONCLUSIÓN Y CIERRE DE RF-03

Se clausura formalmente el contrato de autoridad de Claims:
- **Claims = Contexto grueso y optimización de UI.**
- **Subscription SSOT + Gatekeeper = Única Autoridad Comercial.**
- El sistema es 100% inmune a tokens JWT desactualizados (*Stale Tokens*).
