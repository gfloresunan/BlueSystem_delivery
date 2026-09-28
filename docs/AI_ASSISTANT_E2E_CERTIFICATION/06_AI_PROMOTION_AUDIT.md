# 06. AI Promotion & Discount SSOT Audit

## Protocolo: BSD-AI-ASSISTANT-E2E-CERTIFICATION-001

### 1. Principio de Fuente Única de Verdad (SSOT)
$$\text{CustomerHome Discounts} \equiv \text{BlueSystem AI Discounts}$$

Tanto `CustomerHomeScreen` (mediante `FirebaseManager.listenToDiscountedProducts()`) como `CustomerAI` (mediante `EnterpriseSearchEngine.searchCatalog()`) consumen y evalúan exactamente la misma regla de negocio canónica:
$$\text{isDiscounted} \iff \text{status} == \text{ACTIVE} \land \neg\text{isHidden} \land (\text{hasDiscount} \lor (\text{originalPrice} > \text{price}))$$

### 2. Comparación Canónica

| Parámetro | Customer Home (Carrusel Promos) | BlueSystem AI (*"productos con descuento"*) | Coincidencia |
| :--- | :--- | :--- | :---: |
| **Fuente de Datos** | Colección `/products` de Firestore | Colección `/products` de Firestore | 🟢 **100%** |
| **Criterio de Descuento** | `hasDiscount \|\| originalPrice > price` | `hasDiscount \|\| originalPrice > price` | 🟢 **100%** |
| **Precio Nominal** | `product.price` | `product.price` | 🟢 **100%** |
| **Precio Anterior** | `product.originalPrice` | `product.originalPrice` | 🟢 **100%** |
| **Badge de Descuento** | `-${discountPercentage}%` | `-${discountPercentage}%` | 🟢 **100%** |
| **Imagen** | `product.getMainImage()` | `product.getMainImage()` | 🟢 **100%** |

### 3. Veredicto
- **Resultado:** 🟢 **CERTIFIED (100% SSOT Match)**
