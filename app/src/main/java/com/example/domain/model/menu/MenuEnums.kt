package com.example.domain.model.menu

enum class MenuProductType {
    SINGLE_ITEM,
    COMBO,
    VARIABLE_ITEM
}

enum class MenuProductStatus {
    ACTIVE,
    OUT_OF_STOCK,
    INACTIVE,
    ARCHIVED
}

enum class MenuVersionStatus {
    BUILDING,
    PUBLISHED,
    DEPRECATED,
    FAILED
}
