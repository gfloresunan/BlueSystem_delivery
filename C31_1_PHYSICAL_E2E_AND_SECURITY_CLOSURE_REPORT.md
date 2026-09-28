# C31.1 — PHYSICAL E2E & SECURITY CLOSURE REPORT
## X→Y ENCOMIENDA COURIER DISPATCH + SECURITY HARDENING & FINANCIAL CYCLE

- **Proyecto:** BlueSystem Delivery Enterprise
- **Módulos:** Courier / Motorizado + Cliente X→Y Delivery 2.0 + Seguridad Firestore
- **Checkpoint:** C31.1
- **Fecha:** 2026-08-25
- **Veredicto:** 🟢 **CERTIFIED / PASS (Production-Grade)**

---

## 1. Executive Summary

En este checkpoint **C31.1** se cerraron de manera definitiva y con rigor quirúrgico los dos aspectos críticos señalados en la auditoría:
1. **Blindaje de Seguridad Anti-Fuga de Datos:** Se garantizó que la lectura de `/orders` y `/deliveryTrips` exija de forma estricta el rol de Courier/Motorizado/Driver o Admin para acceder al pool de pedidos disponibles, impidiendo que clientes comunes puedan leer o listar pedidos de otros clientes.
2. **Ciclo Financiero de Transferencias (`payment_verifying`):** Se blindó la máquina de estados financiera para que las encomiendas pagadas con transferencia permanezcan ocultas del pool de repartidores mientras su comprobante se encuentre en verificación (`payment_verifying`), transicionando a `ready` y desbloqueando el despacho únicamente tras la validación del pago.

---

## 2. Matriz de Seguridad y Reglas de Firestore

### A. Colección `/orders/{orderId}`
```text
allow read: if isAuthenticated() && (
    // 1. Propietario (Cliente)
    currentUid() == resource.data.get("customerId", "") ||
    currentUid() == resource.data.get("clienteId", "") ||
    // 2. Repartidor asignado
    currentUid() == resource.data.get("assignedCourierId", "") ||
    currentUid() == resource.data.get("motorizadoId", "") ||
    // 3. Comercio propietario
    ownsBusiness(getOrderBusinessId(resource.data)) ||
    isTenantMember(resource.data.get("tenantId", null)) ||
    // 4. Platform Admin
    isPlatformAdmin() ||
    // 5. Pool de Repartidores AUTORIZADOS (Solo courier/motorizado/driver)
    ((getRole() in ["courier", "COURIER", "motorizado", "MOTORIZADO"] ||
      request.auth.token.get("userType", "") in ["courier", "motorizado", "driver"]) &&
     (resource.data.get("status", "") in ["ready", "READY", "listo", "LISTO", "assigned", "ASSIGNED", "in_transit", "en_ruta", "delivering", "DELIVERING", "preparing", "PREPARING"] ||
      (resource.data.get("serviceType", "") == "X_TO_Y_DELIVERY" && resource.data.get("status", "") in ["ready", "READY", "listo", "LISTO", "pending", "PENDING"])))
);
```

### B. Colección `/deliveryTrips/{tripId}` (Strict Fail-Closed)
```text
allow read: if isAuthenticated() && (
    currentUid() == resource.data.get("customerId", "") ||
    currentUid() == resource.data.get("clienteId", "") ||
    currentUid() == resource.data.get("assignedCourierId", "") ||
    currentUid() == resource.data.get("motorizadoId", "") ||
    isPlatformAdmin() ||
    ((getRole() in ["courier", "COURIER", "motorizado", "MOTORIZADO"] ||
      request.auth.token.get("userType", "") in ["courier", "motorizado", "driver"]) &&
     resource.data.get("serviceType", "") == "X_TO_Y_DELIVERY" &&
     resource.data.get("status", "") in ["PENDING", "pending", "ASSIGNED", "assigned", "IN_TRANSIT", "in_transit", "DELIVERING", "delivering"])
);
```

---

## 3. Invariante Permanente: Arquitectura de Doble Canal (Dual-Channel Dispatch)

La notificación push jamás debe ser el único mecanismo de despacho. El sistema garantiza una arquitectura resiliente basada en redundancia complementaria:

```text
             NUEVA ENCOMIENDA
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      FIRESTORE              FCM
      REALTIME               PUSH
          │                   │
          ▼                   ▼
     (Foreground)        (Background / Lockscreen)
          │                   │
          └─────────┬─────────┘
                    ▼
              COURIER APP
```

### Principios Fundamentales:
1. **Firestore como Fuente Operacional de Verdad:**
   - Si FCM se retrasa por throttling del sistema operativo, limitaciones de batería, fallos de red o rotación de tokens, **el listener de Firestore sincroniza en tiempo real** en cuanto la app esté en primer plano.
2. **FCM como Alerta de Despertar:**
   - Si la app está en segundo plano o el dispositivo bloqueado, FCM despierta el servicio (`DeliveryFirebaseMessagingService`) en canal prioritario `CHANNEL_ALARM_V3_ID`.

---

## 4. Matriz de Validación de 5 Pruebas E2E

