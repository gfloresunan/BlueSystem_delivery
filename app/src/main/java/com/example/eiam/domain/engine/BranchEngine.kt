package com.example.eiam.domain.engine

import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Branch
import com.example.eiam.domain.repository.IBranchRepository
import com.google.firebase.Timestamp

/**
 * EIAM — BranchEngine (FASE 7)
 * Motor central de gestión de sucursales de un comercio.
 */
class BranchEngine(
    private val repository: IBranchRepository
) {

    suspend fun createBranch(
        businessId: String,
        name: String,
        address: String? = null,
        phone: String? = null
    ): Result<Branch> {
        val branchId = "br_${businessId}_${System.currentTimeMillis()}"
        val branch = Branch(
            branchId = branchId,
            businessId = businessId,
            name = name,
            address = address ?: "",
            phone = phone ?: "",
            status = AccountStatus.ACTIVE,
            createdAt = Timestamp.now()
        )

        val success = repository.saveBranch(branch)
        return if (success) {
            Result.success(branch)
        } else {
            Result.failure(RuntimeException("Error guardando la sucursal."))
        }
    }

    suspend fun toggleBranchStatus(branchId: String, isActive: Boolean): Result<Boolean> {
        val success = repository.updateBranchStatus(branchId, isActive)
        return if (success) {
            Result.success(true)
        } else {
            Result.failure(RuntimeException("Error actualizando el estado de la sucursal."))
        }
    }
}
