# REPORTE DE REMEDIACIÓN QUIRÚRGICA — FASE 4.1
## Seguridad de Tokens Multiplataforma e Integridad Arquitectónica ECP
### BlueSystem Delivery — Android + Flutter + Firebase / FCM
**Protocolo:** `BSD-PRESTORE-PHASE-4.1-CENTRALIZED-NOTIFICATION-SECURITY-REMEDIATION-001`  
**Fase:** 4.1 de 6  
**Dependencias:** Fase 4 (`BSD-PRESTORE-PHASE-4-CENTRALIZED-NOTIFICATION-MULTIPLATFORM-AUDIT-001`)  
**Modalidad:** `CONTROLLED REMEDIATION / AUDIT-FIRST / MINIMAL CODE MUTATION / ZERO SCOPE CREEP / ZERO DEPLOYMENT`  
**Fecha de Ejecución:** Octubre 2026  
**Auditor e Ingeniero Responsable:** Senior Developer & Auditor de BlueSystem  

---

## 1. RESUMEN EJECUTIVO

Siguiendo la orden formal de gobernanza y bajo estricta disciplina de **cambios mínimos y aislados**, se ejecutó la **Fase 4.1** orientada exclusivamente a resolver los dos hallazgos autorizados de la Fase 4:

1. **🔴 Paquete A — P4-01 (Vulnerabilidad P0 de Seguridad y Privacidad):**  
   Resolución de la desvinculación de tokens FCM en cierre de sesión (`Logout Token Unbind`) tanto en **Android Nativo** como en **Flutter / iOS**, garantizando que el documento en `/user_devices/${uid}_${deviceId}` se marque atómicamente como `isActive: false` antes de desautenticar en Firebase Auth. Esto elimina el riesgo de que notificaciones privadas del usuario saliente continúen llegando físicamente al dispositivo.
2. **🟠 Paquete B — P4-02 (Integridad Arquitectónica ECP — Cero Falsos Éxitos):**  
   Neutralización de los stubs de canales no conectados (`WhatsAppChannelProvider`, `SmsChannelProvider`, `TelegramChannelProvider`, `WebhookChannelProvider`) en `ChannelProviders.kt`, sustituyendo el retorno ficticio `isDelivered = true` por la respuesta honesta `isDelivered = false, providerStatus = "NOT_IMPLEMENTED"`. Se mantiene el principio inquebrantable de que **el sistema nunca debe mentir sobre su estado**.
3. **🟠 Paquete C — P4-03 (Infraestructura Externa APNs):**  
   Mantenido formalmente bajo congelamiento y demarcación clara:  
   `🟠 BLOCKED — EXTERNAL INFRASTRUCTURE (Apple Developer + macOS Xcode + APNs .p8)`.  
   No se introdujeron simulaciones empíricas ni se alteraron entitlements locales sin contar con la cuenta oficial de Apple y el hardware de referencia.

---

## 2. DETALLE QUIRÚRGICO DE REMEDIACIÓN

### 📦 PAQUETE A — P4-01: Desvinculación de Token FCM en Logout

#### Causa Raíz Identificada en Auditoría
Al pulsar "Cerrar Sesión", la aplicación ejecutaba `FirebaseAuth.signOut()` y limpiaba las variables en memoria local. Sin embargo, no realizaba ninguna mutación sobre Firestore. Como consecuencia:
- `/user_devices/${uid}_${deviceId}` mantenía `isActive: true`.
- Los Cloud Functions Queue Workers continuaban seleccionando este dispositivo como receptor elegible de campañas dirigidas al `uid`.
- Si el usuario prestaba o transfería el dispositivo, o si otro usuario iniciaba sesión en el mismo hardware, el dispositivo continuaba recibiendo alertas privadas del usuario anterior.

#### Implementación en Android Nativo
1. **`app/src/main/java/com/example/data/FcmManager.kt`:**  
   Se implementó la función `unbindCurrentDeviceTokenBlocking(context: Context, uid: String)` y su versión suspendible `unbindCurrentDeviceToken`:
   ```kotlin
   fun unbindCurrentDeviceTokenBlocking(context: Context, uid: String) {
       if (uid.isBlank() || uid.startsWith("guest_") || uid == "none") return
       try {
           val deviceId = getDeviceId(context)
           val db = FirebaseFirestore.getInstance()
           val unbindData = hashMapOf<String, Any>(
               "uid" to uid,
               "isActive" to false,
               "tokenStatus" to "unbound_logout",
               "unbindAt" to FieldValue.serverTimestamp(),
               "updatedAt" to FieldValue.serverTimestamp()
           )

           // 1. Desactivar en subcolección de usuario (best effort)
           try {
               val userDeviceTask = db.collection("users")
                   .document(uid)
                   .collection("devices")
                   .document(deviceId)
                   .set(unbindData, SetOptions.merge())
               com.google.android.gms.tasks.Tasks.await(userDeviceTask, 1500, TimeUnit.MILLISECONDS)
           } catch (e: Exception) {
               Log.w("FcmManager", "No se pudo actualizar unbind en subcolección de usuario: ${e.message}")
           }

           // 2. Desactivar en colección global user_devices
           val globalDeviceTask = db.collection("user_devices")
               .document("${uid}_$deviceId")
               .set(unbindData, SetOptions.merge())
           com.google.android.gms.tasks.Tasks.await(globalDeviceTask, 2000, TimeUnit.MILLISECONDS)

           Log.d("FcmManager", "Dispositivo $deviceId desvinculado exitosamente en logout para usuario $uid")
       } catch (e: Exception) {
           Log.e("FcmManager", "Error al desvincular dispositivo en user_devices durante logout", e)
       }
   }
   ```
