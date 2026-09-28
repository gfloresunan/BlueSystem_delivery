# BSD-X2Y-FINANCIAL-CANONICAL-CONTRACT

Este documento establece el contrato financiero inmutable de la plataforma BlueSystem Delivery Enterprise para el dominio **X→Y Delivery Express**. 

## 1. PRICING & SOURCE OF TRUTH (SSOT)
- **Fuente Canónica de Precios**: `/system_config/global.xToYPricing`
- **Campos Canónicos**:
  - `pricePerKm` (Canónico maestro - Precio por cada km de recorrido).
  - `perKmRate` (Alias legacy retrocompatible. Siempre debe igualar a `pricePerKm`).
  - `baseFee` (Tarifa base, Ingreso de la Plataforma).
- **Prohibición**: Queda prohibido hardcodear `pricePerKm` en las apps de Customer, Courier, o Backend. Si el documento no puede ser leído, la UI debe mostrar error, no usar fallback silencioso con un precio divergente.

## 2. PRICING SNAPSHOT (INMUTABILIDAD)
- Cuando se crea un DeliveryTrip, se estampa un objeto `pricingSnapshot`.
- Contiene: `baseFee`, `pricePerKm`, `routeDistanceKm`, `calculatedAmount`.
- Los cambios futuros en la colección de configuración global **no** alteran viajes históricos. El precio pactado en el `pricingSnapshot` es el único válido para ese `tripId`.

## 3. DISTANCIA CANÓNICA
- La distancia proviene del Routing Engine (backend o maps native).
- Unidad: `routeDistanceKm` redondeado a 2 decimales (`KM_BLOCK_2DEC`).
- **Fórmula de Precio Total**: `CUSTOMER_TOTAL = baseFee + (routeDistanceKm * pricePerKm)`.

## 4. DESGLOSE FINANCIERO CANÓNICO
- **CUSTOMER BILLING**: `CUSTOMER_TOTAL = baseFee + (routeDistanceKm * pricePerKm)`
- **COURIER EARNINGS**: `DISTANCE_KM * PRICE_PER_KM`
- **PLATFORM REVENUE**: `BASE_FEE`
- **ECUACIÓN DE CONCILIACIÓN**: `CUSTOMER_TOTAL = COURIER_EARNINGS + PLATFORM_REVENUE`

## 5. RECAUDACIÓN Y CUSTODIA (CASH)
Si `paymentMethod == CASH`:
- El courier recauda en destino el `CUSTOMER_TOTAL`.
- Se asienta en el ledger del courier:
  - `Cash Received` = CUSTOMER_TOTAL
  - `Courier Earnings` = COURIER_EARNINGS
  - `Amount to Deposit (Custody)` = PLATFORM_REVENUE (Base Fee).
- El proceso de cierre (Cash Closure) tratará a la plataforma como acreedora por ese `baseFee`.

## 6. PAGOS DIGITALES
Si `paymentMethod != CASH` y `paymentStatus == PAID`:
- El courier **no** cobra al cliente en destino.
- La plataforma retiene el `CUSTOMER_TOTAL`.
- Se asienta en el ledger del courier:
  - `Cash Received` = 0
  - `Courier Earnings` = COURIER_EARNINGS (Saldo a favor del courier).
  - `Platform Revenue` = PLATFORM_REVENUE.

## 7. EVENTOS FINANCIEROS (IDEMPOTENCIA)
- La liquidación al completarse el viaje generará eventos atómicos (`financial_events`):
  - `X2Y_{tripId}_COURIER_EARNINGS`
  - `X2Y_{tripId}_PLATFORM_REVENUE`
  - `X2Y_{tripId}_CASH_COLLECTION` (si aplica).

## 8. AUTORIZACIÓN DEL CHAT
- La conversación de chat para X→Y debe vincularse estrictamente a `/deliveryTrips/{tripId}/messages`.
- **Regla de Seguridad**: Solo pueden leer/escribir `customerId`, `assignedCourierId`, o usuarios con rol `SUPER_ADMIN`. Queda prohibido el acceso a terceros.

---
**Nota de Cumplimiento:** Todo desarrollo en X→Y Delivery Express debe acatar estrictamente estas fórmulas. No se permiten "parches" en UI para ocultar cálculos incorrectos de backend.
