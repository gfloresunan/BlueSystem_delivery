# 🔵 BLUESYSTEM DELIVERY ENTERPRISE
# PLAN DE PRUEBAS END-TO-END PARA PASARELA BANCARIA (FASE 3)
## Documento 5: Matriz de Casos de Prueba en Sandbox, Escenarios Adversarios, Idempotencia y Regresión

---

## 1. AMBIENTE Y CONDICIONES DE PRUEBA

- **Ambiente:** `SANDBOX` exclusivamente (Prohibido utilizar endpoints o credenciales de producción).
- **Aislamiento:** Las pruebas de pasarela bancaria no deben interferir con pedidos reales de comercios ni con repartidores en ruta.

---

## 2. MATRIZ DE CASOS DE PRUEBA EN SANDBOX

### 2.1. Escenarios Positivos (Happy Path)
| ID | Caso de Prueba | Entrada / Condición | Resultado Esperado |
| :---: | :--- | :--- | :--- |
| **TC-01** | Pago Exitoso Directo | Tarjeta de prueba válida, fondos suficientes | Transacción aprobada, `PAID`, `authCode` emitido. |
| **TC-02** | Autorización Exitosa | Tarjeta de prueba válida | `AUTHORIZED`, fondos retenidos, pendiente de captura. |
| **TC-03** | Captura Exitosa | ID de transacción autorizada previa | `PAID`, `settlementId` generado. |
| **TC-04** | 3DS Frictionless | Tarjeta 3DS sin reto | Autorización instantánea sin redirección. |
| **TC-05** | 3DS Challenge Exitoso | Tarjeta 3DS con OTP correcto | Reto completado, callback bancario aprueba pago. |
| **TC-06** | Tokenización Exitosa | Registro de tarjeta para compras futuras | Token seguro generado, cero PAN persistido. |

### 2.2. Escenarios Negativos y Declinaciones
| ID | Caso de Prueba | Entrada / Condición | Resultado Esperado |
| :---: | :--- | :--- | :--- |
| **TC-07** | Tarjeta Declinada | Tarjeta con código de rechazo general (05) | Transacción rechazada, `FAILED`, mensaje claro al usuario. |
| **TC-08** | Fondos Insuficientes | Tarjeta con saldo insuficiente (51) | Transacción rechazada, `FAILED`, solicita otro medio. |
| **TC-09** | Tarjeta Expirada | Fecha de vencimiento pasada (54) | Rechazo antes o durante autorización bancaria. |
| **TC-10** | CVV Inválido | Código de seguridad incorrecto (82) | Rechazo por validación de seguridad. |
| **TC-11** | 3DS Challenge Fallido | OTP incorrecto o abandono del reto | Transacción rechazada, `FAILED`, orden cancelada. |
| **TC-12** | Timeout de Pasarela | Servidor bancario no responde en 15s | Estado `PENDING`, consulta vía `getPaymentStatus`. |

### 2.3. Pruebas de Seguridad y Webhooks Adversarios
| ID | Caso de Prueba | Entrada / Condición | Resultado Esperado |
| :---: | :--- | :--- | :--- |
| **TC-13** | Webhook con Firma Falsa | Firma HMAC inválida en header | **401 Unauthorized**, rechazo inmediato, log en auditoría. |
| **TC-14** | Webhook Manipulado | Payload alterado posterior a la firma | **401 Unauthorized**, rechazo por firma no coincidente. |
| **TC-15** | Replay Attack de Webhook | Timestamp mayor a 300 segundos | **401 Unauthorized (Expired Timestamp)**. |
| **TC-16** | Discrepancia de Monto (C$435 $\rightarrow$ C$400) | Webhook declara monto menor al pedido | **RECHAZADO**, alerta de discrepancia financiera. |
| **TC-17** | Discrepancia de Monto (C$435 $\rightarrow$ C$500) | Webhook declara monto mayor al pedido | **RECHAZADO**, alerta de discrepancia financiera. |
| **TC-18** | Discrepancia de Moneda | Pedido en NIO, webhook declara USD | **RECHAZADO / IN REVIEW**. |

### 2.4. Pruebas de Idempotencia y Resiliencia
| ID | Caso de Prueba | Entrada / Condición | Resultado Esperado |
| :---: | :--- | :--- | :--- |
| **TC-19** | Doble Clic en Checkout | Dos peticiones con misma `idempotencyKey` | Una sola transacción procesada en el banco. |
| **TC-20** | Webhook Duplicado | Mismo evento entregado dos veces | Segundo evento retorna 200 OK sin duplicar finanzas. |
| **TC-21** | Retry de Cloud Function | Reintento de trigger de entrega | No duplica eventos contables en `/financial_events`. |

### 2.5. Operaciones de Reembolso y Cancelación
| ID | Caso de Prueba | Entrada / Condición | Resultado Esperado |
| :---: | :--- | :--- | :--- |
| **TC-22** | Anulación (`Void`) | Cancelación antes de preparar pedido | Autorización bancaria liberada, estado `CANCELLED`. |
| **TC-23** | Reembolso Total (`Refund`) | Devolución de pedido completado | Reembolso emitido, evento inmutable en `/financial_events`. |
| **TC-24** | Reembolso Parcial | Devolución de un ítem cancelado | Monto exacto en centavos reembolsado al cliente. |

---

## 3. SUITE DE PRUEBAS DE REGRESIÓN OBLIGATORIA (CASH & DOMINIOS CORE)

Tras la integración del adaptador bancario, es mandatorio certificar que los subsistemas existentes permanecen inalterados:

1. **Flujo de Efectivo (CASH):** Verificación de casos C$435 exacto, C$500 con cambio y C$400 insuficiente.
2. **Courier App (Ruta Activa):** Verificación de que la regla `isElectronicPaidConfirmed = !isEfectivo && paymentStatusState == "PAID" && paymentVerifiedState` continúa protegiendo el cobro en mano.
3. **Encomiendas X $\rightarrow$ Y:** Cobro en destino y comprobantes manuales operando en su ciclo de vida independiente.
4. **Control Tower (ADR-013):** Telemetría de motorizados y mapas Leaflet sin costo de APIs de Google Maps.
5. **Offline Mode:** Liquidación física en mano bajo modo sin conexión preservada.
