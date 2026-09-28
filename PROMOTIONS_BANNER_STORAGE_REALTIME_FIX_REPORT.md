# BLUESYSTEM DELIVERY ENTERPRISE — REPORTE DE REPARACIÓN DE PROMOCIONES, STORAGE Y REALTIME SYNC

## 1. Problema Encontrado
Al intentar crear o subir una nueva imagen para un banner promocional desde el Panel Admin Web ([https://bluesystem-7c9af.web.app/](https://bluesystem-7c9af.web.app/)), el sistema fallaba con el siguiente error en consola:
```
POST https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o?name=banners%2F1786840205647_banner_fritoni.png 403 (Forbidden)
Firebase Storage: User does not have permission to access 'banners/...'. (storage/unauthorized)
```
Adicionalmente, las fechas de vigencia mostraban la leyenda `Ini: Invalid Date Fin: Invalid Date` en la tabla de banners.

---

## 2. Causa Raíz
1. **Reglas de Firebase Storage Incompletas (`storage.rules`):**
   El archivo `storage.rules` contenía coincidencia de reglas únicamente para `/products`, `/vouchers`, `/avatars` y `/merchant_applications_docs`. No existía una regla para la ruta `/banners/{fileName}`, por lo que la subida a `/banners/*` caía en el descarte por defecto:
   ```storage
   match /{allPaths=**} {
     allow read, write: if false;
   }
   ```
2. **Formato Inconsistente de Fechas (`promotions.js`):**
   La función `toLocaleDateString()` fallaba al recibir objetos `Timestamp` de Firestore o cadenas no ISO, resultando en `Invalid Date`.

---

## 3. Storage Rules Anteriores
```storage
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAppCheckVerified() {
      return request.auth != null && (request.auth.token.firebase.get("app_check", false) == true || request.auth.token.get("app_check", false) == true);
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // SIN REGLA PARA /banners/*
    
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 4. Storage Rules Corregidas
```storage
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAppCheckVerified() {
      return request.auth != null && (request.auth.token.firebase.get("app_check", false) == true || request.auth.token.get("app_check", false) == true);
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isPlatformAdmin() {
      return isAuthenticated() && (
        request.auth.token.get("role", "") in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "super_admin", "admin", "auditor", "support"] ||
        request.auth.token.get("admin", false) == true ||
        request.auth.token.get("isSuperAdmin", false) == true
      );
    }

    // ─── /banners/{fileName} ──────────────────────────────────────────────
    match /banners/{fileName} {
      allow read: if true;
      allow write: if isPlatformAdmin();
    }

    // ─── Denegar todo lo demás ──────────────────────────────────────────────
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 5. Firestore Rules Modificadas
No se requirieron modificaciones estructurales en `firestore.rules` debido a que la regla preexistente:
```firestore
match /banners/{bannerId} {
  allow read: if true;
  allow write: if isPlatformAdmin();
}
```
ya otorgaba los permisos correctos de lectura pública y escritura administrativa bajo EIAM v2.1.

---

## 6. Archivos Frontend Modificados

1. **[`storage.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/storage.rules):**
   - Agregada función helper `isPlatformAdmin()`.
   - Agregada regla de seguridad para `/banners/{fileName}` (lectura pública, escritura restringida a admins).

2. **[`panel-admin/public/js/services/storage.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/storage.js):**
   - Agregada validación de tipos MIME (`image/jpeg`, `image/png`, `image/webp`).
   - Agregada validación de tamaño máximo (5 MB).
   - Sanitización de nombres de archivos.
   - Manejo descriptivo de errores de Storage (`storage/unauthorized`, `storage/quota-exceeded`, etc.).

3. **[`panel-admin/public/js/dashboard/promotions.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/promotions.js):**
   - Agregada función `formatDateDisplay` para parseo seguro de fechas de Firestore y cadenas ISO.
   - Agregada función `formatForInputDateTime` para precarga precisa de fechas en formularios.
   - Agregado método `deleteBanner` para eliminación atómica en Firestore con limpieza asíncrona no bloqueante en Storage.
   - Mejorado el manejo de errores al crear/editar banners.

---

## 7. Flujo de Subida
```
1. Admin selecciona archivo de imagen en Panel Admin
2. storageService.uploadImage realiza validaciones (MIME type, max 5MB, safe filename)
3. Subida a Firebase Storage: /banners/{timestamp}_{safeFilename}
4. Obtención de URL pública vía getDownloadURL()
5. Creación/Actualización del documento en Firestore colección 'banners' (active = true)
6. Firebase Firestore dispara en tiempo real el Snapshot Listener
7. App Android recibe el evento inmediatamente y actualiza el carrusel en la interfaz
```

---

## 8. Flujo de Eliminación / Desactivación
- **Desactivación (`Desact.`):**
  - Panel Admin actualiza `isActive: false` en el documento Firestore.
  - Snapshot listener de Android recibe la actualización.
  - `SmartBannerEngine` en Android filtra automáticamente el banner inactivo.
  - La imagen se conserva en Storage para auditoría e historial.
- **Eliminación Definitiva (`Borrar`):**
  - Se elimina primero el documento en Firestore (garantizando actualización inmediata en Android sin referencias rotas).
  - Se remueve el archivo en Firebase Storage de forma asíncrona y tolerante a fallos.

---

## 9. Sincronización Realtime
El mecanismo existente de sincronización mediante `addSnapshotListener` en [FirebaseManager.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L689-L716) y filtrado en [SmartBannerEngine.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/engine/marketing/SmartBannerEngine.kt#L30) se mantuvo 100% intacto y funcional:
- **Sin polling.**
- **Sin necesidad de reiniciar o recargar la App Android.**
- **Sin requerir nuevo inicio de sesión.**

---

## 10. Pruebas Realizadas
- [x] Subida de banners con imágenes PNG/JPG a `/banners/*` en Storage (200 OK, `getDownloadURL` exitoso).
- [x] Creación y edición de banners desde Panel Admin Web.
- [x] Corrección visual de fechas (eliminando `Invalid Date`).
- [x] Verificación de recepción automática de banners en la App Android en tiempo real.
- [x] Desactivación instantánea y eliminación de banners reflejadas en la App Android.
- [x] Rechazo de subida para usuarios no administradores (`storage/unauthorized`).

---

## 11. Seguridad
- **Sin permisos globales permisivos:** No se usaron reglas `allow read, write: if true;` ni `if request.auth != null;`.
- **Integridad EIAM v2.1:** La autorización de escritura en Storage depende estrictamente de las Custom Claims del JWT (`isPlatformAdmin()`).
- **Lectura pública controlada:** Solamente la subcarpeta `/banners/*` permite lectura pública para el catálogo visual.

---

## 12. Despliegue
- Reglas de Storage desplegadas exitosamente a Firebase.
- Panel Admin Web desplegado en Firebase Hosting (`hosting:admin`).

---

## 13. Resultado Final
🟢 **REPARACIÓN EXITOSA Y CERTIFICADA.**
Los administradores pueden gestionar libremente los banners promocionales, las imágenes se suben sin errores de almacenamiento, y los usuarios de la App Android perciben los cambios de manera instantánea y transparente en tiempo real.
