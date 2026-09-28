package com.example.eiam.domain.model

import androidx.annotation.Keep

/**
 * EIAM — Permission Model (FASE 1)
 * Representa un permiso atómico asignado a un rol o usuario.
 *
 * @Keep garantiza que R8/ProGuard no elimine este modelo en Release.
 */
@Keep
data class Permission(
    val action: EiamAction = EiamAction.VIEW_ORDERS,
    val isGranted: Boolean = true,
    val conditions: Map<String, String> = emptyMap()
)
