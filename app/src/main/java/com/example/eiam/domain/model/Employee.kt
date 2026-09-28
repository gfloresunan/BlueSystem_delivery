package com.example.eiam.domain.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp

/**
 * EIAM — Employee
 * Representa a un miembro del personal vinculado a un Business + Branch.
 * Se crea cuando un OWNER invita a un empleado mediante el InvitationEngine.
 *
 * Colección Firestore: /employees/{employeeId}
 *
 * @Keep garantiza que R8/ProGuard no elimine este modelo durante la compilación Release,
 * ya que Firestore lo reconstruye por reflexión mediante toObject(Employee::class.java).
 */
@Keep
data class Employee(
    val employeeId: String = "",
    val uid: String = "",                  // Firebase Auth UID del empleado
    val businessId: String = "",           // Negocio al que pertenece
    val branchId: String? = null,          // Sucursal asignada (null = todas)
    val role: EiamRole = EiamRole.CASHIER,
    val status: AccountStatus = AccountStatus.PENDING,
    val displayName: String = "",
    val email: String = "",
    val phone: String = "",
    val photoUrl: String = "",
    val invitedBy: String = "",            // UID del OWNER
    val invitationToken: String = "",
    val invitedAt: Timestamp? = null,
    val joinedAt: Timestamp? = null,
    val suspendedAt: Timestamp? = null,
    val suspendedReason: String = "",
    val suspendedBy: String = "",
    val lastActivityAt: Timestamp? = null,
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
