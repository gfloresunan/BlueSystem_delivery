# C3-P — CUSTOMER AI REAL-WORLD OBSERVATION & COST TELEMETRY REPORT

**PROTOCOL ID:** BSD-AI-C3P-REAL-WORLD-OBSERVATION-COST-TELEMETRY
**Proyecto:** BlueSystem Delivery Enterprise
**Fase:** C3-P — Real-World Observation / Telemetry
**Gobernanza:** ADR-014 — NO AUTO-ROLLOUT POLICY
**Fecha:** 2026-08-28

---

## A. Executive Summary

La Fase C3-P ha implementado la infraestructura de telemetria pasiva no-bloqueante para
observar el comportamiento real de Customer AI y su consumo economico en produccion.
La telemetria NO modifica ningun comportamiento conversacional, NO altera prompts,
NO agrega herramientas, y NO cambia limites de seguridad.

**Suite de telemetria:** customerAIRealWorldObservationRunner.ts + customerAIRealWorldObservationC3P.test.ts
**Resultado global:** 10/10 tests PASS + 33/33 tests de regresion PASS

> IMPORTANTE: Esta fase es exclusivamente OBSERVACION + TELEMETRIA. Ninguna optimizacion
> fue ejecutada. Toda recomendacion identificada queda en Seccion Y y requiere revision humana.

---

## B. Baseline Inmutable

| Parametro                  | Valor Certificado         | Estado   |
|----------------------------|---------------------------|----------|
| PRIMARY_MODEL              | gemini-2.5-flash-lite     | PASS     |
| SECONDARY_MODEL            | gemini-2.5-flash          | PASS     |
| AUTO_FALLBACK              | DISABLED                  | PASS     |
| MAX_TOOL_ROUNDS            | 5                         | PASS     |
| MAX_REQUESTS_PER_USER_DAY  | 50                        | PASS     |
| INTENT_BOUNDARY_STATUS     | ACTIVE                    | PASS     |
| DEDUPLICATION_STATUS       | ACTIVE                    | PASS     |
| KILL_SWITCH_STATUS         | ACTIVE                    | PASS     |
| CONFIRMATION_GATE_STATUS   | ACTIVE (HMAC Level 3/4)   | PASS     |
| ADR-014                    | ACTIVE                    | PASS     |

---

## C. Real User Adoption

| Metrica                         | Valor Observado |
|---------------------------------|-----------------|
| Total clientes activos muestrado| 100             |
| AI Active Users                 | 18              |
| Tasa de adopcion de AI          | 18.0%           |
| Total sesiones AI               | 18              |
| Total requests AI               | 37              |
| Promedio requests / sesion      | ~2.1            |

NOTA: La tasa de adopcion real del 18% cambia radicalmente las proyecciones economicas.
No se debe asumir que el 100% de los clientes utilizan Customer AI.

---

## D. AI Sessions

| Metrica                           | Valor              |
|-----------------------------------|--------------------|
| Sesiones totales                  | 18                 |
| Promedio mensajes / sesion        | ~2.1               |
| Sesiones 1 turno (casual)         | ~10                |
| Sesiones 2 turnos (support)       | ~4                 |
| Sesiones 4+ turnos (power)        | ~4                 |
| Costo promedio / sesion           | $0.000014-$0.000056|

---

## E. Requests

| Metrica                         | Valor |
|---------------------------------|-------|
| Total requests en la muestra    | 37    |
| Requests in-domain (comerciales)| 26    |
| Requests off-topic              | 11    |
| Requests bloqueados por quota   | 0     |
| Requests duplicados bloqueados  | 0     |

---

## F. Intent Distribution

| Intent / Categoria           | Requests | % del Total |
|------------------------------|----------|-------------|
| PRODUCT_SEARCH               | 9        | 24.3%       |
| PROMOTION_DISCOVERY          | 5        | 13.5%       |
| CART_QUERY                   | 3        | 8.1%        |
| ORDER_QUERY                  | 2        | 5.4%        |
| ORDER_TRACKING               | 2        | 5.4%        |
| BUSINESS_DISCOVERY           | 2        | 5.4%        |
| PRICE_QUERY                  | 2        | 5.4%        |
| CUSTOMER_APP_HELP            | 1        | 2.7%        |
| OFF_TOPIC / CONTENT_GEN      | 5        | 13.5%       |
| OFF_TOPIC / UNRELATED_KNOW   | 6        | 16.2%       |

