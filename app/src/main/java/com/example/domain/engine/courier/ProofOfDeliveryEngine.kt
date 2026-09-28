package com.example.domain.engine.courier

import com.example.domain.model.courier.DeliveryProofPolicy
import com.example.domain.model.courier.ProofOfDeliveryBundle

/**
 * Motor configurable de validación de evidencias de entrega (ProofOfDeliveryEngine).
 */
class ProofOfDeliveryEngine {

    /**
     * Valida si un paquete de evidencias cumple estrictamente con la política exigida para el pedido.
     */
    fun validateProof(
        policy: DeliveryProofPolicy,
        bundle: ProofOfDeliveryBundle,
        expectedOtp: String?
    ): Result<Boolean> {
        if (policy.requireOtp) {
            if (bundle.otpCodeEntered.isNullOrBlank()) {
                return Result.failure(IllegalArgumentException("Se requiere el código OTP de 4 dígitos para confirmar la entrega."))
            }
            if (expectedOtp != null && bundle.otpCodeEntered != expectedOtp) {
                return Result.failure(IllegalArgumentException("El código OTP ingresado es incorrecto."))
            }
        }

        if (policy.requirePhoto && bundle.photoStorageUrl.isNullOrBlank()) {
            return Result.failure(IllegalArgumentException("Se requiere evidencia fotográfica del paquete entregado."))
        }

        if (policy.requireSignature && bundle.signatureStorageUrl.isNullOrBlank()) {
            return Result.failure(IllegalArgumentException("Se requiere la firma digital del cliente."))
        }

        if (policy.requireQrScan && bundle.qrPayloadScanned.isNullOrBlank()) {
            return Result.failure(IllegalArgumentException("Se requiere el escaneo del código QR corporativo del cliente."))
        }

        return Result.success(true)
    }
}
