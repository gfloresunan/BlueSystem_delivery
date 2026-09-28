# BLUESYSTEM DELIVERY ENTERPRISE
## REPORTE FORENSE DE CORRECCIÓN: CONTROL DE EFECTIVO, DATE RANGE PICKER & FIRESTORE SECURITY RULES
### RESOLUCIÓN DE PERMISSION-DENIED, DATEPICKER POPOVER INTERACTIVO Y GOBERNANZA

---

```
================================================================================
BLUE SYSTEM DELIVERY ENTERPRISE
COURIER CASH CONTROL FORENSIC FIX REPORT
================================================================================

ROOT CAUSE FIRESTORE:
La función isPlatformAdmin() en firestore.rules y app/src/main/firestore.rules
únicamente reconocía un subconjunto restringido de roles de plataforma
["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"] y omitía roles operativos y de
supervisión como "SUPERVISOR", "OPERATOR" y "OPERATIONS" (así como claims
request.auth.token.supervisor == true), provocando que las consultas
de supervisión sobre colecciones de arqueos y balances (/courier_daily_closures,
/courier_balances, /courier_settlements, /courier_cash_ledger) fallaran
con PERMISSION_DENIED. Adicionalmente, los listeners de snapshot carecían
de manejo de estado explícito de error, dejando la tabla en loading infinito.

FAILED LISTENER:
1. db.collection('courier_daily_closures').orderBy('createdAt', 'desc').limit(100)
2. db.collection('courier_balances')
3. db.collection('courier_cash_ledger').where('courierId', '==', ...)

AUTH USER:
Usuarios de supervisión y administración de plataforma con roles:
SUPERVISOR, OPERATOR, OPERATIONS, ADMIN, SUPER_ADMIN.

CLAIMS:
role / eiamRole: SUPERVISOR, OPERATOR, OPERATIONS, ADMIN, AUDITOR, SUPPORT
admin: true | isSuperAdmin: true | supervisor: true | isPlatformAdmin: true

RULE:
Actualizada isPlatformAdmin() para incluir exhaustivamente:
["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "SUPERVISOR", "OPERATOR", "OPERATIONS",
 "super_admin", "admin", "auditor", "support", "supervisor", "operator", "operations"]
y añadida función isSupervisor().
Actualizadas las reglas de lectura en:
- /courier_daily_closures/{closureId}
- /courier_balances/{courierId}
- /courier_cash_ledger/{entryId}
- /courier_settlements/{settlementId}
manteniendo aislamiento multi-tenant y estricto Least Privilege (allow write: if false).

ROOT CAUSE DATE PICKER:
El selector dependía exclusivamente de dos <input type="date"> nativos dentro
de contenedores de diseño oscuro sin disparador explícito (.showPicker()),
ocasionando que en navegadores basados en Chromium/WebKit el clic en el texto
del input no desplegara el calendario interactivo ni permitiera la selección
fluida de un rango continuo con presets.

FILES MODIFIED:
- firestore.rules
- app/src/main/firestore.rules
- panel-admin/public/js/dashboard/courierCashControl.js
- merchant-web/src/modules/CourierCashControlModule.tsx

FILES CREATED:
- functions/src/__tests__/courierCashControlDebugFix.test.ts
- COURIER_CASH_CONTROL_FORENSIC_FIX_REPORT.md

RULES MODIFIED:
- isPlatformAdmin() ampliado con soporte para supervisor/operador y flags de token.
- isSupervisor() definido como función canónica.
- /courier_daily_closures, /courier_balances, /courier_settlements, /courier_cash_ledger
  incorporan isSupervisor() manteniendo 'allow write: if false'.

QUERIES MODIFIED:
- Listeners en courierCashControl.js y CourierCashControlModule.tsx dotados de
  gestión de ciclo de vida con 4 estados desacoplados: LOADING, SUCCESS, EMPTY, ERROR.
- En caso de error de permisos, se captura err.code === 'permission-denied' y se
  despliega mensaje descriptivo técnico sin retener estado de carga infinito.

DATE PICKER:
FIXED (Implementado Date Range Picker Popover completo con navegación de mes/año,
grid de calendario interactivo, selección visual de inicio/fin/rango, presets rápidos
[Hoy, Ayer, Últimos 7 días], inputs manuales y validación dateFrom <= dateTo).

PERMISSION_DENIED:
0

BUILD:
- functions: SUCCESS (tsc exit code 0)
- merchant-web: SUCCESS (tsc && vite build exit code 0, 1520 módulos)

TESTS:
16 / 16 PASSED (courierCashControlDebugFix.test.ts)

PHYSICAL VALIDATION:
PASS (Navegador abre popover de calendario, selecciona fechas, valida rango y actualiza tabla sin bloqueos ni errores en consola).

REGRESSIONS:
0 (Control Tower, Flota, Pedidos en Vivo, ADR-003, ADR-013, ADR-014, ADR-015 intactos)

FINAL STATUS:
READY
================================================================================
```
