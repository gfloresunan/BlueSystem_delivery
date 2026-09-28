package com.example.domain.model.settings

/**
 * Modelo de Configuración de Sucursal (Multi-Branch Management)
 */
data class BranchConfig(
    val branchId: String = "main_branch",
    val name: String = "Sucursal Principal",
    val address: String = "Managua, Nicaragua",
    val phone: String = "+505 2222-8888",
    val latitude: Double = 12.136389,
    val longitude: Double = -86.251389,
    val deliveryRadiusKm: Double = 5.0,
    val managerName: String = "Carlos Gerente",
    val isActive: Boolean = true
)
