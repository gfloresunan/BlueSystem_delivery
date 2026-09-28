# C2D.35.COURIER-FLEET-POOL-ROOT-CAUSE.md
**DIAGNÓSTICO OFICIAL DE CAUSA RAÍZ**

---

### ROOT CAUSE 1 (COURIER IDENTITY DE-HYDRATION)
- **CAUSA EXACTA**: El repartidor Henry Paz (`9QHYGkSa3nWiJ7KfPkccjjuIaYp2`) fue registrado antes del portal de onboarding territorial (`createdVia: "APP"`, 19-julio-2026). Sus documentos en `/users` y `/couriers` carecen de `operationalMunicipalityId`, `municipalityId`, `cityId` y `tenantId`. Al hidratar el perfil del repartidor en la App móvil, el municipio se resuelve como cadena vacía (`""`), lo que dispara la condición de aborto inmediato `if (normMuni.isBlank()) return` e impide suscribir el listener a la bolsa de pedidos (`listenerPool`).
- **FILE**: `app/src/main/java/com/example/FirebaseManager.kt`
- **FUNCTION/CLASS**: `obtenerFlujoPedidosCourier` -> `attachPoolListenerIfNeeded` y `listenerUserProfile`
- **LINE**: `FirebaseManager.kt:610` y `646-649`
- **OBSERVED BEHAVIOR**: La función de conexión al pool detecta municipio en blanco y aborta sin crear el SnapshotListener. En memoria, el filtro `courierEffectiveMuni.isNotBlank()` descarta cualquier oferta. La UI presenta `Disponibles (0)` permanentemente.
- **EXPECTED**: El repartidor debe contar con una autoridad territorial canónica (`operationalMunicipalityId = "MANAGUA"`, `tenantId = "ten_bluesystem_core"`), permitiendo que la App móvil se conecte a `orders.whereEqualTo("commercialMunicipalityId", "MANAGUA")`.

---

### ROOT CAUSE 2 (BRANCH / BUSINESS FIELD MISALIGNMENT EN BACKEND)
- **CAUSA EXACTA**: Los comercios y sucursales creados previamente (como FRITONI Boer `br_1786988052589`) almacenan la localidad bajo la clave `city: "Managua"`, sin poseer los campos normalizados `municipalityId` o `cityId`. En el backend Cloud Functions (`notifyNewOrder`), la extracción de `rawMuni` buscaba `municipalityId`, `municipio`, `municipality` y `cityId`, pero omitía `branchData.city` y `bizData.city`. En consecuencia, al normalizar en modo estricto sin fallback a Managua (`GEO-R.2`), el municipio del pedido se calculó como `""`.
- **FILE**: `functions/src/triggers/orders.ts`
- **FUNCTION/CLASS**: `notifyNewOrder`
- **LINE**: `orders.ts:133-134`
- **OBSERVED BEHAVIOR**: Los nuevos pedidos creados por comercios existentes quedan estampados con `commercialMunicipalityId: ""` en lugar de `"MANAGUA"`. Al estar vacío, no coinciden con la query del pool de ningún repartidor ni pueden ser difundidos por FCM.
- **EXPECTED**: `notifyNewOrder` debe extraer `city` y `ciudad` de la sucursal/comercio antes de invocar `normalizeGeoLocationStrict`, permitiendo estampar canónicamente `commercialMunicipalityId: "MANAGUA"`.

---

### WHY MANUAL ASSIGNMENT WORKS
En `firestore.rules` (línea 626), la regla de lectura de `/orders/{orderId}` incluye:
`currentUid() == resource.data.get("assignedCourierId", "") || currentUid() == resource.data.get("motorizadoId", "")`
Cuando Merchant Web asigna un pedido manualmente, inyecta directamente el UID de Henry en `assignedCourierId`. Este predicado de identidad directa se cumple de manera inmediata, **omitiendo la verificación de compatibilidad territorial** de la bolsa (`isCourierInSameTenantAndCity`). En Android, el listener dedicado `whereEqualTo("assignedCourierId", motorizadoId)` recibe la orden y la UI la despliega instantáneamente como `"¡PEDIDO ASIGNADO DIRECTAMENTE!"`.

### WHY FLEET POOL FAILS
El Fleet Pool requiere una cadena de 3 eslabones territoriales congruentes:
1. **Orden**: Requiere `commercialMunicipalityId == "MANAGUA"` (fallaba porque la sucursal tenía `city: "Managua"` y `notifyNewOrder` no leía `city`).
2. **Repartidor**: Requiere `operationalMunicipalityId == "MANAGUA"` (fallaba porque Henry es un usuario legacy sin municipio en Firestore).
3. **Firestore Security Rules**: Exigen `getCourierMunicipality() != ""` para autorizar consultas no asignadas de motorizados (rechazaba con `PERMISSION_DENIED` al no tener Henry municipio asignado).

---

### SCOPE
- **COURIER DATA SCOPE**: `LEGACY COURIERS` (Henry Paz y Juan Delivery carecen de municipio en BD; Pedro y Jinotega Flores sí lo poseen vía portal de onboarding).
- **ORDER PROVENANCE SCOPE**: `LEGACY COMMERCE DATA` (Comercios con `city` en vez de `cityId`/`municipalityId`).
- **SECURITY & QUERY SCOPE**: Correctamente diseñado en `GEO-R.2` (Fail-Closed estricto), pero bloqueó a repartidores y órdenes legacy que no habían sido provisionados territorialmente.
