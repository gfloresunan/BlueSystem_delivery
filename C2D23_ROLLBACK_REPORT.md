# C2D23 — ROLLBACK REPORT
## Procedimiento y Reversibilidad de Cambios
**Protocol ID:** `C2D.23`  

---

### 1. Procedimiento de Rollback Quirúrgico
1. **Frontend:** Eliminar `panel-admin/public/js/dashboard/appConfigManager.js`.
2. **Dashboard SPA:** Revertir la línea de importación en `dashboard.html` y la entrada del router/categoría en `dashboard.js`.
3. **Firestore Rules:** Revertir el bloque `/app_configs/{configId}` en `firestore.rules`.
4. **Base de Datos:** Cero afectación en datos vivos de tenants existentes.

### 2. Tiempo Estimado de Rollback
$< 1\text{ minuto}$, 100% reversible sin impacto en las operaciones en vivo de delivery.
