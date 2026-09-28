# BSD-ACT21-BRAND-TENANT-ISOLATION
## Aislamiento Multi-Tenant y Vinculación Determinística Marca ↔ Tenant
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Garantías de Aislamiento
- **Clave Foránea Obligatoria:** Toda entidad en `/brands/{brandId}` incluye de manera indexada e indivisible el campo `tenantId`.
- **Prohibición de Cross-Tenant Leakage:** Una marca no puede coexistir sin pertenecer a un Tenant reconocido.
- **Tenant Principal (Primary Brand):** Los Tenants pueden referenciar su marca principal vía `primaryBrandId`, garantizando que la resolución visual de cada comercio o ciudad mantenga una fuente única de verdad.

### 2. Estado de Tenants Operativos
- `ten-live-commercial-01`: Intacto.
- `ten-live-commercial-02`: Intacto.
- `ten-live-commercial-03`: Intacto.
- `Tenant 04`: **ESTRICTAMENTE BLOQUEADO / AUSENTE**.
