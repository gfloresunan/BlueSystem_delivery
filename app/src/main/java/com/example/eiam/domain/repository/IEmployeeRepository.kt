package com.example.eiam.domain.repository

import com.example.eiam.domain.model.Employee
import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — Interface IEmployeeRepository (FASE 4)
 * Abstracción del repositorio de empleados para un comercio.
 */
interface IEmployeeRepository {
    suspend fun getEmployeeById(employeeId: String): Employee?
    suspend fun getEmployeesByBusinessId(businessId: String): List<Employee>
    suspend fun getEmployeesByBranchId(businessId: String, branchId: String): List<Employee>
    suspend fun saveEmployee(employee: Employee): Boolean
    suspend fun updateEmployeeRole(employeeId: String, newRole: EiamRole): Boolean
    suspend fun updateEmployeeStatus(employeeId: String, isActive: Boolean): Boolean
    suspend fun deleteEmployee(employeeId: String): Boolean
}
