# C2D25A — GAP ANALYSIS
## Matriz Forense de Brechas Pre-Build
**Protocol ID:** `C2D.25A`  

---

### 1. Matriz de Brechas Identificadas

| ID | Brecha / Gap | Severidad | Tipo | Impacto | Requerido Pre-Build | Acción Recomendada |
|---|---|:---:|---|:---:|:---:|---|
| **GAP-01** | `google-services.json` solo tiene 1 cliente (`com.aistudio.delivery.djweq`) | **P1** | Firebase | ALTO | SI (para whitelabel/fitoni) | Restringir el primer build a `coreDebug` o provisionar clientes en Firebase |
| **GAP-02** | `whitelabel` en `build.gradle.kts` no tiene lectura de `project.findProperty` | **P2** | Gradle | MEDIO | SI (para builds dinámicos) | Incorporar `val customAppId = project.findProperty(...) ?: ...` |
| **GAP-03** | Falta script orquestador local para invocar Gradle de forma desatendida | **P2** | Tooling | MEDIO | NO (para prueba manual) | Desarrollar runner seguro que capture logs sanitizados |
| **GAP-04** | Keystore de producción no está configurado en entorno de prueba | **P3** | Signing | BAJO | NO (primer build es debug) | Mantener `debugConfig` para el primer build controlado |
