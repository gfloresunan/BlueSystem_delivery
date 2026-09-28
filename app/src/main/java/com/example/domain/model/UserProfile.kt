package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

@IgnoreExtraProperties
data class UserProfile(
    val uid: String = "",
    val nombre: String = "",
    val email: String = "",
    val telefono: String = "",
    val rol: String = "",
    val role: String = "",
    val userType: String = "",
    @get:PropertyName("isActive")
    val isActive: Boolean = true,
    @get:PropertyName("active")
    val active: Boolean = true,
    val photoUrl: String = ""
) {
    fun getEffectiveRole(): String {
        val raw = if (role.isNotEmpty()) role else if (rol.isNotEmpty()) rol else userType
        return when (raw.lowercase().trim()) {
            "super_admin", "superadmin", "propietario" -> "super_admin"
            "admin", "administrador" -> "admin"
            "supervisor" -> "supervisor"
            "operator", "operador" -> "operator"
            "support", "soporte" -> "support"
            "auditor" -> "auditor"
            "business", "comercio" -> "business"
            "driver", "motorizado", "courier" -> "courier"
            "customer", "cliente" -> "customer"
            "guest", "invitado" -> "guest"
            else -> "customer"
        }
    }
    fun isUserBlocked(): Boolean = !isActive || !active
}
