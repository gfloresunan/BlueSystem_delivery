# BLUE SYSTEM DELIVERY ENTERPRISE
## SOURCE OF TRUTH MATRIX — ACTIVIDAD #20
### INFRAESTRUCTURA DE EMAIL TRANSACCIONAL Y SMTP CORPORATIVO

**Protocolo:** `BSD-ACT20-TRANSACTIONAL-EMAIL-ENTERPRISE-001`  
**Estado:** `🟢 IMPLEMENTED — READY FOR VALIDATION`  
**Fecha:** 31 de Agosto de 2026  

---

## 1. Fuentes Canónicas de Verdad (Source of Truth)

| Dominio Funcional | Archivo / Recurso Canónico | Rol en la Arquitectura |
|---|---|---|
| **Servicio Central de Correo** | `functions/src/services/emailService.ts` | Único punto de despacho (`EmailService`), motor de plantillas (`EmailTemplateEngine`), transporte SMTP (`SmtpEmailTransport`), sanitizador (`HtmlSanitizer`) y clasificador de errores (`EmailErrorClassifier`). |
| **Callables de Administración** | `functions/src/callables/emailTemplates.ts` | Endpoints HTTPS autenticados para listado, edición, prueba, diagnóstico y consulta de historial de correos. |
| **Credenciales y Secretos** | `functions/src/config/secretManager.ts` & `functions/.env` | Gestión segura de host, puerto, remitente y contraseña SMTP en servidor. |
| **Registro de Eventos** | Firestore: `/email_events/{eventId}` | Registro inmutable de trazabilidad, estatus de entrega, intentos e idempotencia transaccional. |
| **Plantillas en Base de Datos** | Firestore: `/email_templates/{templateId}` | Almacén de overrides y versiones históricas (`/versions/vN`). |
| **Reglas de Seguridad** | `firestore.rules` | Control de acceso estricto: solo Platform Admins pueden leer `/email_events` y mutar `/email_templates`. |
| **Módulo UI Admin** | `panel-admin/public/js/dashboard/emailTemplates.js` | Vista interactiva para edición, prueba, vista previa y monitor de entregas en tiempo real. |
| **Suite de Pruebas** | `functions/src/__tests__/emailService.test.ts` | 14 pruebas automatizadas que certifican la lógica técnica e idempotencia. |

---

## 2. Invariantes de Seguridad y Gobernanza

1. **Invariante de Contraseñas:** Ninguna credencial SMTP se guarda en texto plano en Firestore ni se expone a interfaces de usuario ni aplicaciones móviles.
2. **Invariante de Idempotencia:** Todo despacho requiere un `eventId` único para garantizar que eventos duplicados no generen múltiples envíos físicos.
3. **Invariante de Sanitización:** Todo contenido HTML ingresado por el usuario o administrador es sanitizado antes de su persistencia y renderizado.
4. **Invariante de Transporte Único:** Todo el sistema despacha exclusivamente a través del puerto seguro `465 (SSL/TLS)` hacia `mail.bluesystemdelivery.com`.
