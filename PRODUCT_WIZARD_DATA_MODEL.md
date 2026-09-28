# PRODUCT WIZARD DATA MODEL SPECIFICATION
**BlueSystem Delivery Enterprise v2.1**

---

## 1. Esquema de Entidad `Product`

```kotlin
data class Product(
    val id: String = "",
    val businessId: String = "",
    val name: String = "",
    val description: String = "",
    val shortDescription: String = "",
    val longDescription: String = "",
    val subCategoryName: String = "",
    val price: Double = 0.0,
    val originalPrice: Double? = null,
    val estimatedCost: Double? = null,
    val taxPercentage: Double = 0.0,
    val category: ProductCategory = ProductCategory.MAIN_COURSE,
    val categoryName: String = "",
    val status: ProductStatus = ProductStatus.ACTIVE,
    val imageUrl: String = "",
    val images: List<String> = emptyList(),
    val preparationTimeMinutes: Int = 15,
    val isPopular: Boolean = false,
    val isVegetarian: Boolean = false,
    val isSpicy: Boolean = false,
    val isHidden: Boolean = false,
    val isNew: Boolean = false,
    val isTopSeller: Boolean = false,
    val isRecommended: Boolean = false,
    val spicyLevel: Int = 0,
    val cuisineType: String = "",
    val tags: List<String> = emptyList(),
    val optionGroups: List<MenuOptionGroup> = emptyList(), // Paso 4: Persistencia real
    val stockQuantity: Int? = null,
    val minStockAlert: Int? = 5,
    val autoHideOnZeroStock: Boolean = true,
    val availabilityDays: List<Int> = listOf(1, 2, 3, 4, 5, 6, 7),
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
)
```

---

## 2. Esquema del Grupo de Opciones (`MenuOptionGroup`)

```kotlin
data class MenuOptionGroup(
    val id: String = "",
    val name: String = "",
    val type: MenuOptionGroupType = MenuOptionGroupType.SINGLE_SELECTION,
    val isRequired: Boolean = false,
    val minSelections: Int = 1,
    val maxSelections: Int = 1,
    val options: List<OptionItem> = emptyList()
)

data class OptionItem(
    val id: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val isAvailable: Boolean = true
)
```
