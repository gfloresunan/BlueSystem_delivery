# C2D.29 — BUNDLE ID AUDIT
**Protocol:** BSD-C2D29-IOS-EXTERNAL-PROVISIONING-APPLE-READINESS-001  
**Target Primario:** `com.bluesystem.delivery.client`  
**Date:** 2026-09-14  

---

## 1. Definición del Target Oficial
El target primario oficial para el cliente comercial Flutter en la plataforma iOS es:
```
Bundle ID: com.bluesystem.delivery.client
Display Name: BlueSystem Delivery
```

### Reglas de Nomenclatura e Integridad
1. **Prohibición de Variantes Artificiales:**
   - ❌ `com.bluesystem.delivery.client.test` — PROHIBIDO
   - ❌ `com.bluesystem.delivery.client.dev` — PROHIBIDO
   - ❌ `com.bluesystem.delivery.client.beta` — PROHIBIDO
2. **Aislamiento White-Label:**
   - `com.fitoni.delivery.client`: NO es requisito bloqueante de esta fase. Permanece diferido como target white-label secundario para fases futuras.
   - Cero aprovisionamiento innecesario para tenants alternativos durante C2D.29.

---

## 2. Requerimientos de Configuración del App ID en Apple Developer
El App ID `com.bluesystem.delivery.client` debe ser registrado como un Identificador Explícito (Explicit App ID) con las siguientes características:
- **Platform:** iOS
- **Description:** BlueSystem Delivery Client
- **Bundle ID:** `com.bluesystem.delivery.client` (Explicit)
- **Capabilities Asignadas:**
  - `Push Notifications` — HABILITADO
  - `Sign in with Apple` — DEFERRED (No requerido en alcance actual)
  - `Associated Domains` — DEFERRED (No requerido en alcance actual)
  - `Access WiFi Information` — NO REQUERIDO
  - `HealthKit / HomeKit` — NO REQUERIDO

---

## 3. Estado Forense de Registro
- **Estado Inicial:** `NOT_REGISTERED`
- **Estado Actual:** 🟡 `BLOCKED_EXTERNAL`
- **Evidencia:** Al no existir enlace programático con Apple Developer en la estación de trabajo, el registro del App ID queda bajo responsabilidad del operador humano mediante la consola oficial de Apple Developer.

---

## 4. Veredicto del Bundle ID
```
BUNDLE_ID_TARGET      = com.bluesystem.delivery.client
REGISTRATION_STATUS   = BLOCKED_EXTERNAL (Pending human operator registration)
SYNTHETIC_OVERRIDE    = STRICTLY FORBIDDEN
```
