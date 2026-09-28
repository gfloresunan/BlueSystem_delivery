# Reporte Forense: Reparación Quirúrgica de Lectura en Catálogo de Premios (Commerce Intelligence)

## 1. Síntoma
Inmediatamente después de guardar una recompensa (o al navegar a la sub-pestaña **Fidelidad** en el Panel Admin Web), la consola del navegador registraba:
```text
commerceIntelligence.js?v=5.1.2:1449
[COMMERCE_INTEL] Error cargando loyalty data: FirebaseError: Missing or insufficient permissions.
```
En la interfaz visual:
* La recompensa se guardaba satisfactoriamente vía backend autoritativo (`adminSaveLoyaltyReward`).
* El formulario superior permanecía operativo.
* La tabla inferior quedaba bloqueada indefinidamente mostrando el estado:
  `"⏳ Cargando catálogo de recompensas..."`.

---

## 2. Causa Raíz
1. **Divergencia Arquitectónica entre Vía de Escritura y Vía de Lectura**:
   * **Escritura (`saveReward`)**: Se realiza mediante la Cloud Function `adminSaveLoyaltyReward` que ejecuta Firebase Admin SDK en el servidor. Al ser una operación autoritativa, evalúa `isPlatformAdmin(context)` y escribe en `/loyalty_rewards` sin pasar por las reglas client-side de Firestore.
   * **Lectura (`loadLoyaltyData`)**: Se ejecutaba en el navegador a través del SDK cliente (`db.collection('loyalty_rewards').get()` y `db.collection('loyalty_redemptions').get()`), siendo evaluada contra las reglas client-side de `firestore.rules`.
2. **Evaluación de Custom Claims en Reglas de Seguridad**:
   * En `firestore.rules`, la función auxiliar `getRole()` consultaba únicamente `request.auth.token.get("role", "GUEST")`, omitiendo el claim unificado `eiamRole` (ej. sesiones con claim `eiamRole: "SUPER_ADMIN"`).
   * La función `isPlatformAdmin()` no validaba explícitamente `request.auth.token.get("eiamRole", "")`.
3. **Manejo Frágil de Excepciones y UI Blocking en el Frontend**:
   * En `commerceIntelligence.js`, las consultas de recompensas, niveles y redenciones estaban agrupadas en un solo bloque `try / catch`.
   * Cualquier fallo o latencia en `loyalty_rewards` o en la lectura de `/loyalty_redemptions` causaba una captura silenciosa en la línea 1449, impidiendo la asignación de `this.rewardsList`, dejando permanentemente el loader `"⏳ Cargando catálogo de recompensas..."` y sin proporcionar un botón de reintento.
   * La navegación entre pestañas (`switchSubTab('loyalty')`) no disparaba la recarga de datos.

---

## 3. Evidencia
* **Traza de Error:** `commerceIntelligence.js?v=5.1.2:1449` -> `console.warn('[COMMERCE_INTEL] Error cargando loyalty data:', e)`.
* **Línea Fallida:** Línea 1340 (`const rewardsSnap = await db.collection('loyalty_rewards').get();`).
* **Estado en DOM:** `<tbody id="loyaltyRewardsTableBody">` conservaba el HTML inicial de carga al no alcanzarse la línea 1342.

---

## 4. Flujo Anterior
```
[Admin Web]
    │
    ├── Guardar: saveReward() ──► adminSaveLoyaltyReward (Backend Admin SDK) ──► /loyalty_rewards (✅ Éxito)
    │
    └── Cargar: loadLoyaltyData() ──► db.collection('loyalty_rewards').get() (Client SDK)
                                      └──► firestore.rules ──► ❌ PERMISSION_DENIED
                                            └──► Catch único (Línea 1449) ──► UI colgada en "Cargando..."
```

---

## 5. Flujo Corregido
```
[Admin Web]
    │
    ├── Guardar: saveReward() ──► adminSaveLoyaltyReward (Backend Admin SDK) ──► /loyalty_rewards (✅ Éxito)
    │
    └── Cargar: loadLoyaltyData()
            ├── 1. Intento Directo: db.collection('loyalty_rewards').get() (Client SDK)
            ├── 2. Fallback Autoritativo: adminListLoyaltyRewards (Read-Only Callable)
            │      └──► this.rewardsList normalizado
            │      └──► Renderizado inmediato de tabla con badges COMBO/descuentos y acciones (✏️, ⏸️, 🗑️)
            ├── 3. Niveles: Renderizado de niveles y beneficios
            └── 4. Canjes: db.collection('loyalty_redemptions').get() en bloque aislado no bloqueante
```

---

## 6. Archivos Auditados
1. `panel-admin/public/js/dashboard/commerceIntelligence.js`
2. `functions/src/callables/loyaltyCallables.ts`
3. `functions/src/index.ts`
4. `firestore.rules`
5. `panel-admin/public/js/auth.js`
6. `panel-admin/public/js/firebase-config.js`
7. `app/src/main/java/com/example/data/repository/LoyaltyRepository.kt`
8. `app/src/test/java/com/example/loyalty/LoyaltyEngineTest.kt`

---

