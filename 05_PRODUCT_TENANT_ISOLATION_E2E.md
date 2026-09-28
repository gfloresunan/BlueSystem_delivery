# 05. Certificación de Aislamiento de Tenants (Tenant Isolation E2E)

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Estatus:** 🟢 PASADO / CERTIFICADO SOBERANO  

---

## 1. Reglas de Validación de Tenant Isolation

Cada consulta de productos ejecutada por el cliente Android DEBE filtrar estrictamente en la base de datos por `businessId == currentBusinessId`.  
Está estrictamente prohibido descargar productos globales de todos los comercios para luego filtrarlos mediante `.filter()` en memoria del teléfono.

---

## 2. Matriz de Prueba de Aislamiento por Comercio

| Comercio Consultado | ID Comercio (`businessId`) | Producto Esperado y Visible | Productos Prohibidos / Filtrados | Estatus |
| :--- | :--- | :--- | :--- | :--- |
| **FRITONI** | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | `Quezuda` (C$ 200) | `Plato Mixto Cerdo y Res`, `Mouse Gamer RGB` | 🟢 PASADO |
| **El Chanchito** | `bbb760d5-a8f3-4700-9a96-f58f11f345ac` | `Plato Mixto Cerdo y Res` (C$ 260) | `Quezuda`, `Mouse Gamer RGB` | 🟢 PASADO |
| **Variedades TECNOHOME** | `e7dc911e-e587-4be9-a741-7d9d9828011f` | `Mouse Gamer RGB Ergonómico` (C$ 450) | `Quezuda`, `Plato Mixto Cerdo y Res` | 🟢 PASADO |

---

## 3. Verificación Técnica en Código

En `ProductRepository.kt`, el listener Firestore está acotado directamente en el motor de base de datos:
```kotlin
firestore.collection("products")
    .whereEqualTo("businessId", businessId)
    .addSnapshotListener { snap, _ -> ... }
```

Garantiza cero contaminación cross-tenant entre comercios afiliados.
