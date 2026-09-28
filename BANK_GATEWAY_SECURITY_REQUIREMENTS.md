# 🔵 BLUESYSTEM DELIVERY ENTERPRISE
# REQUERIMIENTOS DE SEGURIDAD PARA INTEGRACIÓN BANCARIA (FASE 3)
## Documento 4: Criptografía, Gestión de Secretos, Protección de Webhooks, Anti-Replay y Cumplimiento PCI

---

## 1. POLÍTICA DE SEGURIDAD Y GESTIÓN DE SECRETOS

### 1.1. Inyección de Credenciales
Queda terminantemente prohibido almacenar credenciales bancarias en código fuente, archivos `.env`, APKs de Android o documentos de Firestore.

Todas las credenciales institucionales serán administradas exclusivamente mediante **Google Cloud Secret Manager**:
- `BANK_MERCHANT_ID`: Identificador de comercio ante el banco.
- `BANK_API_KEY`: Llave pública/privada de API para llamadas REST.
- `BANK_API_SECRET`: Secreto criptográfico de autenticación.
- `BANK_WEBHOOK_SECRET`: Llave secreta para generación y validación de firmas HMAC.

### 1.2. Rotación de Secretos
El backend debe soportar rotación de secretos sin tiempo de inactividad, admitiendo un período de gracia de firmas duales si la pasarela bancaria lo requiere.

---

## 2. SEGURIDAD DE COMUNICACIONES (IN-TRANSIT)

- **Cifrado Obligatorio:** Todas las conexiones con los servidores del banco deben ejecutarse sobre **TLS 1.3** (mínimo TLS 1.2 con suites de cifrado seguras: ECDHE-RSA-AES128-GCM-SHA256 o superior).
- **Certificate Pinning / mTLS:** Si el banco exige autenticación mutua (mTLS) o pinning de certificados, se implementará a nivel de infraestructura en Cloud Functions / Cloud Run mediante certificados X.509 firmados.

---

## 3. BLINDAJE DE WEBHOOKS Y PROTECCIÓN ANTI-REPLAY

Para prevenir ataques de falsificación de eventos y ataques de repetición (Replay Attacks), el endpoint de recepción de webhooks bancarios debe cumplir:

```
    [Payload Webhook Entrante]
               │
               ▼
    1. ¿Existe Header de Timestamp?  ──► NO  ──► 🔴 RECHAZAR (400)
               │ SÍ
               ▼
    2. ¿Timestamp en ventana (±300s)? ──► NO  ──► 🔴 RECHAZAR (401 - Expired/Replay)
               │ SÍ
               ▼
    3. ¿Firma HMAC-SHA256 Válida?     ──► NO  ──► 🔴 RECHAZAR (401 - Invalid Signature)
               │ SÍ (timingSafeEqual)
               ▼
    4. ¿Evento Ya Procesado? (Idemp.) ──► SÍ  ──► 🟢 RETORNAR 200 (Ignorar duplicado)
               │ NO
               ▼
    5. Procesar Transacción y Registrar en /audit_events
```

### 3.1. Mitigación de Timing Attacks
La comparación de firmas digitales debe ejecutarse mediante comparación de tiempo constante (`crypto.timingSafeEqual`) para evitar ataques de canal lateral (Side-Channel Timing Attacks).

---

## 4. POLÍTICA DE ZERO SENSITIVE CARD DATA (PCI DSS SCOPE)

BlueSystem Delivery Enterprise no captura, no transporta y no almacena datos confidenciales de tarjetas de pago:

| Dato de Tarjeta | ¿Permitido en Memoria? | ¿Permitido en Firestore? | ¿Permitido en Logs? |
| :--- | :---: | :---: | :---: |
| **PAN (Número de Tarjeta)** | ❌ PROHIBIDO | ❌ PROHIBIDO | ❌ PROHIBIDO |
| **CVV / CVC** | ❌ PROHIBIDO | ❌ PROHIBIDO | ❌ PROHIBIDO |
| **PIN / PIN Block** | ❌ PROHIBIDO | ❌ PROHIBIDO | ❌ PROHIBIDO |
| **Fecha de Expiración** | ❌ PROHIBIDO | ❌ PROHIBIDO | ❌ PROHIBIDO |
| **Token Bancario** | ✅ SÍ (Solo Adapter) | ✅ SÍ (Referencia) | ❌ Sanitizado |
| **Código de Autorización** | ✅ SÍ | ✅ SÍ (`authCode`) | ✅ Permitido |
| **ID de Transacción** | ✅ SÍ | ✅ SÍ (`providerTxId`)| ✅ Permitido |
| **Últimos 4 dígitos (Masked)**| ✅ SÍ (Display UI) | ✅ SÍ (`last4`) | ✅ Permitido |

---

## 5. SANITIZACIÓN DE REGISTROS (LOG SANITIZATION)

Se aplicará un middleware de sanitización a todos los logs de Cloud Functions para enmascarar automáticamente cualquier campo que contenga palabras clave como `card`, `pan`, `cvv`, `secret`, `token`, `key`, o `authorization`.
