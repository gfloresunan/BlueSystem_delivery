# CONTRATO DE POLÍTICA FINANCIERA DEL MOTORIZADO (COURIER)
## BASELINE INMUTABLE & CIERRE ARQUITECTÓNICO ENTERPRISE v2.2+

**PROTOCOLO:** `BSD-COURIER-FINANCIAL-POLICY-FREEZE-001`  
**SISTEMA:** BlueSystem Delivery Enterprise  
**ESTADO:** 🔒 **BASELINE INMUTABLE & CONGELADO**  
**FECHA DE CONGELAMIENTO:** 30 de Agosto de 2026  
**VEREDICTO:** 🟢 **FINANCIAL POLICY FREEZE COMPLETED — READY FOR FINAL CERTIFICATION**

---

## 1. PROPÓSITO

Establecer formalmente el **Contrato Financiero Inmutable del Motorizado (Courier)** de BlueSystem Delivery Enterprise. Este documento fija las reglas de negocio, fórmulas matemáticas, jerarquías de distancia, momentos de causación de ingresos, máquinas de compensación y políticas de custodia que rigen a toda la plataforma, blindando el sistema contra modificaciones empíricas, duplicaciones de ledger o mutaciones client-side no autorizadas.

---

## 2. ALCANCE

Este contrato cubre:
- Todas las entregas de comercio local (**Commerce Delivery** en `/orders`).
- Todos los envíos punto a punto (**X→Y Delivery** en `/deliveryTrips`).
- El subledger financiero de recaudación (`/courier_cash_ledger`).
- El balance financiero agregado (`/courier_balances`).
- Los arqueos y cierres diarios (`/courier_daily_closures`).
- Las liquidaciones bancarias (`/courier_settlements`).
- La parametrización global (`/system_config/global`).
- La aplicación móvil del Motorizado (Android Jetpack Compose).
- La consola de control administrativo (Admin Web Dashboard).

---

## 3. ARQUITECTURA VIGENTE & PRINCIPIOS

1. **Server-Authoritative:** Ningún valor financiero es calculado ni aceptado por input directo del cliente. Todo ingreso, deducción y balance se genera en Cloud Functions.
2. **Single Source of Truth (SSOT):** La realidad financiera nace en `/courier_balances` y `/courier_cash_ledger`, y se consume sin discrepancias en Android y Admin Web.
3. **Cálculo en Centavos Enteros:** Toda la aritmética se ejecuta en enteros de centavos (`amountCents`) eliminando errores de redondeo de punto flotante.
4. **Idempotencia Estricta:** Todo evento se registra con llaves deterministas (`order_{orderId}_courier_collection` y `trip_{tripId}_courier_collection`).
5. **No Regresión & Respeto de ADRs:** Cumplimiento total de ADR-003, ADR-013, ADR-014, ADR-015 y ADR-016.

---

## 4. FUENTES SSOT Y ESTRUCTURA DE DATOS

```text
                  CLOUD FUNCTIONS (Triggers & Callables)
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
       /courier_cash_ledger                 /courier_balances
     (Asientos Inmutables)                (Saldos en Centavos)
                  │                                 │
                  ├────────────────┬────────────────┤
                  ▼                ▼                ▼
         COURIER ANDROID APP   ADMIN WEB   DAILY CLOSURES
```

---

## 5. FÓRMULA FINANCIERA CANÓNICA

$$\text{COURIER TOTAL EARNINGS} = \text{DISTANCE EARNINGS} + \text{ORDER BONUS} + \text{COURIER TIP}$$

Donde:
- **DISTANCE EARNINGS:** Ganancia generada por los kilómetros de la ruta.
- **ORDER BONUS:** Bono fijo asignado por completar la entrega.
- **COURIER TIP:** 100% de la propina voluntaria otorgada por el cliente.

---

## 6. POLÍTICA DE DISTANCIA OPERACIONAL & JERARQUÍA

La distancia utilizada para la remuneración sigue una jerarquía estricta y determinista:

```text
1. ROUTING ENGINE (routeDistanceMeters / routeDistanceKm)
       ↓ (si no existe odometría vial pero hay coordenadas)
2. FALLBACK ESTIMATED (Haversine × 1.28 factor de tortuosidad vial)
       ↓ (si no existen coordenadas)
3. ROUTE DISTANCE UNAVAILABLE (Distancia = 0, Ganancia KM = C$0, Bono intacto)
```

- **Prohibición:** Queda terminantemente prohibido inventar distancias o utilizar textos de direcciones como kilómetros ficticios.
- **Transparencia:** Todo registro debe estampar `distanceSource` y `routingProvider`.

