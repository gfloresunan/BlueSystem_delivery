package com.example.eiam.domain.model

/**
 * EIAM — Organization Model (EIAM v2.1)
 * Representa la entidad matriz / holding que agrupa múltiples comercios (Business).
 * Soporta franquicias, grupos empresariales y marcas múltiples.
 */
data class Organization(
    val organizationId: String,
    val name: String,
    val taxId: String? = null, // RUC / NIF
    val ownerUid: String,
    val businessIds: List<String> = emptyList(),
    val status: String = "ACTIVE",
    val logoUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
