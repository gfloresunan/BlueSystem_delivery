# FASE I — MATRIZ DE NORMALIZACIÓN PROPUESTA DE CAMPOS

**Regla Canónica de Lectura:** `effectiveName = nombre || name || displayName || username || "Sin nombre"`  
**Regla de Protección de Escritura:** NO sobrescribir valores existentes. Solo proponer llenado de `nombre` cuando esté ausente y `name` esté presente.  

---

## 1. Matriz de Propuestas de Normalización en Lectura/Datos

| UID | Campo Actual | Campo Canónico | Valor Actual | Valor Propuesto | Motivo | Riesgo | Modificable en Dry-Run | Aprobación Requerida |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :-: | :-: |
| `1768226535785` | `name` | `nombre` | `"Gerald José  Flores Gutiérrez"` | `"Gerald José  Flores Gutiérrez"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `1768243841542` | `name` | `nombre` | `"Kim"` | `"Kim"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `1768878763084` | `name` | `nombre` | `"Henry Paz"` | `"Henry Paz"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `1769029559449` | `name` | `nombre` | `"Chepita"` | `"Chepita"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1768621181014` | `name` | `nombre` | `"Zamir Ocornor"` | `"Zamir Ocornor"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769025804680` | `name` | `nombre` | `"Omar Altamirano"` | `"Omar Altamirano"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769029685895` | `name` | `nombre` | `"Richard centeno"` | `"Richard centeno"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769098535884` | `name` | `nombre` | `"Adolfo Urbina"` | `"Adolfo Urbina"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769190932815` | `name` | `nombre` | `"vicenta gutirrrez"` | `"vicenta gutirrrez"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769194803657` | `name` | `nombre` | `"adolfo  urbina"` | `"adolfo  urbina"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769465117595` | `name` | `nombre` | `"andy flores"` | `"andy flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769487243198` | `name` | `nombre` | `"Helo Jdkdk"` | `"Helo Jdkdk"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769620170492` | `name` | `nombre` | `"pepe flores"` | `"pepe flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769633352410` | `name` | `nombre` | `"Gggg Ghh"` | `"Gggg Ghh"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1769711990359` | `name` | `nombre` | `"venus flores"` | `"venus flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1770060240159` | `name` | `nombre` | `"Jairo  AldNa"` | `"Jairo  AldNa"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1771428610412` | `name` | `nombre` | `"Nelson Busto"` | `"Nelson Busto"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-1772377026947` | `name` | `nombre` | `"Luciana  Aldana"` | `"Luciana  Aldana"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-CL-1768337682525` | `name` | `nombre` | `"allan mendoza"` | `"allan mendoza"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-CL-1768342901776` | `name` | `nombre` | `"zoe flores"` | `"zoe flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-CL-1768365031013` | `name` | `nombre` | `"maria chavez"` | `"maria chavez"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `USR-CL-1768422839897` | `name` | `nombre` | `"denis flores"` | `"denis flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `admin_initial` | `name` | `nombre` | `"Admin Gerald Flores"` | `"Admin Gerald Flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cli_1768237897386` | `name` | `nombre` | `"Aldrich  Flores"` | `"Aldrich  Flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cli_1768240170991` | `name` | `nombre` | `"venus flores"` | `"venus flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cliente0002_2026` | `name` | `nombre` | `"Perla  Centeno"` | `"Perla  Centeno"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cliente0008_2026` | `name` | `nombre` | `"Junior Flores"` | `"Junior Flores"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cliente0009_2026` | `name` | `nombre` | `"hola oooo"` | `"hola oooo"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cliente0010_2026` | `name` | `nombre` | `"maria ramos"` | `"maria ramos"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cliente0011_2026` | `name` | `nombre` | `"sonia matamoros"` | `"sonia matamoros"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cliente1768275049139` | `name` | `nombre` | `"eva morales"` | `"eva morales"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |
| `user_cliente1768278375844` | `name` | `nombre` | `"xoci ruiz"` | `"xoci ruiz"` | Copy name to canonical nombre field | LOW | SÍ | SÍ |


---

## 2. Diagnóstico de Protección

* **Legacy POS (`user_cli_*`):** 9 documentos poseen la propiedad `name`. La FASE G ya los normalizó dinámicamente en lectura (`normalizeIdentity`). La propuesta de copiar `name` $\rightarrow$ `nombre` se mantiene congelada en estado **PENDING APPROVAL** (0 escrituras aplicadas).