---

## 7. POLÍTICA DE TARIFA POR KILÓMETRO

- **Tarifa Base:** Configurable en `/system_config/global` (`courierRatePerKm = C$ 7.00/km`).
- **Cálculo:** $\text{distanceEarningsCents} = \text{round}\left(\frac{\text{routeDistanceMeters} \times \text{ratePerKmCents}}{1000}\right)$.

---

## 8. POLÍTICA DE BONO FIJO POR PEDIDO

- **Bono Base:** Configurable en `/system_config/global` (`courierOrderBonus = C$ 10.00/pedido`).
- **Cálculo:** $\text{bonusEarningsCents} = \text{round}(\text{courierOrderBonus} \times 100)$.

---

## 9. POLÍTICA DE PROPINAS (100% COURIER)

- **Propina en Efectivo (CASH):** Incrementa las ganancias del motorizado y el efectivo recaudado. Se compensa inmediatamente contra la custodia a entregar.
- **Propina con Tarjeta (DIGITAL):** Incrementa las ganancias del motorizado y se acredita a su saldo a favor (`courierPayableBalanceCents`), sin generar efectivo físico ficticio.

---

## 10. POLÍTICA DE COBROS EN EFECTIVO (CASH)

- El motorizado recauda el total neto (`cashReceived - changeGiven`).
- El dinero recaudado pasa a custodia física (`cashOutstandingCents`) deduciendo automáticamente las ganancias propias mediante la máquina de compensación.

---

## 11. POLÍTICA DE PAGOS DIGITALES (CARD)

- El cliente paga por medios electrónicos $\to$ Efectivo recaudado $= C\$0.00$.
- Las ganancias generadas compensan cualquier efectivo que el motorizado tenga en custodia viva o se acumulan como saldo a favor exigible (`courierPayableBalanceCents`).

---

## 12. DEFINICIÓN OFICIAL DE LOS 5 CONCEPTOS FINANCIEROS

1. **EARNED (Ganancias Propias):** Total acumulado generado por el motorizado por distancia, bonos y propinas.
2. **PAYABLE (Saldo a Favor):** Deuda del sistema hacia el motorizado por ganancias en pedidos digitales no compensadas.
3. **CASH CUSTODY (Custodia Física):** Efectivo físico vivo en manos del motorizado perteneciente a la recaudación.
4. **COMPENSATED (Compensación Atómica):** Ganancias propias que el motorizado retiene en mano deduciéndolas del efectivo que debe entregar.
5. **REQUIRED DEPOSIT (Depósito Exigible):** Monto neto real que el motorizado debe depositar en banco o mesa ($\max(0, \text{Efectivo Cobrado} - \text{Compensado})$).

---

## 13. MÁQUINA CANÓNICA DE COMPENSACIÓN & LIQUIDACIÓN

$$\text{TOTAL PAYABLE} = \text{PREVIOUS PAYABLE} + \text{CURRENT COURIER EARNINGS}$$
$$\text{COMPENSATION} = \min(\text{CASH COLLECTED NET}, \text{TOTAL PAYABLE})$$
$$\text{REQUIRED DEPOSIT} = \max(0, \text{CASH COLLECTED NET} - \text{COMPENSATION})$$
$$\text{REMAINING PAYABLE} = \text{TOTAL PAYABLE} - \text{COMPENSATION}$$

---

## 14. CASO DE REFERENCIA OBLIGATORIO (C$5,000 / C$1,100)

$$\text{Custodia Inicial} = C\$5,000 \quad|\quad \text{Ganancias Digitales} = C\$1,100$$
$$\Downarrow$$
$$\text{Compensado} = C\$1,100 \quad|\quad \text{Depósito Exigible} = C\$3,900 \quad|\quad \text{Saldo a Favor Remanente} = C\$0$$

---

## 15. SECUENCIA CARD $\to$ CASH $\to$ CARD

1. **CARD (+C$300):** Custodia $= C\$0$, Payable $= C\$300$.
2. **CASH (C$500 cobrado, Ganancia C$100):** Total Payable $= C\$400$, Compensado $= C\$400$, Depósito Requerido $= C\$100$, Payable $= C\$0$.
3. **CARD (+C$200):** Compensa la custodia de $C\$100 \to$ Custodia $= C\$0$, Nuevo Payable $= C\$100$.

---

## 16. POLÍTICA DE CAMBIO / VUELTO AL CLIENTE

Si la cuenta es de $C\$435$, el cliente entrega $C\$500$ y el motorizado devuelve $C\$65$ de cambio:
$$\text{Impacto en Custodia} = C\$435.00 \quad (\text{NO } C\$500.00)$$

