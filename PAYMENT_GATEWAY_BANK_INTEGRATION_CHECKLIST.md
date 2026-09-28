# 🔵 BLUESYSTEM DELIVERY ENTERPRISE
# LISTA MAESTRA DE REQUISITOS TÉCNICOS PARA EL BANCO PROVEEDOR
## Documento 3: Checklist Exhaustivo de Solicitud de Información e Integración de Pasarela

---

## 1. INTRODUCCIÓN

Este documento constituye el **Cuestionario Técnico y Requerimiento Oficial de Integración** que el equipo de arquitectura de BlueSystem Delivery presentará a la entidad bancaria o procesador de pagos una vez seleccionada la pasarela. 

El objetivo es obtener todas las definiciones técnicas, contractuales, de seguridad y operativas necesarias para desarrollar el adaptador específico (`BankAdapter`) sin incertidumbres.

---

## 2. SECCIÓN 1: DATOS GENERALES DEL PROVEEDOR Y AMBIENTES

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 1.1 | **Razón Social y Plataforma** | Nombre oficial de la entidad bancaria, gateway tecnológico y suite de procesamiento. | ⏳ Pendiente |
| 1.2 | **Contactos de Soporte Técnico** | Canales de soporte para desarrolladores (correo, teléfono 24/7, canal Slack/Teams, gestor de cuenta asignado). | ⏳ Pendiente |
| 1.3 | **Ambiente Sandbox (Pruebas)** | URL base de endpoints de prueba, credenciales de test, portal de administración sandbox y tarjetas de prueba para cada escenario. | ⏳ Pendiente |
| 1.4 | **Ambiente de Producción** | URL base de endpoints productivos, proceso de migración y verificación de Go-Live. | ⏳ Pendiente |
| 1.5 | **Políticas de SLA y Mantenimiento** | Disponibilidad garantizada (SLA %), ventanas de mantenimiento programado y página de status público. | ⏳ Pendiente |

---

## 3. SECCIÓN 2: ESPECIFICACIONES DE API Y PROTOCOLO

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 2.1 | **Arquitectura de Integración** | ¿La integración se realiza mediante REST API (JSON), SOAP/XML, Hosted Payment Page o SDK nativo? | ⏳ Pendiente |
| 2.2 | **Método de Autenticación** | ¿Cómo se autentican las peticiones al API? (API Key en headers, Basic Auth, OAuth 2.0 Client Credentials, Certificado mTLS x.509). | ⏳ Pendiente |
| 2.3 | **Mecanismo de Idempotencia** | ¿El API soporta un header de idempotencia nativo (ej. `Idempotency-Key` o `X-Correlation-ID`) para evitar cobros dobles? | ⏳ Pendiente |
| 2.4 | **Timeouts y Latencias** | Tiempo máximo de espera recomendado para requests transaccionales (ej. 15s, 30s) y política de reintentos recomendada. | ⏳ Pendiente |
| 2.5 | **Límites de Peticiones (Rate Limits)** | Límites de peticiones por segundo (RPS) o por minuto para operaciones sincrónicas y consultas de estado. | ⏳ Pendiente |

---

## 4. SECCIÓN 3: EXPERIENCIA MÓVIL Y CLIENTE (SDK & TOKENIZACIÓN)

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 3.1 | **Soporte Android Nativo** | ¿Dispone de SDK oficial para Android (Kotlin/Java)? ¿Es compatible con Jetpack Compose y APIs modernas de Android (API 26+ a 34+)? | ⏳ Pendiente |
| 3.2 | **Modalidad de Checkout** | ¿Cuál es la modalidad recomendada?: <br>A) **Hosted Payment Page (HPP)** en navegador externo/Custom Tab.<br>B) **Hosted Fields / Drop-In UI** dentro de la app móvil.<br>C) **Direct Tokenization** mediante llamada cliente $\rightarrow$ Banco. | ⏳ Pendiente |
| 3.3 | **Autenticación 3D Secure 2.0 (3DS2)** | ¿Cómo se maneja el desafío 3DS2? ¿Soporta flujo sin fricción (Frictionless) y Challenge nativo o vía WebView seguro? | ⏳ Pendiente |
| 3.4 | **Tokenización de Tarjetas (Vault)** | ¿Permite almacenar tarjetas en el Vault del banco para "One-Click Checkout" / Pagos Recurrentes retornando un `CustomerToken` o `CardToken`? | ⏳ Pendiente |
| 3.5 | **Alcance PCI-DSS** | Certificación de que el método propuesto reduce el alcance de BlueSystem a **PCI DSS SAQ-A** (sin manipulación de PAN). | ⏳ Pendiente |

---

## 5. SECCIÓN 4: TARJETAS Y CONDICIONES MONETARIAS

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 4.1 | **Franquicias Soportadas** | Visa, Mastercard, American Express, Diners Club, UnionPay. | ⏳ Pendiente |
| 4.2 | **Tipos de Tarjeta** | Débito nacional, Crédito nacional, Tarjetas internacionales. | ⏳ Pendiente |
| 4.3 | **Monedas Transaccionales** | ¿Procesa en Córdobas (NIO) y Dólares (USD)? ¿Cómo se define la moneda en el payload (`NIO` vs `558`, `USD` vs `840`)? | ⏳ Pendiente |
| 4.4 | **Montos y Decimales** | ¿Los montos se envían en centavos enteros (`43500` para C$435.00) o con punto decimal (`435.00`)? | ⏳ Pendiente |
| 4.5 | **Monto Mínimo y Máximo** | Límites transaccionales mínimos y máximos por operación. | ⏳ Pendiente |