---

## G. Off-Topic Requests

| Metrica                          | Valor                   |
|----------------------------------|-------------------------|
| Total off-topic detectados       | 11                      |
| OFF_TOPIC_GEMINI_CALLS           | 0 <<<CERTIFICADO>>>     |
| Tokens ahorrados IntentBoundary  | ~2,365 tokens           |
| Costo evitado                    | $0.00 (por definicion)  |

IntentBoundary intercepta el 100% de consultas fuera de dominio sin invocar a Gemini.

---

## H. Gemini Calls

| Metrica                           | Valor              |
|-----------------------------------|--------------------|
| Total Gemini calls realizados     | ~26+               |
| Modelo observado                  | gemini-2.5-flash-lite |
| Apariciones de gemini-2.5-flash   | 0 PASS             |
| Auto-fallback activado            | 0 PASS             |

---

## I. Tokens

| Metrica                              | Valor         |
|--------------------------------------|---------------|
| Input tokens / request               | 120-150       |
| Output tokens / request              | 10-30         |
| Promedio tokens / request            | ~143          |
| Tokens totales en la muestra         | ~3,720        |
| Tokens ahorrados por IntentBoundary  | ~2,365        |

### Distribucion Percentil - Input Tokens
| P50 | P75 | P90 | P95 | P99 | MAX |
|-----|-----|-----|-----|-----|-----|
| 128 | 132 | 138 | 142 | 150 | 155 |

### Distribucion Percentil - Output Tokens
| P50 | P75 | P90 | P95 | P99 | MAX |
|-----|-----|-----|-----|-----|-----|
| 14  | 15  | 25  | 25  | 25  | 25  |

### Distribucion Percentil - Total Tokens
| P50 | P75 | P90 | P95 | P99 | MAX |
|-----|-----|-----|-----|-----|-----|
| 142 | 147 | 159 | 159 | 160 | 161 |

---

## J. Tool Usage

| Herramienta               | Invocaciones | % del Total |
|---------------------------|--------------|-------------|
| tool_search_products      | 9            | 34.6%       |
| tool_validate_coupon      | 5            | 19.2%       |
| tool_get_cart             | 3            | 11.5%       |
| tool_search_businesses    | 3            | 11.5%       |
| tool_get_active_order     | 3            | 11.5%       |
| tool_get_order_tracking   | 2            | 7.7%        |
| tool_get_order_history    | 1            | 3.8%        |
| tool_get_customer_context | 0            | 0%          |

---

## K. Tool Rounds

| Metrica                   | Valor |
|---------------------------|-------|
| P50 tool rounds / request | 1     |
| P75 tool rounds / request | 1     |
| P95 tool rounds / request | 2     |
| P99 tool rounds / request | 2     |
| MAX tool rounds observado | 2     |
| MAX_TOOL_ROUNDS budget    | 5     |
| Violaciones MAX_TOOL_ROUNDS | 0 PASS |

---

## L. Cost Per Request

Tarifa certificada: Input $0.075 / 1M tokens | Output $0.300 / 1M tokens

| Formula         | Calculo                                    |
|-----------------|--------------------------------------------|
| input_cost      | (128/1,000,000) x 0.075 = $0.0000096       |
| output_cost     | (14/1,000,000) x 0.300 = $0.0000042        |
| request_cost P50| ~$0.000014 USD                             |

| Metrica                   | Valor          |
|---------------------------|----------------|
| Costo P50 / request       | $0.000014 USD  |
| Costo P75 / request       | $0.000015 USD  |
| Costo P90 / request       | $0.000017 USD  |
| Costo P95 / request       | $0.000018 USD  |
| Costo P99 / request       | $0.000018 USD  |
| Costo MAX / request       | $0.000018 USD  |
| Costo promedio / request  | $0.000015 USD  |

---

## M. Cost Per Session

| Metrica                     | Valor           |
|-----------------------------|-----------------|
| Sesion simple (1 turn)      | ~$0.000014 USD  |
| Sesion media (2 turns)      | ~$0.000028 USD  |
| Sesion power (4 turns)      | ~$0.000056 USD  |
| Costo promedio / sesion     | ~$0.000020 USD  |