---

## 17. POLÍTICA DE CIERRES DIARIOS Y ARQUEOS

- Cada cierre diario consolida los pedidos del turno/fecha.
- El cierre calcula el depósito esperado basándose en `cashOutstandingCents` neto tras compensaciones.

---

## 18. POLÍTICA DE DEPÓSITOS PARCIALES

Si el depósito exigible es de $C\$2,000$ y el motorizado deposita $C\$1,500$:
$$\text{Depositado} = C\$1,500 \quad|\quad \text{Saldo Pendiente} = C\$500$$
El saldo pendiente **no desaparece ni se borra**, manteniéndose vivo en `/courier_balances`.

---

## 19. PRESERVACIÓN HISTÓRICA MULTI-DÍA

Los saldos pendientes de días anteriores se acumulan de forma aditiva y transparente sin sobrescribir los registros de fechas pasadas.

---

## 20. INMUTABILIDAD DE CIERRES HISTÓRICOS

Los pedidos completados en días posteriores no recalculan ni modifican cierres diarios (`courier_daily_closures`) ya aprobados o verificados.

---

## 21. SEMÁNTICA DE EARNED VS PAYABLE VS PAID OUT

- **EARNED:** Ingreso devengado total.
- **PAYABLE:** Saldo líquido a favor acumulado en la plataforma.
- **PAID OUT:** Actualmente no constituye un evento bancario separado (se liquida vía compensación directa en mano).

---

## 22. INMUTABILIDAD ANTE CAMBIOS DE TARIFA Y BONO

- Si la tarifa cambia de $C\$7 \to C\$8$, los pedidos anteriores conservan su snapshot $C\$7$.
- Si el bono cambia de $C\$10 \to C\$15$, los pedidos anteriores conservan su snapshot $C\$10$.

---

## 23. VERSIONAMIENTO DE POLÍTICA

Toda modificación en `/system_config/global` incrementa `courierRatePolicyVersion` y se audita en `/audit_events` con usuario y timestamp.

---

## 24. ALCANCE DE POLÍTICA (GLOBAL / TENANT / MUNICIPIO)

- **Alcance Actual:** Global (`/system_config/global`).
- **Preparación Futura:** Diseñado para soportar override por Tenant o Municipio mediante nuevas versiones de política sin alterar el core.

---

## 25. POLÍTICA DE CANCELACIONES

- **Cancelado antes de aceptar / recoger:** Ganancia $= C\$0.00$.
- **Cancelado en tránsito / cliente no aparece:** Actualmente `NOT CURRENTLY REMUNERATED` (sin cobros arbitrarios no soportados).

---

## 26. POLÍTICA DE TIEMPO DE ESPERA

- **Tiempo de Espera:** `WAITING TIME COMPENSATION = NONE` (el contrato actual no remunera minutos de espera).

---

## 27. POLÍTICA DE UNIDAD DE RUTA (SIN BATCHING)

- **Regla:** $1\text{ Pedido} = 1\text{ Unidad Financiera de Ruta}$.
- No se agrupan kilómetros entre múltiples entregas simultáneas.

---

## 28. POLÍTICA DE AJUSTES ADMINISTRATIVOS

- Ningún evento financiero histórico puede ser editado silenciosamente.
- Cualquier ajuste futuro debe generarse como asiento compensatorio auditable en `/courier_cash_ledger` y `/audit_events`.

---

## 29. REGLA DE NO EDICIÓN CLIENT-SIDE

- Queda terminantemente bloqueada la mutación de montos financieros desde el cliente móvil o web.

---

## 30. RESTRICCIONES DE SEGURIDAD & MULTI-TENANT

- Aislamiento estricto por `courierId` y `tenantId`.
- Ningún motorizado puede acceder a los datos financieros de otro repartidor.

---

## 31. PRESERVACIÓN DEL LÍMITE DE CUSTODIA (C$2,000)

- Se mantiene la restricción de límite de custodia de efectivo ($C\$2,000.00$).
- Si `cashOutstandingCents > limit`, el motorizado es suspendido temporalmente para nuevos pedidos en efectivo hasta liquidar.

---

## 32. PRESERVACIÓN DE RESTRICCIONES POR CIERRE PENDIENTE

- El motorizado con cierres pendientes de días anteriores debe regularizar su depósito antes de operar.

---

## 33. MATRIZ FORMAL DE POLÍTICAS CONGELADAS (POL-001 A POL-023)