| # | Escenario de Prueba | Flujo Técnico | Resultado |
| :-: | :--- | :--- | :---: |
| **1** | **Efectivo (Cash Flow)** | Cliente $\rightarrow$ X→Y $\rightarrow$ `status = "ready"` $\rightarrow$ Firestore $\rightarrow$ FCM `NEW_X_TO_Y_DELIVERY` $\rightarrow$ Courier ve `Disponibles (1)`. | 🟢 **PASS** |
| **2** | **Transferencia (Financial Review)** | Cliente $\rightarrow$ X→Y $\rightarrow$ `status = "payment_verifying"` $\rightarrow$ Oculto de Courier $\rightarrow$ Aprobación Admin $\rightarrow$ `status = "ready"` $\rightarrow$ Entra al pool Courier. | 🟢 **PASS** |
| **3** | **Background & Lockscreen** | App Courier en background o teléfono bloqueado $\rightarrow$ Canal `CHANNEL_ALARM_V3_ID` $\rightarrow$ Sonido de alarma prioritario + botones ACEPTAR / RECHAZAR. | 🟢 **PASS** |
| **4** | **Ubicación & Radio GPS** | Courier $\le 15\text{ km}$ $\rightarrow$ `eligible = true`. Courier $> 15\text{ km}$ $\rightarrow$ `eligible = false, reason = "fuera del radio de servicio (15.0 km)"`. | 🟢 **PASS** |
| **5** | **Seguridad Anti-Data-Leakage** | Cliente A no puede leer encomiendas de Cliente B. Courier no puede inyectar asignación al crear. Pedidos de restaurantes (`COMMERCE_DELIVERY`) 100% aislados. | 🟢 **PASS** |

---

## 5. Cobertura de Pruebas Unitarias (29 Tests en `C31XToYCourierForensicTest.kt`)

- `C31-01`: Payload de creación X→Y. (🟢 PASS)
- `C31-02`: Discriminación de `serviceType`. (🟢 PASS)
- `C31-03`: Resolución de estados iniciales (`ready` vs `payment_verifying`). (🟢 PASS)
- `C31-04`: Elegibilidad de autenticación Courier. (🟢 PASS)
- `C31-05`: Estado online y activo del Courier. (🟢 PASS)
- `C31-06`: Validación de frescura GPS $\le 10$ min. (🟢 PASS)
- `C31-07`: Radio de elegibilidad $\le 15$ km. (🟢 PASS)
- `C31-08`: Independencia de `businessId` para encomiendas X→Y. (🟢 PASS)
- `C31-09`: Listener 4 query targeting. (🟢 PASS)
- `C31-10`: Parser X→Y preserva remitente, destinatario y payer. (🟢 PASS)
- `C31-11`: Filtrado de órdenes en pool. (🟢 PASS)
- `C31-12`: Transiciones de estado UI del Courier. (🟢 PASS)
- `C31-13`: Suscripción al topic `available_orders`. (🟢 PASS)
- `C31-14`: Clasificación de acción `NEW_X_TO_Y_DELIVERY`. (🟢 PASS)
- `C31-15`: Deduplicación de notificaciones en ventana de 60s. (🟢 PASS)
- `C31-16`: Configuración de intent en background y lockscreen. (🟢 PASS)
- `C31-17`: Canal prioritario `CHANNEL_ALARM_V3_ID`. (🟢 PASS)
- `C31-18`: Aceptación y asignación atómica. (🟢 PASS)
- `C31-19`: Transición de fases del repartidor (1 $\rightarrow$ 2 $\rightarrow$ 3). (🟢 PASS)
- `C31-20`: Telemetría GPS en tiempo real. (🟢 PASS)
- `C31-21`: Regresión cero en pedidos comerciales (`COMMERCE_DELIVERY`). (🟢 PASS)
- `C31-22`: Visibilidad estructural de botones en Map Picker. (🟢 PASS)
- `C31-23`: Preservación del botón `📍 Usar mi ubicación actual`. (🟢 PASS)
- `C31-24`: Visibilidad de acción en el viewport. (🟢 PASS)
- `C31-25`: Compatibilidad de área segura en pantallas plegables (Galaxy Z Fold 5). (🟢 PASS)
- `C31-26`: **Anti-Data-Leakage:** Rechazo de lectura cruzada entre clientes no propietarios. (🟢 PASS)
- `C31-27`: **Integridad Financiera:** Órdenes en `payment_verifying` permanecen ocultas del pool de repartidores. (🟢 PASS)
- `C31-28`: **Transición Financiera:** Transición de `payment_verifying` a `ready` desbloquea visibilidad y despacho a Courier. (🟢 PASS)
- `C31-29`: **Aislamiento Fail-Closed en `deliveryTrips`:** Validación estricta de `serviceType == "X_TO_Y_DELIVERY"`. (🟢 PASS)

---

## 6. Veredicto Final y Cierre

El subsistema de despacho de encomiendas X→Y, el esquema de seguridad fail-closed en Firestore, el invariante de doble canal operacional y la experiencia de usuario en el cliente quedan formalmente **CERTIFICADOS (🟢 PASS)** y listos para producción.
