# C2D.29 — GOOGLE MAPS iOS AUDIT
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target:** Maps SDK for iOS  
**GCP Project:** `bluesystem-7c9af` (`bluesystemtecnohome`)  
**Date:** 2026-09-14  

---

## 1. Verificación de Servicios Habilitados en GCP
Se consultó en vivo la API de Google Cloud Platform para verificar el estado de los servicios de cartografía:
```bash
gcloud services list --enabled --filter="name:maps" --project bluesystem-7c9af
```

### Evidencia Forense Capturada
```
NAME: maps-android-backend.googleapis.com
TITLE: Maps SDK for Android
```

### Diagnóstico Forense
- `maps-android-backend.googleapis.com`: Habilitado (Utilizado por Track A Android).
- `maps-ios-backend.googleapis.com` (Maps SDK for iOS): **NO HABILITADO**.

---

## 2. Requerimientos de Provisioning para Maps iOS (GAP-MAPS-02)
Para cerrar el gap de mapas en iOS sin comprometer la seguridad ni incurrir en facturación indebida, se deben cumplir estrictamente tres pasos:

1. **Habilitación de API en Google Cloud Console:**
   - Servicio: `maps-ios-backend.googleapis.com` (Maps SDK for iOS).
   - Proyecto: `bluesystem-7c9af`.
2. **Creación de API Key Dedicada iOS:**
   - Nombre recomendado: `BlueSystem Delivery - iOS Client Key`.
3. **Restricción Obligatoria por Aplicación (Application Restrictions):**
   - Tipo de restricción: `iOS apps`
   - Bundle Identifier autorizado: `com.bluesystem.delivery.client`
4. **Restricción de API (API Restrictions):**
   - Limitar exclusivamente a: `Maps SDK for iOS`.
   - Prohibir el uso de llaves universales o sin restricción.

---

## 3. Estado de la Protección SentinelMapAdapter
En el cliente Flutter (`flutter_client/lib/platform/maps/map_platform_adapter.dart`), la clase `SentinelMapAdapter` implementa `MapPlatformAdapter` como un cortafuegos activo.
- Si la plataforma se ejecuta sin API key o sin aprovisionamiento físico, las llamadas son interceptadas sin lanzar excepciones no controladas ni colapsar la UI.
- No existen dependencias duras ni llamadas directas de Google Maps en la capa de dominio (`domain/`).

---

## 4. Veredicto del Módulo Maps iOS
```
MAPS_SDK_IOS_ENABLED    = FALSE
IOS_RESTRICTED_KEY      = NOT_PROVISIONED
SENTINEL_MAP_ADAPTER    = ACTIVE_AND_VERIFIED
GAP-MAPS-02 STATUS      = BLOCKED_EXTERNAL (Requires GCP Console enablement & key creation)
```
