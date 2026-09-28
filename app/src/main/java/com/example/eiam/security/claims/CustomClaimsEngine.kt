package com.example.eiam.security.claims

import android.util.Log
import androidx.annotation.Keep
import com.example.eiam.domain.model.EiamRole
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.tasks.await

/**
 * EIAM — CustomClaimsEngine (FASE 9)
 * Lee y valida los Firebase Custom Claims del token JWT del usuario.
 *
 * Claims escritos por Cloud Function (functions/src/index.ts):
 *   { "role": "OWNER", "businessId": "xxx", "branchId": "yyy", "tenantId": "zzz" }
 *
 * La Cloud Function se activa automáticamente cuando se actualiza /users/{uid}.
 * Para desplegar: firebase deploy --only functions
 */
object CustomClaimsEngine {

    private const val TAG = "EIAM_CLAIMS"
    private const val CLAIM_ROLE = "role"
    private const val CLAIM_BUSINESS_ID = "businessId"
    private const val CLAIM_BRANCH_ID = "branchId"
    private const val CLAIM_TENANT_ID = "tenantId"

    /**
     * Lee los Custom Claims del token del usuario actual.
     * Fuerza refresh del token para obtener los claims más recientes.
     */
    suspend fun getCurrentClaims(forceRefresh: Boolean = false): EiamClaims? {
        return try {
            val user: FirebaseUser = FirebaseAuth.getInstance().currentUser ?: return null
            val result = user.getIdToken(forceRefresh).await()
            val claims = result.claims

            EiamClaims(
                uid = user.uid,
                role = (claims[CLAIM_ROLE] as? String)?.let {
                    runCatching { EiamRole.valueOf(it) }.getOrNull()
                } ?: EiamRole.CLIENT,
                businessId = claims[CLAIM_BUSINESS_ID] as? String,
                branchId = claims[CLAIM_BRANCH_ID] as? String,
                tenantId = claims[CLAIM_TENANT_ID] as? String
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error reading custom claims: ${e.message}", e)
            null
        }
    }

    /**
     * Verifica si el usuario tiene el rol mínimo requerido en sus claims.
     */
    suspend fun hasMinimumRole(minimumRole: EiamRole): Boolean {
        val claims = getCurrentClaims() ?: return false
        return claims.role.level >= minimumRole.level
    }

    /**
     * Verifica si el businessId del claim coincide con el recurso solicitado.
     * Previene acceso cross-tenant.
     */
    suspend fun validateBusinessAccess(requestedBusinessId: String): Boolean {
        val claims = getCurrentClaims() ?: return false
        // Platform admins tienen acceso a todos los negocios
        if (claims.role.isPlatformAdmin()) return true
        return claims.businessId == requestedBusinessId
    }
}

/**
 * Claims del token JWT del usuario.
 *
 * @Keep garantiza que R8/ProGuard no elimine esta clase en Release,
 * ya que es accedida por reflexión desde CustomClaimsEngine.
 */
@Keep
data class EiamClaims(
    val uid: String = "",
    val role: EiamRole = EiamRole.GUEST,
    val businessId: String? = null,
    val branchId: String? = null,
    val tenantId: String? = null
)