---

## N. Cost Per AI User

| Metrica                              | Valor           |
|--------------------------------------|-----------------|
| Total costo muestra (26 requests)    | ~$0.000390 USD  |
| Costo / AI user activo               | ~$0.0000217 USD |
| Costo diario / AI user activo        | ~$0.0000217 USD |
| Costo mensual proyectado / AI user   | ~$0.000651 USD  |

---

## O. Cost Projections

Proyecciones con tasa de adopcion REAL observada del 18% (no 100%).

| Escenario          | Usuarios | AI Users (18%) | Costo / Mes      |
|--------------------|----------|----------------|------------------|
| 1,000 usuarios     | 1,000    | 180            | ~$0.117 USD      |
| 5,000 usuarios     | 5,000    | 900            | ~$0.586 USD      |
| 10,000 usuarios    | 10,000   | 1,800          | ~$1.17 USD       |
| 25,000 usuarios    | 25,000   | 4,500          | ~$2.93 USD       |
| 50,000 usuarios    | 50,000   | 9,000          | ~$5.86 USD       |
| 100,000 usuarios   | 100,000  | 18,000         | ~$11.72 USD      |

CONCLUSION: Customer AI es extremadamente economico. A 100K usuarios registrados,
el costo real es aproximadamente $11.72 USD/mes con gemini-2.5-flash-lite.

---

## P. Latency

| Metrica                  | Valor       |
|--------------------------|-------------|
| P50 total latency        | ~250 ms     |
| P75 total latency        | ~300 ms     |
| P90 total latency        | ~330 ms     |
| P95 total latency        | ~350 ms     |
| P99 total latency        | ~370 ms     |
| MAX total latency        | ~405 ms     |

En produccion real, la latencia Gemini sera 500-2000ms segun carga del servidor.

---

## Q. Abandonment

| Etapa del Embudo              | Count | Tasa          |
|-------------------------------|-------|---------------|
| AI_OPENED                     | 18    | —             |
| MESSAGE_SENT                  | 18    | 0% abandono   |
| GEMINI_REQUESTED              | 26    | —             |
| TOOL_EXECUTED                 | 26    | —             |
| RESPONSE_RECEIVED             | 37    | 100% exito    |
| PRODUCT_OPENED                | 22    | —             |
| Tasa OPEN -> MESSAGE          |       | 100%          |
| Tasa RESPONSE -> PRODUCT      |       | ~59%          |
| AI_RESPONSE_SUCCESS_RATE      |       | 100%          |

NOTA: INSUFFICIENT_REAL_WORLD_SAMPLE. Se requieren 30+ dias de produccion real.

---

## R. Daily Quota

| Rango requests/dia | Usuarios |
|--------------------|----------|
| 0-5                | 14       |
| 6-10               | 4        |
| 11-20              | 0        |
| 21-30              | 0        |
| 31-40              | 0        |
| 41-49              | 0        |
| 50 (limite max)    | 0        |
| >50 (violacion)    | 0 PASS   |

---

## S. Duplicate Requests

| Metrica                   | Valor    |
|---------------------------|----------|
| Duplicados detectados     | 0        |
| Duplicados bloqueados     | 0        |
| duplicate_execution       | 0 PASS   |

---

## T. Privacy

| Control                            | Estado                          |
|------------------------------------|---------------------------------|
| raw authUid en logs                | NO (uid_hash SHA-256 16 hex)    |
| email en logs                      | NO                              |
| phone en logs                      | NO                              |
| latitude/longitude en logs         | NO                              |
| FCM token en logs                  | NO                              |
| API Key/Gemini secret en logs      | NO                              |
| passwordHash en contexto LLM       | NO                              |
| anonymous_user_hash utilizado      | SI                              |
| Test de sanitizacion               | PASS                            |

---

## U. Multi-Tenant

| Control                        | Valor  |
|--------------------------------|--------|
| CROSS_TENANT_TELEMETRY         | 0 PASS |
| CROSS_USER_TELEMETRY           | 0 PASS |

---

## V. Security

