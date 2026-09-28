# C2D.29 EXTERNAL PROVISIONING REPORT
**Protocol:** BSD-C2D29-OPERATIVE-EXTERNAL-IOS-PROVISIONING-001  
**Firebase Project:** bluesystem-7c9af  
**Commercial iOS Bundle ID:** com.bluesystem.delivery.client  
**Date:** 2026-09-14  

---

## 1. ESTADO DE OPERACIONES DE PROVISIONING EXTERNO

### APPLE DEVELOPER
- **App ID:** PENDING_OPERATOR_ACTION
- **Bundle ID (`com.bluesystem.delivery.client`):** PENDING_OPERATOR_ACTION
- **Push Notifications Capability:** PENDING_OPERATOR_ACTION
- **Evidencia requerida:** Captura o exportación en `C2D29_EXTERNAL_EVIDENCE/01_APPLE/` mostrando el App ID y Push Notifications activos.

### FIREBASE
- **iOS App (`com.bluesystem.delivery.client`):** PENDING_OPERATOR_ACTION
- **GoogleService-Info.plist:** PENDING_OPERATOR_ACTION
- **Evidencia requerida:** `GoogleService-Info.plist` auténtico de `bluesystem-7c9af` depositado en `C2D29_EXTERNAL_EVIDENCE/02_FIREBASE/`.

### GOOGLE MAPS iOS
- **Maps SDK for iOS (`maps-ios-backend.googleapis.com`):** PENDING_OPERATOR_ACTION
- **Restricted API Key:** PENDING_OPERATOR_ACTION
- **Bundle Restriction (`com.bluesystem.delivery.client`):** PENDING_OPERATOR_ACTION
- **Evidencia requerida:** Captura en `C2D29_EXTERNAL_EVIDENCE/03_MAPS/` demostrando API habilitada y key restringida a la app iOS (ocultando el secreto completo).

### APNs
- **Auth Key (.p8):** PENDING_OPERATOR_ACTION
- **Key ID:** PENDING_OPERATOR_ACTION
- **Team ID:** PENDING_OPERATOR_ACTION
- **Firebase APNs Configuration:** PENDING_OPERATOR_ACTION
- **Evidencia requerida:** Captura en `C2D29_EXTERNAL_EVIDENCE/04_APNS/` de la configuración en Firebase Cloud Messaging (Project Settings → Cloud Messaging) con Key ID y Team ID vinculados.
- ⚠️ **RECORDATORIO CRÍTICO:** El archivo `.p8` NO debe depositarse en este repositorio.

---

## 2. INVARIANTES DE SEGURIDAD Y COMPILACIÓN
```
NO BUILD PERFORMED
NO RELEASE PERFORMED
NO DEPLOYMENT PERFORMED
LEVEL 6: NOT CONSUMED
LEVEL 7: NOT GRANTED
TRACK A ANDROID: UNTOUCHED
CORE BACKEND: UNTOUCHED
```
