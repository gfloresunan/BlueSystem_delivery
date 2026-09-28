# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — MAPA CORREGIDO DE MUTACIÓN Y CONCURRENCIA DE CUOTAS
**Remediated Quota Mutation Map, Canonical Sharded Architecture & Unapproved Quota Purge**

- **Protocolo Oficial:** `BSD-C2D35.0R-QUOTA-MUTATION-MAP-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** DEC-06, DEC-07, DEC-08 de C2D.34A
- **Modo:** `READ-ONLY ARCHITECTURAL SPECIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. PURGA FORMAL DE `maxProducts` (RF-06)

### 1.1 Dictamen Forense de Eliminación
Durante C2D.35.0 se detectaron referencias accidentales a `maxProducts` en borradores de matrices de responsabilidad (`RULES_RESPONSIBILITY_MATRIX.md:37`) y en fixtures de pruebas legadas.  
**Decisión Vinculante C2D.34A (DEC-06):** La cuota comercial de Professional **NO INCLUYE `maxProducts`**. BlueSystem Delivery Enterprise no impone límites al catálogo de productos de los comercios en el plan Professional.  
- Se elimina formalmente cualquier pretensión de verificar o computar una cuota de `maxProducts`.
- La referencia en `CustomerAICostGovernance.ts` (`maxProductsInContext: 5`) queda clasificada exclusivamente como un parámetro de poda del tamaño del prompt de IA (*Prompt Context Limiter*), totalmente ajeno al dominio de cuotas de suscripción.

---

## 2. RECURSOS COMERCIALES APROBADOS (LÍMITES PLAN PROFESSIONAL)

Conforme a **DEC-06**, los únicos límites cuantitativos aprobados para el plan `PROFESSIONAL` son:

| Recurso Aprobado | Parámetro en Catálogo | Límite Professional | Período de Cómputo | Almacenamiento en Shards |
| :--- | :--- | :---: | :--- | :---: |
| **Comercios** | `maxBusinesses` | **3 comercios** | Por Suscripción | Shards Físicos (5 docs) |
| **Sucursales** | `maxBranches` | **5 sucursales** | Por Suscripción | Shards Físicos (5 docs) |
| **Personal / Usuarios**| `maxUsers` | **15 usuarios** | Por Suscripción | Shards Físicos (5 docs) |
| **Repartidores de Flota**| `maxCouriers` | **10 motorizados** | Por Suscripción | Shards Físicos (5 docs) |
| **Pedidos Comerciales**| `maxOrders` | **3,000 pedidos** | Ciclo de Facturación | Shards Físicos (5 docs) |

*(Límites operacionales de infraestructura: `maxStorageMb: 2000 MB`, `maxApiRequests: 10000 req/ciclo` se gestionan en capas de Cloud Storage y API Gateway respectivamente).*

---

## 3. DISTINCIÓN CANÓNICA: CAPACIDAD VS USO VS RESERVA

Queda terminantemente prohibido confundir estos tres conceptos en el código:
1. **Entitlement Limit (Capacidad Contratada):**
   `hardLimit` (e.g. 3,000). Es una constante inmutable definida por el plan en `catalog.ts` o en los overrides del contrato de suscripción.
2. **Committed Usage (Uso Consolidado):**
   $\sum \text{shard}_i.\text{committedUsage}$. Refleja el total de recursos definitivamente creados y consumidos.
3. **Reserved Usage (Uso en Vuelo / Reserva):**
   $\sum \text{shard}_i.\text{reservedUsage}$. Refleja recursos en proceso de transacción pre-commit.
4. **Capacidad Disponible (Available Capacity):**
   $$\text{Available} = \text{hardLimit} - (\text{CommittedUsage} + \text{ReservedUsage})$$

---

## 4. MAPA DE MUTACIÓN TRANSACCIONAL POR RECURSO APROBADO

Para cada recurso aprobado, el ciclo en runtime se define formalmente como:
$$\text{RESOURCE} \longrightarrow \text{READ SHARDS} \longrightarrow \text{CHECK} \longrightarrow \text{RESERVE} \longrightarrow \text{COMMIT} \longrightarrow \text{RELEASE} \longrightarrow \text{RECONCILIATION}$$

```
┌─────────────────┬─────────────────┬──────────────────┬─────────────────┬──────────────────┬─────────────────┐
│ Recurso         │ READ & CHECK    │ RESERVE          │ WRITE NEGOCIO   │ COMMIT           │ COMPENSATE      │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ maxOrders       │ Snapshot 5 docs │ shard_k.res += 1 │ Crea /orders    │ shard_k.res -= 1 │ shard_k.res -= 1│
│ (3,000 / ciclo) │ sum <= 3000     │ Crea reservation │ transaccional   │ shard_k.com += 1 │ res = RELEASED  │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ maxBusinesses   │ Snapshot 5 docs │ shard_k.res += 1 │ Crea /businesses│ shard_k.res -= 1 │ shard_k.res -= 1│
│ (3 comercios)   │ sum <= 3        │ Crea reservation │ en Provisioning │ shard_k.com += 1 │ res = RELEASED  │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ maxBranches     │ Snapshot 5 docs │ shard_k.res += 1 │ Crea /branches  │ shard_k.res -= 1 │ shard_k.res -= 1│
│ (5 sucursales)  │ sum <= 5        │ Crea reservation │ en createBranch │ shard_k.com += 1 │ res = RELEASED  │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ maxUsers        │ Snapshot 5 docs │ shard_k.res += 1 │ Crea /employees │ shard_k.res -= 1 │ shard_k.res -= 1│
│ (15 empleados)  │ sum <= 15       │ Crea reservation │ en inviteStaff  │ shard_k.com += 1 │ res = RELEASED  │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ maxCouriers     │ Snapshot 5 docs │ shard_k.res += 1 │ Crea /couriers  │ shard_k.res -= 1 │ shard_k.res -= 1│
│ (10 motorizados)│ sum <= 10       │ Crea reservation │ en approveFleet │ shard_k.com += 1 │ res = RELEASED  │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

---

## 5. RESOLUCIÓN DE RIESGO DE CARRERA (QUOTA-RACE)

Con el modelo de 5 documentos físicos:
1. Las operaciones de reserva concurrente se dispersan aleatoriamente entre `shard_0`, `shard_1`, `shard_2`, `shard_3`, `shard_4`.
2. La lectura transaccional atómica lee la suma consolidada antes de mutar el shard asignado.
3. Si el uso actual más el solicitado excede el límite del plan:
   - Se deniega la operación con error canónico `QUOTA_EXCEEDED`.
   - Se emite alerta soft al superar el 85% (ej. 2,550 pedidos).
   - Se aplica bloqueo duro (*Hard Stop*) al 100% (3,000 pedidos).
   - Enterprise (`hardLimit === -1`) efectúa bypass directo de la compuerta de límite sin incrementar bloqueos.

---

## 6. CONCLUSIÓN Y CIERRE DE RF-06

- `maxProducts` queda **100% purgado** del contrato de cuotas.
- Los 5 recursos aprobados quedan mapeados unívocamente al modelo de sharding físico de 5 documentos independientes con semántica atómica de reserva y compensación.
