# C2D.29 — APNs PROVISIONING AUDIT
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target:** Apple Push Notification service (APNs)  
**Date:** 2026-09-14  

---

## 1. Arquitectura de Notificaciones Remotas iOS
Para la entrega de notificaciones en tiempo real a dispositivos iOS, la cadena autorizada de mensajería empresarial opera del siguiente modo:
```
Cloud Functions (Dispatchers)
             │
             ▼
Firebase Cloud Messaging (FCM HTTP v1)
             │
             ▼  [APNs Auth Key .p8]
Apple Push Notification service (APNs)
             │
             ▼
Dispositivo iOS (com.bluesystem.delivery.client)
```

---

## 2. Requerimientos de Provisioning para APNs (GAP-APNS-01)
El operador humano debe generar la credencial de autenticación en Apple Developer Portal y cargarla en Firebase:
1. **Creación de APNs Auth Key en Apple Developer:**
   - Sección: Certificates, Identifiers & Profiles → Keys.
   - Key Name: `BlueSystem Delivery APNs Key`.
   - Servicio habilitado: `Apple Push Notifications service (APNs)`.
   - Descarga de archivo de clave privada: `AuthKey_XXXXXXXXXX.p8`.
2. **Metadata Requerida (No Sensible):**
   - **Key ID:** Identificador alfanumérico de 10 caracteres (ej. `ABC123XYZ4`).
   - **Team ID:** ID de la organización en Apple Developer (10 caracteres).
3. **Carga en Firebase Console:**
   - Ubicación: Firebase Project Settings → Cloud Messaging → Apple app configuration.
   - Subir el archivo `.p8` ingresando el Key ID y Team ID correspondientes a la app iOS `com.bluesystem.delivery.client`.

---

## 3. Protocolo de Protección del Secreto Operacional (.p8)
- ❌ **ESTRICTAMENTE PROHIBIDO:**
  - Subir archivos `.p8` al repositorio Git.
  - Almacenar `.p8` en carpetas del código fuente (`flutter_client/`, `app/`, `functions/`).
  - Imprimir el contenido de la clave privada en logs, reportes o terminales.
  - Compilar la clave en el binario de la aplicación cliente.
- 🟢 **Buenas Prácticas:**
  - El archivo `.p8` viaja únicamente desde Apple Developer Portal directamente a Firebase Console.
  - El cliente móvil sólo maneja tokens de dispositivo (`device tokens`), nunca la clave de servidor.

---

## 4. Veredicto del Módulo APNs
```
APNS_AUTH_KEY_EXISTS    = BLOCKED_EXTERNAL (Pending human operator creation in Apple Developer)
APNS_LINKED_TO_FIREBASE = BLOCKED_EXTERNAL (Pending upload to Firebase Console)
WORKSPACE_SECRETS_CHECK = ZERO_P8_FILES_FOUND (PASS)
GAP-APNS-01 STATUS      = BLOCKED_EXTERNAL
```
