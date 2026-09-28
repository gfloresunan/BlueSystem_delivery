package com.example.data.repository

import android.util.Log
import com.example.domain.model.Promotion
import com.example.domain.model.coupon.CouponDiscountType
import com.example.domain.model.coupon.CouponDomainModel
import com.example.domain.model.coupon.CouponScope
import com.example.domain.model.coupon.CouponValidationResult
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlin.math.max
import kotlin.math.min

data class CouponRedemptionModel(
    val id: String = "",
    val couponId: String = "",
    val code: String = "",
    val orderId: String = "",
    val customerId: String = "",
    val businessId: String? = null,
    val discountAmount: Double = 0.0,
    val status: String = "CONFIRMED",
    val redeemedAt: Timestamp? = null
)

class CouponRepository(
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    /**
     * Observa en tiempo real los cupones desde la colección canónica `/coupons`.
     * Filtra los cupones que aplican globalmente o específicamente al usuario indicado.
     */
    fun observeCoupons(userId: String?): Flow<List<CouponDomainModel>> = callbackFlow {
        val listener = db.collection("coupons")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("COUPON_REPO", "Error observando cupones: ${error.message}", error)
                    close(error)
                    return@addSnapshotListener
                }

                val list = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        parseCouponDocument(doc)
                    } catch (e: Exception) {
                        Log.w("COUPON_REPO", "Error parseando cupón ${doc.id}: ${e.message}")
                        null
                    }
                } ?: emptyList()

                // Filtrar por pertenencia: cupones globales o del usuario autenticado
                val filtered = list.filter { coupon ->
                    coupon.customerId.isNullOrBlank() || (userId != null && coupon.customerId.equals(userId, ignoreCase = true))
                }

                trySend(filtered)
            }

        awaitClose { listener.remove() }
    }

    /**
     * Consulta una sola vez los cupones activos y válidos para el usuario (globales + personales).
     */
    suspend fun getAvailableCouponsForUser(userId: String?): List<CouponDomainModel> {
        return try {
            val snapshot = db.collection("coupons").get().await()
            val list = snapshot.documents.mapNotNull { doc ->
                try {
                    parseCouponDocument(doc)
                } catch (e: Exception) {
                    null
                }
            }
            val now = Timestamp.now()
            list.filter { coupon ->
                coupon.isActive &&
                (coupon.expiresAt == null || coupon.expiresAt > now) &&
                (coupon.customerId.isNullOrBlank() || (userId != null && coupon.customerId.equals(userId, ignoreCase = true)))
            }
        } catch (e: Exception) {
            Log.e("COUPON_REPO", "Error obteniendo cupones para usuario: ${e.message}", e)
            emptyList()
        }
    }

    /**
     * Observa en tiempo real las redenciones del usuario desde `/coupon_redemptions`.
     */
    fun observeUserRedemptions(userId: String): Flow<List<CouponRedemptionModel>> = callbackFlow {
        if (userId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = db.collection("coupon_redemptions")
            .whereEqualTo("customerId", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("COUPON_REPO", "Error observando redenciones: ${error.message}", error)
                    close(error)
                    return@addSnapshotListener
                }

                val list = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        CouponRedemptionModel(
                            id = doc.id,
                            couponId = doc.getString("couponId") ?: "",
                            code = doc.getString("code") ?: "",
                            orderId = doc.getString("orderId") ?: "",
                            customerId = doc.getString("customerId") ?: "",
                            businessId = doc.getString("businessId"),
                            discountAmount = doc.getDouble("discountAmount") ?: 0.0,
                            status = doc.getString("status") ?: "CONFIRMED",
                            redeemedAt = doc.getTimestamp("redeemedAt") ?: doc.getTimestamp("createdAt")
                        )
                    } catch (e: Exception) {
                        Log.w("COUPON_REPO", "Error parseando redención ${doc.id}: ${e.message}")
                        null
                    }
                } ?: emptyList()

                trySend(list)
            }

        awaitClose { listener.remove() }
    }

    /**
     * Observa en tiempo real las promociones activas desde `/promotions`.
     */
    fun observePromotions(): Flow<List<Promotion>> = callbackFlow {
        val listener = db.collection("promotions")
            .whereEqualTo("active", true)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("COUPON_REPO", "Error observando promociones: ${error.message}", error)
                    close(error)
                    return@addSnapshotListener
                }

                val list = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        doc.toObject(Promotion::class.java)?.copy(id = doc.id)
                    } catch (e: Exception) {
                        Log.w("COUPON_REPO", "Error parseando promoción ${doc.id}: ${e.message}")
                        null
                    }
                } ?: emptyList()

                trySend(list)
            }

        awaitClose { listener.remove() }
    }

    /**
     * Helper para deserializar un documento de `/coupons`.
     */
    fun parseCouponDocument(doc: DocumentSnapshot): CouponDomainModel {
        val scopeStr = doc.getString("scope") ?: "GLOBAL"
        val scope = if (scopeStr.equals("MERCHANT_SPECIFIC", ignoreCase = true)) CouponScope.MERCHANT_SPECIFIC else CouponScope.GLOBAL

        val typeStr = doc.getString("discountType") ?: "PERCENTAGE"
        val discountType = when (typeStr.uppercase()) {
            "FIXED_AMOUNT" -> CouponDiscountType.FIXED_AMOUNT
            "FREE_DELIVERY" -> CouponDiscountType.FREE_DELIVERY
            else -> CouponDiscountType.PERCENTAGE
        }

        return CouponDomainModel(
            id = doc.id,
            code = (doc.getString("code") ?: "").trim().uppercase(),
            title = doc.getString("title") ?: doc.getString("name") ?: "",
            scope = scope,
            businessId = doc.getString("businessId"),
            businessName = doc.getString("businessName"),
            branchIds = (doc.get("branchIds") as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
            discountType = discountType,
            discountValue = doc.getDouble("discountValue") ?: doc.getDouble("discount") ?: doc.getDouble("value") ?: 0.0,
            minimumOrderAmount = doc.getDouble("minimumOrderAmount") ?: doc.getDouble("minAmount") ?: 0.0,
            maximumDiscountAmount = doc.getDouble("maximumDiscountAmount"),
            startsAt = doc.getTimestamp("startsAt"),
            expiresAt = doc.getTimestamp("expiresAt"),
            isActive = doc.getBoolean("isActive") ?: doc.getBoolean("active") ?: true,
            usageLimit = doc.getLong("usageLimit")?.toInt(),
            usageCount = (doc.getLong("usageCount") ?: 0L).toInt(),
            perCustomerLimit = doc.getLong("perCustomerLimit")?.toInt() ?: 1,
            applicableProductIds = (doc.get("applicableProductIds") as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
            applicableCategoryIds = (doc.get("applicableCategoryIds") as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
            stackable = doc.getBoolean("stackable") ?: false,
            priority = doc.getLong("priority")?.toInt() ?: 1,
            description = doc.getString("description") ?: "",
            customerId = doc.getString("customerId"),
            rewardType = doc.getString("rewardType"),
            sourceRewardId = doc.getString("sourceRewardId"),
            createdBy = doc.getString("createdBy") ?: ""
        )
    }

    /**
     * Validación determinista autoritativa en cliente previa al checkout.
     */
    suspend fun validateCoupon(
        rawCode: String,
        businessId: String,
        cartSubtotal: Double,
        deliveryFee: Double,
        branchId: String? = null,
        customerId: String? = null
    ): CouponValidationResult {
        val cleanCode = rawCode.trim().uppercase()
        if (cleanCode.isBlank()) {
            return CouponValidationResult(
                isValid = false,
                errorCode = "INVALID_COUPON",
                errorMessage = "Código de cupón vacío.",
                finalTotal = cartSubtotal + deliveryFee
            )
        }

        try {
            val querySnap = db.collection("coupons")
                .whereEqualTo("code", cleanCode)
                .limit(1)
                .get()
                .await()

            if (querySnap.isEmpty) {
                return CouponValidationResult(
                    isValid = false,
                    errorCode = "INVALID_COUPON",
                    errorMessage = "El código '$cleanCode' no existe o no es válido.",
                    finalTotal = cartSubtotal + deliveryFee
                )
            }

            val doc = querySnap.documents[0]
            val coupon = parseCouponDocument(doc)

            // 1. Validar Activo
            if (!coupon.isActive) {
                return CouponValidationResult(
                    isValid = false,
                    errorCode = "INACTIVE_COUPON",
                    errorMessage = "El cupón '$cleanCode' se encuentra inactivo.",
                    finalTotal = cartSubtotal + deliveryFee,
                    appliedCoupon = coupon
                )
            }

            // 2. Validar Fecha
            if (!coupon.isValidNow()) {
                return CouponValidationResult(
                    isValid = false,
                    errorCode = "EXPIRED_COUPON",
                    errorMessage = "El cupón '$cleanCode' ha expirado o aún no está disponible.",
                    finalTotal = cartSubtotal + deliveryFee,
                    appliedCoupon = coupon
                )
            }

            // 3. Validar Alcance de Comercio (Multi-Tenant Isolation)
            if (coupon.scope == CouponScope.MERCHANT_SPECIFIC) {
                if (coupon.businessId.isNullOrBlank() || !coupon.businessId.equals(businessId, ignoreCase = true)) {
                    return CouponValidationResult(
                        isValid = false,
                        errorCode = "COUPON_BUSINESS_MISMATCH",
                        errorMessage = "Este cupón no es válido para este comercio.",
                        finalTotal = cartSubtotal + deliveryFee,
                        appliedCoupon = coupon
                    )
                }
            }

            // 4. Validar Sucursal si aplica
            if (coupon.branchIds.isNotEmpty() && !branchId.isNullOrBlank() && !coupon.branchIds.contains(branchId)) {
                return CouponValidationResult(
                    isValid = false,
                    errorCode = "BRANCH_MISMATCH",
                    errorMessage = "El cupón no está disponible para esta sucursal.",
                    finalTotal = cartSubtotal + deliveryFee,
                    appliedCoupon = coupon
                )
            }

            // 5. Validar Monto Mínimo
            if (cartSubtotal < coupon.minimumOrderAmount) {
                return CouponValidationResult(
                    isValid = false,
                    errorCode = "MINIMUM_ORDER_NOT_REACHED",
                    errorMessage = "El monto mínimo para este cupón es C$ ${String.format(java.util.Locale.US, "%.2f", coupon.minimumOrderAmount)}.",
                    finalTotal = cartSubtotal + deliveryFee,
                    appliedCoupon = coupon
                )
            }

            // 6. Validar Límite de Usos Global
            val limit = coupon.usageLimit
            if (limit != null && limit > 0 && coupon.usageCount >= limit) {
                return CouponValidationResult(
                    isValid = false,
                    errorCode = "USAGE_LIMIT_REACHED",
                    errorMessage = "Este cupón ha alcanzado el límite máximo de usos disponibles.",
                    finalTotal = cartSubtotal + deliveryFee,
                    appliedCoupon = coupon
                )
            }

            // 7. Calcular Descuento
            var calculatedDiscount = 0.0
            var calculatedDeliveryDiscount = 0.0

            when (coupon.discountType) {
                CouponDiscountType.PERCENTAGE -> {
                    val pct = coupon.discountValue.coerceIn(0.0, 100.0)
                    calculatedDiscount = cartSubtotal * (pct / 100.0)
                }
                CouponDiscountType.FIXED_AMOUNT -> {
                    calculatedDiscount = coupon.discountValue
                }
                CouponDiscountType.FREE_DELIVERY -> {
                    calculatedDeliveryDiscount = deliveryFee
                }
            }

            // Aplicar tope de descuento máximo si existe
            coupon.maximumDiscountAmount?.let { maxCap ->
                if (maxCap > 0) {
                    calculatedDiscount = min(calculatedDiscount, maxCap)
                }
            }

            // Regla crítica: Descuento nunca puede superar el subtotal (total >= 0)
            calculatedDiscount = min(calculatedDiscount, cartSubtotal)

            val finalSubtotal = max(0.0, cartSubtotal - calculatedDiscount)
            val finalDelivery = max(0.0, deliveryFee - calculatedDeliveryDiscount)
            val finalTotal = finalSubtotal + finalDelivery

            return CouponValidationResult(
                isValid = true,
                discountAmount = calculatedDiscount,
                deliveryDiscountAmount = calculatedDeliveryDiscount,
                finalTotal = finalTotal,
                appliedCoupon = coupon
            )
        } catch (e: Exception) {
            Log.e("COUPON_REPO", "Error validando cupón: ${e.message}", e)
            return CouponValidationResult(
                isValid = false,
                errorCode = "SERVER_ERROR",
                errorMessage = "Error al validar el cupón con el servidor.",
                finalTotal = cartSubtotal + deliveryFee
            )
        }
    }
}
