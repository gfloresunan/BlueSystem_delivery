# C2D25A — HARDENING BACKLOG
## Backlog de Hardening Previo al Primer Build Controlado
**Protocol ID:** `C2D.25A`  
**Classification:** `YELLOW — HARDENING REQUIRED BEFORE BUILD`  

---

### 1. Elementos de Bloqueo y Mejoras Identificadas

#### [P1 Blockers]
- **ID:** `HARDEN-01`
  - **Problema:** `google-services.json` solo contiene el paquete `com.aistudio.delivery.djweq`.
  - **Evidencia:** [google-services.json](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/google-services.json#L7-L14).
  - **Riesgo:** Si se intenta compilar `enterpriseFitoni` o `whitelabel`, Google Services Plugin abortará la compilación.
  - **Acción Recomendada:** Para el primer build controlado, seleccionar exclusivamente el perfil `core` (`com.aistudio.delivery.djweq`) o provisionar los clientes en Firebase Console.

#### [P2 Improvements]
- **ID:** `HARDEN-02`
  - **Problema:** `whitelabel` en `app/build.gradle.kts` utiliza cadenas constantes.
  - **Evidencia:** [build.gradle.kts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/build.gradle.kts#L55-L62).
  - **Riesgo:** Imposibilidad de sobreescribir `applicationId` y `app_name` desde CLI sin editar el archivo.
  - **Acción Recomendada:** Habilitar `project.findProperty("customApplicationId")` en el flavor `whitelabel` en la siguiente fase de implementación.

---

### 2. Candidato Recomendado para el Primer Build Controlado
- **Flavor:** `core`
- **Variante:** `coreDebug`
- **Application ID:** `com.aistudio.delivery.djweq`
- **Tipo de Artefacto:** `APK`
- **Ambiente:** `DEVELOPMENT / STAGING`
- **Razón:** Es el único cliente completamente alineado con `google-services.json`, certificados SHA-1 y firma debug existente, garantizando cero fricciones en la primera verificación física de empaquetado.
