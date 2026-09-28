# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — ARQUITECTURA FÍSICA DE SHARDING Y PROTOCOLO DE RESERVA DE CUOTAS
**Physical Sharded Quotas & Reserve-Commit-Release Lifecycle Specification**

- **Protocolo Oficial:** `BSD-C2D35.0R-PHYSICAL-QUOTA-ARCHITECTURE-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** DEC-06, DEC-07, DEC-08 de C2D.34A
- **Modo:** `READ-ONLY ARCHITECTURAL SPECIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. REMEDIACIÓN DEL MODELO FÍSICO DE SHARDING (RF-01)

### 1.1 El Defecto Crítico Previo
En borradores preliminares de C2D.35.0 se propuso un esquema donde los 5 shards residían como atributos (`shard_0`, `shard_1`, `shard_2`, `shard_3`, `shard_4`) dentro de un único documento Firestore `/usage_counters/{tenantPeriod}`.  
**Dictamen Forense:** Esta propuesta **NO constituye sharding físico real**. Toda mutación atómica concurrente sigue compitiendo por el mismo lock documental en la base de datos distribuida, violando la restricción de 1 escritura/segundo de Firestore y provocando contención y cuotas perforadas (*QUOTA-RACE*).

### 1.2 Topología Física Canónica de 5 Documentos
A partir de C2D.35.0-R, los shards se definen como **cinco documentos físicos completamente independientes** alojados en una subcolección dedicada:

```
usage_counters (colección raíz)
 └── {tenantId} (documento del tenant)
      └── periods (subcolección)
           └── {periodKey} (documento agregador y metadatos del ciclo)
                ├── shards (subcolección física)
                │    ├── shard_0 (documento físico independiente)
                │    ├── shard_1 (documento físico independiente)
                │    ├── shard_2 (documento físico independiente)
                │    ├── shard_3 (documento físico independiente)
                │    └── shard_4 (documento físico independiente)
                └── reservations (subcolección de seguimiento)
                     └── {reservationId} (documento transaccional de reserva)
```

---

## 2. ESQUEMAS FÍSICOS DE DOCUMENTOS

### 2.1 Documento de Shard Físico (`shards/shard_{i}`)
Ruta: `/usage_counters/{tenantId}/periods/{periodKey}/shards/{shardId}`

```typescript
export interface PhysicalQuotaShardDocument {
  tenantId: string;
  periodKey: string;
  shardId: 'shard_0' | 'shard_1' | 'shard_2' | 'shard_3' | 'shard_4';
  resourceType: 'ORDERS' | 'BUSINESSES' | 'BRANCHES' | 'USERS' | 'COURIERS';
  
  // Estado contable autoritativo
  committedUsage: number;   // Uso definitivamente consumido y consolidado
  reservedUsage: number;    // Uso reservado temporalmente en transacciones abiertas
  
  // Metadatos operacionales
  updatedAt: FirebaseFirestore.Timestamp;
  lastReservationAt: FirebaseFirestore.Timestamp | null;
  lastCommitAt: FirebaseFirestore.Timestamp | null;
  version: number;          // Monotónico para control optimista
}
```

### 2.2 Documento Agregador de Período (`periods/{periodKey}`)
Ruta: `/usage_counters/{tenantId}/periods/{periodKey}`

```typescript
export interface QuotaPeriodAggregateDocument {
  tenantId: string;
  periodKey: string;
  resourceType: 'ORDERS' | 'BUSINESSES' | 'BRANCHES' | 'USERS' | 'COURIERS';
  cycleStartDate: FirebaseFirestore.Timestamp;
  cycleEndDate: FirebaseFirestore.Timestamp;
  
  // Optimización derivada (NO ES AUTORIDAD)
  totalCachedCommitted: number;
  totalCachedReserved: number;
  lastAggregatedAt: FirebaseFirestore.Timestamp;
  
  // Límites contractuales del plan
  hardLimit: number;        // Ej: 3000 en Professional, -1 en Enterprise
  softLimitThreshold: number; // 85% del hardLimit (Ej: 2550)
  softLimitNotified: boolean;
  status: 'OPEN' | 'WARNING_85' | 'EXHAUSTED_100' | 'CLOSED';
}
```

---

## 3. ROL DE `totalCached` Y REGLA DE ARBITRAJE DE DISCREPANCIAS

1. **`totalCached` es estrictamente una proyección/cache:**  
   Su propósito es permitir lecturas no transaccionales de bajo costo para dashboards y reportes gerenciales. **Bajo ninguna circunstancia es fuente de verdad para la toma de decisiones comerciales**.