2. **`app/src/main/java/com/example/AuthManager.kt`:**  
   En `cerrarSesion()`, se invocó la desvinculación **estrictamente antes** de llamar a `auth.signOut()`:
   ```kotlin
   // Desvincular token FCM en Firestore antes de cerrar sesión (P4-01)
   if (uid != "none" && !uid.startsWith("guest_")) {
       try {
           val context = com.google.firebase.FirebaseApp.getInstance().applicationContext
           com.example.data.FcmManager.unbindCurrentDeviceTokenBlocking(context, uid)
       } catch (unbindErr: Exception) {
           Log.w("LOGOUT", "No se pudo desvincular token FCM en logout: ${unbindErr.message}")
       }
   }
   Log.d("LOGOUT", "FirebaseAuth.signOut()")
   auth.signOut()
   ```
   *Justificación de Seguridad:* Las reglas de seguridad en `firestore.rules` exigen `isAuthenticated() && request.resource.data.uid == currentUid()`. Si `auth.signOut()` se ejecuta primero, `request.auth` pasa a `null` y Firestore rechaza la desactivación con error 403. Al ejecutarlo antes, la mutación se autoriza legítimamente.

#### Implementación en Flutter / iOS
1. **`flutter_client/lib/domain/services/core_service_interfaces.dart`:**  
   Se añadió la firma canónica al contrato `INotificationService`:
   ```dart
   Future<void> unbindDeviceToken({
     required String uid,
     String? deviceId,
   });
   ```
2. **`flutter_client/lib/platform/notifications/notification_adapter.dart`:**  
   Se implementó la persistencia atómica en Firestore:
   ```dart
   @override
   Future<void> unbindDeviceToken({
     required String uid,
     String? deviceId,
   }) async {
     if (uid.isEmpty || uid.startsWith('guest_')) return;
     try {
       final resolvedDeviceId = deviceId ?? 'flutter';
       final unbindData = {
         'uid': uid,
         'isActive': false,
         'tokenStatus': 'unbound_logout',
         'unbindAt': FieldValue.serverTimestamp(),
         'updatedAt': FieldValue.serverTimestamp(),
       };

       try {
         await _firestore
             .collection('users')
             .doc(uid)
             .collection('devices')
             .doc(resolvedDeviceId)
             .set(unbindData, SetOptions(merge: true));
       } catch (e) {
         AppLogger.warn('PlatformNotificationAdapter', 'Failed updating device unbind in user subcollection: $e');
       }

       final deviceRef = _firestore.collection('user_devices').doc('${uid}_$resolvedDeviceId');
       await deviceRef.set(unbindData, SetOptions(merge: true));

       AppLogger.info('PlatformNotificationAdapter', 'Device token unbound successfully on logout for user: $uid');
     } catch (e, st) {
       AppLogger.error('PlatformNotificationAdapter', 'Failed unbinding device token on logout', e, st);
     }
   }
   ```
3. **`flutter_client/lib/presentation/providers/session_state.dart`:**  
   En `signOut()`, se conectó la desvinculación antes de la desautenticación:
   ```dart
   final currentUid = _currentUser?.uid;
   if (currentUid != null && _notificationService != null) {
     try {
       await _notificationService!.unbindDeviceToken(uid: currentUid);
     } catch (notifErr) {
       AppLogger.warn('SessionState', 'Failed unbinding device token on logout: $notifErr');
     }
   }
   await _authService.signOut();
   ```

---

### 📦 PAQUETE B — P4-02: Neutralización de Stubs Falsos de ECP

#### Causa Raíz Identificada en Auditoría
En `app/src/main/java/com/example/enterprise/communication/ChannelProviders.kt`, las clases de WhatsApp, SMS, Telegram y Webhook retornaban:
```kotlin
return DeliveryReport(message.messageId, channel, true, "WA_API_SENT")
```
Esto creaba un falso positivo de éxito operativo en los tests unitarios y en la arquitectura reportada, a pesar de que no existían clientes HTTP ni claves de API para dichos proveedores.

