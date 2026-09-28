package com.example.presentation.auth

sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class Success(val user: AuthUser) : AuthUiState()
    data class Error(val mensaje: String) : AuthUiState()
}

data class AuthUser(
    val email: String,
    val userType: String?,
    val role: String?,
    val rol: String?
)
