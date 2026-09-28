package com.example.domain.model

data class CatalogSection(
    val category: ProductCategory,
    val title: String,
    val products: List<Product>
)
