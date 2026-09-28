# PRODUCT WIZARD FIRESTORE PERSISTENCE SPECIFICATION
**BlueSystem Delivery Enterprise v2.1**

---

## 1. Mapeo en Firestore (`/products/{productId}`)

Los documentos creados o actualizados por el nuevo Wizard Enterprise se persisten en la colección inmutable `products`:

```json
{
  "id": "prod_88a1f2",
  "businessId": "biz_enterprise_01",
  "name": "Pizza Pepperoni XL Enterprise",
  "description": "Doble queso mozzarella y pepperoni premium",
  "shortDescription": "Doble queso mozzarella y pepperoni",
  "longDescription": "Pizza artesanal horneada en piedra de leña con masa madre",
  "price": 380.0,
  "originalPrice": 450.0,
  "estimatedCost": 120.0,
  "taxPercentage": 15.0,
  "categoryName": "Pizzas Especiales",
  "subCategoryName": "Artesanales",
  "status": "ACTIVE",
  "imageUrl": "https://firebasestorage.googleapis.com/v0/b/.../product_images/prod_88a1f2.jpg",
  "images": [
    "https://firebasestorage.googleapis.com/v0/b/.../product_images/prod_88a1f2.jpg"
  ],
  "preparationTimeMinutes": 20,
  "isPopular": true,
  "isVegetarian": false,
  "isSpicy": false,
  "isNew": true,
  "isTopSeller": true,
  "spicyLevel": 0,
  "tags": ["Pizza", "Popular", "Familiar"],
  "optionGroups": [
    {
      "id": "og_size",
      "name": "Seleccione el Tamaño",
      "type": "SINGLE_SELECTION",
      "isRequired": true,
      "minSelections": 1,
      "maxSelections": 1,
      "options": [
        { "id": "opt_mediana", "name": "Mediana 12\"", "price": 0.0, "isAvailable": true },
        { "id": "opt_familiar", "name": "Familiar 16\"", "price": 100.0, "isAvailable": true }
      ]
    },
    {
      "id": "og_extras",
      "name": "Extras Opcionales",
      "type": "MULTIPLE_SELECTION",
      "isRequired": false,
      "minSelections": 0,
      "maxSelections": 3,
      "options": [
        { "id": "opt_queso", "name": "Queso Extra", "price": 35.0, "isAvailable": true },
        { "id": "opt_orilla", "name": "Orilla de Queso", "price": 50.0, "isAvailable": true }
      ]
    }
  ],
  "stockQuantity": 50,
  "minStockAlert": 5,
  "autoHideOnZeroStock": true,
  "availabilityDays": [1, 2, 3, 4, 5, 6, 7],
  "createdAt": "2026-08-05T10:00:00Z",
  "updatedAt": "2026-08-05T10:30:00Z"
}
```
