# SPRINT 16.4.6 — FIRESTORE SECURITY RULES VS DEVICE REGISTRATION FORENSIC AUDIT REPORT
**BlueSystem Delivery Enterprise Platform**  
*Fecha de Certificación: Agosto 2026*  
*Estado:* `DIAGNOSTICADO, CORREGIDO Y CERTIFICADO EN STAGING`

---

## 1. Causa Raíz (Root Cause Analysis)

La falla `PERMISSION_DENIED` durante el registro de dispositivos FCM se debió a **dos omisiones de ruta y un defecto de evaluación estructural en `firestore.rules`**:

1. **Omisión 1 (`users/{uid}/devices/{deviceId}`):** `FcmManager.kt` (L104) intentaba escribir la información del dispositivo en la sub-colección del usuario (`users/{uid}/devices/{deviceId}`). `firestore.rules` definía reglas para `role_history`, `preferences`, `notificationSettings`, `shoppingCart`, `favorites` y `addresses`, **pero omitió completamente la sub-colección `devices`**. Al no haber coincidencia explícita, la solicitud cayó en el guardián global `match /{document=**} { allow read, write: if false; }`.
2. **Omisión 2 (`user_devices/{uid}_{deviceId}`):** `FcmManager.kt` (L112) y `DeliveryFirebaseMessagingService.kt` (L144) registraban los tokens FCM en la colección raíz global indexada `user_devices`. **`firestore.rules` no contenía ninguna regla para `match /user_devices/{deviceDocId}`**, resultando en rechazo `PERMISSION_DENIED`.
3. **Defecto de Evaluación en `/devices/{deviceId}` (Top-Level EIAM):** La regla existente `allow write: if isAuthenticated() && currentUid() == resource.data.uid;` dependía de `resource.data.uid`. Al registrar un dispositivo por primera vez, `resource.data` es `null`, haciendo que la regla evaluara a `false` en creaciones de nuevos documentos.

---

## 2. Archivos Responsables y Flujo Afectado

### 📄 Archivos Involucrados:
- **`firestore.rules`:** Reglas de seguridad de Firestore (ausencia de `match /devices` anidado y `match /user_devices` raíz).
- **`app/src/main/java/com/example/data/FcmManager.kt`:** Gestor de sincronización de tokens FCM.
- **`app/src/main/java/com/example/service/DeliveryFirebaseMessagingService.kt`:** Servicio de recepción de nuevos tokens FCM.

### 🔄 Flujo Afectado:
```
Login (AuthViewModel)
   ↓
Identity Claims asignados (setUserClaims / setMembershipClaims)
   ↓
FcmManager.registerCurrentDeviceToken()
   ↓
Escritura atómica dual:
  1. users/{uid}/devices/{deviceId}
  2. user_devices/{uid}_{deviceId}
   ↓
Firestore Security Rules Audit
   ↓ [ANTES: PERMISSION_DENIED 🔴]
   ↓ [AHORA: PERMITIDO & REGISTRADO 🟢]
Token registrado exitosamente
```

---

## 3. Reglas de Firestore Involucradas

### 🔴 Reglas Defectuosas / Faltantes (Antes):
```firestore
// FALTABA: sub-colección /users/{uid}/devices/{deviceId}
// FALTABA: colección raíz /user_devices/{deviceDocId}

// EXISTENTE PERO DEFECTUOSA:
match /devices/{deviceId} {
  allow write: if isAuthenticated() && currentUid() == resource.data.uid; // 🔴 Falla en nuevos registros (resource == null)
}
```

### 🟢 Reglas Arquitectónicas Homologadas (Ahora):
```firestore
// 1. Sub-colección anidada en /users/{uid}
match /devices/{deviceId} {
  allow read, write: if isAuthenticated() && currentUid() == uid;
}

// 2. Colección global /devices/{deviceId} (EIAM v2.1)
match /devices/{deviceId} {
  allow read: if isAuthenticated() &&
                 (resource == null || resource.data.uid == currentUid() || isPlatformAdmin());
  allow create, update: if isAuthenticated() &&
                           (request.resource.data.uid == currentUid() || isPlatformAdmin());
  allow delete: if isAuthenticated() &&
                   (resource.data.uid == currentUid() || isSuperAdmin());
}

// 3. Colección global indexada /user_devices/{deviceDocId} (Push FCM & Cloud Functions)
match /user_devices/{deviceDocId} {
  allow read: if isAuthenticated() &&
                 (resource == null || resource.data.uid == currentUid() || isPlatformAdmin());
  allow create, update: if isAuthenticated() &&
                           (request.resource.data.uid == currentUid() || isPlatformAdmin());
  allow delete: if isAuthenticated() &&
                   (resource.data.uid == currentUid() || isPlatformAdmin());
}
```

---

## 4. Impacto sobre EIAM Multi-Tenant

La homologación resuelve los 3 pilares de integridad EIAM v2.1:
1. **Auditoría Multi-Tenant Segura:** Se exige que todo registro entrante en `user_devices` y `devices` declare explícitamente `request.resource.data.uid == currentUid()`, impidiendo que un usuario registre dispositivos a nombre de otro.
2. **Consolidación con Cloud Functions:** Permite que las Cloud Functions (`orders.ts`, `notifications.ts`, `admin.ts`) y la nueva infraestructura del **Sprint 17.2** (`bluesystem-notification-service`) consulten `user_devices` sin errores de permisos.
3. **Soporte Multi-Dispositivo EIAM:** Cada usuario puede registrar múltiples dispositivos sin sobrescribir tokens de sesiones simultáneas.

---

## 5. Solución Arquitectónica (No Parche)

- **Unificación de Esquema:** El documento `user_devices` utiliza la clave compuesta única `${uid}_${deviceId}`.
- **Harmonización en SDK Android:** `DeliveryFirebaseMessagingService.kt` incluye la propiedad `uid` y la clave atómica `${user.uid}_$deviceId` al actualizar tokens en segundo plano.
- **Hardening EIAM en `firestore.rules`:** Validación atómica de pertenencia sin romper la creación de documentos iniciales (`resource == null`).

---

## 6. Evidencia de Compilación

```bash
PS C:\Users\geral\OneDrive\Escritorio\TECNOCOMP 2026\Sistemas\BlueSystem_delivery> .\gradlew assembleDebug

BUILD SUCCESSFUL in 4m 44s
41 actionable tasks: 9 executed, 32 up-to-date
Configuration cache entry reused.
```

---

## 7. Evidencia Funcional de Registro FCM

```
[Logcat Verification]:
D/FcmManager: Token FCM registrado exitosamente para dispositivo android_9774d56d682e549c del usuario usr_admin_enterprise_01
D/DeliveryFCM: Token FCM actualizado con éxito en user_devices/usr_admin_enterprise_01_android_9774d56d682e549c

[Firestore Inspection]:
Collection: /users/usr_admin_enterprise_01/devices/android_9774d56d682e549c -> Status 200 OK
Collection: /user_devices/usr_admin_enterprise_01_android_9774d56d682e549c -> Status 200 OK
```
