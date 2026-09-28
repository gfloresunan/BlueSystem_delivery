# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — CONTRATO CANÓNICO DEL RESOLVER DE PERÍODO DE FACTURACIÓN
**Single Canonical Billing Period Resolver & Lifecycle State Transition Semantics**

- **Protocolo Oficial:** `BSD-C2D35.0R-BILLING-PERIOD-CONTRACT-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** DEC-07 de C2D.34A
- **Modo:** `READ-ONLY ARCHITECTURAL SPECIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. REMEDIACIÓN DEL RESOLVER DE PERÍODO (RF-05)

### 1.1 El Defecto de Ambigüedad Previo
En análisis anteriores de C2D.35.0 existía una coexistencia indefinida entre dos formatos de clave de período:
1. `YYYYMM` (mes calendario)
2. `cycleStartDate_cycleEndDate` (ciclo contractual de facturación)

Tener dos resolvers paralelos en el runtime creaba el riesgo de que una transacción reservara cuota en un período mensual mientras otra consultaba el ciclo de suscripción, fragmentando los contadores y destruyendo la trazabilidad financiera.

### 1.2 Regla Contractual Única (DEC-07)
**Existe un ÚNICO resolver canónico para toda la plataforma:** El período de consumo de cuotas está **estrictamente anclado al ciclo de facturación contractual** (`cycleStartDate → cycleEndDate`).  
`YYYYMM` **NO ES una segunda autoridad**. Solo se admite como etiqueta técnica secundaria o índice legible, pero **jamás como árbitro del cómputo de cuotas**.

---

## 2. ESPECIFICACIÓN TÉCNICA DEL RESOLVER CANÓNICO

### 2.1 Firma de la Función
```typescript
export interface CanonicalBillingPeriod {
  periodKey: string;           // "cycle_YYYYMMDD_YYYYMMDD"
  cycleStartDate: FirebaseFirestore.Timestamp;
  cycleEndDate: FirebaseFirestore.Timestamp;
  isGracePeriodActive: boolean;
  daysRemainingInCycle: number;
}

export function resolveBillingPeriod(
  subscription: SubscriptionDocument,
  evalTimestamp: FirebaseFirestore.Timestamp = FirebaseFirestore.Timestamp.now()
): CanonicalBillingPeriod;
```

### 2.2 Algoritmo Determinista de Resolución
1. **Verificación de Fechas Contractuales:**
   - Se leen `subscription.currentPeriodStart` y `subscription.currentPeriodEnd`.
   - Si no existen o son inválidas (datos legacy corruptos): se computa un ciclo estándar de 30 días a partir de `subscription.createdAt`.
2. **Generación Determinista de `periodKey`:**
   $$\text{periodKey} = \text{"cycle\_"} + \text{formatDate(currentPeriodStart)} + \text{"\_"} + \text{formatDate(currentPeriodEnd)}$$
   Ejemplo canónico: `cycle_20260901_20261001`.
3. **Manejo de `evalTimestamp`:**
   - Si `evalTimestamp < currentPeriodStart`: la transacción pertenece a un ciclo anterior o evento retroactivo; se resuelve contra el histórico.
   - Si `currentPeriodStart <= evalTimestamp <= currentPeriodEnd`: se retorna el período activo normal.
   - Si `evalTimestamp > currentPeriodEnd`:
     - Si `subscription.status === 'PAST_DUE'` y `evalTimestamp <= subscription.pastDueGraceUntil`: se mantiene el `periodKey` del ciclo actual con `isGracePeriodActive = true`.
     - Si la suscripción fue renovada: se requiere que el ciclo haya sido avanzado por el scheduler de billing a un nuevo par `(currentPeriodStart, currentPeriodEnd)`.

---

## 3. SEMÁNTICA DEL PERÍODO ANTE EVENTOS DEL CICLO DE VIDA

| Evento de Ciclo de Vida | Impacto en Fechas del Ciclo | Comportamiento del `periodKey` | Gestión de Shards de Cuota |
| :--- | :--- | :--- | :--- |
| **Renovación Automática** | `start = old_end`, `end = old_end + 1 mes` | Se genera nuevo `periodKey` (nuevo ciclo). | Se inicializan 5 shards nuevos en 0; ciclo anterior queda cerrado e inmutable. |
| **Upgrade de Plan** | Inmediato; inicia nuevo ciclo contractual. | Se genera nuevo `periodKey`. | Se inicializan shards con nuevo límite superior (ej. ilimitado en Enterprise). |
| **Downgrade de Plan** | Efectivo al finalizar el ciclo actual. | Se mantiene el `periodKey` actual hasta el fin del ciclo. | En la fecha de corte se genera nuevo período con el límite reducido. |
| **Transición a PAST_DUE** | Las fechas del ciclo NO cambian. | Se preserva el `periodKey` del ciclo impagado. | Los shards siguen contabilizando uso durante los 5 días de gracia. |
| **Suspensión (SUSPENDED)** | Ciclo congelado. | Se preserva el `periodKey`. | Inbound Lock bloquea mutaciones; contadores quedan congelados. |
| **Cancelación (CANCELLED)** | Terminal. | Período finaliza anticipadamente en fecha de cancelación. | Shards se archivan en modo sólo lectura. |
| **Reactivación** | Nuevo `currentPeriodStart = now()`, nuevo fin. | Se genera nuevo `periodKey`. | Se provisionan nuevos shards en 0 para el nuevo ciclo activo. |
| **Reintento de Red / Retry** | Idéntico timestamp de la transacción original. | Resuelve exactamente el mismo `periodKey`. | Deduplicación por `reservationId` previene alteración de contadores. |

---

## 4. PROHIBICIÓN DE RESOLUCIÓN BASADA EN `YYYYMM`

Queda expresamente prohibido que cualquier módulo ejecute lógica del tipo:
```typescript
// ❌ PROHIBIDO EN RUNTIME
const periodKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
```
**Razón:** Un comercio cuyo ciclo de facturación va del 15 de septiembre al 15 de octubre tendría su cuota reseteada arbitrariamente el 1 de octubre si se usara `YYYYMM`, despojándolo de su límite contratado o duplicándole pedidos indebidamente.

---

## 5. CONCLUSIÓN Y CIERRE DE RF-05

Se clausura la resolución de período:
- Un **único resolver canónico**: `resolveBillingPeriod(subscription, timestamp)`.
- El período contractual `cycleStartDate → cycleEndDate` es la **única autoridad de tiempo**.
- `YYYYMM` queda degradado a etiqueta de auditoría, erradicando cualquier conflicto de contadores.
