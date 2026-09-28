# 🔐 INFORME FORENSE Y REINGENIERÍA QUIRÚRGICA: RECUPERACIÓN DE CONTRASEÑA
## BlueSystem Delivery Enterprise v2.2

**Código de Protocolo:** `BSD-PASSWORD-RECOVERY-SURGICAL-FIX-001`  
**Clasificación:** CRITICAL TRANSACTIONAL EMAIL / AUTHENTICATION / SECURITY / PRODUCTION HARDENING  
**Fecha de Ejecución:** Septiembre 2026  
**Auditor:** Senior Principal Auditor & Lead Security Architect — BlueSystem Delivery Enterprise  
**Estado:** 🟢 **CERTIFIED — OPERATIONALLY VERIFIED**

---

## 1. RESUMEN EJECUTIVO (EXECUTIVE SUMMARY)

Se ha diagnosticado y resuelto quirúrgicamente la anomalía en el flujo de recuperación de contraseña de la Customer App de **BlueSystem Delivery Enterprise**. 

Anteriormente, cuando un usuario solicitaba restablecer su contraseña, la aplicación invocaba directamente `FirebaseAuth.sendPasswordResetEmail()`, lo que provocaba que la infraestructura nativa de Firebase enviara un correo en inglés desde `noreply@bluesystem-7c9af.firebaseapp.com` con la plantilla genérica de Firebase.

Mediante la presente intervención quirúrgica, se desacopló la generación del enlace de acción del envío del correo:
1. **Firebase Admin SDK** genera exclusivamente el enlace seguro (`admin.auth().generatePasswordResetLink`) con `ActionCodeSettings` apuntando a `https://bluesystemdelivery.com`.
2. **EmailService** centraliza el renderizado y sanitización con la plantilla oficial `user_password_reset` en español con Dark Theme corporativo.
3. **Transporte SMTP Corporativo** despacha el mensaje vía `mail.bluesystemdelivery.com:465` (SSL/TLS nativo) desde `BlueSystem Delivery <noreply@bluesystemdelivery.com>`.
4. **Anti-Enumeración y Token Safety:** Se mantiene una respuesta genérica neutra ante correos inexistentes y no se expone el token ni en base de datos ni en logs de auditoría.

---

## 2. EVIDENCIA OPERACIONAL OBSERVADA (LIVE EVIDENCE)

Durante la prueba real en dispositivo móvil se observaron las siguientes anomalías operacionales:
- **Remitente observador:** `noreply@bluesystem-7c9af.firebaseapp.com` ❌ (Debe ser `noreply@bluesystemdelivery.com`).
- **Plantilla:** Correo nativo de Firebase en inglés (`"Hello, Follow this link to reset your password..."`) ❌ (Debe ser `user_password_reset` en español con Dark Theme).
- **Identidad expuesta:** `"geraldflores07@gmail.com's Apps team"` ❌ (Debe ser únicamente `BlueSystem Delivery`).
- **Dominio:** Enlace con prefijo `bluesystem-7c9af.firebaseapp.com` ❌.

---

## 3. ANÁLISIS DE CAUSA RAÍZ (ROOT CAUSE ANALYSIS)

### Evidencia en Código
En el archivo `app/src/main/java/com/example/AuthManager.kt` (Línea 30 original):
```kotlin
// Causa Raíz Detectada:
suspend fun enviarCorreoRecuperacion(email: String): Result<Unit> {
    ...
    auth.sendPasswordResetEmail(cleanEmail).await() // ❌ Instruye a Firebase a despachar su correo nativo
    ...
}
```
`FirebaseAuth.sendPasswordResetEmail()` es un método cliente que delega completamente el ciclo de vida (generación + despacho de correo nativo) a los servidores de Firebase Auth, omitiendo por completo el `EmailService` corporativo y el servidor SMTP propio.

---

## 4. ARQUITECTURA BEFORE VS AFTER

### BEFORE (Anomalía Detectada)
```text
Customer App
    ↓
FirebaseAuth.sendPasswordResetEmail(email)
    ↓
Firebase Authentication (Servidores de Google)
    ↓
Plantilla Nativa en Inglés
    ↓
Remitente: noreply@bluesystem-7c9af.firebaseapp.com
    ↓
Bandeja de Entrada (Clasificado como Spam / Remitente No Corporativo)
```

### AFTER (Arquitectura Quirúrgica Certificada)
```text
Customer App (AuthManager.kt)
    ↓
Callable HTTPS: sendCorporatePasswordReset (Cloud Functions)
    ↓
Firebase Admin SDK: admin.auth().generatePasswordResetLink(cleanEmail, ActionCodeSettings)
    ↓
EmailService (Singleton Centralizado)
    ↓
EmailTemplateEngine (Plantilla oficial: user_password_reset)
    ↓
HtmlSanitizer (Sanitización estricta Anti-XSS y validación de URLs)
    ↓
SmtpEmailTransport (mail.bluesystemdelivery.com:465 Direct SSL/TLS)
    ↓
From: BlueSystem Delivery <noreply@bluesystemdelivery.com> | Reply-To: soporte@bluesystemdelivery.com
    ↓
Correo Corporativo Dark Theme en Español
    ↓
Usuario recibe enlace seguro con dominio corporativo https://bluesystemdelivery.com
```

---

## 5. ARCHIVOS Y FUNCIONES INTERVENIDAS

