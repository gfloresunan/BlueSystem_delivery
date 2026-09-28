# 🔵 BLUESYSTEM DELIVERY ENTERPRISE
# ESPECIFICACIÓN DEL PAYMENT ACTIVATION GATE
## Documento 2: Mecanismo de Activación Autoritativa, Prerrequisitos, Emergency Kill Switch y Gobernanza

---

## 1. MISIÓN Y PROPÓSITO DEL GATE

El **Payment Activation Gate** es el componente autoritativo de seguridad en el backend de BlueSystem Delivery Enterprise encargado de gobernar la disponibilidad operativa del método de pago con tarjeta de crédito/débito (`CARD`).

Su propósito principal es:
> **Garantizar que ningún pedido con tarjeta pueda ser iniciado, procesado, creado o marcado como pagado mientras no se hayan completado rigurosamente todos los prerrequisitos de infraestructura, adaptadores, certificación bancaria, webhooks criptográficos, auditoría de seguridad y aprobación formal de gobernanza.**

El Gate opera bajo el principio de **Defensa en Profundidad**: la activación no depende de un flag en el cliente móvil, sino de una evaluación lógica server-side en Cloud Functions.

---

## 2. ARQUITECTURA DEL GATE

```
                    PAYMENT ACTIVATION GATE ENGINE
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
INFRAESTRUCTURA & CÓDIGO     CERTIFICACIÓN TÉCNICA      SEGURIDAD & PRODUCCIÓN
• cardEnabled                • sandboxCertified         • securityReviewed
• gatewayConfigured          • webhookVerified          • governanceApproved
• gatewayAdapterAvailable    • e2eCertified             • productionCredentialsConfigured
    │                             │                             │
    └─────────────────────────────┼─────────────────────────────┘
                                  │
                                  ▼
                    EMERGENCY KILL SWITCH ACTIVE?
                                  │
                    ┌─────────────┴─────────────┐
                   YES                          NO
                    │                           │
                    ▼                           ▼
            🔒 CARD BLOCKED             ¿TODAS LAS CONDICIONES
            (Kill Switch)                     CUMPLIDAS?
                                                │
                                  ┌─────────────┴─────────────┐
                                 YES                          NO
                                  │                           │
                                  ▼                           ▼
                          🟢 CARD ALLOWED             🔒 CARD BLOCKED
                          (Producción Activa)         (Pre-Bank State)
```

---

## 3. LAS 9 CONDICIONES OBLIGATORIAS DE ACTIVACIÓN

Para que el Payment Activation Gate autorice el método `CARD`, **todas y cada una** de las siguientes condiciones (8 prerrequisitos técnicos base + 1 condición de producción) deben encontrarse en estado verificado (`true`):

### A. 8 Prerrequisitos Técnicos Base
| # | Prerrequisito | Código del Flag | Descripción Técnica y Criterio de Aceptación |
| :---: | :--- | :--- | :--- |
| **1** | **Disponibilidad Global** | `cardEnabled` | Habilitación administrativa del método de pago con tarjeta en la plataforma. |
| **2** | **Configuración de Pasarela** | `gatewayConfigured` | URLs de endpoints bancarios, Merchant ID institucional y parámetros de conexión válidos. |
| **3** | **Adaptador Bancario** | `gatewayAdapterAvailable` | Clase concreta `BankGatewayAdapter` implementando el contrato `PaymentGatewayPort`. |
| **4** | **Certificación Sandbox** | `sandboxCertified` | Suite de pruebas de tarjetas (éxito, fondos insuficientes, tarjeta bloqueada, 3DS) aprobada. |
| **5** | **Verificación de Webhooks** | `webhookVerified` | Endpoint HTTPS con validación criptográfica de firma digital (HMAC-SHA256) y anti-replay. |
| **6** | **Auditoría de Seguridad** | `securityReviewed` | Zero Sensitive Card Data — arquitectura diseñada para minimizar el alcance PCI DSS. |
| **7** | **Certificación E2E** | `e2eCertified` | Flujo tripartito móvil-banco-comercio probado en todos los escenarios de reintento y timeout. |
| **8** | **Aprobación de Gobernanza** | `governanceApproved` | Autorización explícita y firmada según la directiva ADR-014 (No Auto-Rollout). |

