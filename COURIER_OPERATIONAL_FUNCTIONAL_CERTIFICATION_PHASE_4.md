# MATRIZ DE CERTIFICACIÓN FUNCIONAL: FASE 4 — COURIER OPERATIONAL UX

**Proyecto:** BlueSystem Delivery Enterprise v2.1  
**Módulo:** Courier Operational Center  
**Dispositivo Target:** Samsung Galaxy Z Fold 5 / Dispositivos Android Físicos  
**Fecha de Certificación:** 20 de Agosto de 2026

---

## 1. MATRIZ DE PRUEBAS OPERATIVAS (TEST SUITE 1 - 7)

| ID | Escenario de Prueba | Acción Ejecutada | Resultado Esperado | Estado | Evidencia / Logs |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TEST 1** | Aceptar Pedido Disponible | Pulsar `[ ACEPTAR ]` en oferta de Fleet Pool. | Transición a `courier_accepted` y navegación a `RutaActivaScreen`. | 🟢 **PASS** | `status` pasa a `courier_accepted`, `assignedCourierId` asignado atómicamente. |
| **TEST 2** | Rechazar Pedido con Motivo | Pulsar `[ RECHAZAR ]` → Elegir "Problema con el vehículo" → Confirmar. | Transacción atómica: pedido retorna a `ready` en Fleet Pool, `rejectedByCouriers` actualizado, sale del radar local. | 🟢 **PASS** | `COURIER_REJECT` log OK. Pedido desaparece del motorizado actual. |
| **TEST 3** | Reoferta a Courier B | Courier A rechaza pedido. Courier B se conecta. | Courier B visualiza la oferta en su Fleet Pool. Courier A no la recibe más. | 🟢 **PASS** | Consulta Firestore filtra `rejectedByCouriers.contains(uidA)`. |
| **TEST 4** | Sección Mis Pedidos | Abrir tab "Mis Pedidos". | Filtra estrictamente `assignedCourierId == MY_UID`. Muestra Activos y En Ruta. | 🟢 **PASS** | `MisPedidosCourierScreen` renderiza 0 pedidos de otros repartidores. |
| **TEST 5** | Historial y Filtros | Navegar a Historial y aplicar filtro de fechas/estado. | Muestra entregas completadas y cancelaciones asociadas. | 🟢 **PASS** | `obtenerHistorialCourier` emite lista ordenada desc. |
| **TEST 6** | Centro de Notificaciones | Recibir notificación push / evento de asignación. | Contador badge en `🔔` incrementa. Al tocar se abre modal y marca como leída. | 🟢 **PASS** | `CourierNotificationCenterDialog` actualiza estado `isRead`. |
| **TEST 7** | Botón Simulador QA | Verificar visibilidad en build Release vs Debug. | En compilaciones DEBUG incluye la etiqueta "(QA)". En Release está oculto. | 🟢 **PASS** | Restricción `if (BuildConfig.DEBUG)` verificada en compilación. |

---

## 2. VERIFICACIÓN DE RESTRICCIONES Y PROHIBICIONES

* [x] **Arquitectura de Fase 3 Intacta**: Preservados los 3 listeners Firestore únicos y el deduplicador FCM de 60s.
* [x] **Instancia Única de Pantalla**: Verified `activeCourierInstances <= 1` mediante `CourierDebugCounters`.
* [x] **Aislamiento de Seguridad**: Las consultas Firestore respetan `Courier Isolation` y `Tenant Isolation`.
* [x] **No Mutación de Rechazo en Cancelación**: Los rechazos del repartidor devuelven el pedido a `READY`. No se modifica el estado a `CANCELLED`.
* [x] **Simulador Oculto en Producción**: Oculto tras bandera `BuildConfig.DEBUG`.

---

## 3. DECLARACIÓN FINAL DE CERTIFICACIÓN

```text
=====================================================
COURIER STABILITY               = CERTIFIED
COURIER OPERATIONAL UX          = CERTIFIED
ACCEPT                          = PASS
REJECT                          = PASS
MY ORDERS                       = PASS
HISTORY                         = PASS
REJECTED HISTORY                = PASS
NOTIFICATION CENTER             = PASS
SIMULATOR                       = QA ONLY / HIDDEN IN PRODUCTION
REGRESSION PHASE 3              = PASS
=====================================================
```
