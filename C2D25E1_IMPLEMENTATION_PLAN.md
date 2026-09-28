# C2D25E.1 — IMPLEMENTATION PLAN (CLOSURE PLAN)
## Protocol ID: `BSD-C2D25E1-EXTERNAL-PROVISIONING-HARDENING-CLOSURE-001`
### Focus: Hardening Closure Plan (NO-BUILD PLAN)

> [!IMPORTANT]
> Este documento es exclusivamente un **PLAN DE CIERRE DE GAPs**. Bajo ninguna circunstancia autoriza ni contempla la ejecución de Gradle, compilación de APKs/AABs ni consumo de tokens Level 6.

---

### 1. Remaining Hardening Backlog & Plan de Acción

| GAP ID | Root Cause | Required Action | Owner | External / Internal | Dependency | Validation Method | Blocking Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-FB-01** | Solo 1 cliente en `google-services.json` | Registrar 2da Android App en Firebase y descargar JSON consolidado | Operador Humano | **EXTERNAL** | Firebase Console | Validar 2 clientes y package en JSON | **P0 BLOCKER** |
| **GAP-FB-02** | Clave Maps sin 2do package autorizado | Añadir package y SHA-1 en restricciones de Maps SDK | Operador Humano | **EXTERNAL** | Google Cloud Console | Verificación en consola GCP | **P2 BLOCKER** |
| **GAP-BA-01** | Inyección de assets solo diseñada | Implementar script/task pre-build que inyecte mipmaps y splash en overlay temporal | Antigravity / Dev | **INTERNAL** | Storage de marca | Prueba estática de overlay sin build | **P1 HIGH** |
| **GAP-SG-01** | Release signing con env vars | Integrar Secret Manager en release | Dev | **INTERNAL** | Fase C2D.26 | Auditoría de seguridad | **P3 DEFERRED** |

---

### 2. Secuencia de Ejecución para Cierre

```text
PASO 1: Operador Humano registra Android App en Firebase Console (GAP-FB-01)
   ↓
PASO 2: Operador Humano autoriza package + SHA-1 en Google Cloud Console (GAP-FB-02)
   ↓
PASO 3: Operador Humano actualiza app/google-services.json consolidado
   ↓
PASO 4: Antigravity implementa script transitorio de Brand Assets Overlay (GAP-BA-01)
   ↓
PASO 5: Verificación y Re-Auditoría de Cierre de GAPs (GREEN)
   ↓
🛑 STOP — SOLICITUD DE AUTORIZACIÓN HUMANA PARA C2D.25F (SEGUNDO BUILD CONTROLADO)
```
