# ADR-022: Merchant Dashboard Timezone Architecture & Operational KPI Contract Freeze

**Estado:** CONGELADO / IMMUTABLE BASELINE v2.3 ENTERPRISE  
**Fecha:** 9 de Septiembre de 2026  
**Autor:** Lead Software Architect & Forensic Debugging Specialist  
**Alcance:** Merchant Web (`DashboardModule.tsx`), KPI Contracts, Timezone Governance

---

## 1. Contexto y Justificación

Tras la investigación forense documentada en `MERCHANT_DASHBOARD_FORENSIC_AUDIT_REPORT.md`, se identificó una vulnerabilidad crítica de desplazamiento temporal (*Timezone UTC Drift*): el cálculo de métricas diarias utilizaba `new Date().toISOString().split('T')[0]`.

En la zona horaria oficial de Nicaragua (`America/Managua`, UTC-6), a partir de las 18:00 (6:00 PM) hora local, la hora UTC entra en el día siguiente (`D+1`). Esto provocaba que cualquier pedido creado o completado durante el horario comercial del día actual (`D`) fuera descartado por discrepancia de cadenas de fecha, reduciendo artificialmente a `C$ 0.00` los indicadores de facturación diaria (*"VENTAS HOY"*).

Adicionalmente, se detectó la necesidad de fijar formalmente el contrato de negocio que distingue las métricas operativas de turno respecto a los subledgers contables de liquidación financiera.

---

## 2. Definición del Contrato de Negocio de KPIs

### 2.1 "Ventas Hoy" (Métrica de Demanda Comercial Operativa)
- **Propósito:** Brindar al comerciante visibilidad en tiempo real de la demanda bruta total atendida durante el turno operativo del día actual.
- **Criterio de Inclusión:**
  - Todo pedido comercial creado o completado durante el día calendario actual en Nicaragua (`America/Managua`).
  - Estados incluidos: `PENDING`, `PREPARING`, `READY`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `COMPLETED`.
  - Estados excluidos: `CANCELLED`, `REJECTED`, `cancelado`, `rechazado`.
- **Fórmula de Venta Bruta:**
  $$\text{Venta Bruta} = \text{merchantGrossSales} \mathrel{?} (\text{subtotal} - \text{descuentos}) \mathrel{?} \text{total}$$

### 2.2 Desacoplamiento Contable respecto a Liquidaciones Financieras (ADR-019)
- Las transacciones financieras devengadas y exigibles para pago bancario se procesan **exclusivamente** a través de la colección canónica `/merchant_settlements` y el módulo de Finanzas (`FinanceModule.tsx`).
- En el corte contable de liquidación (ADR-019), **únicamente** participan pedidos en estado definitivo `DELIVERED` o `COMPLETED` con inmutabilidad `isFrozen: true`.

---

## 3. Principios Inviolables de Arquitectura

1. **Prohibición de `toISOString().split('T')[0]` en Métricas Diarias:**
   Queda terminantemente prohibido utilizar `toISOString()` o cualquier serializador UTC nativo para evaluar pertenencia a días calendario.

2. **Resolución Canónica mediante `America/Managua`:**
   Todo cálculo de fecha debe utilizar la función estándar:
   ```typescript
   const TIMEZONE_MANAGUA = 'America/Managua';

   const getManaguaDateStr = (dateInput?: any): string => {
     if (!dateInput) return '';
     const d = dateInput instanceof Date
       ? dateInput
       : typeof dateInput.toDate === 'function'
       ? dateInput.toDate()
       : new Date(dateInput);

     if (isNaN(d.getTime())) return '';
     return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE_MANAGUA }).format(d);
   };
   ```

3. **Purga Total de Mocks y Fallbacks Ficticios:**
   - Prohibido reintroducir métricas inventadas (como el mock histórico de SLA `14.5 min`).
   - Si no existen pedidos con marcas de tiempo suficientes para calcular un promedio real hoy, la UI debe mostrar transparentemente `N/A` (`-- min`).

4. **Acotamiento Temporal de Clientes Únicos:**
   La métrica *"Clientes Hoy"* debe computar exclusivamente el `Set` de identificadores de clientes (`customerId` / `customerName`) asociados a órdenes válidas del día actual.

5. **Tratamiento Explícito de Errores Firestore:**
   Si la consulta reactiva `onSnapshot` falla por permisos o red, el error debe renderizarse visualmente en la tarjeta (`syncError`), prohibiendo la conversión silenciosa del fallo a `C$ 0.00`.

---

## 4. Regression Gate Obligatorio

Toda suite de verificación, build de certificación o prueba de integración debe validar obligatoriamente el siguiente escenario:

> **GATE-TIMEZONE-1823:**  
> Simulación de ejecución en la franja horaria `18:00–23:59` hora de Managua (equivalente a `00:00–05:59 UTC` del día siguiente).  
> **Criterio de Aceptación:** Ninguna orden creada o completada en el día actual en Nicaragua puede desaparecer o ser excluida de las agregaciones de *"Ventas Hoy"*, *"Clientes Hoy"* o *"Tendencia de Ventas"* debido al salto de día en UTC.

---

## 5. Componentes Blindados

- `merchant-web/src/modules/DashboardModule.tsx`
- Funciones auxiliares de tiempo en `merchant-web/src/shared/`
- Contrato de estados y agregaciones de órdenes de comercio
