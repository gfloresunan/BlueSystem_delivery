# C2D24 — IMPLEMENTATION PLAN
## Android Product Flavors & Multi-Brand Build Configuration Foundation
**Protocol ID:** `C2D.24`  
**Execution Class:** `CONTROLLED IMPLEMENTATION PROPOSAL / ARCHITECTURAL BASELINE`  
**Governance State:** `WAITING_FOR_HUMAN_DECISION`  

---

## 1. Alcance Propuesto para Futura Implementación (Post-Revisión Humana)

Si se autoriza formalmente en el futuro, los cambios en `app/build.gradle.kts` se limitarán exclusivamente a:

1. **Declaración de Dimensión de Flavors:**
   ```kotlin
   flavorDimensions += "commercialProfile"
   productFlavors {
       create("core") {
           dimension = "commercialProfile"
           applicationId = "com.aistudio.delivery.djweq"
           resValue("string", "app_name", "BlueSystem Delivery")
           manifestPlaceholders["app_name"] = "BlueSystem Delivery"
       }
       create("enterpriseFitoni") {
           dimension = "commercialProfile"
           applicationId = "com.fitoni.delivery"
           resValue("string", "app_name", "Fitoni Express")
           manifestPlaceholders["app_name"] = "Fitoni Express"
       }
       create("whitelabel") {
           dimension = "commercialProfile"
           applicationId = "com.bluesystem.delivery"
           resValue("string", "app_name", "Delivery WhiteLabel")
           manifestPlaceholders["app_name"] = "Delivery WhiteLabel"
       }
   }
   ```
2. **Estructura de SourceSets Aislada:**
   - `app/src/core/res/` (Iconos por defecto)
   - `app/src/enterpriseFitoni/res/` (Iconos de Fitoni)
   - `app/src/whitelabel/res/` (Iconos genéricos)
   - `app/src/main/` (100% de la lógica de código Kotlin/Compose compartida)

---

## 2. Invariantes Blindados y Límites
- **NO se ejecutarán builds en C2D.24:** Los builds pertenecen a C2D.25 (Build Engine).
- **NO se crearán árboles de código duplicados:** Cero forks.
- **Tenant 04:** Bloqueado y Ausente.
- **Production Mutation Guard:** 0 mutaciones en base de datos.
