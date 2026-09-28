# C2D24 — FLAVOR ARCHITECTURE ANALYSIS
## Análisis de Alternativas Arquitectónicas para Product Flavors
**Protocol ID:** `C2D.24`  

---

### 1. Evaluación de Modelos de Flavors

#### Alternativa A: Un Flavor por Tenant (Antipatrón: Combinatorial Explosion)
- `tenant01Debug`, `tenant01Release`, `tenant02Debug`, `tenant02Release`, `tenant03Debug`, etc.
- **Veredicto:** 🔴 **RECHAZADO**. No escala; acopla el código Gradle a la base de clientes y requeriría editar `build.gradle.kts` cada vez que se cree un nuevo Tenant.

#### Alternativa B: Un Flavor por Marca Comercial (`brand = flavor`)
- `bluesystemDebug`, `fitoniDebug`, `clientBRelease`, etc.
- **Veredicto:** 🟡 **VIABLE PERO RESTRINGIDO A FLAVORS CANÓNICOS**. Útil únicamente para marcas principales predeterminadas del Core.

#### Alternativa C (Recomendada): Modelo Híbrido "Commercial Profile & Dynamic Build Profile"
- **Dimensión de Flavor:** `flavorDimensions += "commercialProfile"`
- **Flavors Base:**
  1. `core` (Flavor por defecto / Marketplace / BlueSystem Core): `applicationId = "com.aistudio.delivery.djweq"`
  2. `whitelabel` (Flavor genérico parametrizable para builds autónomos): `applicationId = (inyectado o configurado)`
  3. `enterpriseFitoni` (Flavor de referencia para Tenant 01 / Fitoni Express): `applicationId = "com.fitoni.delivery"`
- **Veredicto:** 🟢 **APROBADO (RECOMENDADO)**. Mantiene el conteo de variantes bajo control (3 flavors $\times$ 2 buildTypes = 6 variantes), soporta compilaciones multi-marca sin acoplamiento masivo y es 100% compatible con el futuro Android Build Engine.
