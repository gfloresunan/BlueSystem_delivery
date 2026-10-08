# INFORME FORENSE Y AUDITORÍA DE REMEDIACIÓN CI/CD, GATES iOS Y FIREBASE CD

**BlueSystem Delivery Enterprise v2.3**  
**Fecha:** 8 de Octubre de 2026  
**Rama:** `fix/ci-cd-ios-firebase-remediation`  
**Pull Request:** [PR #1 — fix/ci-cd-ios-firebase-remediation](https://github.com/gfloresunan/BlueSystem_delivery/pull/1)  
**Auditor / Ingeniero:** Senior Flutter/iOS, GitHub Actions & Firebase CI/CD Specialist  

---

## 1. Versión Exacta y Justificación de `firebase-tools`

- **Versión Fija:** `firebase-tools@13.31.0` (eliminado el comodín `^13.31.0` que introducía indeterminación).
- **Justificación Técnica:**
  1. `13.31.0` es una versión semver específica, probada y estable con Node.js 22 y Cloud Functions v2.
  2. Despacha reglas de Cloud Storage (`firebase deploy --only storage`) limpiamente sin requerir targets nombrados complejos cuando no hay múltiples buckets configurados en `storage.rules`.
  3. Previene incompatibilidades con `firestore.indexes.json` y `firestore.rules` del estándar EIAM v2.1/v3.
  4. *Nota de precisión técnica:* No se cataloga formalmente como "LTS" (Firebase CLI sigue ciclo continuo de releases semver), sino como versión congelada de referencia compatible.

---

## 2. Aislamiento de Staging y Configuración Multi-Proyecto

### Diagnóstico de Vulnerabilidad Previa
En el archivo `firebase.json` original se encontraba el bucket de producción hardcodeado:
```json
"storage": [
  {
    "bucket": "bluesystem-7c9af.firebasestorage.app",
    "rules": "storage.rules"
  }
]
```
Esto provocaba:
1. Fallo en `firebase deploy --only storage:rules` con el error: `Could not find rules for the following storage targets: rules`.
2. **Riesgo crítico de contaminación cruzada:** Si el pipeline de staging ejecutaba `deploy`, podía publicar accidentalmente reglas contra el bucket productivo `bluesystem-7c9af`.

### Remediación Aplicada
1. En `firebase.json` se simplificó la clave `storage` al formato canónico multi-proyecto:
   ```json
   "storage": {
     "rules": "storage.rules"
   }
   ```
2. En `.github/workflows/backend-ci-cd.yml` se configuró el proyecto explícito:
   - **Staging:** `--project bluesystem-7c9af-staging` (aislado).
   - **Producción:** `--project bluesystem-7c9af` (productivo).
3. **Manejo de Credenciales y Fallo Explícito:**
   - Se eliminó el `exit 0` silencioso cuando falta `FIREBASE_TOKEN`. En su lugar, el workflow falla explícitamente con `exit 1` y mensaje de error claro para evitar falsos verdes.
   - Ambos entornos consumen el secreto `FIREBASE_TOKEN` del repositorio; se documenta la necesidad futura de segregar a `FIREBASE_TOKEN_STAGING` o credenciales OIDC/WIF independientes por proyecto.

---

## 3. Gobernanza de Despliegue a Producción (ADR-014 No Auto-Rollout)

Dado que el entorno `production` en GitHub no cuenta con revisores configurados (`protection_rules: []` vía API), un merge directo a `main` corría el riesgo de disparar un despliegue productivo no intencionado.

**Medidas de Bloqueo Implementadas en el Workflow:**
- El job `deploy_production` **NO se ejecuta automáticamente por push o merge a `main`**.
- Requiere invocación manual explícita vía `workflow_dispatch` seleccionando:
  - `target_environment: production`
  - `confirm_production: CONFIRM_PROD`
- De esta manera, el merge del PR #1 en `main` solo ejecutará el job de validación y pruebas (`validate_and_test`), salvaguardando la estabilidad de producción hasta la autorización humana expresa.

---

## 4. Reproducibilidad de Build iOS y Versión de Flutter

- **Flutter SDK:** Fijado exactamente a `flutter-version: "3.47.6"` (channel: `stable`) tanto en el job `analyze_and_test` como en `build_ios`.
- **Target iOS:** Actualizado a `platform :ios, '15.0'` en `flutter_client/ios/Podfile` y en el proyecto Xcode `Runner.xcodeproj/project.pbxproj` para compatibilidad completa con Firebase iOS SDK 11.x (`firebase_core ^3.10`).
- **Runner macOS:** `macos-15` (Apple Silicon M-series, Xcode 16.4 / CocoaPods 1.17.0).

---

## 5. Evidencia Objetiva de GitHub Actions y Artifacts

### Pull Request
- **URL del PR:** [https://github.com/gfloresunan/BlueSystem_delivery/pull/1](https://github.com/gfloresunan/BlueSystem_delivery/pull/1)

### Ejecuciones Validadas en GitHub Actions
1. **Pipeline Backend:**
   - **Workflow:** `BlueSystem Enterprise Backend CI/CD Pipeline`
   - **Run ID:** `37801394531`
   - **URL:** [https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801394531](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801394531)
   - **Estado:** `completed` / `success` 🟢
   - **Resultados:** **191 tests pasados, 0 fallidos** (35 suites). Despliegues omitidos (PR run).

2. **Pipeline iOS:**
   - **Workflow:** `🍏 [L1] iOS Build Validation — flutter_client`
   - **Run ID:** `37801395186`
   - **URL:** [https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801395186](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801395186)
   - **Estado:** `completed` / `success` 🟢
   - **Job 1 (Dart Analyze + Tests):** **205 tests pasados, 0 fallidos**, `flutter analyze` **0 issues**.
   - **Job 2 (iOS Build macos-15):** Compilación y empaquetado exitoso de `Runner.app` y generación de `.IPA`.

### Artifacts Descargables
| Artifact | Tamaño | ID | URL de Descarga |
| :--- | :--- | :--- | :--- |
| **`BlueSystem-iOS-L1-46`** (.IPA Unsigned) | **19.36 MB** | `11561497370` | [Descargar Artifact IPA #11561497370](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801395186/artifacts/11561497370) |
| **`flutter-test-logs-46`** (Logs) | **0.01 MB** | `11560263816` | [Descargar Logs #11560263816](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801395186/artifacts/11560263816) |

---

## 6. Demostración Forense de Puertas de Enlace y Fallos Previos

### A. Bloqueo Upstream (Negative Gate Test) — Run #37798005381
- **Causa:** Errores detectados por `flutter analyze` en `app_update_resolver.dart`.
- **Comportamiento en GitHub Actions:**
  - `Job 1: 🔍 Dart Analyze + Unit Tests` $\rightarrow$ `failure` ❌
  - `Job 2: 🍎 [L1] iOS Build — macos-15` $\rightarrow$ `skipped` ⏭️ (0 minutos de macOS consumidos).
- **Conclusión Forense:** Demuestra de manera concluyente que el fallo en pruebas/análisis upstream impide la ejecución del build iOS.

### B. Fallo In-Job de Dependencias iOS — Run #37800645998
- **Causa:** Análisis y pruebas pasaron (`analyze_and_test` exitoso), por lo que `build_ios` procedió a ejecutarse en macOS.
- **Comportamiento en GitHub Actions:**
  - `Job 1: 🔍 Dart Analyze + Unit Tests` $\rightarrow$ `success` 🟢
  - `Job 2: 🍎 [L1] iOS Build — macos-15` $\rightarrow$ `failure` ❌ (Fallo en `pod install` debido a incompatibilidad de target deployment `14.0` con pods de Firebase iOS SDK 11.x).
- **Conclusión Forense:** Este run documenta un fallo interno de compilación/enlazado en macOS, el cual fue resuelto elevando el target a `15.0`.

---

## 7. Auditoría de Seguridad: Branch Protection y Environments

### Branch Protection en `main`
- **Consulta API:** `GET /repos/gfloresunan/BlueSystem_delivery/branches/main/protection` $\rightarrow$ `404 Branch not protected`
- **Rulesets:** `GET /repos/gfloresunan/BlueSystem_delivery/rulesets` $\rightarrow$ `[]`
- **Acción Pendiente para el Administrador:** Configurar Branch Protection Rule en GitHub Settings exigiendo PR y status checks requeridos (`Validate, Lint & Test Suite`, `Dart Analyze + Unit Tests`, `iOS Build`).

### Environment `production`
- **Consulta API:** `GET /repos/gfloresunan/BlueSystem_delivery/environments` $\rightarrow$ `protection_rules: []` (sin revisores requeridos).
- **Mitigación:** Gobernanza por código vía `workflow_dispatch` con confirmación explícita (ADR-014).

---

## 8. Plan de Migración de Autenticación (`--token` → WIF / OIDC)

1. **Fase 1 (GCP):** Crear Workload Identity Pool y Service Account con roles de mínimo privilegio (`cloudfunctions.developer`, `firebase.admin`, `storage.admin`).
2. **Fase 2 (GitHub Actions):** Migrar de `FIREBASE_TOKEN` a `google-github-actions/auth@v2` con tokens efímeros OIDC (`id-token: write`).

---

## 9. Versiones Reales de Entorno en Runner macOS Extraídas de Logs

| Componente | Versión Extraída de Logs |
| :--- | :--- |
| **Sistema Operativo Runner** | macOS 15.7.9 (Darwin 24G830) |
| **Arquitectura de Hardware** | `darwin-arm64` (Apple Silicon M-series) |
| **Flutter SDK** | **Flutter 3.47.6** (channel `stable`, revision `5fc346839b`) |
| **Dart SDK** | **Dart 3.13.5** (DevTools 2.60.0) |
| **Xcode** | **Xcode 16.4** (Build version `16F6`) |
| **CocoaPods** | **CocoaPods 1.17.0** |
| **Node.js (Backend CI)** | **Node.js 22.x** (Ubuntu Linux) |

---

## 10. Guía de Ejecución Local desde la Raíz

```bash
# 1. Validación de Backend (TypeScript & Tests — 191 tests)
(cd functions && npm ci && npm test)

# 2. Validación de Flutter (Análisis y Tests — 205 tests)
(cd flutter_client && flutter pub get && flutter analyze --no-pub && flutter test --no-pub)
```

---

## 11. Matriz de Estados de 5 Dimensiones

| Dimensión | Estado | Evidencia / Justificación |
| :--- | :--- | :--- |
| **1. Validación Local** | 🟢 **CERTIFICADO** | Backend (191 tests OK) + Flutter (205 tests OK, analyze 0 issues) ejecutados y validados localmente. |
| **2. CI & Build iOS (GitHub Actions)** | 🟢 **CERTIFICADO** | Backend Run `#37801394531` (Success) + iOS Run `#37801395186` (Success). Generación de IPA de 19.36 MB. |
| **3. Configuración de Despliegue** | 🟢 **REMEDIADO** | `firebase.json` con `storage.rules` aislado, versión exacta `firebase-tools@13.31.0`, targets multi-entorno corregidos (`bluesystem-7c9af-staging` y `bluesystem-7c9af`). |
| **4. Firebase CD (Staging)** | 🟡 **PENDIENTE DE VALIDACIÓN EN VIVO** | Jobs omitidos en PR (esperado). Requiere push a rama `staging`/`develop` o `workflow_dispatch` con credenciales configuradas para certificar despliegue real en nube. |
| **5. Firebase CD (Producción)** | 🛡️ **PROTEGIDO (ADR-014)** | Auto-rollout bloqueado. Requiere autorización humana explícita vía `workflow_dispatch` (`confirm_production: CONFIRM_PROD`). |

---

*Fin del Informe Forense y Auditoría CI/CD.*
