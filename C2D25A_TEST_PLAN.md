# C2D25A — TEST PLAN
## Plan de Pruebas de Hardening Pre-Build
**Protocol ID:** `C2D.25A`  

---

### 1. Batería de Pruebas de Preparación

| Test ID | Criterio Evaluado | Resultado |
|---|---|:---:|
| PREBUILD-01 | Contrato `BuildRequestEntity` en `models.ts` | 🟢 PASS |
| PREBUILD-02 | Regla Firestore `/build_requests` | 🟢 PASS |
| PREBUILD-03 | Hard Stop en `buildEngineManager.js` | 🟢 PASS |
| PREBUILD-04 | Detección de ausencia de cliente Firebase en `google-services.json` | 🟢 PASS |
| PREBUILD-05 | Validación de sintaxis de Package Name en Gradle | 🟢 PASS |
| PREBUILD-06 | Preservación de ADR-018 (Track A intacto) | 🟢 PASS |
| PREBUILD-07 | Cero mutaciones en BD productiva | 🟢 PASS |
| PREBUILD-08 | Tenant 04 bloqueado y ausente | 🟢 PASS |
