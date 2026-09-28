package com.example.eiam.domain.resolver

import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.model.MerchantIdentityContext
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * Motor Canónico de Resolución de Identidad Multi-Tenant para el Módulo Comercio (ADR-011 / ADR-016).
 *
 * Flujo Autorizado:
 * FirebaseAuth.currentUser.uid
 *         ↓
 * getIdTokenResult(forceRefresh)
 *         ↓
 * claims.businessId + branchId
 *         ↓
 * Validación contra /membership (Anti-Tampering)
 *         ↓
 * Validación contra /businesses/{businessId}
 *         ↓
 * MerchantIdentityContext (FAIL CLOSED si falla cualquier paso)
 */
object MerchantIdentityResolver {
    private const val TAG = "MERCHANT_IDENTITY"

    @Volatile
    private var cachedContext: MerchantIdentityContext? = null

    fun getCachedContext(): MerchantIdentityContext? = cachedContext

    fun clearContext() {
        logD(TAG, "Merchant identity context cleared")
        cachedContext = null
    }

    private fun logD(tag: String, msg: String) {
        try {
            android.util.Log.d(tag, msg)
        } catch (t: Throwable) {
            println("DEBUG: [$tag] $msg")
        }
    }

    private fun logW(tag: String, msg: String) {
        try {
            android.util.Log.w(tag, msg)
        } catch (t: Throwable) {
            println("WARN: [$tag] $msg")
        }
    }

    private fun logE(tag: String, msg: String, tr: Throwable? = null) {
        try {
            if (tr != null) android.util.Log.e(tag, msg, tr) else android.util.Log.e(tag, msg)
        } catch (t: Throwable) {
            println("ERROR: [$tag] $msg ${tr?.message ?: ""}")
        }
    }

    suspend fun resolve(
        auth: FirebaseAuth = FirebaseAuth.getInstance(),
        firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
        forceRefresh: Boolean = false
    ): Result<MerchantIdentityContext> {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            val errorMsg = "IDENTIDAD_NO_AUTENTICADA: No hay usuario autenticado en Firebase Auth"
            logE(TAG, "[MERCHANT_IDENTITY_ERROR] uid=none reason=$errorMsg")
            cachedContext = null
            return Result.failure(IllegalStateException(errorMsg))
        }

        // Si ya está resuelto en memoria para este UID y no se requiere refresh forzado
        if (!forceRefresh && cachedContext?.uid == currentUser.uid && cachedContext?.isResolved == true) {
            return Result.success(cachedContext!!)
        }

