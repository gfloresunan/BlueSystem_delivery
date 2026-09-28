# 06_E2E_TEST_MATRIX.md
## Matriz de Pruebas E2E y Verificación de Integración
**Protocolo:** BSD-COMMERCE-IDENTITY-GEO-FEATURED-CONSISTENCY-001  
**Fecha:** 28 de Agosto, 2026  
**Ambiente:** Enterprise Live  

---

### 1. Matriz de Casos de Prueba E2E

| ID Caso | Escenario de Prueba | Pasos Ejecutados | Resultado Esperado | Estatus |
| :--- | :--- | :--- | :--- | :--- |
| **TC-GEO-01** | Carga de Catálogo Geográfico | Abrir Admin Web y abrir modal de edición de comercio. | Dropdowns de Departamento y Municipio se pueblan con los 17 departamentos de Nicaragua. | 🟢 **PASS** |
| **TC-GEO-02** | Cascada Departamento → Municipio | Seleccionar Departamento "Masaya". | Dropdown de Municipio actualiza a "Masaya", "Nindirí", "Catarina", "Niquinohomo", etc. | 🟢 **PASS** |
| **TC-GEO-03** | Map Picker Interactivo | Hacer clic en "Seleccionar en Mapa", mover el pin y pulsar "Aplicar Ubicación". | Coordenadas `latitude` y `longitude` se actualizan en el formulario y se sincroniza el link a Google Maps. | 🟢 **PASS** |
| **TC-GEO-04** | Detección GPS | Pulsar botón "GPS". | Navegador consulta `navigator.geolocation` y completa latitud/longitud con 6 decimales de precisión. | 🟢 **PASS** |
| **TC-SSOT-01** | Edición Completa de Comercio | Guardar comercio con nuevo nombre, depto "Masaya", muni "Nindirí", lat `11.99` y lng `-86.12`. | Firestore `/businesses/{id}` persiste los datos; Read-Back Verification confirma coincidencia exacta sin perder campos. | 🟢 **PASS** |
| **TC-SSOT-02** | Edición Parcial No Destructiva | Modificar únicamente el nombre de un comercio existente con `merge: true`. | Solo cambia el nombre; `departmentId`, `municipalityId`, `latitude`, `longitude` y `isFeatured` se preservan intactos. | 🟢 **PASS** |
| **TC-FEAT-01** | Activar Destacado (⭐ DESTACADO) | Marcar `isFeatured: true` y guardar. | `/businesses/{id}` y `/users/{id}` se actualizan a `isFeatured: true`, apareciendo en el carrusel de la App Cliente. | 🟢 **PASS** |
| **TC-FEAT-02** | Desactivar Destacado (☆ NORMAL) | Desmarcar `isFeatured: false` y guardar o hacer clic en el botón de la tabla. | `/businesses/{id}` y `/users/{id}` se actualizan a `false`; trigger `onUserStoreWrite` NO reactiva el valor; read-back confirma `false`. | 🟢 **PASS** |
| **TC-FLEET-01** | Mismo Municipio (Elegible) | Comercio en `MANAGUA`, Courier en `MANAGUA`. | `FleetEligibilityEngine` declara `isEligible = true`; orden visible en pool de órdenes de Managua. | 🟢 **PASS** |
| **TC-FLEET-02** | Diferente Municipio (No Elegible) | Comercio en `CIUDAD_DARIO`, Courier en `MATAGALPA`. | `FleetEligibilityEngine` rechaza con `isEligible = false`; orden oculta para el courier de Matagalpa. | 🟢 **PASS** |
| **TC-ORD-01** | Estampado Autoritativo en Orden | Cliente crea pedido comercial desde la App. | `notifyNewOrder` en Cloud Functions consulta `/businesses/{id}` y estampa `businessMunicipalityId`, `businessDepartmentId`, etc. en `/orders/{orderId}`. | 🟢 **PASS** |
| **TC-COMP-01** | Compilación Cloud Functions | Ejecutar `npm --prefix functions run build`. | TypeScript compila con 0 errores (código de salida 0). | 🟢 **PASS** |

---

### 2. Evidencia de Ejecución de Pruebas Unitarias

- **Suite de Segmentación Operacional:** `com.example.courier.CityAndTenantOperationalSegmentationTest`
- **Resultados:**
  - `testCaso01_MismoTenant_MismoMunicipio_CiudadDario_Elegible` → 🟢 **PASSED**
  - `testCaso02_MismoTenant_MismoDepartamento_DiferenteMunicipio_CiudadDario_vs_Matagalpa_NO_Elegible` → 🟢 **PASSED**
  - `testCaso03_DiferenteTenant_MismoMunicipio_CiudadDario_NO_Elegible` → 🟢 **PASSED**
  - `testCaso04_MismoTenant_MismoMunicipio_DiferenteDireccion_Elegible` → 🟢 **PASSED**
- **Compilación TypeScript Backend:**
  - `npm --prefix functions run build` → `tsc` → 🟢 **EXIT CODE 0**
