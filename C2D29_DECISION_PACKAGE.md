# C2D.29 — DECISION PACKAGE
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target:** `com.bluesystem.delivery.client`  
**Date:** 2026-09-14  

---

## 1. Evaluación de Opciones de Decisión Ejecutiva

### Opción A — 🟢 READY_FOR_CONTROLLED_IOS_BUILD
- **Condición:** Todos los prerrequisitos externos físicamente verificados y activos (Apple Developer App ID creado, Firebase iOS App registrada, `GoogleService-Info.plist` auténtico verificado, Maps iOS habilitado y key restringida, APNs `.p8` cargado en Firebase).
- **Evaluación:** NO PROCEDE en este momento porque los portales externos de Apple Developer, Google Cloud y Firebase Console requieren la intervención manual directa del operador humano. Declarar Opción A constituiría una violación directa del principio Fail-Closed y de la directiva de No Simulación (Sección 24).

### Opción B — 🟡 READY_WITH_EXTERNAL_PREREQUISITES (RECOMENDADA)
- **Condición:** La arquitectura de software, los contratos de configuración (`Info.plist`, `Entitlements`), las interfaces de plataforma (GPS, Maps Sentinel, FCM Notifications, Secure Storage), el escaneo de seguridad y la protección de Track A y Core están 100% listos y certificados. Los prerrequisitos externos se encuentran plenamente identificados y especificados a la espera de ejecución por el operador humano en las consolas oficiales.
- **Evaluación:** **PROCEDE Y ES LA ÚNICA TÉCNICAMENTE HONESTA Y CERTIFICABLE.**

### Opción C — 🔴 BLOCKED
- **Condición:** Existencia de bloqueos arquitectónicos graves, contradicciones en el Core backend o incompatibilidades insalvables en el código de Flutter.
- **Evaluación:** NO APLICA. No se detectaron fallos estructurales ni regresiones.

### Opción D — FAIL-CLOSED (POR INFRACCIÓN)
- **Condición:** Detección de mutaciones accidentales en Track A, fuga de secretos o intento no autorizado de compilación.
- **Evaluación:** NO APLICA. El Build Firewall y las protecciones operaron al 100%.

---

## 2. Decisión Ejecutiva Oficial
```
============================================================
FINAL DECISION:
🟡 READY_WITH_EXTERNAL_PREREQUISITES
============================================================
```

### Plan de Acción Humana para Transición a C2D.29.1:
1. **Paso 1 (Apple Developer):** Registrar el App ID `com.bluesystem.delivery.client` con la capability `Push Notifications`.
2. **Paso 2 (Firebase Console):** Dar de alta la app iOS con Bundle ID `com.bluesystem.delivery.client` en el proyecto `bluesystem-7c9af` y descargar el `GoogleService-Info.plist` auténtico en la carpeta del proyecto.
3. **Paso 3 (Google Cloud Console):** Habilitar `Maps SDK for iOS` en `bluesystem-7c9af` y crear una API key restringida a la app iOS `com.bluesystem.delivery.client`.
4. **Paso 4 (APNs & Firebase):** Generar una Auth Key `.p8` en Apple Developer y cargarla en Firebase Project Settings → Cloud Messaging.
5. **Paso 5 (Autorización Humana):** Emitir la orden ejecutiva para avanzar a la fase **C2D.29.1 — iOS Host Generation & Static Integration Audit**.
