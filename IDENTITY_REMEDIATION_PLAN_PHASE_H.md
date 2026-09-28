# FASE H — PLAN ESTRATÉGICO DE SANEAMIENTO Y REMEDIACIÓN DE IDENTIDADES

**Fase:** FASE H — Plan de Saneamiento (Propuesta Teórica sin Ejecución)  
**Proyecto:** BlueSystem Enterprise v2.2 / Delivery Platform  

---

## 1. Niveles del Plan de Remediación

### PLAN A — Correcciones de Lectura y UI (Completado en FASE G)
* Normalización en tiempo de lectura mediante `normalizeIdentity()`.
* Remoción de `.orderBy('nombre')` en el Panel Admin Web.
* Presentación de badges visuales (`Legacy / POS`, `Perfil Incompleto`, `Posible Duplicado`).

### PLAN B — Normalización Segura de Datos (Propuesta para FASE I)
* **Dry-run previo obligatorio.**
* Copiar propiedad `name` a `nombre` únicamente en documentos donde `nombre` esté ausente para resolver la inconsistencia a nivel de base de datos.
* Completar campos faltantes en perfiles de cliente activos mediante formularios de resincronización.

### PLAN C — Vinculación Controlada de Cuentas (Propuesta para FASE I)
* Vincular lógicamente perfiles POS Legacy (`user_cli_*`) con sus correspondientes cuentas en la App Móvil sin alterar los UIDs originales ni borrar documentos.

### PLAN D — Archivado de Identidades Inactivas (Propuesta para FASE J)
* Transferir identidades sin actividad operativa ni credenciales Auth a una colección estática `/users_archive` para conservar el historial auditor sin saturar las consultas en vivo.

### PLAN E — Eliminación Definitiva de Datos de Prueba (Propuesta para FASE J)
* Aplicable únicamente a perfiles de prueba sintéticos que cumplan el 100% de las 10 precondiciones de seguridad.

---

## 2. Precondiciones de Seguridad Obligatorias para Eliminación Futura (PLAN E)

Para que una identidad pueda considerarse apta para eliminación en una fase posterior, debe cumplir **simultáneamente las 10 precondiciones**:

1. **Auth Verification:** Sin registro activo en Firebase Authentication o estado eliminado verificado.
2. **No Business Ownership:** Sin propiedad ni vinculación en `/businesses`.
3. **No Branch Ownership:** Sin vinculación en `/branches`.
4. **No Membership:** Sin registro activo en `/memberships`.
5. **No Active Devices:** Sin dispositivos registrados en `/user_devices`.
6. **No Orders Activity:** Total de pedidos en `/orders` igual a 0.
7. **No Deliveries Activity:** Total de entregas en `/deliveries` igual a 0.
8. **No Payments / Sales Activity:** Total de transacciones financieras en `/payments` y `/sales` igual a 0.
9. **No Audit Logs:** Sin registros de auditoría ni eventos de seguridad en `/audit_events`.
10. **Human Approval:** Aprobación manual explícita del administrador principal.
