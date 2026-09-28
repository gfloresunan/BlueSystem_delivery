package com.example.eiam.data.repository

import com.example.eiam.domain.model.Employee
import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.repository.IEmployeeRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — EmployeeRepository (FASE 4)
 * Implementación de Firestore para la gestión de empleados.
 */
class EmployeeRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IEmployeeRepository {

    private val collection = firestore.collection("employees")

    override suspend fun getEmployeeById(employeeId: String): Employee? {
        return try {
            val snapshot = collection.document(employeeId).get().await()
            if (snapshot.exists()) {
                snapshot.toObject(Employee::class.java)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getEmployeesByBusinessId(businessId: String): List<Employee> {
        return try {
            val snapshot = collection.whereEqualTo("businessId", businessId).get().await()
            snapshot.toObjects(Employee::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getEmployeesByBranchId(businessId: String, branchId: String): List<Employee> {
        return try {
            val snapshot = collection
                .whereEqualTo("businessId", businessId)
                .whereEqualTo("branchId", branchId)
                .get()
                .await()
            snapshot.toObjects(Employee::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun saveEmployee(employee: Employee): Boolean {
        return try {
            collection.document(employee.employeeId).set(employee).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateEmployeeRole(employeeId: String, newRole: EiamRole): Boolean {
        return try {
            collection.document(employeeId).update("role", newRole.name).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateEmployeeStatus(employeeId: String, isActive: Boolean): Boolean {
        return try {
            collection.document(employeeId).update("isActive", isActive).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun deleteEmployee(employeeId: String): Boolean {
        return try {
            collection.document(employeeId).delete().await()
            true
        } catch (e: Exception) {
            false
        }
    }
}
