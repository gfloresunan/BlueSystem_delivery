package com.example.domain.model.courier

/**
 * Tipo de política de prueba de entrega (Delivery Proof Policy).
 */
enum class DeliveryProofType {
    /** Solo OTP dinámico de 4 dígitos */
    STANDARD_SMALL,

    /** Foto CameraX + OTP dinámico */
    STANDARD_NORMAL,

    /** Foto CameraX + Firma Digital en Canvas + OTP dinámico */
    PREMIUM,

    /** Escaneo de QR + Firma Digital + Foto CameraX */
    CORPORATE
}

/**
 * Reglas requeridas para dar por válida una entrega.
 */
data class DeliveryProofPolicy(
    val proofType: DeliveryProofType = DeliveryProofType.STANDARD_NORMAL,
    val requireOtp: Boolean = true,
    val requirePhoto: Boolean = true,
    val requireSignature: Boolean = false,
    val requireQrScan: Boolean = false
) {
    companion object {
        fun resolvePolicy(orderTotal: Double, isCorporate: Boolean, isPremiumCustomer: Boolean): DeliveryProofPolicy {
            return when {
                isCorporate -> DeliveryProofPolicy(
                    proofType = DeliveryProofType.CORPORATE,
                    requireOtp = false,
                    requirePhoto = true,
                    requireSignature = true,
                    requireQrScan = true
                )
                isPremiumCustomer || orderTotal >= 500.0 -> DeliveryProofPolicy(
                    proofType = DeliveryProofType.PREMIUM,
                    requireOtp = true,
                    requirePhoto = true,
                    requireSignature = true,
                    requireQrScan = false
                )
                orderTotal < 150.0 -> DeliveryProofPolicy(
                    proofType = DeliveryProofType.STANDARD_SMALL,
                    requireOtp = true,
                    requirePhoto = false,
                    requireSignature = false,
                    requireQrScan = false
                )
                else -> DeliveryProofPolicy(
                    proofType = DeliveryProofType.STANDARD_NORMAL,
                    requireOtp = true,
                    requirePhoto = true,
                    requireSignature = false,
                    requireQrScan = false
                )
            }
        }
    }
}

/**
 * Paquete completo de evidencias recolectadas para cerrar la entrega.
 */
data class ProofOfDeliveryBundle(
    val orderId: String,
    val otpCodeEntered: String? = null,
    val photoStorageUrl: String? = null,
    val signatureStorageUrl: String? = null,
    val qrPayloadScanned: String? = null,
    val timestampMs: Long = System.currentTimeMillis()
)
