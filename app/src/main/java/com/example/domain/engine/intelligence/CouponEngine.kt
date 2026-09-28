package com.example.domain.engine.intelligence

data class Coupon(
    val code: String,
    val discountPercent: Double = 0.0,
    val flatDiscount: Double = 0.0,
    val minSubtotal: Double = 0.0,
    val freeDelivery: Boolean = false,
    val isActive: Boolean = true,
    val description: String = ""
)

data class CouponValidationResult(
    val isValid: Boolean,
    val discountAmount: Double = 0.0,
    val freeDelivery: Boolean = false,
    val message: String
)

object CouponEngine {

    private val activeCoupons = mapOf(
        "GERALD20" to Coupon("GERALD20", discountPercent = 20.0, minSubtotal = 200.0, description = "20% de descuento en tu compra"),
        "PRIMERPEDIDO" to Coupon("PRIMERPEDIDO", flatDiscount = 100.0, minSubtotal = 300.0, description = "C$ 100.00 de descuento en tu 1er pedido"),
        "FARMACIA15" to Coupon("FARMACIA15", discountPercent = 15.0, minSubtotal = 150.0, description = "15% de descuento en Farmacias"),
        "ENVIOGRATIS" to Coupon("ENVIOGRATIS", freeDelivery = true, minSubtotal = 250.0, description = "Envío Gratis a domicilio")
    )

    /**
     * Valida la aplicación de un código de cupón contra el subtotal actual.
     */
    fun validateCoupon(code: String, subtotal: Double): CouponValidationResult {
        val coupon = activeCoupons[code.trim().uppercase()]
            ?: return CouponValidationResult(isValid = false, message = "Código de cupón no válido o expirado.")

        if (!coupon.isActive) {
            return CouponValidationResult(isValid = false, message = "El cupón se encuentra inactivo.")
        }

        if (subtotal < coupon.minSubtotal) {
            return CouponValidationResult(
                isValid = false,
                message = "El monto mínimo para aplicar este cupón es C$ ${coupon.minSubtotal}"
            )
        }

        val discountAmount = if (coupon.discountPercent > 0) {
            (subtotal * (coupon.discountPercent / 100.0))
        } else {
            coupon.flatDiscount
        }

        return CouponValidationResult(
            isValid = true,
            discountAmount = discountAmount,
            freeDelivery = coupon.freeDelivery,
            message = "¡Cupón ${coupon.code} aplicado con éxito!"
        )
    }
}
