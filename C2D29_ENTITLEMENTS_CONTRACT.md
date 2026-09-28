# C2D.29 — ENTITLEMENTS CONTRACT SPECIFICATION
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target:** `Runner/Runner.entitlements`  
**Date:** 2026-09-14  

---

## 1. Propósito del Contrato
Define la especificación formal del archivo de entitlements requerido para la compilación y firma del binario iOS en la fase de Controlled Build.

---

## 2. Contenido Canónico del Runner.entitlements

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Entitlement para Push Notifications (APNs) -->
    <key>aps-environment</key>
    <string>development</string>
</dict>
</plist>
```

> [!NOTE]
> El valor de `aps-environment` transicionará de `development` a `production` cuando se compile el build de release o distribución (C2D.30 / C2D.30.1).

---

## 3. Entitlements Estrictamente Excluidos (Por Justificación Técnica)
- ❌ `keychain-access-groups`: No requerido para Keychain interno.
- ❌ `com.apple.developer.associated-domains`: Diferido; no usado en C2D.29.
- ❌ `com.apple.developer.applesignin`: Diferido.
- ❌ `com.apple.security.application-groups`: No requerido.

---

## 4. Veredicto del Contrato de Entitlements
```
ENTITLEMENTS_SPECIFICATION = COMPILED_AND_MINIMAL
ALLOWED_ENTITLEMENTS      = ['aps-environment']
UNJUSTIFIED_ENTITLEMENTS  = ZERO
```