| ID | Política | Estado | Regla Congelada | Evidencia |
| :--- | :--- | :---: | :--- | :---: |
| **POL-001** | Jerarquía de Distancia | 🔒 Inmutable | Routing Engine > Fallback Estimated > Unavailable | Test `POL-001` (5.2ms) |
| **POL-002** | Inmutabilidad de Snapshot | 🔒 Inmutable | Pedidos históricos conservan snapshot congelado | Test `POL-002` (0.5ms) |
| **POL-003** | Tarifa Mínima | 🔒 Inmutable | `MINIMUM COURIER PAY = NONE` (Proporcional) | Test `POL-003` (0.6ms) |
| **POL-004** | Momento de Nacimiento | 🔒 Inmutable | Generación exclusiva al estado `DELIVERED`/`COMPLETED` | Test `POL-004` (0.5ms) |
| **POL-005** | Cancelación Previa | 🔒 Inmutable | Cancelado sin asignación $= C\$0.00$ | Test `POL-005` (0.6ms) |
| **POL-006** | Cancelación Operativa | 🔒 Inmutable | Cancelado en tránsito $= \text{NOT REMUNERATED}$ | Test `POL-006` (0.5ms) |
| **POL-007** | Tiempo de Espera | 🔒 Inmutable | `WAITING TIME COMPENSATION = NONE` | Test `POL-007` (0.5ms) |
| **POL-008** | Propina en Efectivo | 🔒 Inmutable | 100% Courier, incrementa custodia y se compensa | Test `POL-008` (0.5ms) |
| **POL-009** | Propina Digital | 🔒 Inmutable | 100% Courier, acredita a Payable, $0$ efectivo | Test `POL-009` (0.5ms) |
| **POL-010** | Cálculo de Vuelto | 🔒 Inmutable | Custodia $=$ Monto exacto de la cuenta | Test `POL-010` (1.8ms) |
| **POL-011** | Unidad de Ruta | 🔒 Inmutable | $1\text{ Pedido} = 1\text{ Unidad Financiera de Ruta}$ | Test `POL-011` (0.3ms) |
| **POL-012** | Cierre Inmutable | 🔒 Inmutable | Pedidos de D2 no modifican cierre de D1 | Test `POL-012` (0.3ms) |
| **POL-013** | Versionamiento | 🔒 Inmutable | `courierRatePolicyVersion` incrementable en Admin | Test `POL-013` (0.2ms) |
| **POL-014** | Snapshot Tarifa KM | 🔒 Inmutable | `courierRatePerKmApplied` inmutable | Test `POL-014` (0.2ms) |
| **POL-015** | Snapshot Bono Pedido | 🔒 Inmutable | `courierOrderBonusApplied` inmutable | Test `POL-015` (0.3ms) |
| **POL-016** | Earned vs Payable | 🔒 Inmutable | Distinción matemática disjunta | Test `POL-016` (0.3ms) |
| **POL-017** | Ajustes Administrativos | 🔒 Inmutable | Prohibida la edición silenciosa | Test `POL-017` (0.3ms) |
| **POL-018** | Bloqueo Client Mutation | 🔒 Inmutable | Rechazo server-authoritative de mutaciones | Test `POL-018` (0.3ms) |
| **POL-019** | Límite de Custodia | 🔒 Inmutable | Bloqueo al superar $C\$2,000.00$ en efectivo | Test `POL-019` (0.2ms) |
| **POL-020** | Cierre Pendiente | 🔒 Inmutable | Restricción operativa por mora no regularizada | Test `POL-020` (0.2ms) |
| **POL-021** | Alcance de Política | 🔒 Inmutable | Scope global en `/system_config/global` | Test `POL-021` (0.2ms) |
| **POL-022** | Aislamiento Multi-Tenant | 🔒 Inmutable | Aislamiento por `tenantId` y `courierId` | Test `POL-022` (0.3ms) |
| **POL-023** | Alcance Municipal | 🔒 Inmutable | Preparado para scopes geográficos futuros | Test `POL-023` (0.2ms) |

---

## 34. REPORTE FINAL DE CAMBIOS ARQUITECTÓNICOS

```text
ARCHITECTURE CHANGES = 0
FINANCIAL LOGIC CHANGES = 0
LEDGER CHANGES = 0
BALANCE CHANGES = 0
```

Se declara el congelamiento oficial de políticas sin requerir modificaciones en la arquitectura ni en los esquemas de persistencia.

---

## VEREDICTO OFICIAL DE CONGELAMIENTO

🟢 **FINANCIAL POLICY FREEZE COMPLETED — READY FOR FINAL CERTIFICATION**
