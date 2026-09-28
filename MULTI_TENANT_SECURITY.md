# MULTI_TENANT_SECURITY.md
# Seguridad Multi-Tenant — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Fuentes**: `FirebaseManager.kt`, `MerchantOrdersRepository.kt`, `DeliveryControlTowerRepository.kt`, `MerchantDashboardRepository.kt`, `ProductRepository.kt`

---

## 1. Mecanismo de Aislamiento de Tenant

### Mecanismo Actual: Query-Level Isolation

El sistema **no** utiliza Firebase Auth Custom Claims ni reglas de Firestore Security Rules visibles en el código. El aislamiento se implementa a nivel de **query del cliente** usando el UID del usuario autenticado como `businessId`.

---

## 2. Patrón de Aislamiento (Evidencia del Código)

### BusinessDashboardScreen — Pedidos del Comercio
**Archivo**: `BusinessDashboardScreen.kt:109-115`

```kotlin
val currentUid = FirebaseAuth.getInstance().currentUser?.uid ?: ""

db.collection("orders")
  .whereEqualTo("businessId", currentUid)
  .addSnapshotListener { ... }
```

### MerchantOrdersRepository — MOOC
**Archivo**: `MerchantOrdersRepository.kt:35`

```kotlin
db.collection("orders")
  .whereEqualTo("businessId", businessId)
```

### MerchantDashboardRepository — EOC
**Archivo**: `MerchantDashboardRepository.kt:33-39`

```kotlin
db.collection("orders")
  .whereEqualTo("businessId", businessId)

db.collection("orders")
  .whereEqualTo("businessId", businessId)
```

### DeliveryControlTowerRepository — DCT
**Archivo**: `DeliveryControlTowerRepository.kt:36`

```kotlin
db.collection("orders")
  .whereEqualTo("businessId", businessId)
```

### ProductRepository — Catálogo
**Archivo**: `ProductRepository.kt:35,58`

```kotlin
db.collection("products")
  .whereEqualTo("businessId", businessId)
```

---

## 3. ¿Garantiza el Sistema que Restaurante A No Vea Datos de Restaurante B?

### Respuesta: ⚠️ PARCIALMENTE

**A nivel de query en el cliente: ✅ Sí**, si el `businessId` que se pasa al query siempre proviene del UID del usuario autenticado (`FirebaseAuth.currentUser?.uid`).

**A nivel de Firestore Security Rules: ❓ No verificable desde el código Kotlin**. Las reglas de Firestore se configuran en la consola Firebase (archivo `firestore.rules`), que no está visible en el proyecto Android. No es posible confirmar si existen reglas server-side que validen `businessId == request.auth.uid`.

---

## 4. Diagrama de Aislamiento Actual

```
Comercio A (uid: "aaaaa")              Comercio B (uid: "bbbbb")
        │                                      │
        ▼                                      ▼
BusinessDashboard                      BusinessDashboard
currentUid = "aaaaa"                   currentUid = "bbbbb"
        │                                      │
        ▼                                      ▼
orders.where(businessId == "aaaaa")    orders.where(businessId == "bbbbb")
        │                                      │
        ▼                                      ▼
  [Solo pedidos de A]                    [Solo pedidos de B]
```

---

## 5. Vulnerabilidades Identificadas (Client-Side Only Isolation)

| Vulnerabilidad | Descripción | Riesgo |
|---|---|---|
| Sin Security Rules verificadas | El aislamiento depende solo del query del cliente | Alto |
| `businessId` pasado como parámetro | En `startDashboard(businessId)`, `startOrdersCenter(businessId)`, etc., el ID viene como parámetro de función. Si se pasa el ID incorrecto, se accedería a datos ajenos | Medio |
| Sin validación cruzada | No existe verificación de que el `businessId` pasado coincida con el UID del usuario autenticado en el ViewModel | Medio |
| Sin Firebase Custom Claims | No existen custom claims en el token JWT que validen tenant en server-side | Alto |

---

## 6. Puntos Positivos del Diseño Actual

| Aspecto | Descripción |
|---|---|
| `isPrivateAccessAllowed()` | `FirebaseManager.kt:17-25` bloquea todos los listeners privados si el usuario es guest o no está autenticado |
| `SessionManager.isGuest()` | Previene acceso a datos privados en modo invitado |
| Queries `whereEqualTo` | Al menos el filtro existe; no se hacen lecturas de toda la colección |
| AuditLogger + PermissionAuditLogger | Registra eventos de acceso denegado para trazabilidad |

---

## 7. Validación de branchId

Los pedidos incluyen `branchId` pero **no existe validación** de que el usuario autenticado tenga acceso a esa sucursal específica. El filtro solo aplica a `businessId`.

---

## 8. Recomendación de Auditoría

> ⚠️ **CRÍTICO**: Se debe verificar el archivo `firestore.rules` en la consola de Firebase para confirmar que existen reglas server-side que validen:
> ```
> allow read: if request.auth.uid == resource.data.businessId;
> allow write: if request.auth.uid == resource.data.businessId;
> ```
> Sin estas reglas, cualquier usuario autenticado podría modificar el query en el cliente y acceder a datos de otro comercio.
