package com.example.eiam.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.eiam.domain.model.AppUser
import com.example.eiam.domain.model.EiamRole
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class EiamAdminUiState(
    val isLoading: Boolean = false,
    val users: List<AppUser> = emptyList(),
    val errorMessage: String? = null
)

class EiamAdminViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(EiamAdminUiState())
    val uiState: StateFlow<EiamAdminUiState> = _uiState.asStateFlow()

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            // Stubs de carga para la vista admin
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                users = listOf(
                    AppUser(
                        uid = "usr_admin_1",
                        email = "admin@bluesystem.com",
                        displayName = "Super Admin EIAM",
                        photoUrl = null,
                        phoneNumber = "+50588888888",
                        activeRole = EiamRole.SUPER_ADMIN,
                        isActive = true
                    )
                )
            )
        }
    }
}
