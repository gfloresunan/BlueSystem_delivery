# BLUE SYSTEM DELIVERY ENTERPRISE
## AUDITORÍA FORENSE ARQUITECTÓNICA DEL MÓDULO ANDROID (FASE 11 & FASE 16)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO AUDITORÍA:** READ-ONLY / ZERO MODIFICATION / ZERO DEPLOY  

---

### 1. EVALUACIÓN DE CONOCIMIENTO DE LA JERARQUÍA EN ANDROID

| Pregunta Audita | Dictamen Técnico | Evidencia de Código |
| :--- | :--- | :--- |
| **1. ¿Android conoce `orgId`?** | 🔴 **NO OPERACIONAL**. Existe la clase `com.example.eiam.domain.model.Organization`, pero los repositorios de Pedidos, Catálogo, Carrito y Sincronización lo ignoran por completo. | [Organization.kt:L8](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/eiam/domain/model/Organization.kt#L8)<br>[FirebaseManager.kt:L651](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L651) |
| **2. ¿Android conoce `businessId`?** | ✅ **VERIFIED**. Toda la arquitectura Android gravita exclusivamente alrededor de `businessId`. | [Product.kt:L259](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/Product.kt)<br>[Order.kt:L247](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/order/Order.kt) |
| **3. ¿Android conoce `branchId`?** | 🔴 **NO OPERACIONAL**. No se incluye en los modelos de Pedido u Orden de Compra ni en la selección de sucursal del cliente. | [Order.kt:L247](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/order/Order.kt) |
| **4. ¿Android persiste estos IDs?** | 🟡 **PARCIAL**. Solo persiste `businessId` en SQLite (`PendingActionEntity`, `OfflineOrderEntity`). No guarda `orgId` ni `branchId`. | [OfflineOrderEntity.kt:L35](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/data/local/entity/OfflineOrderEntity.kt) |
| **5. ¿Android los obtiene del JWT?** | 🔴 **NO**. Android lee roles y datos de usuario directamente desde el documento Firestore `/users/{uid}`, ignorando las Custom Claims JWT (`orgId`, `branchId`). | [FirebaseManager.kt:L583](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L583) |
| **6. ¿Android los obtiene de Firestore?** | SÍ. Obtiene `businessId` desde los documentos consultados en Firestore. | [BusinessRepository.kt:L55](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/data/repository/BusinessRepository.kt#L55) |
| **7. ¿Android filtra por `businessId`?** | SÍ. Filtra consultas de productos y pedidos agregando `.whereEqualTo("businessId", businessId)`. | [FirebaseManager.kt:L653](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L653) |
| **8. ¿Android filtra por `branchId` o `orgId`?** | 🔴 **NO**. Las consultas de Android no incluyen cláusulas `.whereEqualTo("orgId", ...)` ni `.whereEqualTo("branchId", ...)`. | [FirebaseManager.kt:L653](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L653) |
| **9. ¿La seguridad depende del filtro Android o de Rules?** | Depende 100% de Firestore Security Rules, ya que la app Android solo maneja `BusinessContext`. | [firestore.rules:L175](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L175) |

---

### 2. AUDITORÍA FASE 16: OFFLINE SYNC Y SYNC ENGINE

#### Arquitectura de Persistencia Local (Room SQLite)
- **Entidades Auditadas:**
  - `OfflineOrderEntity`: contiene `id`, `businessId`, `payloadJson`, `timestamp`, `syncStatus`.
  - `PendingActionEntity`: contiene `id`, `actionType`, `businessId`, `payloadJson`, `createdAt`.

#### Evaluación de Seguridad Offline
1. **Conservación de IDs Jerárquicos en Cola Offline:**
   - `businessId`: ✅ SE CONSERVA.
   - `orgId`: 🔴 **NO SE ALMACENA**. Se pierde en el origen offline.
   - `branchId`: 🔴 **NO SE ALMACENA**. Se pierde en el origen offline.
2. **Riesgo de Contaminación Cross-Tenant en Reconexión:**
   - Si un usuario crea una acción offline y la sesión de usuario cambia antes de la reconexión, `SyncWorker` procesa las acciones pendientes utilizando las credenciales activas sin validar que el `orgId` coincida.
3. **Mecanismo de Sincronización:**
   - `SyncEngine.kt` reintenta las peticiones hacia Firestore llamando a `db.collection("orders").add(...)`. Como las órdenes creadas en Android carecen de `orgId`, la sincronización offline NO propaga la jerarquía `Organization`.

---

### 3. DICTAMEN ARQUITECTÓNICO DE ANDROID

```text
ANDROID MULTI-TENANT ARCHITECTURE: LEVEL 1 (BUSINESS-ONLY)
Organization Context: NOT IMPLEMENTED IN OPERATION
Branch Context: NOT IMPLEMENTED IN OPERATION
Business Context: FULLY IMPLEMENTED
```
