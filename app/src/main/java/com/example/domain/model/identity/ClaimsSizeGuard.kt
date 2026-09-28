package com.example.domain.model.identity

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Claims Size Guard en Kotlin.
 */

enum class ClaimsSizeStatus {
    PASS,
    PASS_WITH_WARNING,
    FAIL_OVERSIZED
}

data class SizeEvaluation(
    val isValid: Boolean,
    val byteSize: Int,
    val status: ClaimsSizeStatus,
    val message: String
)

object ClaimsSizeGuard {
    const val MAX_CLAIMS_BYTES = 1000
    const val WARNING_THRESHOLD = 800

    fun measureBytes(jsonString: String): Int {
        return jsonString.toByteArray(Charsets.UTF_8).size
    }

    fun evaluate(byteSize: Int): SizeEvaluation {
        return when {
            byteSize >= MAX_CLAIMS_BYTES -> SizeEvaluation(
                isValid = false,
                byteSize = byteSize,
                status = ClaimsSizeStatus.FAIL_OVERSIZED,
                message = "El payload ($byteSize bytes) excede el máximo de $MAX_CLAIMS_BYTES bytes."
            )
            byteSize >= WARNING_THRESHOLD -> SizeEvaluation(
                isValid = true,
                byteSize = byteSize,
                status = ClaimsSizeStatus.PASS_WITH_WARNING,
                message = "El payload ($byteSize bytes) supera el umbral de advertencia de $WARNING_THRESHOLD bytes."
            )
            else -> SizeEvaluation(
                isValid = true,
                byteSize = byteSize,
                status = ClaimsSizeStatus.PASS,
                message = "Payload dentro del presupuesto ($byteSize bytes)."
            )
        }
    }
}
