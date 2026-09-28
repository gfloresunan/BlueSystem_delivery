package com.example.eiam.domain.model

import android.util.Log

/**
 * EIAM — AccountStatus
 * Estado de cuenta / entidad en la plataforma.
 */
enum class AccountStatus {
    ACTIVE,      // Cuenta/Entidad activa y operativa
    OPERATIONAL, // Sucursal/Entidad operativa
    PENDING,     // Pendiente de verificación (email no verificado o invitación sin aceptar)
    BLOCKED,     // Bloqueada temporalmente por seguridad (intentos fallidos, sospecha de fraude)
    SUSPENDED,   // Suspendida manualmente por Admin (reversible)
    TERMINATED,  // Dada de baja permanente (irreversible)
    UNKNOWN;     // Estado desconocido / fallback seguro

    val isOperational: Boolean
        get() = this == ACTIVE || this == OPERATIONAL

    companion object {
        fun fromString(value: String?, defaultStatus: AccountStatus = ACTIVE): AccountStatus {
            if (value.isNullOrBlank()) return defaultStatus
            val cleanValue = value.trim().uppercase()
            return try {
                values().firstOrNull { it.name == cleanValue } ?: run {
                    try {
                        Log.w("EIAM_STATUS_NORMALIZATION", "rawStatus=$value normalizedStatus=UNKNOWN source=branches")
                    } catch (_: Throwable) {
                        // Guard for JVM unit tests where Log class might not be mocked
                    }
                    UNKNOWN
                }
            } catch (e: Exception) {
                UNKNOWN
            }
        }
    }
}

