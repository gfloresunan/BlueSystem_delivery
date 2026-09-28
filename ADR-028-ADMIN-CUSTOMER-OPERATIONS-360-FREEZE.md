# BLUE SYSTEM DELIVERY ENTERPRISE
## ARCHITECTURAL DECISION RECORD — ADR-028
### ADMIN WEB CUSTOMER OPERATIONS CENTER & CUSTOMER 360 ARCHITECTURE FREEZE
**Protocolo:** `BSD-ADMIN-CUSTOMER-OPERATIONS-360-FREEZE-001` / `BSD-ADMIN-CUSTOMER-360-001`  
**Estado:** 🟢 **CERTIFIED / CODE FREEZE / PROTECTED 🔒**  
**Fecha de Certificación:** 2026-09-22  
**Dominio Oficial:** `https://admin.bluesystemdelivery.com`  
**Componente Canónico:** `panel-admin/public/js/dashboard/liveCustomers.js` (v5.2.0)  
**Target Hosting:** `admin` (`panel-admin/public`)  

---

## 1. Resumen Ejecutivo

El módulo **Clientes** del Panel Administrativo de BlueSystem Delivery Enterprise ha sido sometido a una auditoría forense integral y a una transformación quirúrgica de clase empresarial, erradicando una deficiencia estructural arcaica (`.where('userType', '==', 'cliente')`) y elevando la superficie a un **CUSTOMER OPERATIONS CENTER & CUSTOMER 360**.

La implementación ha sido certificada al 100% mediante auditoría forense **READ-ONLY contra el entorno real de Firestore en producción** (`bluesystem-7c9af`), validando los 7 casos operacionales y el escenario complejo multidominio (`BSD-ADMIN-CUSTOMER-360-FORENSIC-CERTIFICATION-001.md`).

A través del presente documento **ADR-028**, el subsistema queda formalmente **CONGELADO E INMUTABLE como Baseline v2.3 Enterprise**.

---

## 2. Invariantes Arquitectónicas Blindadas

1. **Resolución Canónica de Identidad y Cero Claims Asumidos:**
   - La clasificación de identidades de clientes opera sobre los campos materializados en `/users` procesados por `CanonicalIdentityResolver.resolve()`.
   - Queda estrictamente prohibido intentar filtrar en consultas directas de Firestore por Custom Claims de Firebase Auth, ya que no son campos indexados del documento.

2. **Cero Colecciones Paralelas (SSOT Absoluto):**
   - Queda terminantemente prohibido crear colecciones paralelas como `/customers`, `/customer_profiles`, `/customer_analytics` o similares. La verdad transaccional reside exclusivamente en `/users`, `/orders`, `/deliveryTrips` e `/incidents`.

3. **Arquitectura Anti N+1 y Gobernanza de Lecturas (ADR-003):**
   - Prohibido iterar sobre listas de usuarios para disparar consultas individuales a subcolecciones.
   - Las operaciones en vivo se sostienen sobre 3 listeners acotados:
     - Orders activas (`status` en estados operacionales, `limit(100)`).
     - Trips activos (`status` en estados operacionales, `limit(100)`).
     - Incidencias abiertas (`status in ['OPEN', 'IN_REVIEW']`, `limit(50)`).

4. **Paginación Cursor-Based Real para "TODOS":**
   - La pestaña `[ 📋 Todos los Clientes ]` opera mediante paginación real por cursor (`startAfter` / 20 por página con selector Anterior/Siguiente), eliminando cualquier límite artificial o descarga masiva que degrade la memoria del navegador.

5. **Compatibilidad Legacy Multicampo con Deduplicación Atómica:**
   - Las consultas históricas del expediente se ejecutan en paralelo (`Promise.all`) sobre `customerId`, `clienteId`, `userId` y `senderUid`, fusionándose y deduplicándose atómicamente por `doc.id` en memoria. Cero pérdida de pedidos históricos.

6. **Separación Estricta: Métricas Totales vs Timeline (Últimos 20):**
   - El **Timeline** operativo presenta los 20 eventos cronológicos más recientes combinados (Commerce + X→Y).
   - El **Resumen Financiero** (Gasto Total acumulado y Ticket Promedio) se calcula de forma exhaustiva sobre el 100% de las órdenes y viajes recuperados del cliente, garantizando integridad matemática absoluta.

7. **Delegación Operativa Sin Duplicación de Módulos:**
   - Customer 360 no implementa mapas propios ni gestores de pedidos paralelos. Las acciones contextuales delegan a los módulos oficiales mediante `dashboardController.switchTab()`:
     - `[Ver Pedido]` → `liveOrders`
     - `[Ver Mapa]` → `liveMap`
     - `[Ver Encomienda X→Y]` → `deliveryExpress`
     - `[Ver Incidencia]` → `incidentsCenter`

8. **Aislamiento EIAM:**
   - Desde el módulo Clientes está prohibido mutar roles, contraseñas, claims o estados de habilitación de cuenta. Esas atribuciones pertenecen exclusivamente al Governance Center / EIAM (`users.js`).

---

## 3. Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo)

- `panel-admin/public/js/dashboard/liveCustomers.js`
- Versionado de script en `panel-admin/public/dashboard.html` (`liveCustomers.js?v=5.2.0`)
- `scratch/audit_customer_ops_e2e_forensic.js` (Suite de verificación forense permanente)
- `BSD-ADMIN-CUSTOMER-360-FORENSIC-CERTIFICATION-001.md`

---

## 4. Regla de Gobierno y Protección Inviolable

El subsistema **Customer Operations Center & Customer 360** queda formalmente **CONGELADO (CODE FREEZE / PROTECTED 🔒)**. 

Queda terminantemente prohibido a cualquier desarrollador o agente de IA:
- Reintroducir consultas léxicas rígidas (`where('userType', '==', 'cliente')`).
- Convertir nuevamente este módulo en un simple listado estático de usuarios.
- Eliminar la deduplicación legacy multicampo.
- Sesgar las métricas financieras a una muestra de 20 elementos.

Cualquier requerimiento futuro sobre este flujo deberá tramitarse obligatoriamente mediante:
`AUDIT FIRST → IMPACT ANALYSIS → HUMAN APPROVAL → MINIMAL CHANGE → FORENSIC CERTIFICATION → NUEVO ADR`.

---
**Firmado y Certificado:**  
*Senior Developer & Auditor de BlueSystem v2.1 Enterprise*  
*Baseline Inmutable v2.3 Enterprise — STATUS: FROZEN / PROTECTED 🔒*
