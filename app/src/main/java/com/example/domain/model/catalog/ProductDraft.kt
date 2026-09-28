package com.example.domain.model.catalog

import com.example.domain.model.Product

/**
 * DTO para AutoSave local de borrador del Wizard
 */
data class ProductDraft(
    val draftId: String = "draft_current",
    val step: Int = 1,
    val product: Product = Product(),
    val photosList: List<String> = emptyList(), // Base64 o URIs temporales
    val lastSavedAt: Long = System.currentTimeMillis()
)