2. **Los Shards son la ÚNICA Autoridad Contable:**  
   Cualquier decisión de reserva o autorización pre-commit lee y computa la suma viva:
   $$\text{TotalOperativo} = \sum_{i=0}^{4} (\text{shard}_i.\text{committedUsage} + \text{shard}_i.\text{reservedUsage})$$
3. **Regla de Divergencia (`sum(shards) != totalCached`):**  
   Si se detecta discrepancia:
   - **Los Shards GANAN automáticamente.**
   - Se ejecuta una sincronización atómica del valor agregado `totalCached`.
   - Se genera un evento de auditoría en `/audit_events`:
     `type: "QUOTA_AGGREGATE_RECONCILED"`, registrando el delta corregido.

---

## 4. PROTOCOLO Y CICLO DE VIDA: RESERVE → COMMIT → RELEASE (RF-02)

```
       CLIENT REQUEST (e.g. Crear Orden)
                  │
                  ▼
       1. PRE-CHECK QUOTA
          (Lee 5 shards: committed + reserved + 1 <= limit)
                  │
          ┌───────┴───────┐
          │               │
      [EXCEEDED]      [ALLOWED]
          │               │
          ▼               ▼
      HTTP 429     2. ATOMIC RESERVE
    (Hard Stop)       • Genera deterministic reservationId
                      • shard_k.reservedUsage += 1
                      • Crea /reservations/{reservationId}
                        (status: RESERVED, ttl: 120s)
                              │
                              ▼
                   3. BUSINESS TRANSACTION
                      • Crea Orden en /orders
                      • Impacta estados operacionales
                              │
                      ┌───────┴────────┐
                      │                │
                  [SUCCESS]         [FAILED]
                      │                │
                      ▼                ▼
               4. COMMIT QUOTA     5. COMPENSATING RELEASE
                  • shard_k.reservedUsage -= 1    • shard_k.reservedUsage -= 1
                  • shard_k.committedUsage += 1   • reservation.status = RELEASED
                  • reservation.status = COMMITTED • audit event registrado
                  • reservation.businessId = orderId
```

### 4.1 Máquina de Estados de la Reserva (`ReservationDocument`)

```
   ┌───────────┐
   │   NONE    │
   └─────┬─────┘
         │ (atomic reserve)
         ▼
   ┌───────────┐       (business write fails)       ┌───────────┐
   │ RESERVED  ├───────────────────────────────────►│ RELEASED  │
   └─────┬─────┘                                    └───────────┘
         │                                                ▲
         │ (business write succeeds)                      │
         ▼                                                │ (worker sweeps)
   ┌───────────┐                                          │
   │ COMMITTED │                       ┌──────────────────┴─┐
   └───────────┘                       │ EXPIRED_RECOVERED  │
                                       └────────────────────┘
```

Ruta: `/usage_counters/{tenantId}/periods/{periodKey}/reservations/{reservationId}`

```typescript
export interface QuotaReservationDocument {
  reservationId: string; // "res_{tenantId}_{idempotencyKey}"
  tenantId: string;
  periodKey: string;
  assignedShardId: 'shard_0' | 'shard_1' | 'shard_2' | 'shard_3' | 'shard_4';
  requestedAmount: number; // Típicamente 1
  status: 'RESERVED' | 'COMMITTED' | 'RELEASED' | 'EXPIRED_RECOVERED';
  idempotencyKey: string;
  businessDocId: string | null; // e.g. orderId
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp; // now + 120 segundos
  committedAt: FirebaseFirestore.Timestamp | null;
  releasedAt: FirebaseFirestore.Timestamp | null;
}
```

---

## 5. SELECCIÓN DE SHARD Y CONCURRENCIA

1. **Selección de Shard:**  
   $$\text{shardIndex} = \lfloor \text{Math.random()} \times 5 \rfloor \implies \text{"shard\_" + shardIndex}$$
   Distribuye la carga de reservas de forma uniforme entre los 5 documentos físicos.
2. **Garantía Inviolable de Concurrencia:**  
   Dentro de la transacción Firestore que ejecuta el `RESERVE`:
   - Se leen los 5 documentos de shards de forma atómica en el mismo snapshot transaccional.
   - Se evalúa:
     $$\sum_{i=0}^{4} (\text{shard}_i.\text{committedUsage} + \text{shard}_i.\text{reservedUsage}) + \text{requested} \le \text{hardLimit}$$
   - Si la suma supera `hardLimit`, la transacción aborta inmediatamente con error formal `QUOTA_EXCEEDED` (mapeado a HTTP 429 en REST o HttpsError en Callable).
   - Si no supera, se aplica `FieldValue.increment(requested)` sobre el campo `reservedUsage` del `shard_k` seleccionado y se escribe el documento `reservations/{reservationId}`.

