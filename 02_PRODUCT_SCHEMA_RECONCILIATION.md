# 02. Reconciliación de Esquema de Productos — Firestore vs Android DTO

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Colección Firestore Auditada:** `/products`  

---

## 1. Matriz Real de Productos Auditados en Firestore

| Comercio | ID Documento Producto | `businessId` | Nombre Producto | Precio | `category` | `categoria` | `categoryName` | `active` | `isAvailable` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FRITONI** | `prod_dlRY2ZVUqPR2Fxoc3cazcOxxRJg2_1787017056830` | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | Quezuda | C$ 200.00 | Especialidades NICA | Especialidades NICA | *(No presente)* | `true` | `true` |
| **El Chanchito** | `prod_bbb760d5-a8f3-4700-9a96-f58f11f345ac_01` | `bbb760d5-a8f3-4700-9a96-f58f11f345ac` | Plato Mixto Cerdo y Res | C$ 260.00 | Carnes Asadas | Carnes Asadas | *(No presente)* | `true` | `true` |
| **Variedades TECNOHOME** | `prod_e7dc911e-e587-4be9-a741-7d9d9828011f_01` | `e7dc911e-e587-4be9-a741-7d9d9828011f` | Mouse Gamer RGB Ergonómico | C$ 450.00 | Accesorios & Periféricos | Accesorios & Periféricos | *(No presente)* | `true` | `true` |

---

## 2. Reconciliación de Nombres de Campos

El portal web `BlueSystem Merchant Portal Enterprise` guarda la categoría bajo la clave `category` y/o `categoria`.  
El modelo Kotlin `Product.kt` define el atributo `categoryName: String`.

### Cadena de Prioridad de Resolución (Fallback Determinístico)
Para garantizar que nunca se pierda una categoría ni se asigne una cadena vacía:

```text
categoryName (si no es blanco)
   └─► categoria (si no es blanco)
        └─► category (si no es blanco)
             └─► categoryId (si existe)
                  └─► "Menú Principal" (por defecto)
```

---

## 3. Preservación del Contrato EIAM e Identidad

- Los valores de `businessId` corresponden exactamente a los IDs de los documentos en `/businesses` y `/users`.
- No se han modificado ni alterado los documentos originales en Firestore.
- La reconciliación fue realizada 100% en la capa de adaptación del cliente Android (`ProductRepository.kt`).