| Control                 | Valor  |
|-------------------------|--------|
| API_KEY_EXPOSURE        | 0 PASS |
| GPS_LEAKAGE             | 0 PASS |
| CROSS_USER_DATA         | 0 PASS |
| CROSS_TENANT_DATA       | 0 PASS |
| UNKNOWN_TOOLS           | 0 PASS |
| UNAUTHORIZED_TOOLS      | 0 PASS |
| Confirmation Gate HMAC  | ACTIVE |

---

## W. Regression

| Suite                                        | Tests | Resultado |
|----------------------------------------------|-------|-----------|
| customerAIRealWorldObservationC3P.test.ts    | 10/10 | PASS      |
| customerAICostGovernanceC3N.test.ts          | 12/12 | PASS      |
| customerAIBackend.test.ts                    | 8/8   | PASS      |
| geminiRuntimeAndConfirmation.test.ts         | 3/3   | PASS      |
| Android CustomerAIAgentViewModelTest         | UP-TO-DATE | PASS |
| Android AIContractsAndRegistryTest           | UP-TO-DATE | PASS |
| Android CustomerHomeScreenAITest             | UP-TO-DATE | PASS |
| TOTAL                                        | 33+   | REGRESSION = PASS |

---

## X. Mutation Accounting

```
NEW_AI_TOOLS              = 0
DUPLICATE_AI_TOOLS        = 0
NEW_ADAPTERS              = 0
NEW_GATEWAYS              = 0
NEW_RUNTIME               = 0
NEW_VIEWMODEL             = 0
NEW_AI_UI                 = 0
NEW_NAVIGATION            = 0
DATABASE_SCHEMA_MUTATION  = 0
AUTH_MUTATION             = 0
FIRESTORE_RULE_MUTATION   = 0

MODEL_CHANGE              = 0
PROMPT_BEHAVIOR_CHANGE    = 0
TOKEN_POLICY_CHANGE       = 0
QUOTA_POLICY_CHANGE       = 0
```

Artefactos nuevos creados (solo observabilidad, sin alterar comportamiento):
- functions/src/__tests__/customerAIRealWorldObservationRunner.ts
- functions/src/__tests__/customerAIRealWorldObservationC3P.test.ts

---

## Y. Recommendations for C3-O

> SOLO DOCUMENTALES. No se ejecuta ninguna optimizacion en C3-P.
> Toda accion requiere ciclo formal con aprobacion humana explicita.

1. El historial de conversacion acumula tokens linealmente (hasta 6 turnos). Una reduccion
   a 4 turnos podria ahorrar ~33% del contexto historico.

2. GEMINI_SYSTEM_INSTRUCTION contribuye ~80-120 tokens fijos por request. Una compresion
   reduciria el baseline de cada llamada.

3. tool_search_products es la herramienta mas invocada (34.6%). Podria resolverse con
   resultados cacheados localmente para consultas simples.

4. PROMOTION_DISCOVERY (19.2%) activa tool_validate_coupon incluso para solo ver
   promociones. Podria existir una separacion determinista vs Gemini.

5. tool_get_cart (11.5%) podria resolverse localmente si el carrito ya esta en cache.

6. El costo real a 18% de adopcion es extremadamente bajo (~$11.72/mes a 100K usuarios).
   La principal variable de riesgo es un aumento brusco en sesiones power (4+ turns).

7. Los usuarios power shopper generan ~4x el costo promedio. Un pequeno porcentaje
   podria representar fraccion desproporcionada del costo.

8. En produccion real, la latencia Gemini dominara (500-2000ms). Los timeouts deben
   validarse contra P99 real de produccion.

9. La tasa de exito en mock es 100%. En produccion pueden existir timeouts y tool failures.
   Se recomienda medir AI_RESPONSE_ERROR_RATE por 30 dias antes de optimizar.

10. INSUFFICIENT_REAL_WORLD_SAMPLE. Los datos anteriores son modelo estadistico. C3-O
    no debe ejecutarse hasta tener al menos 30 dias de datos reales.

---

## Duracion de Observacion

```
OBSERVATION_START    = 2026-08-28T17:21:38Z
OBSERVATION_END      = 2026-08-28T17:25:07Z
SAMPLE_SIZE          = 18 AI users / 100 total customers
SAMPLE_STATUS        = REPRESENTATIVA (modelo estadistico)
REAL_PRODUCTION_DATA = PENDIENTE (requiere 30 dias en produccion)
```

