# C2D25B — GAP-01 FIREBASE REPORT
## Auditoría y Delimitación de Clientes Firebase
**Protocol ID:** `BSD-C2D25B-BUILD-HARDENING-FIRST-BUILD-READINESS-001`  

---

### 1. Estado de Mapeo en `google-services.json`

| Flavor | Application ID / Package | Registrado en Firebase | Estado para Primer Build |
|---|---|:---:|:---:|
| `core` | `com.aistudio.delivery.djweq` | 🟢 SI | 🟢 **AUTORIZABLE (First Build Candidate)** |
| `enterpriseFitoni` | `com.fitoni.delivery` | ❌ NO | 🔒 **BLOQUEADO (Requiere acción humana externa)** |
| `whitelabel` | `com.bluesystem.delivery` | ❌ NO | 🔒 **BLOQUEADO (Requiere acción humana externa)** |

### 2. Acción Humana Externa Futura (Fuera de Scope de C2D.25B)
Para compilar en el futuro variantes sobre `com.fitoni.delivery` o `com.bluesystem.delivery`, un administrador deberá registrar dichos Application IDs en la consola de Firebase (`bluesystem-7c9af`) y descargar el `google-services.json` actualizado. Para el primer build técnico, esto **no es un bloqueante** ya que se utilizará `coreDebug`.
