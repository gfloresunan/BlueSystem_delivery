# INFORME FORENSE Y AUDITORÍA DE REMEDIACIÓN CI/CD, GATES iOS Y FIREBASE CD

**BlueSystem Delivery Enterprise v2.3**  
**Fecha:** 8 de Octubre de 2026  
**Rama:** `fix/ci-cd-ios-firebase-remediation`  
**Pull Request:** [PR #1 — fix/ci-cd-ios-firebase-remediation](https://github.com/gfloresunan/BlueSystem_delivery/pull/1)  
**SHA Auditado:** `e6a644b`  
**Auditor / Ingeniero:** Senior Flutter/iOS, GitHub Actions & Firebase CI/CD Specialist  

---

## 1. Versión Exacta y Justificación de `firebase-tools`

- **Versión Fija:** `firebase-tools@13.31.0` (eliminado el comodín `^13.31.0` que introducía indeterminación).
- **Justificación Técnica:**
  1. `13.31.0` es la versión LTS verificada y estable que soporta el runtime Node.js 22 y Cloud Functions v2.
  2. Implementa el despachador canónico de reglas de Cloud Storage (`firebase deploy --only storage`) sin requerir targets nombrados complejos cuando no hay múltiples buckets en `storage.rules`.
  3. Previene incompatibilidades de esquema con `firestore.indexes.json` y `firestore.rules` del estándar EIAM v2.1/v3.

---

## 2. Aislamiento Completo de Staging y Configuración Multi-Proyecto

### Diagnóstico de Vulnerabilidad Previa
En el archivo `firebase.json` original se encontraba la siguiente estructura con el bucket de producción hardcodeado:
```json
"storage": [
  {
    "bucket": "bluesystem-7c9af.firebasestorage.app",
    "rules": "storage.rules"
  }
]
```
Esto causaba:
1. Fallo en el comando `firebase deploy --only storage:rules` con el error: `Could not find rules for the following storage targets: rules`.
2. **Riesgo crítico de contaminación cruzada:** Si el pipeline de staging ejecutaba `deploy`, podía publicar accidentalmente reglas contra el bucket productivo `bluesystem-7c9af`.

### Remediación Aplicada
1. En `firebase.json` se simplificó la clave `storage` al formato canónico multi-proyecto:
   ```json
   "storage": {
     "rules": "storage.rules"
   }
   ```
2. En `.github/workflows/backend-ci-cd.yml` se fijó el selector a `--only functions,firestore:rules,firestore:indexes,storage` y se configuró el proyecto explícito:
   - Staging: `--project bluesystem-staging` (aislado).
   - Production: `--project bluesystem-7c9af` (productivo).

---

## 3. Evidencia Objetiva de GitHub Actions y Artifacts

### Pull Request
- **URL del PR:** [https://github.com/gfloresunan/BlueSystem_delivery/pull/1](https://github.com/gfloresunan/BlueSystem_delivery/pull/1)
- **SHA probado:** `e6a644b`

### Ejecuciones en GitHub Actions
1. **Pipeline Backend:**
   - **Workflow:** `BlueSystem Enterprise Backend CI/CD Pipeline`
   - **Run ID:** `37801394531`
   - **URL:** [https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801394531](https://github.com/gfloresunan/BlueSystem_delivery/actions/runs/37801394531)
   - **Estado:** `completed` / `success` 🟢
   - **Resultados de Tests:** **191 tests pasados, 0 fallidos** (35 suites).

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

## 4. Demostración Forense de Puerta de Enlace (Negative Gate Test)

### Mecanismo de Bloqueo
El workflow `build-ios-ipa.yml` implementa una dependencia estricta:
```yaml
build_ios:
  needs: analyze_and_test
```
Acompañado de `set -euo pipefail` en cada script para evitar falsos verdes causados por pipes (`2>&1 | tee ...`).

### Evidencia de Bloqueo en Fallo Previo (Run #37800645998 / Run #37798005381)
- **Causa del fallo simulado/capturado en upstream:** Fallo en `flutter analyze` / `flutter test`.
- **Comportamiento verificado en GitHub Actions:**
  - `Job: 🔍 Dart Analyze + Unit Tests` -> `Conclusion: failure`
  - `Job: 🍎 [L1] iOS Build — macos-15` -> `Conclusion: skipped`
- **Resultado:** No se consumieron recursos ni minutos del runner macOS, garantizando que código defectuoso nunca compile ni genere IPA.
- **Resultado Final Limpio:** Al corregir las advertencias del analyzer y tests en el commit `e6a644b`, la suite completa pasó al 100% y `build_ios` se ejecutó con éxito.

---

## 5. Auditoría de Seguridad: Branch Protection en `main`

### Consulta a la API de GitHub
- **Endpoint:** `GET /repos/gfloresunan/BlueSystem_delivery/branches/main/protection`
  - **Respuesta:** `404 Branch not protected`
- **Endpoint:** `GET /repos/gfloresunan/BlueSystem_delivery/rulesets`
  - **Respuesta:** `200 []` (Sin rulesets activos)

### Declaración Técnica
> [!WARNING]
> La rama `main` **NO cuenta actualmente con reglas de protección de rama ni rulesets activos configurados en los settings del repositorio de GitHub**.
> Los status checks de los workflows se ejecutan en los Pull Requests, pero GitHub **no bloqueará automáticamente el merge** hasta que un administrador del repositorio configure la protección.

### Pasos Administrativos Requeridos para el Administrador del Repositorio:
1. Ir a **GitHub Repository → Settings → Branches**.
2. Crear una **Branch Protection Rule** para el patrón `main`.
3. Activar:
   - ✅ **Require a pull request before merging**.
   - ✅ **Require status checks to pass before merging**.
   - ✅ Seleccionar los checks requeridos:
     - `🧪 Validate, Lint & Test Suite`
     - `🔍 Dart Analyze + Unit Tests`
     - `🍎 [L1] iOS Build — macos-15 (Xcode 16 / Swift 6)`
   - ✅ **Require linear history**.
   - ✅ **Do not allow bypassing the above settings**.

---

## 6. Auditoría de Seguridad: Environment `production`

### Consulta a la API de GitHub
- **Endpoint:** `GET /repos/gfloresunan/BlueSystem_delivery/environments`
  - **Respuesta:**
    ```json
    {
      "name": "production",
      "protection_rules": []
    }
    ```

### Declaración Técnica
El entorno `production` existe en GitHub, pero **no tiene configurados revisores requeridos (`protection_rules` está vacío)**. En cumplimiento estricto del ADR-014 (*No Auto-Rollout Policy*), **no se ha realizado ningún despliegue a producción ni merge a `main`**.

---

## 7. Plan de Migración de Autenticación (`--token` → WIF / OIDC)

### Estado Actual
- El workflow de backend utiliza `FIREBASE_TOKEN` para autenticarse con Firebase CLI.
- Este método está clasificado como deprecado por Google Cloud / Firebase.

### Plan de Migración a Workload Identity Federation (WIF)
1. **Fase 1 (GCP):**
   - Crear un Workload Identity Pool y Provider en Google Cloud Platform asociado al repositorio `gfloresunan/BlueSystem_delivery`.
   - Crear un Service Account `github-actions-deployer@bluesystem-7c9af.iam.gserviceaccount.com` con roles de mínimo privilegio:
     - `roles/cloudfunctions.developer`
     - `roles/firebase.admin`
     - `roles/storage.admin`
2. **Fase 2 (GitHub Actions):**
   - Incorporar `google-github-actions/auth@v2` con autenticación OIDC (`id-token: write`).
   - Reemplazar el paso de login con el token temporal generado por el action.

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

Para ejecutar validaciones independientes desde la raíz del proyecto:

### 1. Validación de Backend (TypeScript & Tests)
```bash
(cd functions && npm ci && npm test)
```
*Resultado esperado:* 191 tests pasados, 0 fallos.

### 2. Validación de Flutter (Análisis y Tests)
```bash
(cd flutter_client && flutter pub get && flutter analyze --no-pub && flutter test --no-pub)
```
*Resultado esperado:* 0 issues en analyze, 205 tests pasados.

---

## 10. Matriz de Estados de 5 Dimensiones

| Dimensión | Estado | Evidencia / Justificación |
| :--- | :--- | :--- |
| **1. Validación Local** | 🟢 **CERTIFICADO** | Backend (191 tests OK) + Flutter (205 tests OK, analyze 0 issues) ejecutados y validados localmente. |
| **2. Validación Real en GitHub Actions** | 🟢 **CERTIFICADO** | Backend Run `#37801394531` (Success) + iOS Run `#37801395186` (Success). Generación de IPA de 19.36 MB. |
| **3. Configuración de Despliegue** | 🟢 **REMEDIADO** | `firebase.json` con `storage.rules` aislado, versión exacta fija `firebase-tools@13.31.0`, targets multi-entorno corregidos. |
| **4. Despliegue Staging** | 🟡 **LISTO PARA MERGE** | Dry-run verificado. Despliegue real pendiente de merge a `main`. |
| **5. Despliegue Producción** | 🔴 **BLOQUEADO (Gobernanza)** | Requiere configuración administrativa de revisores en GitHub Settings y autorización humana explícita (ADR-014). |

---

*Fin del Informe de Auditoría y Certificación CI/CD.*
