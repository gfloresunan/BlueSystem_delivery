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
3. **Manejo de Eventos y Credenciales en Staging:**
   - La condición de ejecución distingue explícitamente entre push a ramas `staging`/`develop` y dispatch manual dirigido exclusivamente a `staging`:
     ```yaml
     if: >-
       (github.event_name == 'push' && (github.ref == 'refs/heads/staging' || github.ref == 'refs/heads/develop')) ||
       (github.event_name == 'workflow_dispatch' && github.event.inputs.target_environment == 'staging')
     ```
   - Un dispatch manual hacia `production` disparado desde ramas secundarias no activará staging bajo ningún concepto.
   - Se eliminó el `exit 0` silencioso cuando falta `FIREBASE_TOKEN`. En su lugar, el workflow falla explícitamente con `exit 1` y mensaje de error claro para evitar falsos verdes.
   - Ambos entornos consumen actualmente el secreto `FIREBASE_TOKEN` del repositorio; se documenta la necesidad de segregar a credenciales independientes por proyecto.

---

## 3. Gobernanza de Despliegue a Producción (ADR-014 No Auto-Rollout)

Dado que el entorno `production` en GitHub no cuenta con revisores configurados (`protection_rules: []` vía API), un merge directo a `main` corría el riesgo de disparar un despliegue productivo no intencionado.

**Compuerta de Cuatro Vías Implementada en el Workflow:**
Para que el job `deploy_production` pueda ejecutarse, se deben cumplir **simultáneamente** las cuatro condiciones siguientes:
```yaml
if: >-
  github.event_name == 'workflow_dispatch' &&
  github.ref == 'refs/heads/main' &&
  github.event.inputs.target_environment == 'production' &&
  github.event.inputs.confirm_production == 'CONFIRM_PROD'
```
1. Invocación manual explícita (`workflow_dispatch`).
2. Ejecución exclusiva sobre la rama productiva (`refs/heads/main`).
3. Selección explícita del target `production`.
4. Confirmación tipográfica manual del operador (`CONFIRM_PROD`).

> [!IMPORTANT]
> **Aclaración de Gobernanza:** La cadena `CONFIRM_PROD` es una salvaguarda operativa a nivel de workflow, pero **no sustituye la aprobación independiente de un revisor humano formal** que debe ser configurada en GitHub Repository Settings (Environment Protection Rules).

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
   - **Run ID:** `37803873763`
   - **URL:** [https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37803873763](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37803873763)
   - **Estado:** `completed` / `success` 🟢
   - **Resultados:** **191 tests pasados, 0 fallidos** (35 suites). Despliegues omitidos (PR run).

2. **Pipeline iOS:**
   - **Workflow:** `🍏 [L1] iOS Build Validation — flutter_client`
   - **Run ID:** `37803873826`
   - **URL:** [https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37803873826](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37803873826)
   - **Job 1 (Dart Analyze + Tests):** `completed` / `success` 🟢 (**205 tests pasados, 0 issues en analyze** bajo Flutter 3.47.6).
   - **Job 2 (iOS Build macos-15):** Compilación y empaquetado de `Runner.app` y `.IPA`.

### Artifacts Descargables Certificados
| Artifact | Tamaño | Run ID | Artifact ID | URL de Descarga |
| :--- | :--- | :--- | :--- | :--- |
| **`BlueSystem-iOS-L1-48`** (.IPA Unsigned) | **20.30 MB** | `37803873826` | `11562881563` | [Descargar Artifact IPA #11562881563](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37803873826/artifacts/11562881563) |
| **`flutter-test-logs-48`** (Logs) | **0.01 MB** | `37803873826` | `11562116602` | [Descargar Logs #11562116602](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37803873826/artifacts/11562116602) |
| **`BlueSystem-iOS-L1-46`** (.IPA Unsigned) | **19.36 MB** | `37801395186` | `11561497370` | [Descargar Artifact IPA #11561497370](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801395186/artifacts/11561497370) |

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

## 7. Pendientes Administrativos y Auditoría de Seguridad

### A. Branch Protection en `main`
- **Consulta API:** `GET /repos/gfloresunan/BlueSystem_delivery/branches/main/protection` $\rightarrow$ `404 Branch not protected`
- **Rulesets:** `GET /repos/gfloresunan/BlueSystem_delivery/rulesets` $\rightarrow$ `[]`
- **Acción Pendiente para el Administrador:** Configurar Branch Protection Rule en GitHub Settings exigiendo PR y status checks requeridos (`Validate, Lint & Test Suite`, `Dart Analyze + Unit Tests`, `iOS Build`).

### B. Environment `production` y Revisores Requeridos
- **Consulta API:** `GET /repos/gfloresunan/BlueSystem_delivery/environments` $\rightarrow$ `protection_rules: []` (sin revisores requeridos).
- **Acción Pendiente para el Administrador:** Asignar revisores obligatorios en **Settings → Environments → production → Required reviewers**.
- **Mitigación Temporal:** Compuerta de 4 vías (`workflow_dispatch` + `main` + `production` + `CONFIRM_PROD`).

### C. Plan de Migración de Autenticación (`--token` → WIF / OIDC)
1. **Fase 1 (GCP):** Crear Workload Identity Pool y Service Account con roles de mínimo privilegio (`cloudfunctions.developer`, `firebase.admin`, `storage.admin`).
2. **Fase 2 (GitHub Actions):** Migrar de `FIREBASE_TOKEN` a `google-github-actions/auth@v2` con tokens efímeros OIDC (`id-token: write`) segregados por entorno.

---

## 8. Versiones Reales de Entorno en Runner macOS Extraídas de Logs

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

## 9. Guía de Ejecución Local desde la Raíz

```bash
# 1. Validación de Backend (TypeScript & Tests — 191 tests)
(cd functions && npm ci && npm test)

# 2. Validación de Flutter (Análisis y Tests — 205 tests)
(cd flutter_client && flutter pub get && flutter analyze --no-pub && flutter test --no-pub)
```

---

## 10. Matriz de Estados de 5 Dimensiones

| Dimensión | Estado | Evidencia / Justificación |
| :--- | :--- | :--- |
| **1. Validación Local** | 🟢 **CERTIFICADO** | Backend (191 tests OK) + Flutter (205 tests OK, analyze 0 issues) ejecutados y validados localmente. |
| **2. CI & Build iOS (GitHub Actions)** | 🟢 **CERTIFICADO** | Backend Run `#37803873763` (Success) + iOS Run `#37801395186` (Success). Generación de IPA de 19.36 MB. |
| **3. Configuración de Despliegue** | 🟢 **REMEDIADO** | `firebase.json` con `storage.rules` aislado, versión exacta `firebase-tools@13.31.0`, targets multi-entorno corregidos (`bluesystem-7c9af-staging` y `bluesystem-7c9af`). |
| **4. Firebase CD (Staging)** | 🟡 **PENDIENTE DE VALIDACIÓN EN VIVO** | Jobs omitidos en PR (esperado). Requiere push a rama `staging`/`develop` o `workflow_dispatch` con credenciales configuradas para certificar despliegue real en nube. |
| **5. Firebase CD (Producción)** | 🛡️ **PROTEGIDO (ADR-014)** | Auto-rollout bloqueado. Requiere compuerta de 4 vías (`workflow_dispatch`, `main`, `production`, `CONFIRM_PROD`). Pendiente asignación de revisores en repo settings. |

---

*Fin del Informe Forense y Auditoría CI/CD.*
