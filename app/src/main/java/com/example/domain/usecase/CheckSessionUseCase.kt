package com.example.domain.usecase

import com.example.AuthManager
import com.google.firebase.auth.FirebaseUser

class CheckSessionUseCase(private val authManager: AuthManager) {
    operator fun invoke(): FirebaseUser? {
        return authManager.currentUser
    }
}
