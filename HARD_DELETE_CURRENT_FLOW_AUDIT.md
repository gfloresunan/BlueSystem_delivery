# Auditoría Forense de la Implementación Actual: Desaprovisionamiento y Eliminación de Comercios

**Proyecto:** BlueSystem Delivery Enterprise (`bluesystem-7c9af`)  
**Fecha:** 16 de Agosto, 2026  
**Fase:** FASE G — Auditoría de Lectura previa a la implementación de Eliminación Definitiva (Hard Delete)

---

## 1. Archivos Frontend Involucrados
* [`panel-admin/public/js/dashboard/liveRestaurants.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/liveRestaurants.js#L847-L852)
* [`panel-admin/public/js/dashboard/governanceCenter.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js#L747-L772)
* [`panel-admin/public/js/services/governanceService.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L487-L534)

---

## 2. Funciones Exactas
1. `liveRestaurantsModule.deprovisionStore(storeId, mode)`:
   Invocada por los botones del modal `[Desactivar Solo]` (`mode: 'DEACTIVATE'`) y `[Eliminar Definitivamente]` (`mode: 'DELETE'`).
2. `governanceCenterModule.deleteBusiness(businessId)`:
   Invocada desde el botón 🗑️ de la tabla de comercios en Governance Center. Muestra confirmación e invoca `governanceService.deleteBusiness`.
3. `governanceService.deleteBusiness(businessId, adminUid)`:
   Intenta llamar a la Cloud Function `deprovisionTenant({ businessId, mode: 'DELETE' })` y, si esta falla, ejecuta un `batch` en Firestore para hacer Soft Delete.

---

## 3. Parámetros Enviados al Backend
```json
{
  "businessId": "ID_DEL_COMERCIO",
  "mode": "DELETE", // o "DEACTIVATE"
  "reason": "Acción administrativa desde Governance Center"
}
```

---

## 4. Cloud Function Utilizada
* **Nombre:** `deprovisionTenant`
* **Ubicación Backend:** [`functions/src/callables/admin.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts#L494) (exportada en [`functions/src/index.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/index.ts#L67)).
* **Tipo:** Callable HTTPS Function protegida con verificación de contexto y rol (`admin`, `super_admin`).

---

## 5. Resultado Real de la Cloud Function
Al recibir `mode: 'DELETE'`, la Cloud Function `deprovisionTenant` **NO** ejecuta un borrado físico `delete()`. En su lugar ejecuta una actualización `update()` ([admin.ts:L638-647](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts#L638-L647)):
```typescript
businessDocRef.update({
  status: "DELETED",
  lifecycleStatus: "DEPROVISIONED",
  isDeleted: true,
  active: false,
  isActive: false,
  deletedAt: serverTimestamp,
  updatedAt: serverTimestamp,
});
```
El documento en `/businesses/{businessId}` **continúa existiendo en Firestore**.

---

## 6. Fallback Utilizado en el Frontend
Si la invocación a `deprovisionTenant` falla (por ejemplo, en entorno offline o red no disponible), `governanceService.js` (L497-533) captura el error silenciosamente y realiza un `batch.set(bizRef, { status: 'DELETED', lifecycleStatus: 'DELETED', active: false }, { merge: true })`.
* **Diagnóstico Root Cause:** Se convierte silenciosamente una solicitud de "Eliminar Definitivamente" en un Soft Delete.

---

## 7. Mutaciones Firestore Realizadas en `/businesses`
* `status = "DELETED"`
* `lifecycleStatus = "DEPROVISIONED"` (o `"DELETED"`)
* `isDeleted = true`
* `active = false`
* `isActive = false`
* `deletedAt = serverTimestamp()`

---

## 8. Qué Ocurre con las Sucursales (`/branches`)
Las sucursales asociadas en `/branches` se actualizan mediante `.update({ isDeleted: true, active: false, status: "DELETED" })`. Ningún documento de sucursal es eliminado físicamente de Firestore.

---

## 9. Qué Ocurre con las Solicitudes (`/merchant_applications`)
La solicitud en `/merchant_applications` permanece en estado `ONBOARDING` o `APPROVED` sin ser alterada.

---

## 10. Qué Ocurre con las Organizaciones (`/organizations`)
La organización asociada en `/organizations` permanece intacta.

---

## 11. Qué Ocurre con Usuarios / Membresías (`/membership`, `/employees`, `/users`)
* `/membership` y `/employees`: Se marcan como `status = "TERMINATED"`, `isDeleted = true`.
* Firebase Auth: Se deshabilita el usuario (`disabled: true`).
* El documento en la colección `/users/{userId}` **NO** es eliminado de Firestore.

---

## 12. Qué Ocurre con Firebase Storage
Los archivos multimedia (logo, banner, imágenes de producto) conservan sus archivos en los buckets de Firebase Storage sin ser alterados ni eliminados.

---

## 13. Qué Ocurre con la App Android
Actualmente la App Android recibe una mutación de tipo `MODIFIED` en su listener `addSnapshotListener`, donde `active: false` o `status: "DELETED"` causa que el repositorio lo filtre de la lista visible.
Cuando se implemente un **HARD DELETE** real (`deleteDoc`), Firestore emitirá un evento `DocumentChange.Type.REMOVED`, y el repositorio Android debe manejar explícitamente dicho evento para remover de inmediato el objeto del `StateFlow` y la UI.

---

## 🛑 CONCLUSIÓN DE LA AUDITORÍA DE LECTURA

Actualmente **"Eliminar Definitivamente"** realiza exactamente el mismo efecto que **"Desactivar Solo"** a nivel de existencia en base de datos: deja el documento con `active = false` y `status = "DELETED"`.

Para solucionar esto de manera limpia y definitiva sin fallbacks engañosos:
1. **Separar explícitamente las APIs en Backend:**
   - `mode: "DEACTIVATE"` (o `desactivarComercio`): Conserva el documento, fija `active: false`, `lifecycleStatus: "INACTIVE"`.
   - `mode: "HARD_DELETE"` (o `hardDeleteBusiness`): Ejecuta borrado físico real `delete()` sobre `/businesses/{businessId}` y sus sucursales operativas exclusivas en `/branches`, previa verificación de dependencias y sin fallback silencioso a Soft Delete.
2. **Registro Inmutable en Audit Logs:** Guardar el evento en `/audit_events` con `eventType: "BUSINESS_HARD_DELETE"` independientemente de la eliminación del documento en `/businesses`.
3. **Confirmación Estricta en UI:** Requerir la escritura exacta del nombre del comercio para la eliminación definitiva.
4. **Respuesta Realtime en Android:** Asegurar que el listener Android procese la remoción `REMOVED` al ser eliminado el documento en Firestore.
