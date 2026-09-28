package com.example.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.AppUser
import com.example.FirebaseManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class AdminUsersViewModel(private val firebaseManager: FirebaseManager) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedRoleFilter = MutableStateFlow("ALL")
    val selectedRoleFilter: StateFlow<String> = _selectedRoleFilter.asStateFlow()

    private val allUsers = firebaseManager.listenToAllUsers().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val currentAdminId: String = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""

    val currentAdminRole = allUsers.map { users ->
        val admin = users.find { it.uid == currentAdminId }
        val role = admin?.role?.lowercase() ?: ""
        if (role.isEmpty()) "admin" else role
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "admin")

    // Filtered lists
    val filteredUsers = combine(allUsers, _searchQuery, _selectedRoleFilter) { users, query, roleFilter ->
        users.filter { user ->
            val matchesQuery = user.nombre.contains(query, ignoreCase = true) || user.email.contains(query, ignoreCase = true)
            val mappedRole = user.role.uppercase().let { if (it.isEmpty() || it == "CUSTOMER") "CLIENT" else it }
            val matchesRole = roleFilter == "ALL" || mappedRole == roleFilter
            matchesQuery && matchesRole
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val pendingRequests = allUsers.map { users ->
        users.filter { it.requestedRole.isNotEmpty() }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun updateRoleFilter(role: String) {
        _selectedRoleFilter.value = role
    }

    fun updateUserRole(userId: String, newRole: String, previousRole: String = "", reason: String = "Cambio manual por admin") {
        viewModelScope.launch {
            val fbRole = if (newRole == "CLIENT") "client" else newRole.lowercase()
            firebaseManager.updateUserRole(
                userId = userId,
                newRole = fbRole,
                changedByAdminId = currentAdminId,
                reason = reason,
                previousRole = previousRole
            )
        }
    }

    fun approveRequest(userId: String, requestedRole: String, previousRole: String = "") {
        viewModelScope.launch {
            val validReqRole = requestedRole.lowercase()
            val mappedRole = when (validReqRole) {
                "business" -> "business"
                "courier", "driver" -> "driver"
                else -> "client"
            }
            firebaseManager.updateUserRole(
                userId = userId,
                newRole = mappedRole,
                changedByAdminId = currentAdminId,
                reason = "Solicitud aprobada",
                previousRole = previousRole
            )
        }
    }

    fun rejectRequest(userId: String) {
        viewModelScope.launch {
            firebaseManager.rejectUserRoleRequest(userId, changedByAdminId = currentAdminId)
        }
    }
}

@Suppress("UNCHECKED_CAST")
class AdminUsersViewModelFactory(private val firebaseManager: FirebaseManager) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AdminUsersViewModel::class.java)) {
            return AdminUsersViewModel(firebaseManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
