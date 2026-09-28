# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0 — MAPA DE MUTACIÓN Y CONCURRENCIA DE CUOTAS (QUOTA MUTATION MAP)
**Protocolo:** `BSD-C2D35-IMPLEMENTATION-READINESS-RUNTIME-MAPPING-001`  
**Fase:** POST-C2D.34A / PRE-C2D.35 IMPLEMENTATION  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION`  
**Fecha:** 3 de Septiembre de 2026  

---

### 1. ALCANCE Y ANÁLISIS DE RIESGO DE CONCURRENCIA (QUOTA-RACE)
La evaluación de cuotas comerciales aprobada en **DEC-06** y **ADR-021** establece límites estrictos para los planes `STARTER`, `PROFESSIONAL` y `ENTERPRISE`.

#### Escenario de Vulnerabilidad de Carrera (QUOTA-RACE)
En la implementación actual:
$$\text{Cliente A y Cliente B emiten peticiones simultáneas cuando el contador es } 2999$$
1. Petición A lee: `currentUsage = 2999` $\implies$ $2999 < 3000$ $\implies$ **ALLOWED**.
2. Petición B lee concurrentemente: `currentUsage = 2999` $\implies$ $2999 < 3000$ $\implies$ **ALLOWED**.
3. Ambas peticiones escriben su orden $\implies$ `total = 3001` $\implies$ **CUOTA PERFORADA**.

Para resolver este riesgo sin colapsar el rendimiento en Firestore (que limita escrituras en un solo documento a ~1 write/sec), **DEC-08** dictaminó el uso de **5 shards distribuidos** (`shard_0` a `shard_4`) con incrementos atómicos mediante `FieldValue.increment()`.

---

### 2. MAPA FÍSICO DE MUTACIÓN DE RECURSOS Y CUOTAS

| Recurso Comercial | Operación de Mutación | Contador Actual | Validación Actual | Límite Aprobado (Professional) | Enforcement Requerido en C2D.35 | Riesgo de Concurrencia (Race Risk) |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **maxOrders** | Creación de Pedido en `/orders` | ❌ Inexistente | ❌ Ninguna en cliente ni en rules | **3,000 pedidos / ciclo** | `UsageCounterEngine.incrementUsage()` en shard aleatorio (0..4) con transacción atómica previa a crear orden. | 🔴 **CRÍTICO (QUOTA-RACE)** |
| **maxBusinesses** | Creación de Comercio en `/businesses` | ❌ Inexistente | ❌ Client-side check decorativo | **3 comercios** | Pre-check transaccional en Callable de aprovisionamiento contra `/usage_counters`. | 🟠 **MEDIO** |
| **maxBranches** | Adición de Sucursal en `/branches` | ❌ Inexistente | ❌ Client-side check | **5 sucursales** | Pre-check transaccional en Callable `createBranch` contra `/usage_counters`. | 🟠 **MEDIO** |
| **maxUsers** | Invitación de Personal en `/employees` | ❌ Inexistente | ❌ Ninguna | **15 usuarios** | Pre-check transaccional en Callable `adminInviteEmployee` contra `/usage_counters`. | 🟠 **MEDIO** |
| **maxCouriers** | Alta de Repartidor en `/couriers` | ❌ Inexistente | ❌ Ninguna | **10 repartidores** | Pre-check transaccional en Callable de aprobación de flota contra `/usage_counters`. | 🟡 **BAJO** |
| **maxStorageMb** | Subida de Imágenes a Cloud Storage | ❌ Inexistente | ❌ Validación básica de tamaño individual | **2,000 MB** | Cloud Function trigger `onStorageUpload` computa bytes acumulados por tenant. | 🟡 **BAJO** |
| **maxApiRequests**| Invocación de API Gateway / Webhooks | ❌ Inexistente | ❌ Rate limit genérico en Express | **10,000 req / ciclo** | Middleware de API Gateway incrementa contador en shard y rechaza con HTTP 429. | 🔴 **CRÍTICO (API-BURST)** |

---

### 3. ESPECIFICACIÓN FÍSICA DE LOS SHARDED USAGE COUNTERS (C2D.35.0-R REMEDIADO)
- **Topología Física:** `/usage_counters/{tenantId}/periods/{periodKey}/shards/{shardId}`
- **Formato Canónico del `periodKey`:** Resuelto exclusivamente por `resolveBillingPeriod(subscription, timestamp)`: `cycle_YYYYMMDD_YYYYMMDD`. `YYYYMM` no es autoridad.
- **Topología de 5 Documentos Físicos Independientes:**
  ```
  /usage_counters/{tenantId}/periods/{periodKey}/shards/shard_0
  /usage_counters/{tenantId}/periods/{periodKey}/shards/shard_1
  /usage_counters/{tenantId}/periods/{periodKey}/shards/shard_2
  /usage_counters/{tenantId}/periods/{periodKey}/shards/shard_3
  /usage_counters/{tenantId}/periods/{periodKey}/shards/shard_4
  ```
- **Esquema de Documento de Shard Físico:**
  ```typescript
  interface PhysicalQuotaShardDocument {
    tenantId: string;
    periodKey: string;
    shardId: 'shard_0' | 'shard_1' | 'shard_2' | 'shard_3' | 'shard_4';
    resourceType: 'ORDERS' | 'BUSINESSES' | 'BRANCHES' | 'USERS' | 'COURIERS';
    committedUsage: number;
    reservedUsage: number;
    updatedAt: FirebaseFirestore.Timestamp;
    version: number;
  }
  ```
- **Fórmula de Agregación Autoritativa (Suma de Shards Físicos):**
  $$\text{AuthoritativeUsage} = \sum_{i=0}^{4} (\text{shard}_i.\text{committedUsage} + \text{shard}_i.\text{reservedUsage})$$
  *(Nota: `totalCached` en el documento agregador `periods/{periodKey}` es una optimización derivada; si discrepa, la suma de los 5 shards manda).*
- **Reglas de Compuerta y Protocolo Atómico:**
  1. $\text{AuthoritativeUsage} + \text{requested} \le \text{limit} \implies$ **ATOMIC RESERVE (Crea /reservations/{reservationId})**.
  2. $\text{AuthoritativeUsage} \ge \text{limit} \times 0.85 \implies$ **DISPATCH_SOFT_LIMIT_ALERT**.
  3. $\text{AuthoritativeUsage} + \text{requested} > \text{limit} \implies$ **QUOTA_EXCEEDED (HTTP 429 HARD_STOP)**.
  4. $\text{limit} == -1 \implies$ **BYPASS_ENTERPRISE**.
  5. Escritura de negocio exitosa $\implies$ **COMMIT (reserved -= requested, committed += requested)**.
  6. Escritura de negocio fallida $\implies$ **RELEASE / COMPENSATE (reserved -= requested, status = RELEASED)**.
