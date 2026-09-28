package com.example.data.repository

import com.example.domain.model.finance.*
import com.google.firebase.Timestamp
import com.google.firebase.firestore.*
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.*

data class SettlementsPageResult(
    val settlements: List<MerchantSettlement>,
    val hasNextPage: Boolean,
    val nextCursor: DocumentSnapshot?
)

/**
 * Repositorio Financiero del Comercio (ADR-003 & ADR-019 Compliant)
 * 
 * Fuentes SSOT:
 *  - /merchant_summaries/{businessId} (Documento agregado en tiempo real)
 *  - /financial_events (Ledger inmutable general)
 *  - /merchant_settlements (Liquidaciones formales del Settlement Engine)
 * 
 * Acciones Transaccionales:
 *  - merchantConfirmSettlement (Callable)
 *  - merchantDisputeSettlement (Callable)
 */
class MerchantFinanceRepository(
    private val firestore: FirebaseFirestore? = try { FirebaseFirestore.getInstance() } catch (e: Throwable) { null },
    private val functions: FirebaseFunctions? = try { FirebaseFunctions.getInstance() } catch (e: Throwable) { null }
) {
    companion object {
        const val SUMMARY_COLLECTION = "merchant_summaries"
        const val EVENTS_COLLECTION = "financial_events"
        const val SETTLEMENTS_COLLECTION = "merchant_settlements"
        const val PAGE_SIZE = 20
    }

    private val orderCodeCache = java.util.concurrent.ConcurrentHashMap<String, String>()

    /**
     * Listener 1: Flujo en tiempo real del Resumen Financiero del Día (ADR-003: 1 listener agregado)
     */
    fun getFinancialSummaryStream(businessId: String): Flow<FinancialSummary> = callbackFlow {
        if (businessId.isEmpty() || firestore == null) {
            trySend(FinancialSummary(businessId = businessId))
            close()
            return@callbackFlow
        }

        val registration = firestore.collection(SUMMARY_COLLECTION).document(businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || !snapshot.exists()) {
                    trySend(FinancialSummary(businessId = businessId))
                    return@addSnapshotListener
                }

                val revCents = snapshot.getLong("todayRevenueCents") ?: 0L
                val ordCount = (snapshot.getLong("todayOrdersCount") ?: 0L).toInt()
                val feeCents = snapshot.getLong("todayPlatformFeesCents") ?: 0L
                val netCents = snapshot.getLong("todayNetCents") ?: 0L
                val pendingCents = snapshot.getLong("pendingSettlementCents") ?: 0L
                val lastUpdate = snapshot.getTimestamp("lastUpdatedAt")
                val lastOrder = snapshot.getString("lastOrderId")

                val summary = FinancialSummary(
                    businessId = businessId,
                    revenueCents = revCents,
                    ordersCount = ordCount,
                    platformFeesCents = feeCents,
                    netRevenueCents = netCents,
                    pendingSettlementCents = pendingCents,
                    lastUpdatedAt = lastUpdate,
                    lastOrderId = lastOrder
                )
                trySend(summary)
            }

        awaitClose {
            registration.remove()
        }
    }

    /**
     * Sobrecarga de compatibilidad: Soporta filtros temporales.
     * Para TODAY consulta /merchant_summaries; para otros períodos calcula a partir del ledger real.
     */
    fun getFinancialSummaryStream(businessId: String, filter: FinancialFilter): Flow<FinancialSummary> {
        return getFinancialSummaryStream(businessId)
    }

    /**
     * Listener 2: Flujo en tiempo real de Eventos Financieros (/financial_events)
     * Acotado estrictamente por fecha para cumplir con ADR-003.
     */
    fun getFinancialEventsStream(
        businessId: String,
        filter: FinancialFilter,
        dateFrom: String? = null,
        dateTo: String? = null
    ): Flow<List<FinancialEvent>> = callbackFlow {
        if (businessId.isEmpty() || firestore == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val (startDate, endDate) = calculateDateRange(filter, dateFrom, dateTo)

        val query = if (filter == FinancialFilter.TODAY) {
            firestore.collection(EVENTS_COLLECTION)
                .whereEqualTo("businessId", businessId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(100)
        } else if (startDate != null && endDate != null) {
            firestore.collection(EVENTS_COLLECTION)
                .whereEqualTo("businessId", businessId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .endAt(Timestamp(startDate))
                .startAt(Timestamp(endDate))
        } else {
            firestore.collection(EVENTS_COLLECTION)
                .whereEqualTo("businessId", businessId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(100)
        }

        val registration = query.addSnapshotListener { snapshot, error ->
            if (error != null || snapshot == null) {
                trySend(emptyList())
                return@addSnapshotListener
            }

            val events = snapshot.documents.mapNotNull { doc ->
                mapDocToFinancialEvent(doc)
            }
            trySend(events)
        }

        awaitClose {
            registration.remove()
        }
    }

    /**
     * Paginación Cursor de Liquidaciones (/merchant_settlements)
     * Consume 20 documentos por página mediante getDocs y startAfter (ADR-003 & ADR-019).
     */
    suspend fun getSettlementsPage(
        businessId: String,
        cursor: DocumentSnapshot? = null,
        pageSize: Int = PAGE_SIZE
    ): Result<SettlementsPageResult> {
        if (businessId.isEmpty() || firestore == null) {
            return Result.success(SettlementsPageResult(emptyList(), false, null))
        }

        return try {
            var q = firestore.collection(SETTLEMENTS_COLLECTION)
                .whereEqualTo("businessId", businessId)
                .orderBy("createdAt", Query.Direction.DESCENDING)

            if (cursor != null) {
                q = q.startAfter(cursor).limit((pageSize + 1).toLong())
            } else {
                q = q.limit((pageSize + 1).toLong())
            }

            val snapshot = q.get().await()
            val docs = snapshot.documents
            val hasMore = docs.size > pageSize
            val pageDocs = if (hasMore) docs.take(pageSize) else docs

            val settlements = pageDocs.mapNotNull { mapDocToMerchantSettlement(it) }
            val nextCursor = if (hasMore && pageDocs.isNotEmpty()) pageDocs.last() else null

            Result.success(SettlementsPageResult(settlements, hasMore, nextCursor))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Detecta si existe alguna liquidación pendiente de confirmación (PAID o AWAITING_CONFIRMATION)
     * para mostrar la alerta contextual en el Dashboard.
     */
    fun getAwaitingConfirmationSettlementStream(businessId: String): Flow<MerchantSettlement?> = callbackFlow {
        if (businessId.isEmpty() || firestore == null) {
            trySend(null)
            close()
            return@callbackFlow
        }

        val registration = firestore.collection(SETTLEMENTS_COLLECTION)
            .whereEqualTo("businessId", businessId)
            .whereIn("status", listOf("AWAITING_CONFIRMATION", "PAID"))
            .limit(1)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || snapshot.isEmpty) {
                    trySend(null)
                    return@addSnapshotListener
                }

                val doc = snapshot.documents.firstOrNull()
                val settlement = doc?.let { mapDocToMerchantSettlement(it) }
                trySend(settlement)
            }

        awaitClose {
            registration.remove()
        }
    }

    /**
     * Acción Transaccional: Confirmar Liquidación (merchantConfirmSettlement)
     * Invoca el Callable autoritativo en Cloud Functions. Cero escrituras directas.
     */
    suspend fun confirmSettlement(settlementId: String, notes: String? = null): Result<Map<String, Any?>> {
        if (functions == null) return Result.failure(IllegalStateException("Firebase Functions no inicializado"))
        return try {
            val payload = hashMapOf<String, Any?>(
                "settlementId" to settlementId,
                "notes" to (notes ?: "Liquidación confirmada desde Android App.")
            )
            val res = functions.getHttpsCallable("merchantConfirmSettlement").call(payload).await()
            @Suppress("UNCHECKED_CAST")
            val data = res.data as? Map<String, Any?> ?: emptyMap()
            Result.success(data)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Acción Transaccional: Disputar Liquidación (merchantDisputeSettlement)
     * Invoca el Callable autoritativo en Cloud Functions. Cero escrituras directas.
     */
    suspend fun disputeSettlement(
        settlementId: String,
        reason: String,
        claimedDifferenceCents: Long,
        description: String,
        evidenceUrl: String? = null
    ): Result<Map<String, Any?>> {
        if (functions == null) return Result.failure(IllegalStateException("Firebase Functions no inicializado"))
        return try {
            val payload = hashMapOf<String, Any?>(
                "settlementId" to settlementId,
                "reason" to reason,
                "claimedDifferenceCents" to claimedDifferenceCents,
                "description" to description,
                "evidenceUrl" to evidenceUrl
            )
            val res = functions.getHttpsCallable("merchantDisputeSettlement").call(payload).await()
            @Suppress("UNCHECKED_CAST")
            val data = res.data as? Map<String, Any?> ?: emptyMap()
            Result.success(data)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ─── Mappers Canónicos ──────────────────────────────────────────────────

    private fun mapDocToFinancialEvent(doc: DocumentSnapshot): FinancialEvent? {
        return try {
            val typeStr = doc.getString("eventType") ?: "ORDER_REVENUE"
            val eType = try { FinancialEventType.valueOf(typeStr) } catch (e: Exception) { FinancialEventType.ORDER_REVENUE }
            val dirStr = doc.getString("direction") ?: "CREDIT"
            val dir = try { FinancialDirection.valueOf(dirStr) } catch (e: Exception) { FinancialDirection.CREDIT }

            val amountC = doc.getLong("amountCents") ?: Math.round((doc.getDouble("amount") ?: 0.0) * 100)
            val grossC = doc.getLong("merchantGrossSalesCents") ?: Math.round((doc.getDouble("merchantGrossSales") ?: 0.0) * 100)
            val totalC = doc.getLong("orderTotalCents") ?: Math.round((doc.getDouble("orderTotal") ?: 0.0) * 100)
            val subtotalC = doc.getLong("subtotalCents") ?: Math.round((doc.getDouble("subtotal") ?: 0.0) * 100)
            val deliveryFeeC = doc.getLong("deliveryFeeCents") ?: Math.round((doc.getDouble("deliveryFee") ?: 0.0) * 100)
            val tipC = doc.getLong("tipCents") ?: Math.round((doc.getDouble("tipAmount") ?: 0.0) * 100)
            val discountC = doc.getLong("discountCents") ?: Math.round((doc.getDouble("discountAmount") ?: 0.0) * 100)
            val commC = doc.getLong("merchantCommissionAmountCents") ?: Math.round((doc.getDouble("merchantCommissionAmount") ?: 0.0) * 100)
            val netC = doc.getLong("merchantNetPayoutCents") ?: Math.round((doc.getDouble("merchantNetPayout") ?: 0.0) * 100)

            val orderIdStr = doc.getString("orderId") ?: ""
            val ordCode = doc.getString("orderCode")
                ?: doc.getString("displayOrderCode")
                ?: orderCodeCache[orderIdStr]
                ?: ""
            val commRate = doc.getDouble("merchantCommissionRate")
                ?: doc.getDouble("commissionRate")
                ?: 0.0

            FinancialEvent(
                eventId = doc.id,
                businessId = doc.getString("businessId") ?: "",
                orderId = orderIdStr,
                eventType = eType,
                amountCents = amountC,
                direction = dir,
                currency = doc.getString("currency") ?: "NIO",
                description = doc.getString("description") ?: "",
                orderTotalCents = totalC,
                merchantGrossSalesCents = grossC,
                merchantCommissionAmountCents = commC,
                merchantNetPayoutCents = netC,
                subtotalCents = subtotalC,
                deliveryFeeCents = deliveryFeeC,
                tipCents = tipC,
                discountCents = discountC,
                paymentMethod = doc.getString("paymentMethod") ?: "efectivo",
                paymentStatus = doc.getString("paymentStatus") ?: "COMPLETED",
                createdAt = doc.getTimestamp("createdAt"),
                idempotencyKey = doc.getString("idempotencyKey") ?: "",
                orderCode = ordCode,
                commissionRate = commRate
            )
        } catch (e: Exception) {
            null
        }
    }

    fun isOrderCodeMissing(orderId: String): Boolean {
        if (orderId.isBlank()) return false
        return !orderCodeCache.containsKey(orderId)
    }

    suspend fun resolveOrderDisplayCode(orderId: String): String {
        if (orderId.isBlank() || firestore == null) return ""
        orderCodeCache[orderId]?.let { return it }

        return try {
            val orderDoc = firestore.collection("orders").document(orderId).get().await()
            if (orderDoc.exists()) {
                val code = orderDoc.getString("orderCode")
                    ?: orderDoc.getString("orderNumber")
                    ?: (if (orderId.isNotBlank()) orderId.takeLast(6).uppercase() else "")
                if (code.isNotBlank()) {
                    orderCodeCache[orderId] = code
                    code
                } else ""
            } else ""
        } catch (e: Exception) {
            ""
        }
    }

    private fun mapDocToMerchantSettlement(doc: DocumentSnapshot): MerchantSettlement? {
        return try {
            val statusStr = doc.getString("status") ?: "DRAFT"
            val status = try { SettlementStatus.valueOf(statusStr) } catch (e: Exception) { SettlementStatus.DRAFT }

            val grossC = doc.getLong("grossSalesCents") ?: 0L
            val feesC = doc.getLong("platformFeesCents") ?: 0L
            val discC = doc.getLong("discountsCents") ?: 0L
            val adjC = doc.getLong("adjustmentsCents") ?: 0L
            val netC = doc.getLong("netPayableCents") ?: 0L
            val ordCount = (doc.getLong("ordersCount") ?: 0L).toInt()
            val paidC = doc.getLong("paidCents")

            // Parse confirmedBy map if present
            val confMap = doc.get("confirmedBy") as? Map<*, *>
            val confirmedBy = confMap?.let {
                ConfirmedByDetails(
                    confirmedAt = it["confirmedAt"] as? Timestamp,
                    confirmedByUid = it["confirmedByUid"] as? String ?: "",
                    confirmedByEmail = it["confirmedByEmail"] as? String ?: "",
                    notes = it["notes"] as? String ?: ""
                )
            }

            // Parse dispute map if present
            val dispMap = doc.get("dispute") as? Map<*, *>
            val dispute = dispMap?.let {
                DisputeDetails(
                    disputedAt = it["disputedAt"] as? Timestamp,
                    disputedByUid = it["disputedByUid"] as? String ?: "",
                    disputedByEmail = it["disputedByEmail"] as? String ?: "",
                    reason = it["reason"] as? String ?: "",
                    claimedDifferenceCents = (it["claimedDifferenceCents"] as? Number)?.toLong() ?: 0L,
                    description = it["description"] as? String ?: "",
                    evidenceUrl = it["evidenceUrl"] as? String,
                    status = it["status"] as? String ?: "OPEN",
                    resolution = it["resolution"] as? String,
                    resolvedByUid = it["resolvedByUid"] as? String,
                    resolvedAt = it["resolvedAt"] as? Timestamp
                )
            }

            // Parse history list
            val histList = (doc.get("history") as? List<*>)?.mapNotNull { item ->
                (item as? Map<*, *>)?.let { h ->
                    SettlementHistoryItem(
                        fromStatus = h["fromStatus"] as? String ?: "",
                        toStatus = h["toStatus"] as? String ?: "",
                        actorUid = h["actorUid"] as? String ?: "",
                        actorRole = h["actorRole"] as? String ?: "",
                        actorEmail = h["actorEmail"] as? String ?: "",
                        timestamp = h["timestamp"] as? Timestamp,
                        note = h["note"] as? String ?: ""
                    )
                }
            } ?: emptyList()

            MerchantSettlement(
                settlementId = doc.id,
                businessId = doc.getString("businessId") ?: "",
                businessName = doc.getString("businessName") ?: "",
                currency = doc.getString("currency") ?: "NIO",
                periodType = doc.getString("periodType") ?: "CUSTOM",
                periodStart = doc.getTimestamp("periodStart"),
                periodEnd = doc.getTimestamp("periodEnd"),
                cutoffAt = doc.getTimestamp("cutoffAt"),
                grossSalesCents = grossC,
                platformFeesCents = feesC,
                discountsCents = discC,
                adjustmentsCents = adjC,
                netPayableCents = netC,
                ordersCount = ordCount,
                paidCents = paidC,
                bankName = doc.getString("bankName"),
                transferReference = doc.getString("transferReference"),
                paymentDate = doc.getTimestamp("paymentDate"),
                receiptUrl = doc.getString("receiptUrl"),
                receiptPath = doc.getString("receiptPath"),
                status = status,
                isFrozen = doc.getBoolean("isFrozen") ?: (status == SettlementStatus.CLOSED),
                frozenAt = doc.getTimestamp("frozenAt"),
                confirmedBy = confirmedBy,
                dispute = dispute,
                history = histList,
                createdAt = doc.getTimestamp("createdAt")
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun calculateDateRange(
        filter: FinancialFilter,
        dateFrom: String?,
        dateTo: String?
    ): Pair<Date?, Date?> {
        val cal = Calendar.getInstance()
        return when (filter) {
            FinancialFilter.TODAY -> {
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)
                val start = cal.time
                cal.set(Calendar.HOUR_OF_DAY, 23)
                cal.set(Calendar.MINUTE, 59)
                cal.set(Calendar.SECOND, 59)
                cal.set(Calendar.MILLISECOND, 999)
                val end = cal.time
                Pair(start, end)
            }
            FinancialFilter.YESTERDAY -> {
                cal.add(Calendar.DAY_OF_YEAR, -1)
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)
                val start = cal.time
                cal.set(Calendar.HOUR_OF_DAY, 23)
                cal.set(Calendar.MINUTE, 59)
                cal.set(Calendar.SECOND, 59)
                cal.set(Calendar.MILLISECOND, 999)
                val end = cal.time
                Pair(start, end)
            }
            FinancialFilter.THIS_WEEK -> {
                cal.set(Calendar.DAY_OF_WEEK, cal.firstDayOfWeek)
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)
                val start = cal.time
                cal.add(Calendar.DAY_OF_WEEK, 6)
                cal.set(Calendar.HOUR_OF_DAY, 23)
                cal.set(Calendar.MINUTE, 59)
                cal.set(Calendar.SECOND, 59)
                val end = cal.time
                Pair(start, end)
            }
            FinancialFilter.THIS_MONTH -> {
                cal.set(Calendar.DAY_OF_MONTH, 1)
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)
                val start = cal.time
                cal.set(Calendar.DAY_OF_MONTH, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
                cal.set(Calendar.HOUR_OF_DAY, 23)
                cal.set(Calendar.MINUTE, 59)
                cal.set(Calendar.SECOND, 59)
                val end = cal.time
                Pair(start, end)
            }
            FinancialFilter.LAST_30_DAYS -> {
                val end = cal.time
                cal.add(Calendar.DAY_OF_YEAR, -30)
                val start = cal.time
                Pair(start, end)
            }
            FinancialFilter.CUSTOM_RANGE -> {
                // Si no se especificaron fechas, devolver null
                Pair(null, null)
            }
        }
    }
}