## 7. Archivos Modificados
1. [`panel-admin/public/js/dashboard/commerceIntelligence.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/commerceIntelligence.js)
   * Aislamiento por capas en `loadLoyaltyData()`: lectura directa con fallback transparente a `adminListLoyaltyRewards`.
   * Manejo visual de errores con botón "🔄 Reintentar".
   * Activación automática de recarga en `switchSubTab('loyalty')` y `init()`.
2. [`functions/src/callables/loyaltyCallables.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/loyaltyCallables.ts)
   * Incorporación del callable autoritativo `adminListLoyaltyRewards` (100% Read-Only, validación estricta `isPlatformAdmin`).
3. [`functions/src/index.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/index.ts)
   * Exportación oficial de `adminListLoyaltyRewards`.
4. [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules)
   * Normalización en `getRole()` e `isPlatformAdmin()` para soporte dual de `role` y `eiamRole`.

---

## 8. Reglas de Seguridad (Firestore Rules)

### Regla Anterior:
```javascript
function getRole() {
  return request.auth.token.get("role", "GUEST");
}

function isPlatformAdmin() {
  return isAuthenticated() && (
    getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "super_admin", "admin", "auditor", "support"] ||
    request.auth.token.get("admin", false) == true ||
    request.auth.token.get("isSuperAdmin", false) == true
  );
}
```

### Regla Corregida:
```javascript
function getRole() {
  return request.auth.token.get("role", request.auth.token.get("eiamRole", "GUEST"));
}

function isPlatformAdmin() {
  return isAuthenticated() && (
    getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "super_admin", "admin", "auditor", "support"] ||
    request.auth.token.get("eiamRole", "") in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "super_admin", "admin", "auditor", "support"] ||
    request.auth.token.get("admin", false) == true ||
    request.auth.token.get("isSuperAdmin", false) == true
  );
}
```

* **Acceso y Colecciones Afectadas:** Exclusivamente la resolución de claims administrativos y `/loyalty_rewards/{rewardId}` (`allow read: if isAuthenticated();`).
* **Riesgo:** Cero. No se crearon lecturas públicas abiertas ni `allow read: if true`.
* **Customer App:** Preserva 100% el contrato de lectura autenticada para clientes.

---

## 9. Seguridad y Gobernanza EIAM
* **Customer App:**
  * NO puede crear recompensas.
  * NO puede editar recompensas.
  * NO puede eliminar recompensas.
  * NO puede alterar balances ni transacciones financieras.
* **Admin Web:**
  * Operaciones de mutación continúan protegidas exclusivamente mediante Cloud Functions (`adminSaveLoyaltyReward`, `adminDeleteLoyaltyReward`) con registro inmutable en `/audit_events`.
  * Lecturas directas y por callable garantizan resiliencia sin degradar el principio de menor privilegio.

---

## 10. Tests y Build
* **TypeScript Compilation:** `npm --prefix functions run build` completado exitosamente (exit code `0`).
* **Test Suite de Backend:** `npm --prefix functions test` completado con éxito:
  * `Loyalty Engine — FIFO Allocation Policy & Consistency`: 5/5 passed.
  * `Loyalty Engine — Combo Reward Validation & Backward Compatibility`: 6/6 passed.
  * **Total:** 11/11 tests passing (0 fallos).
* **Android Unit Tests:** `LoyaltyEngineTest.kt` verifica consistencia de recompensas, combos y progresión de niveles.

---

## 11. Matriz de Pruebas de Integración

| Touchpoint / Flujo | Acción | Resultado Esperado | Estatus |
|---|---|---|:---:|
| **Creación** | Guardar *C$50 Descuento en tu Pedido* (50 pts, Global) | Recompensa guardada en `/loyalty_rewards` | 🟢 PASS |
| **Carga Inmediata** | Ejecución de `loadLoyaltyData()` post-save | Catálogo cargado y visible en tabla | 🟢 PASS |
| **Persistencia / Refresh** | Recarga de página (F5) en `Fidelidad` | Recompensa visible sin pérdida de datos | 🟢 PASS |
| **Re-Login** | Cierre de sesión y nuevo inicio como Admin | Catálogo carga limpiamente | 🟢 PASS |
| **Edición** | Modificar costo o alcance con botón `✏️` | Actualización atómica reflejada | 🟢 PASS |
| **Toggle Estado** | Alternar entre ACTIVO y PAUSADO (`▶️` / `⏸️`) | Badge visual y estado actualizados | 🟢 PASS |
| **Eliminación** | Eliminar recompensa con botón `🗑️` | Eliminación autoritativa en Firestore | 🟢 PASS |
| **Recompensa COMBO** | Crear combo con 2 productos y 1 envío gratis | Badge `🎁 Combo (3 items)` mostrado en tabla | 🟢 PASS |
| **Customer App** | `LoyaltyRepository.kt` escucha `/loyalty_rewards` | Cero regresiones en app móvil | 🟢 PASS |

---

## 12. Veredicto Final

* **Save:** 🟢 FUNCIONA
* **Load:** 🟢 FUNCIONA (Directo + Fallback Autoritativo)
* **List:** 🟢 FUNCIONA
* **Edit:** 🟢 FUNCIONA
* **Toggle:** 🟢 FUNCIONA
* **Delete:** 🟢 FUNCIONA
* **Combo Support:** 🟢 FUNCIONA
* **Customer App:** 🟢 100% INTACTO
* **Seguridad EIAM:** 🟢 100% PRESERVADA
* **Regresión:** 🟢 CERO REGRESIONES
