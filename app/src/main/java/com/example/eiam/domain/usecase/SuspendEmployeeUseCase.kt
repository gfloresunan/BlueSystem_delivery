package com.example.eiam.domain.usecase

import com.example.eiam.domain.engine.EmployeeEngine

/**
 * EIAM — SuspendEmployeeUseCase (FASE 4)
 */
class SuspendEmployeeUseCase(
    private val employeeEngine: EmployeeEngine
) {
    suspend operator fun invoke(employeeId: String): Result<Boolean> {
        return employeeEngine.suspendEmployee(employeeId)
    }
}
