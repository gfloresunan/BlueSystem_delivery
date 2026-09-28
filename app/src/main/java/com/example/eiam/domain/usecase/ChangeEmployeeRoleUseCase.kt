package com.example.eiam.domain.usecase

import com.example.eiam.domain.engine.EmployeeEngine
import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — ChangeEmployeeRoleUseCase (FASE 4)
 */
class ChangeEmployeeRoleUseCase(
    private val employeeEngine: EmployeeEngine
) {
    suspend operator fun invoke(employeeId: String, newRole: EiamRole): Result<Boolean> {
        return employeeEngine.changeRole(employeeId, newRole)
    }
}