---

## 6. SECCIÓN 5: OPERACIONES Y CICLO TRANSACCIONAL

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 5.1 | **Venta Directa vs Autorización/Captura** | ¿Soporta flujo de 2 pasos (`Authorize` $\rightarrow$ `Capture`) o únicamente Venta Directa (`Sale / Purchase`)? | ⏳ Pendiente |
| 5.2 | **Ventana de Captura** | En caso de 2 pasos, ¿cuántos días se mantienen bloqueados los fondos antes de que expire la pre-autorización? | ⏳ Pendiente |
| 5.3 | **Anulaciones (Void)** | ¿Permite anular una transacción el mismo día antes del corte sin generar comisiones para el cliente? | ⏳ Pendiente |
| 5.4 | **Reembolsos (Refund)** | ¿Soporta reembolsos parciales y totales vía API? ¿Cuál es el tiempo de acreditación para el tarjetahabiente? | ⏳ Pendiente |
| 5.5 | **Consulta de Transacción (Inquiry)** | Endpoint para consultar el estado de una transacción por `internalPaymentId` o `providerTransactionId` si hubo timeout. | ⏳ Pendiente |

---

## 7. SECCIÓN 6: NOTIFICACIONES ASÍNCRONAS (WEBHOOKS)

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 7.1 | **Soporte de Webhooks** | ¿El banco emite webhooks HTTP/HTTPS en tiempo real ante cambios de estado de las transacciones? | ⏳ Pendiente |
| 7.2 | **Seguridad y Firma Digital** | ¿Cómo se valida la autenticidad del webhook? (HMAC-SHA256 con Secreto Compartido, Firma RSA, Token en Header). | ⏳ Pendiente |
| 7.3 | **Estructura del Payload** | Documentación y esquema JSON de todos los eventos emitidos (`PAYMENT_APPROVED`, `PAYMENT_DECLINED`, `CHARGEBACK`, etc.). | ⏳ Pendiente |
| 7.4 | **Política de Reintentos** | Si el backend de BlueSystem responde con error o demora, ¿cuántos reintentos realiza el banco y con qué periodicidad? | ⏳ Pendiente |
| 7.5 | **Direcciones IP de Origen** | Lista oficial de rangos de direcciones IP del banco para configurar el Firewall / Reglas de Ingress de Cloud Functions. | ⏳ Pendiente |

---

## 8. SECCIÓN 7: CATÁLOGO DE RESPUESTAS Y GESTIÓN DE ERRORES

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 8.1 | **Diccionario de Códigos de Respuesta** | Listado completo de códigos ISO 8583 o códigos propietarios de respuesta (ej. `00` = Aprobado, `51` = Fondos Insuficientes, `54` = Tarjeta Vencida). | ⏳ Pendiente |
| 8.2 | **Mensajes para el Usuario** | Especificación de cuáles mensajes de rechazo pueden mostrarse de forma segura al cliente final y cuáles son de uso interno. | ⏳ Pendiente |
| 8.3 | **Detección de Fraude (Anti-Fraud)** | Reglas automáticas de bloqueo por sospecha de fraude y códigos de error asociados. | ⏳ Pendiente |

---

## 9. SECCIÓN 8: CONCILIACIÓN, LIQUIDACIÓN Y REPORTES

| # | Requerimiento Técnico | Descripción / Pregunta para el Banco | Estado |
| :---: | :--- | :--- | :---: |
| 9.1 | **Hora de Corte Diario (Batch Settlement)** | Hora oficial en que el banco realiza el cierre de lote y liquidación financiera diaria. | ⏳ Pendiente |
| 9.2 | **Archivos de Conciliación** | ¿El banco provee archivos de conciliación automática (SFTP, API, CSV, formato bancario estándar)? | ⏳ Pendiente |
| 9.3 | **Estructura de Comisiones (MDR)** | Desglose de tasa de descuento bancaria (% por transacción + costo fijo) para la liquidación neta a comercios. | ⏳ Pendiente |
| 9.4 | **Gestión de Contracargos (Chargebacks)** | Proceso y plazos para la notificación y disputa de contracargos bancarios. | ⏳ Pendiente |

---

## 10. PROTOCOLO DE RECEPCIÓN Y ACCIÓN

Una vez que el banco entregue la información de este checklist:
1. El equipo de arquitectura revisará el cumplimiento de seguridad (Firma HMAC, Tokenización y PCI Scope).
2. Se creará la clase concreta `BankAdapter` implementando `PaymentGatewayPort`.
3. Se ejecutarán pruebas de integración en Sandbox con la suite de tarjetas de prueba.
4. Se solicitará la certificación técnica al banco para obtener las credenciales productivas.
