# 04_FEATURED_SSOT_FIX.md
## Corrección Quirúrgica: Single Source of Truth (SSOT) para Comercios Destacados
**Protocolo:** BSD-COMMERCE-IDENTITY-GEO-FEATURED-CONSISTENCY-001  
**Fecha:** 28 de Agosto, 2026  
**Atributo Canónico:** `isFeatured: boolean`  
**Colección de Verdad:** `/businesses/{businessId}`  

---

### 1. Diagnóstico del Defecto Resuelto
Anteriormente, al alternar un comercio como no destacado (`isFeatured = false`), el documento en `/businesses` volvía a revertirse a `true`. La auditoría demostró la siguiente secuencia de eventos:
1. `liveRestaurants.js` llamaba a `commerceSyncService.saveStoreAtomic` o `toggleStoreFeaturedAtomic`.
2. El servicio persistía `isFeatured: false` en `/businesses`.
3. Pero en el documento legacy `/users/{id}`, el campo `isFeatured` o `destacado` no se actualizaba o se omitía.
4. Cualquier mutación en `/users/{id}` disparaba la Cloud Function `onUserStoreWrite` en `businessProjection.ts`.
5. En `businessProjection.ts`, la línea `const isFeatured = data.isFeatured === true || data.destacado === true;` leía el valor obsoleto de `/users/{id}` (`destacado: true`) y sobreescribía `/businesses/{id}` con `isFeatured: true`.

---

### 2. Implementación de la Solución Quirúrgica

#### A. En `businessProjection.ts` (Cloud Functions)
Se eliminó la resurrección por `destacado: true`. La función ahora evalúa con precedencia estricta el booleano `isFeatured`:
```typescript
const isFeatured = data.isFeatured !== undefined
  ? Boolean(data.isFeatured)
  : (data.featured !== undefined ? Boolean(data.featured) : (data.destacado === true));
```

#### B. En `commerceSyncService.js` (Admin Web Service)
1. **Sincronización Bidireccional Atómica:** `saveStoreAtomic` y `toggleStoreFeaturedAtomic` actualizan en un único `WriteBatch` atómico tanto `/businesses/{storeId}` como `/users/{storeId}` (si este último existe como legacy):
```javascript
toggleStoreFeaturedAtomic: async (storeId, newFeaturedState) => {
    const isFeaturedBool = Boolean(newFeaturedState);
    const batch = db.batch();

    const businessRef = db.collection('businesses').doc(storeId);
    batch.set(businessRef, {
        isFeatured: isFeaturedBool,
        featured: isFeaturedBool,
        destacado: isFeaturedBool,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const userRef = db.collection('users').doc(storeId);
    const userDoc = await userRef.get().catch(() => null);
    if (userDoc && userDoc.exists) {
        batch.set(userRef, {
            isFeatured: isFeaturedBool,
            featured: isFeaturedBool,
            destacado: isFeaturedBool,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    await batch.commit();
    return { success: true, storeId, isFeatured: isFeaturedBool };
}
```

2. **Corrección de ReferenceError:** Se eliminó la referencia no definida a `existingStore` en la línea 61.

#### C. En `liveRestaurants.js` (Admin Web UI)
1. **Read-Back Verification Inmediata:** Tras cada guardado (`saveStore`) o toggle (`toggleFeaturedState`), el cliente consulta directamente Firestore con `db.collection('businesses').doc(storeId).get()`, valida que el valor retornado sea idéntico al solicitado y emite el log forense `[BUSINESS_FEATURED]`.
2. **Telemetría Forense:** Emisión de logs con trazabilidad de origen (`source=AdminWeb_liveRestaurants`, `requested`, `persisted`).

---

### 3. Verificación de No Regresión
- Al marcar un comercio como `Destacado` (`isFeatured: true`), se persiste en `/businesses` y `/users`, manteniéndose en `true` y visible en el carrusel de la App Cliente.
- Al desmarcar un comercio (`isFeatured: false`), se persiste en `/businesses` y `/users`, pasando el test de Read-Back Verification y desapareciendo del carrusel de Destacados de inmediato sin reinfección.
