package com.example.domain.usecase

import com.example.AuthManager

class ObtenerTipoUsuarioUseCase(private val authManager: AuthManager) {
    suspend operator fun invoke(uid: String): String? {
        return authManager.obtenerTipoUsuario(uid)
    }
}
