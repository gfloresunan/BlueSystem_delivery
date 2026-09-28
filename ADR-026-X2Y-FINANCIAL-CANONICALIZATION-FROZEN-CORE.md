# ADR-026: X→Y Delivery Financial Canonicalization & Frozen Core
## Baseline Inmutable v2.2 Enterprise — Dominio Financiero X→Y Delivery Express

**Estatus:** 🔒 **ACCEPTED & FROZEN**  
**Identificador Oficial:** `BSD-X2Y-FINANCIAL-FROZEN-CORE-001`  
**Fecha:** 2026-09-21  
**Área de Gobernanza:** Finanzas, Contabilidad Atómica & SSOT Tarifario X→Y  
**Protocolos Base:** `BSD-X2Y-ADMIN-PRICING-SDK-ROOT-CAUSE`, `BSD-X2Y-ENTERPRISE-FINANCE-CANONICALIZATION`, `BSD-X2Y-FINAL-CLOSURE-001`  
**Referencia Inmutable:** Documento `/system_config/global.xToYPricing`, Colección `/deliveryTrips`, Colección `/courier_cash_ledger`, Colección `/courier_balances`

---

## 1. Cadena de Protección Blindada (Frozen Core)

Queda terminantemente prohibido alterar la siguiente cadena de extremo a extremo sin un Change Request formal previamente auditado y aprobado:

```text
/system_config/global.xToYPricing
              ↓
      routingService.ts
              ↓
     RealRoutingEngine.kt
              ↓
    SolicitarEnvioScreen.kt
              ↓
       pricingSnapshot
              ↓
          trips.ts
              ↓
      financial_events
              ↓
     courier_cash_ledger
              ↓
      courier_balances
              ↓
          closure
              ↓
          deposit
              ↓
         settlement
```

---

## 2. Las 10 Reglas Financieras Inmutables

Salvo un nuevo Change Request formal de arquitectura, las siguientes 10 reglas son leyes de negocio inmutables del sistema:

* **Regla 1 (Conservación Monetaria):**
  $$\text{CUSTOMER\_TOTAL} = \text{COURIER\_EARNINGS} + \text{PLATFORM\_REVENUE}$$
* **Regla 2 (Ganancia Operativa Courier):**
  $$\text{COURIER\_EARNINGS} = \text{DISTANCE} \times \text{PRICE\_PER\_KM}$$
* **Regla 3 (Ingreso de Plataforma / Fee Base):**
  $$\text{PLATFORM\_REVENUE} = \text{BASE\_FEE}$$
* **Regla 4 (Cobro en Efectivo):**
  $$\text{CASH\_COLLECTED} = \text{CUSTOMER\_TOTAL} \quad \text{(cuando el método sea efectivo)}$$
* **Regla 5 (Responsabilidad de Custodia / Deuda Courier):**
  $$\text{CUSTODY\_LIABILITY} = \text{CASH\_COLLECTED} - \text{COURIER\_EARNINGS} = \text{PLATFORM\_REVENUE}$$
* **Regla 6 (Inmutabilidad Histórica):**
  El `pricingSnapshot` histórico de un viaje no se modifica ni se recalcula retroactivamente ante cambios futuros en el SSOT.
* **Regla 7 (Idempotencia Estricta):**
  Un trigger de finalización (`completion trigger`) repetido, reprocesado o duplicado no puede generar dinero adicional ni crear movimientos contables repetidos.
* **Regla 8 (Fail-Closed Absoluto):**
  Si el SSOT tarifario (`/system_config/global.xToYPricing`) no está disponible o presenta valores inválidos: **NO HAY COTIZACIÓN, no hay tarifa inventada ni fallback silencioso**. La orden no se publica.
* **Regla 9 (Aislamiento de Dominio):**
  X→Y Delivery Express (`/deliveryTrips`) no se convierte en Commerce (`/orders`). Mantiene su propio ciclo de despacho y modelos independientes.
* **Regla 10 (Libro Mayor Único):**
  No crear una segunda contabilidad ni subledgers paralelos para X→Y. Los movimientos impactan directamente el `courier_cash_ledger` y `courier_balances` estándar de la plataforma.

---

## 3. Componentes Blindados Específicos

1. **Backend & Cloud Functions:**
   - `functions/src/services/routingService.ts`: Resolución fail-closed estricta (`getXToYPricingConfig(failClosed = true)`), caché en memoria con TTL 60s e invalidación quirúrgica (`clearPricingConfigCache()`).
   - `functions/src/triggers/trips.ts`: Transacción atómica de completitud (`onTripCompletedFinancialTrigger`), cómputo en centavos enteros (`Math.round`), deduplicación por `financial_events`, y rechazo explícito si las tarifas son $\le 0$.
   - `functions/src/callables/adminPricing.ts`: Gobernanza SSOT de tarifas con RBAC estricto (`isPlatformAdmin()`).
2. **Aplicación Móvil Android:**
   - `app/src/main/java/com/example/domain/engine/RealRoutingEngine.kt`: Requiere obligatoriamente un `pricingSnapshot` inyectado para calcular tarifas; cero fallbacks con precios arbitrarios.
   - `app/src/main/java/com/example/presentation/screens/client/SolicitarEnvioScreen.kt`: Eliminación total de valores fijos (`35.0` y `15.0`); estado reactivo `pricingErrorMessage`; bloqueo total de botones de oferta y de solicitud ante ausencia de cotización válida.
   - `app/src/main/java/com/example/MainActivity.kt`: Validación estricta y empaquetado del `pricingSnapshot` íntegro en `/deliveryTrips`.
3. **Reglas de Seguridad y Autorización:**
   - `firestore.rules`: Permisos simétricos en `/deliveryTrips/{tripId}/messages/{messageId}` para Customer, Courier asignado y `isPlatformAdmin()`, con prohibición total de mutación o borrado (`update: if false`, `delete: if false`).

---

## 4. Estado de Certificación

- **Pricing SSOT:** 🟢 PASS
- **Routing & Distance:** 🟢 PASS
- **Customer Billing:** 🟢 PASS
- **Courier Earnings:** 🟢 PASS
- **Platform Revenue:** 🟢 PASS
- **Cash Collection:** 🟢 PASS
- **Cash Custody:** 🟢 PASS
- **Closure:** 🟢 PASS
- **Deposit:** 🟢 PASS
- **Settlement:** 🟢 PASS
- **Financial Events & Idempotency:** 🟢 PASS
- **Historical Integrity:** 🟢 PASS
- **Chat Authorization:** 🟢 PASS
- **Android Core Build:** 🟢 PASS (`assembleCoreDebug` exitoso)

---

## 5. Directiva Operativa Inviolable

> [!CAUTION]
> **NO TOCAR EL CORE**: Ningún agente o desarrollador tiene autorización para realizar modificaciones directas, refactorizaciones o limpiezas de código sobre los componentes de la cadena X→Y. Todo nuevo requerimiento debe tratarse mediante un Change Request formal con auditoría previa.
