package com.example.data.repository

import android.util.Log
import com.example.domain.model.loyalty.*
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.QuerySnapshot
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * BlueSystem Delivery Enterprise — Loyalty Repository v1.0
 * 100% Real Firestore reactive listeners and authoritative Cloud Function calls.
 */
class LoyaltyRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val functions: FirebaseFunctions = FirebaseFunctions.getInstance()
) {
    companion object {
        private const val TAG = "LOYALTY_REPO"
    }

    /**
     * Observa el resumen global del cliente en tiempo real (/users/{uid}/loyaltySummary/global).
     */
    fun observeGlobalSummary(customerId: String): Flow<LoyaltyGlobalSummary> = callbackFlow {
        if (customerId.isBlank()) {
            trySend(LoyaltyGlobalSummary())
            close()
            return@callbackFlow
        }

        val docRef = firestore.collection("users")
            .document(customerId)
            .collection("loyaltySummary")
            .document("global")

        val listener = docRef.addSnapshotListener { snapshot: DocumentSnapshot?, error ->
            if (error != null) {
                Log.e(TAG, "Error escuchando loyaltySummary/global: ${error.message}", error)
                return@addSnapshotListener
            }

            if (snapshot != null && snapshot.exists()) {
                val data = snapshot.data
                val summary = LoyaltyGlobalSummary(
                    customerId = customerId,
                    globalPointsBalance = (data?.get("globalPointsBalance") as? Long)?.toInt() ?: 0,
                    lifetimePointsEarned = (data?.get("lifetimePointsEarned") as? Long)?.toInt() ?: 0,
                    lifetimePointsRedeemed = (data?.get("lifetimePointsRedeemed") as? Long)?.toInt() ?: 0,
                    updatedAt = snapshot.getTimestamp("updatedAt")
                )
                trySend(summary)
            } else {
                trySend(LoyaltyGlobalSummary(customerId = customerId))
            }
        }

        awaitClose { listener.remove() }
    }

    /**
     * Observa los saldos comerciales individuales del cliente (/users/{uid}/loyalty).
     */
    fun observeMerchantBalances(customerId: String): Flow<List<MerchantLoyaltyBalance>> = callbackFlow {
        if (customerId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val colRef = firestore.collection("users")
            .document(customerId)
            .collection("loyalty")

        val listener = colRef.addSnapshotListener { snapshot: QuerySnapshot?, error ->
            if (error != null) {
                Log.e(TAG, "Error escuchando saldos comerciales: ${error.message}", error)
                return@addSnapshotListener
            }

            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc: DocumentSnapshot ->
                    val data = doc.data ?: return@mapNotNull null
                    val balance = (data["pointsBalance"] as? Long)?.toInt() ?: 0
                    if (balance <= 0 && ((data["completedOrdersCount"] as? Long)?.toInt() ?: 0) <= 0) {
                        return@mapNotNull null
                    }
                    MerchantLoyaltyBalance(
                        businessId = doc.id,
                        businessName = data["businessName"] as? String ?: "Comercio",
                        businessLogoUrl = data["businessLogoUrl"] as? String ?: "",
                        pointsBalance = balance,
                        lifetimePointsEarned = (data["lifetimePointsEarned"] as? Long)?.toInt() ?: 0,
                        completedOrdersCount = (data["completedOrdersCount"] as? Long)?.toInt() ?: 0,
                        updatedAt = doc.getTimestamp("updatedAt")
                    )
                }.sortedByDescending { it.pointsBalance }

                trySend(list)
            } else {
                trySend(emptyList())
            }
        }

        awaitClose { listener.remove() }
    }

    /**
     * Observa el ledger inmutable de movimientos del cliente (/users/{uid}/loyaltyTransactions).
     */
    fun observeTransactions(customerId: String): Flow<List<LoyaltyTransactionItem>> = callbackFlow {
        if (customerId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val query = firestore.collection("users")
            .document(customerId)
            .collection("loyaltyTransactions")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)

        val listener = query.addSnapshotListener { snapshot: QuerySnapshot?, error ->
            if (error != null) {
                Log.e(TAG, "Error escuchando transacciones de fidelidad: ${error.message}", error)
                return@addSnapshotListener
            }

            if (snapshot != null) {
                val items = snapshot.documents.map { doc: DocumentSnapshot ->
                    val data = doc.data ?: emptyMap<String, Any>()
                    val allocList = (data["allocation"] as? List<*>)?.mapNotNull { item ->
                        val map = item as? Map<*, *> ?: return@mapNotNull null
                        LoyaltyAllocationItem(
                            businessId = map["businessId"] as? String ?: "",
                            businessName = map["businessName"] as? String ?: "",
                            points = (map["points"] as? Long)?.toInt() ?: 0
                        )
                    } ?: emptyList()

                    val comboSnapList = (data["comboSnapshot"] as? List<*>)?.mapNotNull { item ->
                        val map = item as? Map<*, *> ?: return@mapNotNull null
                        LoyaltyComboItem(
                            type = map["type"] as? String ?: "PRODUCT",
                            productId = map["productId"] as? String,
                            productName = map["productName"] as? String,
                            quantity = (map["quantity"] as? Long)?.toInt() ?: 1,
                            value = (map["value"] as? Number)?.toDouble() ?: 0.0,
                            businessId = map["businessId"] as? String,
                            businessName = map["businessName"] as? String
                        )
                    } ?: emptyList()

                    LoyaltyTransactionItem(
                        transactionId = doc.id,
                        customerId = data["customerId"] as? String ?: customerId,
                        businessId = data["businessId"] as? String ?: "",
                        businessName = data["businessName"] as? String ?: "Comercio",
                        orderId = data["orderId"] as? String,
                        rewardId = data["rewardId"] as? String,
                        rewardType = data["rewardType"] as? String ?: "FIXED_DISCOUNT",
                        couponCode = data["couponCode"] as? String,
                        type = data["type"] as? String ?: "EARN",
                        points = (data["points"] as? Long)?.toInt() ?: 0,
                        balanceBefore = (data["balanceBefore"] as? Long)?.toInt() ?: 0,
                        balanceAfter = (data["balanceAfter"] as? Long)?.toInt() ?: 0,
                        scope = data["scope"] as? String ?: "MERCHANT_SPECIFIC",
                        allocation = allocList,
                        comboSnapshot = comboSnapList,
                        description = data["description"] as? String ?: "",
                        createdAt = doc.getTimestamp("createdAt")
                    )
                }
                trySend(items)
            } else {
                trySend(emptyList())
            }
        }

        awaitClose { listener.remove() }
    }

    /**
     * Observa las recompensas activas configuradas por el administrador (/loyalty_rewards).
     */
    fun observeActiveRewards(): Flow<List<LoyaltyReward>> = callbackFlow {
        val query = firestore.collection("loyalty_rewards")
            .whereEqualTo("active", true)

        val listener = query.addSnapshotListener { snapshot: QuerySnapshot?, error ->
            if (error != null) {
                Log.e(TAG, "Error escuchando recompensas de fidelidad: ${error.message}", error)
                return@addSnapshotListener
            }

            if (snapshot != null) {
                val rewards = snapshot.documents.map { doc: DocumentSnapshot ->
                    val data = doc.data ?: emptyMap<String, Any>()
                    val comboItemsList = (data["comboItems"] as? List<*>)?.mapNotNull { item ->
                        val map = item as? Map<*, *> ?: return@mapNotNull null
                        LoyaltyComboItem(
                            type = map["type"] as? String ?: "PRODUCT",
                            productId = map["productId"] as? String,
                            productName = map["productName"] as? String,
                            quantity = (map["quantity"] as? Long)?.toInt() ?: 1,
                            value = (map["value"] as? Number)?.toDouble() ?: 0.0,
                            businessId = map["businessId"] as? String,
                            businessName = map["businessName"] as? String
                        )
                    } ?: emptyList()

                    LoyaltyReward(
                        id = doc.id,
                        name = data["name"] as? String ?: "Premio",
                        description = data["description"] as? String ?: "",
                        imageUrl = data["imageUrl"] as? String ?: "",
                        rewardType = data["rewardType"] as? String ?: "FIXED_DISCOUNT",
                        pointsCost = (data["pointsCost"] as? Long)?.toInt() ?: 50,
                        scope = data["scope"] as? String ?: "GLOBAL",
                        businessId = data["businessId"] as? String,
                        businessName = data["businessName"] as? String,
                        discountType = data["discountType"] as? String ?: "FIXED_AMOUNT",
                        discountValue = (data["discountValue"] as? Number)?.toDouble() ?: 0.0,
                        freeProductId = data["freeProductId"] as? String,
                        deliveryFree = data["deliveryFree"] as? Boolean ?: false,
                        comboItems = comboItemsList,
                        active = data["active"] as? Boolean ?: true,
                        maxRedemptions = (data["maxRedemptions"] as? Long)?.toInt(),
                        maxRedemptionsPerCustomer = (data["maxRedemptionsPerCustomer"] as? Long)?.toInt(),
                        currentRedemptionsCount = (data["currentRedemptionsCount"] as? Long)?.toInt() ?: 0,
                        validityDays = (data["validityDays"] as? Long)?.toInt() ?: 30,
                        startsAt = doc.getTimestamp("startAt"),
                        expiresAt = doc.getTimestamp("endAt")
                    )
                }.sortedBy { it.pointsCost }

                trySend(rewards)
            } else {
                trySend(emptyList())
            }
        }

        awaitClose { listener.remove() }
    }

    /**
     * Observa los niveles configurados en Firestore (/loyalty_levels).
     */
    fun observeLevels(): Flow<List<LoyaltyLevel>> = callbackFlow {
        val query = firestore.collection("loyalty_levels")
            .orderBy("sortOrder", Query.Direction.ASCENDING)

        val listener = query.addSnapshotListener { snapshot: QuerySnapshot?, error ->
            if (error != null) {
                Log.e(TAG, "Error escuchando niveles de fidelidad: ${error.message}", error)
                return@addSnapshotListener
            }

            if (snapshot != null && !snapshot.isEmpty) {
                val levels = snapshot.documents.map { doc: DocumentSnapshot ->
                    val data = doc.data ?: emptyMap<String, Any>()
                    val rawBenefits = (data["benefits"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                    LoyaltyLevel(
                        id = doc.id,
                        name = data["name"] as? String ?: "Nivel",
                        description = data["description"] as? String ?: "",
                        minPoints = (data["minPoints"] as? Long)?.toInt() ?: 0,
                        maxPoints = (data["maxPoints"] as? Long)?.toInt() ?: 0,
                        benefits = rawBenefits,
                        icon = data["icon"] as? String ?: "🏆",
                        sortOrder = (data["sortOrder"] as? Long)?.toInt() ?: 1,
                        active = data["active"] as? Boolean ?: true
                    )
                }
                trySend(levels)
            } else {
                trySend(getDefaultLevels())
            }
        }

        awaitClose { listener.remove() }
    }

    private fun getDefaultLevels(): List<LoyaltyLevel> = listOf(
        LoyaltyLevel("bronce", "Bronce", "Nivel de bienvenida", 0, 499, listOf("Acumula 10 pts por pedido completado"), "🥉", 1),
        LoyaltyLevel("plata", "Plata", "Cliente recurrente", 500, 999, listOf("Acceso a cupones promocionales", "Ofertas en comercios asociados"), "🥈", 2),
        LoyaltyLevel("oro", "Oro", "Cliente preferencial", 1000, 1999, listOf("Descuentos exclusivos", "Atención preferente"), "🥇", 3),
        LoyaltyLevel("platino", "Platino", "Cliente VIP", 2000, 4999, listOf("Delivery gratis mensual", "Acceso prioritario a lanzamientos"), "🏆", 4),
        LoyaltyLevel("diamante", "Diamante", "Cliente Elite", 5000, 0, listOf("Máxima prioridad de entrega", "Recompensas exclusivas"), "💎", 5)
    )

    /**
     * Canje atómico server-side de una recompensa invocando Cloud Function Callable.
     */
    suspend fun redeemReward(rewardId: String): Result<RedeemRewardResult> {
        return try {
            val payload = hashMapOf("rewardId" to rewardId)
            val result = functions.getHttpsCallable("redeemLoyaltyReward")
                .call(payload)
                .await()

            val map = result.data as? Map<*, *>
            if (map != null && map["success"] == true) {
                val couponCode = map["couponCode"] as? String
                val pointsRedeemed = (map["pointsRedeemed"] as? Number)?.toInt() ?: 0
                val remainingGlobalPoints = (map["remainingGlobalPoints"] as? Number)?.toInt() ?: 0
                val rewardName = map["rewardName"] as? String ?: "Premio"
                val rewardType = map["rewardType"] as? String ?: "FIXED_DISCOUNT"

                val allocList = (map["allocation"] as? List<*>)?.mapNotNull { item ->
                    val m = item as? Map<*, *> ?: return@mapNotNull null
                    LoyaltyAllocationItem(
                        businessId = m["businessId"] as? String ?: "",
                        businessName = m["businessName"] as? String ?: "",
                        points = (m["points"] as? Number)?.toInt() ?: 0
                    )
                } ?: emptyList()

                val comboSnapList = (map["comboSnapshot"] as? List<*>)?.mapNotNull { item ->
                    val m = item as? Map<*, *> ?: return@mapNotNull null
                    LoyaltyComboItem(
                        type = m["type"] as? String ?: "PRODUCT",
                        productId = m["productId"] as? String,
                        productName = m["productName"] as? String,
                        quantity = (m["quantity"] as? Number)?.toInt() ?: 1,
                        value = (m["value"] as? Number)?.toDouble() ?: 0.0,
                        businessId = m["businessId"] as? String,
                        businessName = m["businessName"] as? String
                    )
                } ?: emptyList()

                Result.success(
                    RedeemRewardResult(
                        success = true,
                        message = map["message"] as? String ?: "¡Premio canjeado con éxito!",
                        couponCode = couponCode,
                        pointsRedeemed = pointsRedeemed,
                        remainingGlobalPoints = remainingGlobalPoints,
                        rewardName = rewardName,
                        rewardType = rewardType,
                        comboSnapshot = comboSnapList,
                        allocation = allocList
                    )
                )
            } else {
                Result.failure(Exception("Respuesta inválida del servidor de fidelidad."))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al canjear recompensa: ${e.message}", e)
            Result.failure(e)
        }
    }
}