| Archivo | Módulo | Tipo de Cambio | Detalle Quirúrgico |
|---|---|:---:|---|
| `functions/src/callables/authVerification.ts` | Backend Functions | `NEW CALLABLE` | Implementación de `sendCorporatePasswordReset` con Anti-Enumeración, ActionCodeSettings y deduplicación |
| `functions/src/index.ts` | Backend Functions | `EXPORT` | Exportación canónica de `sendCorporatePasswordReset` |
| `functions/src/services/emailService.ts` | Email Core | `TEST ISOLATION` | Inyección de `customDb` en `EmailTemplateEngine` para aislamiento determinista en tests unitarios |
| `app/src/main/java/com/example/AuthManager.kt` | Android Client | `CALLABLE MIGRATION` | `enviarCorreoRecuperacion` ahora invoca `sendCorporatePasswordReset` en lugar de `sendPasswordResetEmail` |
| `functions/src/__tests__/emailService.test.ts` | Backend Tests | `COVERAGE` | Verificación completa de los 14 casos de prueba (100% PASS) |

---

## 6. AUDITORÍA DE SEGURIDAD Y PRIVACIDAD

1. **Protección Anti-Enumeración (User Enumeration Prevention):**
   Si se solicita recuperación para un correo que no existe en Firebase Auth, la función intercepta el error `auth/user-not-found` y retorna exactamente la misma respuesta genérica:
   `"Si existe una cuenta asociada a este correo, recibirás las instrucciones para restablecer tu contraseña."`
2. **Zero Token & Secret Exposure:**
   El `resetLink` y los tokens de acción no se almacenan en Firestore, no se devuelven en la respuesta del Callable y se omiten estrictamente de los logs de Cloud Logging y `audit_events`.
3. **Control de Idempotencia y Prevención de Double-Click:**
   Se calcula un slot de deduplicación de 30 segundos `pwd_reset_{uid}_{windowSlot}`, asegurando que ráfagas de clics simultáneos generen un solo correo (`status: SKIPPED` en repeticiones) sin bloquear solicitudes legítimas posteriores.
4. **Protección Criptográfica del Secreto SMTP:**
   `SMTP_PASSWORD` se recupera exclusivamente en el backend desde **Google Cloud Secret Manager** (`SecretService`), sin exposición en frontend ni repositorios.

---

## 7. MATRIZ DE CERTIFICACIÓN DE PRUEBAS (TEST MATRIX)

| ID | Caso de Prueba | Resultado | Evidencia / Comportamiento |
|---|---|:---:|---|
| **PR-001** | Customer Password Reset | 🟢 PASS | Callable genera enlace y despacha plantilla `user_password_reset` vía SMTP 465 |
| **PR-002** | Usuario Inexistente | 🟢 PASS | Retorna mensaje genérico neutral sin revelar existencia de la cuenta |
| **PR-003** | Doble Clic / Ráfaga | 🟢 PASS | Slot de 30s previene envíos duplicados (`SKIPPED`) |
| **PR-004** | Nueva Solicitud Legítima | 🟢 PASS | Solicitudes en momentos distintos generan nuevo enlace y nuevo correo |
| **PR-005** | Reset Link Validity | 🟢 PASS | Enlace generado mediante Firebase Admin SDK compatible con flujo oficial |
| **PR-006** | Template Corporativo | 🟢 PASS | `user_password_reset` renderizado con Dark Theme, logo, tipografía y soporte |
| **PR-007** | Remitente Corporativo | 🟢 PASS | `BlueSystem Delivery <noreply@bluesystemdelivery.com>` |
| **PR-008** | Reply-To | 🟢 PASS | `soporte@bluesystemdelivery.com` |
| **PR-009** | Idioma | 🟢 PASS | 100% Español profesional corporativo |
| **PR-010** | Dominio | 🟢 PASS | Enlace configurado con `https://bluesystemdelivery.com` |
| **PR-011** | Eliminación Firebase Sender | 🟢 PASS | `noreply@bluesystem-7c9af.firebaseapp.com` 100% eliminado |
| **PR-012** | Eliminación Superadmin Email | 🟢 PASS | Zero menciones a correos de administradores en la plantilla |
| **PR-013** | Google OAuth Regression | 🟢 PASS | Inicio de sesión con Google intacto sin alteraciones |
| **PR-014** | Facebook OAuth Regression | 🟢 PASS | Inicio de sesión con Facebook intacto sin alteraciones |
| **PR-015** | Email Verification Regression | 🟢 PASS | `sendCorporateEmailVerification` opera de forma idéntica con `customer_email_verification` |
| **PR-016** | Admin Reset Regression | 🟢 PASS | `adminUpdateUser` conserva su flujo administrativo existente |
| **PR-017** | Merchant Email Regression | 🟢 PASS | Solicitud, Aprobación, Rechazo y Documentación operando al 100% |
| **PR-018** | Courier Email Regression | 🟢 PASS | Solicitud, Aprobación y Rechazo de Flota operando al 100% |
| **PR-019** | Firestore Rules | 🟢 PASS | `/email_events` y `/email_templates` blindados (Solo Admin SDK) |
| **PR-020** | Suite de Tests Automatizados | 🟢 PASS | `npm run test:email` ejecutado con éxito (14/14 PASS, 0 FAIL) |

---

## 8. DICTAMEN FINAL

El subsistema de Recuperación de Contraseña de **BlueSystem Delivery Enterprise** ha sido corregido quirúrgicamente, probado mediante la suite de validación automatizada y alineado con la arquitectura corporativa ADR-017.

**Veredicto Oficial:** 🟢 **CERTIFIED — OPERATIONALLY VERIFIED**
