# C2D.29 — Info.plist CONTRACT SPECIFICATION
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target:** `Runner/Info.plist` (para consumo determinista en C2D.29.1)  
**Date:** 2026-09-14  

---

## 1. Propósito del Contrato
Este documento define la especificación canónica y exhaustiva de las claves que deberán incorporarse al `Info.plist` del Runner iOS en la fase C2D.29.1 (Generación del Host e Integración Estática), garantizando el cumplimiento estricto de las directivas de privacidad de Apple (App Store Review Guidelines) y la correcta interoperabilidad con los SDKs integrados.

---

## 2. Declaración de Permisos y Textos de Uso (Privacy Usage Descriptions)

### A. Ubicación Geográfica (GPS)
Justificado por: `flutter_client/lib/platform/gps/gps_adapter.dart`
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>BlueSystem Delivery necesita acceder a tu ubicación mientras usas la app para mostrarte comercios cercanos y calcular rutas de entrega precisas.</string>
```

> [!IMPORTANT]
> **No se incluye `NSLocationAlwaysAndWhenInUseUsageDescription` ni `NSLocationAlwaysUsageDescription`** debido a que este cliente comercial (Track B) no requiere geolocalización continua en segundo plano, evitando objeciones de privacidad durante la revisión de Apple.

---

## 3. Capacidades de Red y Segundo Plano (Background Modes)
Justificado por: `flutter_client/lib/platform/notifications/notification_adapter.dart`
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

---

## 4. Configuración de Firebase y Notificaciones
```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<true/>
```

---

## 5. Identificación de la Aplicación y Nomenclatura
```xml
<key>CFBundleIdentifier</key>
<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
<key>CFBundleName</key>
<string>BlueSystem</string>
<key>CFBundleDisplayName</key>
<string>BlueSystem Delivery</string>
<key>CFBundleShortVersionString</key>
<string>2.2.0</string>
<key>CFBundleVersion</key>
<string>100</string>
<key>LSRequiresIPhoneOS</key>
<true/>
<key>UIViewControllerBasedStatusBarAppearance</key>
<false/>
<key>CADisableMinimumFrameDurationOnPhone</key>
<true/>
<key>UIApplicationSupportsIndirectInputEvents</key>
<true/>
```

---

## 6. Veredicto del Contrato Info.plist
```
CONTRACT_STATUS  = CANONICALLY_DEFINED (100% Deterministic)
HOST_GENERATION  = DEFERRED_TO_C2D29_1
INTEGRITY        = VERIFIED (No redundant or excessive permissions)
```
