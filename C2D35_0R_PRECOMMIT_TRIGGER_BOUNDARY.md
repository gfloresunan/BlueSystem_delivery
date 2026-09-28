# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — DELIMITACIÓN PRE-COMMIT VS DISPARADORES POST-COMMIT
**Authoritative Pre-Commit Commercial Gate vs Asynchronous Trigger Responsibilities**

- **Protocolo Oficial:** `BSD-C2D35.0R-PRECOMMIT-TRIGGER-BOUNDARY-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** DEC-01, DEC-03, DEC-10, DEC-14 de C2D.34A
- **Modo:** `READ-ONLY ARCHITECTURAL SPECIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. REMEDIACIÓN DEL ROL DE LOS DISPARADORES (RF-04)

### 1.1 El Defecto de Concepción Previo
Cualquier formulación técnica previa que describiera flujos equivalentes a:
```
[Cliente escribe en Firestore /orders]
                 │
                 ▼
      [Trigger onOrderCreated()]
                 │
                 ▼
[Verifica suscripción del comercio]
                 │
                 ▼
   [¿Rechaza / Borra la orden?]  <-- ❌ GRAVE ERROR DE DISEÑO
```
ha sido declarada formalmente **INVÁLIDA y DEFECTUOSA**.

**Justificación Técnica:**  
Un trigger en Cloud Functions (`onDocumentCreated`) se ejecuta **de forma reactiva, asíncrona y posterior** a que la mutación ya ha sido confirmada (*committed*) en la base de datos distribuida de Firestore.
- Si un trigger intenta revertir una orden no autorizada, la orden ya existió físicamente en Firestore, fue leída por los listeners en tiempo real de la cocina del restaurante y del motorizado, y disparó efectos secundarios irreparables.
- Un disparador post-commit **JAMÁS puede actuar como compuerta preventiva comercial**.

---

## 2. FLUJO CANÓNICO DE CREACIÓN DE PEDIDOS (TARGET RUNTIME)

La creación de pedidos comerciales en BlueSystem Delivery Enterprise debe regirse estrictamente por la siguiente cadena síncrona pre-commit:

```
CUSTOMER (App Móvil / Web)
   │
   ▼
1. AUTHORITATIVE ORDER CALLABLE / SERVER ENTRYPOINT
   (`createAuthoritativeOrder`)
   │
   ▼
2. AUTHENTICATION VERIFICATION
   (Valida token JWT del cliente, identidad UID)
   │
   ▼
3. TENANT / BUSINESS CONTEXT RESOLUTION
   (Carga `businessId`, mapea al `tenantId` correspondiente)
   │
   ▼
4. COMMERCIAL GATEKEEPER EVALUATION
   │
   ├── A. SUBSCRIPTION STATUS CHECK
   │      (Lee `/subscriptions/{tenantId}`, verifica `ACTIVE` o `PAST_DUE_IN_GRACE`)
   │      (Aplica Inbound Lock si el estado es SUSPENDED o CANCELLED)
   │
   ├── B. EFFECTIVE ENTITLEMENTS RESOLUTION
   │      (disabledFeatures > enabledFeatures > defaultPlanEntitlements)
   │
   └── C. QUOTA PRE-CHECK & ATOMIC SHARD RESERVATION
          (Lee 5 shards físicos de contadores de cuota)
          (Verifica: `committed + reserved + 1 <= 3000`)
          (Ejecuta reserva atómica con `reservationId` determinista)
   │
   ▼
5. ATOMIC BUSINESS WRITE
   (Escribe el documento en `/orders/{orderId}`)
   (Realiza commit de la cuota en el shard: `reserved -= 1`, `committed += 1`)
   │
   ▼
6. ORDER COMMITTED SUCCESSFULLY
   (Retorna confirmación exitosa con `orderId` al cliente)
   │
   ▼
7. POST-COMMIT TRIGGERS (ASYNCHRONOUS)
   (`onOrderCreated` trigger de Cloud Functions)
   │
   ├── A. Notificaciones Push a Comercio y Repartidores
   ├── B. Agregación de métricas analíticas en `/daily_analytics`
   ├── C. Registro en `/audit_events`
   └── D. Webhooks a sistemas externos autorizados
```

---

## 3. MATRIZ DE RESPONSABILIDADES: PRE-COMMIT VS POST-COMMIT

| Capacidad del Sistema | Pre-Commit (Callable / Transaction) | Post-Commit (Cloud Function Trigger) | Estado Contractual |
| :--- | :---: | :---: | :--- |
| **Validar si el comercio está al día (Subscription)** | ✅ **OBLIGATORIO** | ❌ **ESTRICTAMENTE PROHIBIDO** | Pre-commit previene órdenes no autorizadas. |
| **Verificar cuota de 3,000 pedidos** | ✅ **OBLIGATORIO** | ❌ **ESTRICTAMENTE PROHIBIDO** | Pre-commit ejecuta la reserva atómica. |
| **Rechazar con HTTP 429 / Quota Exceeded** | ✅ **OBLIGATORIO** | ❌ **INAPLICABLE** | Solo un endpoint síncrono puede responder al cliente. |
| **Persistir documento en `/orders`** | ✅ **OBLIGATORIO** | ❌ **NO APLICA** | Escritura autorizada centralizada. |
| **Notificar a la cocina / dashboard** | ❌ Innecesario | ✅ **PERMITIDO Y ESPERADO** | El trigger procesa efectos secundarios. |
| **Despachar evento a FCM / Push** | ❌ Innecesario | ✅ **PERMITIDO Y ESPERADO** | El trigger despacha notificaciones. |
| **Actualizar agregados de ventas del día** | ❌ Opcional | ✅ **PERMITIDO Y ESPERADO** | Desacopla cómputo de la latencia del pedido. |
| **Materializar proyecciones de analítica** | ❌ Opcional | ✅ **PERMITIDO Y ESPERADO** | Tareas asíncronas no bloqueantes. |

---

## 4. IMPACTO EN CLIENTES EXISTENTES (MIGRACIÓN EN C2D.35.1)

Durante la implementación física (C2D.35.1), los puntos de mutación directa en clientes:
1. `FirebaseManager.kt:256` (`crearPedido`) en Android Customer App
2. `CustomerHomeViewModel.kt:333` (`placeOrder`)
3. `MainActivity.kt:726` (`createOrder`)

serán reconducidos exclusivamente a través del Callable `createAuthoritativeOrder`. Las reglas de Firestore (`firestore.rules`) en la colección `/orders` serán endurecidas para revocar la escritura directa del cliente (`allow create: if false;`), forzando que toda orden comercial atraviese la compuerta pre-commit autoritativa.

---

## 5. CONCLUSIÓN Y CIERRE DE RF-04

Se erradica cualquier confusión conceptual:
- **La prevención comercial es 100% PRE-COMMIT en Cloud Functions Callables.**
- **Los disparadores (*Triggers*) son 100% POST-COMMIT y se limitan a efectos secundarios y analítica.**