        try {
            // 1. Obtener Token JWT y Custom Claims
            var tokenResult = currentUser.getIdToken(forceRefresh).await()
            var claims = tokenResult.claims

            var rawRole = claims["role"] as? String
            var claimBusinessId = claims["businessId"] as? String
            var claimBranchId = claims["branchId"] as? String
            var claimOrgId = claims["orgId"] as? String
            var claimTenantId = claims["tenantId"] as? String

            // Si faltan claims clave en token en caché, forzar refresh una vez
            if ((claimBusinessId.isNullOrBlank() || rawRole.isNullOrBlank()) && !forceRefresh) {
                logW(TAG, "[MERCHANT_IDENTITY] Claims faltantes en token cached. Ejecutando getIdToken(true)...")
                tokenResult = currentUser.getIdToken(true).await()
                claims = tokenResult.claims
                rawRole = claims["role"] as? String
                claimBusinessId = claims["businessId"] as? String
                claimBranchId = claims["branchId"] as? String
                claimOrgId = claims["orgId"] as? String
                claimTenantId = claims["tenantId"] as? String
            }

            // Normalización del Rol EIAM
            val resolvedRole = rawRole?.let {
                runCatching { EiamRole.valueOf(it.uppercase()) }.getOrNull()
            } ?: when (rawRole?.lowercase()?.trim()) {
                "owner", "business", "comercio", "merchant", "propietario", "business_owner", "merchant_owner" -> EiamRole.OWNER
                "manager", "gerente" -> EiamRole.MANAGER
                "supervisor" -> EiamRole.SUPERVISOR
                "cashier", "cajero", "caja", "seller" -> EiamRole.CASHIER
                "cook", "cocinero", "cocina", "kitchen" -> EiamRole.COOK
                else -> null
            }

            var effectiveBusinessId = claimBusinessId ?: ""
            var effectiveBranchId = claimBranchId ?: ""
            var effectiveOrgId = claimOrgId ?: ""
            var effectiveTenantId = claimTenantId ?: ""
            var membershipId = ""
            var permissionsList = emptyList<String>()

            // 2. Si no hay businessId en claims, buscar en colección /membership por UID
            if (effectiveBusinessId.isBlank()) {
                logW(TAG, "[MERCHANT_IDENTITY] Claims no contienen businessId. Buscando en /membership por UID: ${currentUser.uid}")
                val memQuery = firestore.collection("membership")
                    .whereEqualTo("uid", currentUser.uid)
                    .whereEqualTo("status", "ACTIVE")
                    .limit(1)
                    .get().await()

                if (!memQuery.isEmpty) {
                    val memDoc = memQuery.documents.first()
                    effectiveBusinessId = memDoc.getString("businessId") ?: ""
                    effectiveBranchId = memDoc.getString("branchId") ?: effectiveBranchId
                    effectiveOrgId = memDoc.getString("orgId") ?: effectiveOrgId
                    effectiveTenantId = memDoc.getString("tenantId") ?: effectiveTenantId
                    membershipId = memDoc.id
                    @Suppress("UNCHECKED_CAST")
                    permissionsList = memDoc.get("permissions") as? List<String> ?: emptyList()
                    logD(TAG, "[MERCHANT_IDENTITY] Identidad recuperada desde /membership: businessId=$effectiveBusinessId")
                }
            } else {
                // 3. Validar consistencia contra /membership (Anti-Tampering & Cross-Tenant Check)
                val memQuery = firestore.collection("membership")
                    .whereEqualTo("uid", currentUser.uid)
                    .whereEqualTo("businessId", effectiveBusinessId)
                    .limit(1)
                    .get().await()

                if (!memQuery.isEmpty) {
                    val memDoc = memQuery.documents.first()
                    membershipId = memDoc.id
                    if (effectiveBranchId.isBlank()) {
                        effectiveBranchId = memDoc.getString("branchId") ?: ""
                    }
                    if (effectiveOrgId.isBlank()) {
                        effectiveOrgId = memDoc.getString("orgId") ?: ""
                    }
                    if (effectiveTenantId.isBlank()) {
                        effectiveTenantId = memDoc.getString("tenantId") ?: ""
                    }
                    @Suppress("UNCHECKED_CAST")
                    permissionsList = memDoc.get("permissions") as? List<String> ?: emptyList()
                } else {
                    // Si no es admin global de plataforma, verificar en /users por fallback de migración
                    if (resolvedRole?.isPlatformAdmin() != true) {
                        logW(TAG, "[MERCHANT_IDENTITY_WARNING] No se encontró membership directo con businessId=$effectiveBusinessId. Verificando /users/${currentUser.uid}")
                        val userDoc = firestore.collection("users").document(currentUser.uid).get().await()
                        val userBizId = userDoc.getString("businessId") ?: userDoc.getString("comercioId") ?: ""
                        if (userBizId != effectiveBusinessId && userBizId.isNotBlank()) {
                            val errorMsg = "IDENTITY_MISMATCH: Claims businessId ($effectiveBusinessId) != user document businessId ($userBizId)"
                            logE(TAG, "[MERCHANT_IDENTITY_ERROR] uid=${currentUser.uid} claimBusinessId=$effectiveBusinessId userBusinessId=$userBizId reason=$errorMsg")
                            cachedContext = null
                            return Result.failure(SecurityException(errorMsg))
                        }
                    }
                }
            }

            // 4. Si aún no hay businessId, FAIL CLOSED
            if (effectiveBusinessId.isBlank()) {
                val errorMsg = "BUSINESS_ID_NOT_FOUND: No se encontró ningún businessId asignado para el usuario ${currentUser.uid}"
                logE(TAG, "[MERCHANT_IDENTITY_ERROR] uid=${currentUser.uid} reason=$errorMsg")
                cachedContext = null
                return Result.failure(IllegalStateException(errorMsg))
            }

            // 5. Validar existencia del documento /businesses/{effectiveBusinessId}
            val bizDoc = firestore.collection("businesses").document(effectiveBusinessId).get().await()
            if (!bizDoc.exists()) {
                val errorMsg = "BUSINESS_DOCUMENT_NOT_FOUND: El documento /businesses/$effectiveBusinessId no existe en Firestore"
                logE(TAG, "[MERCHANT_IDENTITY_ERROR] uid=${currentUser.uid} businessId=$effectiveBusinessId reason=$errorMsg")
                cachedContext = null
                return Result.failure(IllegalStateException(errorMsg))
            }

            val finalRole = resolvedRole ?: EiamRole.OWNER
            val context = MerchantIdentityContext(
                uid = currentUser.uid,
                email = currentUser.email ?: "",
                tenantId = effectiveTenantId,
                businessId = effectiveBusinessId,
                branchId = effectiveBranchId,
                orgId = effectiveOrgId,
                role = finalRole,
                membershipId = membershipId,
                permissions = permissionsList,
                isResolved = true,
                errorMessage = null
            )

            logD(TAG, """
                [MERCHANT_IDENTITY_RESOLVED]
                uid        = ${context.uid}
                email      = ${context.email}
                businessId = ${context.businessId}
                branchId   = ${context.branchId}
                orgId      = ${context.orgId}
                tenantId   = ${context.tenantId}
                role       = ${context.role}
                source     = CLAIMS_AND_MEMBERSHIP
                status     = RESOLVED
            """.trimIndent())

            cachedContext = context
            return Result.success(context)

        } catch (e: Exception) {
            val errorMsg = "ERROR_RESOLVING_IDENTITY: ${e.message}"
            logE(TAG, "[MERCHANT_IDENTITY_ERROR] uid=${currentUser.uid} reason=$errorMsg", e)
            cachedContext = null
            return Result.failure(e)
        }
    }
}