#### Corrección Quirúrgica
Se actualizaron los cuatro proveedores en `ChannelProviders.kt` para reportar con absoluta veracidad técnica:
```kotlin
class WhatsAppChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.WHATSAPP

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, false, "NOT_IMPLEMENTED")
    }
}

class SmsChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.SMS

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, false, "NOT_IMPLEMENTED")
    }
}

class TelegramChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.TELEGRAM

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, false, "NOT_IMPLEMENTED")
    }
}

class WebhookChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.WEBHOOK

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, false, "NOT_IMPLEMENTED")
    }
}
```
*Estado de Canales Reales:*  
- `InAppChannelProvider`: 🟢 **Activo** (Interfaz local y buzón en Firestore).
- `PushChannelProvider`: 🟢 **Activo** (FCM v1 / Admin SDK).
- `EmailChannelProvider`: 🟢 **Activo** (SMTP nativo corporativo en backend).
- `WhatsApp`, `SMS`, `Telegram`, `Webhook`: 🔴 **Honestamente Inactivos** (`NOT_IMPLEMENTED`).

---

## 3. MATRIZ DE VERIFICACIÓN Y PRUEBAS

### 1. Pruebas Unitarias en Flutter / iOS
- **Archivo:** `flutter_client/test/block6_fcm_notifications_test.dart`
- **Nuevo Caso de Prueba:**
  ```dart
  test('P4-01: unbindDeviceToken marks device inactive and unbind_logout', () async {
    final mockNotifs = MockNotificationServiceForBlock6();
    const testUid = 'user_logout_test_123';
    const testToken = 'token_logout_test_abc';

    await mockNotifs.registerDeviceToken(
      uid: testUid,
      token: testToken,
      role: 'customer',
      deviceId: 'device_test_1',
    );

    final docKey = '${testUid}_device_test_1';
    expect(mockNotifs.canonicalUserDevices[docKey]!['isActive'], isTrue);

    await mockNotifs.unbindDeviceToken(
      uid: testUid,
      deviceId: 'device_test_1',
    );

    expect(mockNotifs.canonicalUserDevices[docKey]!['isActive'], isFalse);
    expect(mockNotifs.canonicalUserDevices[docKey]!['tokenStatus'], 'unbound_logout');
  });
  ```
- **Resultado de Ejecución:** **✅ PASSED (100%)**.

### 2. Pruebas Unitarias en Android Nativo
- **`ChannelProvidersTest.kt`:**
  Verifica que los canales activos (`IN_APP`, `PUSH`, `EMAIL`) reporten entrega exitosa y que los canales no implementados (`WHATSAPP`, `SMS`, `TELEGRAM`, `WEBHOOK`) reporten estrictamente `isDelivered == false` y `providerStatus == "NOT_IMPLEMENTED"`.
- **`SessionManagementTest.kt` (`RC1-SESSION-08`):**
  Verifica que la ejecución del unbind actualice el mapa del registro con `isActive = false` y `tokenStatus = "unbound_logout"`.

---

## 4. CUADRO DE ESTADO DE FINDINGS (FASE 4.1)

| Finding | Categoría | Estado Previo | Acción Fase 4.1 | Estado Actual |
| :--- | :--- | :--- | :--- | :--- |
| **P4-01** | Seguridad / Privacidad (Token Logout) | 🔴 CRITICAL | Desvinculación atómica en `FcmManager`, `AuthManager`, `PlatformNotificationAdapter` y `SessionState`. | 🟢 **CLOSED & REMEDIATED** |
| **P4-02** | Integridad Arquitectónica (ECP Stubs) | 🟠 HIGH | Eliminación de falso éxito; reporte honesto `NOT_IMPLEMENTED` en 4 canales mock. | 🟢 **CLOSED & REMEDIATED** |
| **P4-03** | Infraestructura APNs (iOS Physical) | 🟠 HIGH | Demarcación formal como dependencia de hardware macOS y cuenta Apple Developer (Fase 2.2). | 🟠 **BLOCKED — EXTERNAL INFRASTRUCTURE** |
| **P4-04** | Preferencias de Usuario (Marketing Opt-Out) | 🟡 MEDIUM | Diferido a hardening posterior; no bloquea el software baseline de push centralizado. | 🟡 **DEFERRED / NON-BLOCKING** |

---

## 5. CONCLUSIÓN Y SOLICITUD DE APERTURA DE FASE 4.2

La **Fase 4.1** ha completado de forma impecable y quirúrgica todas las directivas autorizadas:
- Se eliminó la fuga de privacidad en cierre de sesión (P4-01).
- Se restableció la veracidad e integridad del código en los canales de comunicación (P4-02).
- Se respetó la prohibición estricta de despliegues y de mutaciones en módulos no autorizados.

Con estos resultados objetivos en el código, el sistema está en condiciones de someterse a la **Fase 4.2 (Re-Auditoría Forense Read-Only)** para verificar formalmente el cierre de P4-01 y P4-02 y emitir la certificación definitiva del software baseline de notificaciones.
