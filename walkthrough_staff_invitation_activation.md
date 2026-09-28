# Walkthrough: Activación de Personal y Resolución Forense de acceptStaffInvitation
**Protocolo:** `BSD-MERCHANT-STAFF-INVITATION-ACTIVATION-FORENSIC-001`  
**Fecha:** 2026-09-14  

---

### Resumen Ejecutivo
Se investigó y resolvió de forma quirúrgica el incidente crítico donde la aceptación de invitaciones de personal en `AcceptInviteModule` fallaba con `HTTP 500` (`FirebaseError: INTERNAL`).

### Causa Raíz Identificada
1. **IAM:** La cuenta de servicio `bluesystem-7c9af@appspot.gserviceaccount.com` carecía del rol `roles/iam.serviceAccountTokenCreator`, lo que provocaba que `admin.auth().createCustomToken(...)` fallara con `Permission 'iam.serviceAccounts.signBlob' denied on resource`.
2. **Resiliencia & Idempotencia:** La llamada a `createCustomToken` ocurría tras el commit de base de datos (`status: 'ACCEPTED'`) sin bloque defensivo `try/catch`. Cualquier reintento era rechazado con error 400.

### Cambios Aplicados
1. **GCP IAM:** Otorgado el rol `roles/iam.serviceAccountTokenCreator` a `bluesystem-7c9af@appspot.gserviceaccount.com`.
2. **Backend (`functions/src/callables/staffAuth.ts`):**  
   - Soporte de reintento idempotente para la misma identidad sin rechazar la llamada.
   - Envoltorio defensivo `try/catch` alrededor de `createCustomToken`.
   - Inclusión de `email` en el payload de respuesta.
3. **Frontend (`merchant-web/src/modules/AcceptInviteModule.tsx`):**  
   - Flujo de autenticación dual: si viene `customToken`, usa `signInWithCustomToken`; si no, realiza fallback transparente con `signInWithEmailAndPassword`.

### Pruebas y Certificación
- Verificación en vivo de token bloqueado: **HTTP 200** con Custom Token emitido.
- Suite de Gates: **16/16 pruebas unitarias y de integración PASS**.
- Regresión de email (ADR-017): **14/14 tests PASS**.
- Despliegue en producción: `acceptStaffInvitation` (Cloud Functions) y `merchant` (Hosting) 100% operativos.
