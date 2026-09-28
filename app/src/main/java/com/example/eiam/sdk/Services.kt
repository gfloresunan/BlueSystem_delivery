package com.example.eiam.sdk

import com.example.eiam.domain.model.AppUser
import com.example.eiam.domain.model.Identity

interface IdentityService {
    suspend fun getCurrentUser(): AppUser?
    suspend fun getIdentity(uid: String): Identity?
}

interface RoleService {
    suspend fun hasRole(requiredRole: String): Boolean
}

interface PermissionService {
    suspend fun hasPermission(action: String): Boolean
}

interface InvitationService {
    suspend fun sendInvitation(email: String, businessId: String, role: String): Boolean
}

interface SessionService {
    suspend fun revokeCurrentSession(): Boolean
}

interface BusinessService {
    suspend fun getActiveBusinessId(): String?
}

interface BranchService {
    suspend fun getActiveBranchId(): String?
}

interface EmployeeService {
    suspend fun getEmployees(businessId: String): List<Any>
}

interface DeviceService {
    suspend fun registerCurrentDevice(): Boolean
}