### B. Condición Adicional de Producción
| # | Condición | Código del Flag | Descripción Técnica y Criterio de Aceptación |
| :---: | :--- | :--- | :--- |
| **9** | **Credenciales de Producción** | `productionCredentialsConfigured` | Secretos bancarios inyectados de forma segura mediante GCP Secret Manager. |

---

## 4. FORMULACIÓN LÓGICA DEL GATE

```typescript
CARD_ALLOWED = 
    // 8 Prerrequisitos Técnicos Base
    cardEnabled === true
    AND gatewayConfigured === true
    AND gatewayAdapterAvailable === true
    AND sandboxCertified === true
    AND webhookVerified === true
    AND securityReviewed === true
    AND e2eCertified === true
    AND governanceApproved === true
    // 1 Condición de Producción
    AND productionCredentialsConfigured === true
    // Mecanismo de Emergencia
    AND killSwitchActive === false
```

> **Regla de Oro:** Un único `true` jamás será suficiente para habilitar pagos con tarjeta. Si cualquiera de las 9 condiciones falla, la evaluación retorna `isAllowed = false` con la lista explícita de causas de bloqueo.

---

## 5. MECANISMO DE EMERGENCIA: KILL SWITCH

### 5.1. Definición
El `CARD_PAYMENTS_KILL_SWITCH` es un circuito de seguridad de desconexión inmediata. Si se activa (`killSwitchActive = true`), el Gate bloquea instantáneamente todas las solicitudes de tarjeta, retornando el error `PAYMENT_GATEWAY_KILL_SWITCH_ACTIVE`.

### 5.2. Casos de Activación de Emergencia
1. Falla masiva de red o indisponibilidad reportada por el banco proveedor (SLA Breach).
2. Caída o degradación del servicio receptor de webhooks.
3. Detección de intentos anómalos de fraude o discrepancias en la conciliación diaria.
4. Mantenimiento programado de la infraestructura bancaria.

### 5.3. Aislamiento Operacional
La activación del Kill Switch para tarjeta **NO afecta, NO bloquea y NO degrada** bajo ninguna circunstancia el flujo de **Efectivo (CASH)**, el despacho de pedidos de cocina, el Fleet Pool de motorizados ni las encomiendas X→Y.

---

## 6. PROTOCOLO DE ACTIVACIÓN Y ROLLBACK

### 6.1. Protocolo de Activación (Go-Live)
1. **Recepción:** El banco entrega contratos, API Key, Merchant ID y Secretos de Sandbox.
2. **Desarrollo:** Implementación quirúrgica del `BankGatewayAdapter`.
3. **Pruebas Sandbox:** Ejecución y pase del 100% de los casos de prueba del checklist bancario.
4. **Inspección de Seguridad:** Auditoría forense confirmando Zero PCI Contamination y determinación formal del SAQ aplicable según el método de captura bancario (Hosted Fields / Redirección / SDK).
5. **Aprobación Formal:** Firma del dictamen técnico de gobernanza (ADR-014).
6. **Inyección de Secretos:** Carga de credenciales en GCP Secret Manager.
7. **Apertura del Gate:** Actualización de los 9 parámetros del Gate a `true`.

### 6.2. Protocolo de Rollback Inmediato
Si tras la apertura del gate se detecta un incidente en producción:
1. Activar `CARD_PAYMENTS_KILL_SWITCH = true`.
2. El backend conmuta automáticamente a modo contingencia Efectivo.
3. Los clientes en checkout reciben el aviso *"Pagos con tarjeta en mantenimiento; por favor utiliza Efectivo"*.
4. Investigar causa raíz en logs de auditoría sin interrumpir el negocio.

---

## 7. MATRIZ DE RESPONSABILIDADES Y GOBERNANZA

| Rol / Módulo | Autoridad sobre el Gate | Responsabilidad |
| :--- | :---: | :--- |
| **Customer App** | 🔒 Solo Lectura / Consumidor | Respeta el bloqueo y deshabilita UI |
| **Merchant Web** | 🔒 Solo Lectura / Consumidor | Visualiza transacciones confirmadas |
| **Courier App** | 🔒 Solo Lectura / Verificador | Conjunción estricta: solo `PAID && VERIFIED` no cobra efectivo |
| **Backend Cloud Functions** | 🛡️ Evaluador Autoritativo | Ejecuta `evaluatePaymentActivationGate()` (9 condiciones) |
| **Platform Governance (Admin)** | 🔑 Autoridad de Activación | Autoriza la apertura del Gate tras certificación formal |