---

## 6. MATRIZ DE MANEJO DE FALLOS PARCIALES (CASOS A AL H)

| Caso | Escenario de Falla | Estado Esperado en BD | Acción de Recuperación (Recovery Action) | Requisito de Auditoría | Resultado Contable Final |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Caso A** | Reserva creada; transacción de negocio falla | Shard con `reservedUsage` incrementado; orden NO existe; reserva en `RESERVED`. | Catch block de la Cloud Function ejecuta liberación compensatoria atómica (`reservedUsage -= 1`, `status = RELEASED`). | `QUOTA_RESERVATION_RELEASED_COMPENSATION` | `0` committed<br>`0` reserved |
| **Caso B** | Orden creada; commit de cuota falla (timeout Firestore) | Orden existe en `/orders`; reserva en `RESERVED`; `reservedUsage` activo. | Worker de conciliación detecta que `businessDocId` existe en estado válido y consolida el commit de forma asíncrona. | `QUOTA_COMMIT_RECONCILED_ASYNC` | `+1` committed<br>`0` reserved |
| **Caso C** | Cliente reintenta petición idéntica (Retry) | Documento de reserva `/reservations/{reservationId}` ya existe. | Si status es `COMMITTED`, retorna la orden previamente creada sin volver a reservar ni incrementar shards. | `IDEMPOTENT_RETRY_SERVED` | `+1` committed (sin doble conteo) |
| **Caso D** | Timeout de Cloud Function durante ejecución | Reserva en `RESERVED`; cliente recibe error 504. | Cliente reintenta con el mismo `idempotencyKey` (resuelve caso C); o sweep worker limpia a los 120s si no hubo orden. | `TIMEOUT_RECOVERY_EVALUATED` | Consistente (0 o +1 según negocio) |
| **Caso E** | Crash del contenedor de la Cloud Function | Reserva en `RESERVED` en Firestore; proceso en memoria muere. | Worker de barrido (*Sweep Reconciliation Worker*) detecta `expiresAt < now` y devuelve el uso reservado al shard. | `ORPHAN_RESERVATION_EXPIRED` | `0` committed<br>`0` reserved |
| **Caso F** | Reintento por caída de red entre cliente y gateway | Gateway recibió petición pero el ACK no llegó al cliente. | Mismo mecanismo que Caso C: deduplicación determinista por `reservationId`. | `NETWORK_RETRY_DEDUPLICATED` | `+1` committed (exactamente uno) |
| **Caso G** | Peticiones concurrentes idénticas (Duplicate Request) | Dos requests simultáneas con idéntico `idempotencyKey`. | Firestore Transaction intenta crear `/reservations/{resId}`; la segunda colisiona con `ALREADY_EXISTS` y es rechazada. | `CONCURRENT_DUPLICATE_REJECTED` | `+1` committed<br>`0` reserved |
| **Caso H** | Reserva estancada (Stale Reservation > 120s) | Reserva en `RESERVED`, `now > expiresAt`, sin orden asociada. | Worker cron periódico (`every 2 minutes`) decrementa `reservedUsage` en el shard correspondiente y marca `EXPIRED_RECOVERED`. | `STALE_RESERVATION_SWEPT` | `0` committed<br>`0` reserved |

---

## 7. CRON DE CONCILIACIÓN DE RESERVAS HUÉRFANAS

Un proceso de mantenimiento en Cloud Functions (`reconcileQuotaReservations`) se ejecuta cada 2 minutos con la siguiente semántica:
1. Consulta: `/usage_counters/{tenantId}/periods/{periodKey}/reservations` donde `status == 'RESERVED'` y `expiresAt < now()`.
2. Para cada reserva expirada:
   - Verifica si existe el documento de negocio (e.g. `/orders/{orderId}`).
   - Si el documento existe: ejecuta commit diferido (`reservedUsage -= 1`, `committedUsage += 1`, `status = COMMITTED`).
   - Si el documento NO existe: ejecuta compensación diferida (`reservedUsage -= 1`, `status = EXPIRED_RECOVERED`).
3. Actualiza el documento agregador `periods/{periodKey}` recalculando `totalCachedCommitted` y `totalCachedReserved`.

---

## 8. CONCLUSIÓN Y CIERRE DE RF-01 Y RF-02

Queda formalmente clausurado el diseño de sharding físico:
- **5 documentos físicos reales** eliminan la falsa garantía de sharding lógico en campos individuales.
- El ciclo de reserva con identidad determinista garantiza **CERO pérdidas, CERO cuotas perforadas y CERO doble conteo** ante concurrencia extrema o fallos de red.
