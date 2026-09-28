# C2D25D — MULTI-BRAND READINESS REPORT
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

---

### 1. Evaluación de Capacidades Multi-Marca

| Dimensión | Capacidad Actual | Brecha / Requisito | Estado |
|---|---|---|---|
| **Resolución de Marca** | `BrandEntity` con metadatos de logo, colores y nombre | Ninguna | 🟢 READY |
| **Configuración de App** | `AppConfigEntity` vinculada a Tenant y Brand | Ninguna | 🟢 READY |
| **Parámetros de Build** | `BuildRequestEntity` con Flavor, Variant y BuildNumber | Ninguna | 🟢 READY |
| **Inyección de App ID** | Inyección vía `-PcustomApplicationId` | Requiere sincronización con Firebase | 🟡 CONDITIONAL |
| **Inyección de App Name** | Inyección vía `-PcustomAppName` | Totalmente soportada en Gradle | 🟢 READY |
| **Inyección de Assets** | Recursos estáticos en `app/src/main/res/` | Requiere generador de mipmaps para ícono/splash | 🟡 HARDENING |
| **Mapeo Firebase** | Un solo package registrado (`com.aistudio.delivery.djweq`) | Requiere registrar `com.fitoni.delivery` o nuevo ID | 🔴 BLOCKER (P0/P1) |

---

### 2. Diagnóstico de Preparación
La fábrica está conceptualmente lista para multi-marca sin crear forks de código, pero requiere completar el aprovisionamiento del identificador de aplicación en Firebase y la canalización automatizada de assets de launcher antes de autorizar la compilación física de un segundo producto.