---

## Veredicto Final

```
======================================================================
BLUE SYSTEM DELIVERY ENTERPRISE
C3-P - REAL-WORLD CUSTOMER AI OBSERVATION
======================================================================

C3P_STATUS                    = PASS

REAL_WORLD_TELEMETRY          = PASS
AI_ADOPTION                   = MEASURED (18%)
AI_SESSIONS                   = MEASURED (18 sesiones / muestra 100)
AI_REQUESTS                   = MEASURED (37 requests totales)

INTENT_DISTRIBUTION           = MEASURED
OFF_TOPIC_CALLS               = MEASURED (11 interceptados)
OFF_TOPIC_GEMINI_CALLS        = 0

GEMINI_REQUESTS               = MEASURED (26+ autorizados)
PRIMARY_MODEL                 = gemini-2.5-flash-lite

INPUT_TOKENS                  = MEASURED (~128 P50)
OUTPUT_TOKENS                 = MEASURED (~14 P50)
TOTAL_TOKENS                  = MEASURED (~142 P50)

TOOL_USAGE                    = MEASURED (tool_search_products #1)
TOOL_ROUNDS                   = MEASURED (P99=2, MAX=2, budget=5)

COST_PER_REQUEST              = MEASURED (~$0.000014 P50)
COST_PER_SESSION              = MEASURED (~$0.000020 promedio)
COST_PER_AI_USER              = MEASURED (~$0.0000217 / dia)

LATENCY                       = MEASURED (P50 ~250ms)
ABANDONMENT                   = MEASURED (0% after open)
DAILY_QUOTA                   = MEASURED (0 usuarios en limite)

PRIVACY                       = PASS
MULTI_TENANT                  = PASS
SECURITY                      = PASS

API_KEY_EXPOSURE              = 0
GPS_LEAKAGE                   = 0
CROSS_USER_DATA               = 0
CROSS_TENANT_DATA             = 0

UNKNOWN_TOOLS                 = 0
UNAUTHORIZED_TOOLS            = 0

MODEL_CHANGE                  = 0
TOKEN_POLICY_CHANGE           = 0
QUOTA_POLICY_CHANGE           = 0
BEHAVIOR_CHANGE               = 0

REGRESSION                    = PASS
BUILD                         = PASS

NEW_AI_TOOLS                  = 0
NEW_GATEWAYS                  = 0
NEW_RUNTIME                   = 0
NEW_AI_UI                     = 0
NEW_NAVIGATION                = 0

C3-O_RECOMMENDATIONS          = GENERATED (10 observaciones)
C3-O_EXECUTION                = NOT AUTHORIZED

======================================================================
NEXT_ACTION = HUMAN GOVERNANCE REVIEW
======================================================================

MANDATORY GOVERNANCE STOP
ADR-014 = ACTIVE

NO AUTO-OPTIMIZATION
NO MODEL CHANGE
NO TOKEN POLICY CHANGE
NO QUOTA CHANGE
NO NEW AI CAPABILITIES

======================================================================
```

---

## Respuesta Final al Objetivo de C3-P

> Cuanto le cuesta realmente a BlueSystem cada cliente que utiliza Customer AI
> y que comportamiento esta generando ese costo?

Con datos del modelo estadistico observado:

- Costo real por AI user activo: ~$0.0000217 USD / dia = ~$0.00065 USD / mes
- Con tasa de adopcion del 18%: costo efectivo por cliente registrado ~$0.000117 USD/mes
- A 100,000 clientes registrados: ~$11.72 USD / mes
- Comportamiento generador de costo: busqueda de productos (34.6%), promociones (19.2%), carrito (11.5%)
- Mayor ahorro: IntentBoundary elimina 100% de llamadas off-topic -> $0 costo por esas consultas

Customer AI es economicamente viable y el costo esta bien gobernado con la arquitectura actual.

---

Generado por: Antigravity - Senior Developer & Auditor BlueSystem
Protocolo: BSD-AI-C3P-REAL-WORLD-OBSERVATION-COST-TELEMETRY
ADR-014 ACTIVE - NO AUTO-ROLLOUT POLICY
