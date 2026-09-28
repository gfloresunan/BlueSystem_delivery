package com.example.eiam.domain.engine

import com.example.eiam.data.adapter.LegacyRoleAdapter
import com.example.eiam.domain.model.*
import com.google.firebase.Timestamp
import java.util.UUID

/**
 * EIAM — MigrationEngine (FASE Legacy)
 * Gestiona la migración progresiva de datos legados al modelo EIAM.
 *
 * Fases de migración:
 * M1: LegacyRoleAdapter activo (sin cambios en Firestore)
 * M2: CompatibilityAdapter propaga businessId
 * M3: MigrationEngine migra documentos Firestore
 * M4: Campos legacy marcados @Deprecated
 * M5: Eliminación legacy (Sprint futuro)
 */
object MigrationEngine {

    /**
     * Genera el mapa de campos EIAM a escribir en /users/{uid}
     * sin eliminar los campos legacy existentes.
     * Se llama durante la migración M3.
     */
    fun buildEiamPatch(
        uid: String,
        role: String?,
        displayName: String,
        email: String
    ): Map<String, Any?> {
        val eiamRole = LegacyRoleAdapter.toEiamRole(role)
        return mapOf(
            "eiamRole" to eiamRole.name,
            "eiamRoleLevel" to eiamRole.level,
            "eiamMigrated" to true,
            "eiamMigratedAt" to Timestamp.now()
            // Campos legacy (role, rol, userType) se mantienen sin tocar
        )
    }

    /**
     * Genera el negocio mínimo para un usuario con rol "business" en el sistema legacy.
     * businessId temporalmente == uid (se migrará a UUID propio en FASE M4+).
     */
    fun buildLegacyBusiness(uid: String, displayName: String, email: String): Business =
        LegacyBusinessAdapter.fromLegacyUser(uid, displayName, email)

    /**
     * Genera la Membership OWNER para un negocio migrado desde el sistema legacy.
     */
    fun buildLegacyOwnerMembership(business: Business): Membership =
        BusinessEngine.createOwnerMembership(business)

    /**
     * Verifica si un documento de usuario ya fue migrado al modelo EIAM.
     */
    fun isMigrated(userDoc: Map<String, Any?>): Boolean =
        userDoc["eiamMigrated"] == true
}
