package com.example.eiam.domain.repository

import com.example.eiam.domain.model.Branch

/**
 * EIAM — Interface IBranchRepository (FASE 7)
 */
interface IBranchRepository {
    suspend fun getBranchById(branchId: String): Branch?
    suspend fun getBranchesByBusinessId(businessId: String): List<Branch>
    suspend fun saveBranch(branch: Branch): Boolean
    suspend fun updateBranchStatus(branchId: String, isActive: Boolean): Boolean
}
