package com.example.domain.engine.courier

import com.example.CourierFinancialItem
import com.example.CourierFinancesState
import com.example.FinanceDateFilter
import com.example.LineOfBusinessSummary
import com.example.PedidoOfrecido
import java.util.Calendar

/**
 * Motor de Cálculo Financiero del Motorizado por Línea de Negocio (Actividad #13).
 *
 * Principios:
 * 1. Cero recálculo de fórmulas de negocio: consume los valores autoritativos ya fijados en el documento.
 * 2. Partición matemática disjunta: Commerce Delivery vs X→Y Delivery (Total = Commerce + X→Y).
 * 3. Idempotencia y sin duplicación: distinctBy { it.id }.
 * 4. Trazabilidad exacta hacia la orden/encomienda.
 */
object CourierFinanceCalculator {

    fun calculateFilterBounds(
        filter: FinanceDateFilter,
        customStart: Long? = null,
        customEnd: Long? = null,
        nowMs: Long = System.currentTimeMillis()
    ): Pair<Long, Long> {
        val calendar = Calendar.getInstance().apply { timeInMillis = nowMs }

        return when (filter) {
            FinanceDateFilter.TODAY -> {
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                val start = calendar.timeInMillis
                calendar.set(Calendar.HOUR_OF_DAY, 23)
                calendar.set(Calendar.MINUTE, 59)
                calendar.set(Calendar.SECOND, 59)
                calendar.set(Calendar.MILLISECOND, 999)
                val end = calendar.timeInMillis
                Pair(start, end)
            }
            FinanceDateFilter.YESTERDAY -> {
                calendar.add(Calendar.DAY_OF_YEAR, -1)
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                val start = calendar.timeInMillis
                calendar.set(Calendar.HOUR_OF_DAY, 23)
                calendar.set(Calendar.MINUTE, 59)
                calendar.set(Calendar.SECOND, 59)
                calendar.set(Calendar.MILLISECOND, 999)
                val end = calendar.timeInMillis
                Pair(start, end)
            }
            FinanceDateFilter.THIS_WEEK -> {
                calendar.add(Calendar.DAY_OF_YEAR, -6)
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                val start = calendar.timeInMillis
                val end = nowMs
                Pair(start, end)
            }
            FinanceDateFilter.THIS_MONTH -> {
                calendar.set(Calendar.DAY_OF_MONTH, 1)
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                val start = calendar.timeInMillis
                val maxDay = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
                calendar.set(Calendar.DAY_OF_MONTH, maxDay)
                calendar.set(Calendar.HOUR_OF_DAY, 23)
                calendar.set(Calendar.MINUTE, 59)
                calendar.set(Calendar.SECOND, 59)
                calendar.set(Calendar.MILLISECOND, 999)
                val end = calendar.timeInMillis
                Pair(start, end)
            }
            FinanceDateFilter.CUSTOM -> {
                val start = customStart ?: (nowMs - 86400000L)
                val end = customEnd ?: nowMs
                Pair(start, end)
            }
        }
    }

    fun computeFinances(
        orders: List<PedidoOfrecido>,
        filter: FinanceDateFilter,
        customStart: Long? = null,
        customEnd: Long? = null,
        nowMs: Long = System.currentTimeMillis(),
        overdueNotice: com.example.OverdueClosureNotice? = null
    ): CourierFinancesState {
        val (startTs, endTs) = calculateFilterBounds(filter, customStart, customEnd, nowMs)

        // 1. Desduplicación estricta por Document ID
        val uniqueOrders = orders.distinctBy { it.id }

        // 2. Filtrar por rango temporal canónico
        val filteredOrders = uniqueOrders.filter { order ->
            val ts = order.getFinancialTimestamp()
            if (ts == 0L) true else ts in startTs..endTs
        }

        // 3. Mapear a ítems financieros con trazabilidad
        val financialItems = filteredOrders.map { order ->
            val statusLower = (order.status.ifBlank { order.estado }).lowercase().trim()
            val isCompleted = statusLower in listOf("completed", "completado", "delivered", "entregado")
            val isXToY = order.serviceType == "X_TO_Y_DELIVERY"
            val paymentMethodLower = order.pagoMetodo.ifBlank { "efectivo" }.lowercase().trim()
            val isCash = paymentMethodLower in listOf("efectivo", "cash")

            // Ganancia realizada y desgloses autoritativos:
            // 1. Ganancia total
            val earning = if (isCompleted) {
                if (order.courierTotalEarnings > 0.0) {
                    order.courierTotalEarnings
                } else if (order.courierDistanceEarnings > 0.0) {
                    order.courierDistanceEarnings + order.tip
                } else if (isXToY) {
                    if (order.gananciaRepartidor > 0.0 && order.total > 0.0 && order.gananciaRepartidor < order.total) {
                        order.gananciaRepartidor
                    } else if (order.routeDistanceKm > 0.0 && order.courierRatePerKmApplied > 0.0) {
                        order.routeDistanceKm * order.courierRatePerKmApplied
                    } else if (order.gananciaRepartidor > 0.0) {
                        order.gananciaRepartidor
                    } else {
                        order.calculatedFee
                    }
                } else {
                    order.gananciaRepartidor + order.tip
                }
            } else 0.0

            // 2. Distancia y Desglose de Ganancias
            val distanceKm = if (order.routeDistanceKm > 0.0) {
                order.routeDistanceKm
            } else if (order.routeDistanceMeters > 0L) {
                order.routeDistanceMeters.toDouble() / 1000.0
            } else {
                order.distanceKm
            }

            val rateApplied = order.courierRatePerKmApplied
            val distanceEarnings = if (isCompleted) {
                if (order.courierDistanceEarnings > 0.0) {
                    order.courierDistanceEarnings
                } else if (rateApplied > 0.0 && distanceKm > 0.0) {
                    distanceKm * rateApplied
                } else 0.0
            } else 0.0

            val bonusEarnings = if (isCompleted) {
                if (order.courierBonusEarnings > 0.0) {
                    order.courierBonusEarnings
                } else {
                    order.courierOrderBonusApplied
                }
            } else 0.0

            val tipAmount = if (isCompleted) {
                if (order.courierTipEarnings > 0.0) order.courierTipEarnings else order.tip
            } else 0.0

            val orderTotal = if (order.total > 0.0) {
                order.total
            } else if (isXToY) {
                val canonFee = if (order.deliveryFee > 0.0) order.deliveryFee else (order.customerOffer ?: 0.0)
                if (canonFee > 0.0) canonFee else (earning + tipAmount + order.additionalCharge)
            } else {
                order.gananciaRepartidor + order.subtotalProductos + tipAmount + order.additionalCharge
            }

            val cashCollected = if (isCompleted && isCash) {
                if (order.cashReceived > 0.0) order.cashReceived else orderTotal
            } else 0.0

            val productSubtotal = if (!isXToY && isCompleted) {
                if (order.subtotalProductos > 0.0) {
                    order.subtotalProductos
                } else if (orderTotal > order.gananciaRepartidor) {
                    orderTotal - order.gananciaRepartidor - tipAmount - order.additionalCharge
                } else 0.0
            } else 0.0

            val deliveryFee = if (isCompleted) {
                if (order.deliveryFee > 0.0) order.deliveryFee else if (isXToY) earning else order.gananciaRepartidor
            } else 0.0

            val entityName = if (isXToY) {
                if (order.senderName.isNotBlank()) "Remitente: ${order.senderName}" else "Encomienda X→Y"
            } else {
                order.comercioNombre.ifBlank { "Comercio Local" }
            }

            val route = if (isXToY) {
                val orig = order.comercioDireccion.ifBlank { "Origen X" }
                val dest = order.clienteDireccion.ifBlank { "Destino Y" }
                "$orig → $dest"
            } else {
                order.clienteDireccion.ifBlank { "Dirección Cliente" }
            }

            CourierFinancialItem(
                orderId = order.id,
                serviceType = if (isXToY) "X_TO_Y_DELIVERY" else "COMMERCE_DELIVERY",
                referenceNumber = "#${order.displayOrderCode.removePrefix("#")}",
                entityName = entityName,
                routeDescription = route,
                status = order.status,
                paymentMethod = order.pagoMetodo.ifBlank { "Efectivo" },
                earningAmount = earning,
                totalAmount = orderTotal,
                cashReceived = cashCollected,
                deliveryFee = deliveryFee,
                productSubtotal = productSubtotal,
                tipAmount = tipAmount,
                additionalCharge = if (isCompleted) order.additionalCharge else 0.0,
                distanceKm = distanceKm,
                ratePerKmApplied = rateApplied,
                distanceEarnings = distanceEarnings,
                bonusEarnings = bonusEarnings,
                tipEarnings = tipAmount,
                compensatedAmount = if (order.compensatedAmount > 0.0) order.compensatedAmount else (if (isCompleted && isCash) minOf(cashCollected, earning) else 0.0),
                distanceSource = order.distanceSource,
                timestamp = order.getFinancialTimestamp(),
                isCompleted = isCompleted
            )
        }.sortedByDescending { it.timestamp }

        // 4. Partición disjunta por línea de negocio
        val commerceCompleted = financialItems.filter { it.serviceType == "COMMERCE_DELIVERY" && it.isCompleted }
        val xToYCompleted = financialItems.filter { it.serviceType == "X_TO_Y_DELIVERY" && it.isCompleted }

        val commerceEarnings = commerceCompleted.sumOf { it.earningAmount }
        val commerceCash = commerceCompleted.sumOf { it.cashReceived }
        val commerceBilled = commerceCompleted.sumOf { it.totalAmount }
        val commerceTips = commerceCompleted.sumOf { it.tipAmount }
        val commerceDeliveryFees = commerceCompleted.sumOf { it.deliveryFee }
        val commerceProducts = commerceCompleted.sumOf { it.productSubtotal }
        val commerceAddCharges = commerceCompleted.sumOf { it.additionalCharge }
        val commerceDistKm = commerceCompleted.sumOf { it.distanceKm }
        val commerceDistEarnings = commerceCompleted.sumOf { it.distanceEarnings }
        val commerceBonusEarnings = commerceCompleted.sumOf { it.bonusEarnings }
        val commerceCompensated = commerceCompleted.sumOf { it.compensatedAmount }

        val xToYEarnings = xToYCompleted.sumOf { it.earningAmount }
        val xToYCash = xToYCompleted.sumOf { it.cashReceived }
        val xToYBilled = xToYCompleted.sumOf { it.totalAmount }
        val xToYTips = xToYCompleted.sumOf { it.tipAmount }
        val xToYDeliveryFees = xToYCompleted.sumOf { it.deliveryFee }
        val xToYAddCharges = xToYCompleted.sumOf { it.additionalCharge }
        val xToYDistKm = xToYCompleted.sumOf { it.distanceKm }
        val xToYDistEarnings = xToYCompleted.sumOf { it.distanceEarnings }
        val xToYBonusEarnings = xToYCompleted.sumOf { it.bonusEarnings }
        val xToYCompensated = xToYCompleted.sumOf { it.compensatedAmount }

        val grandEarnings = commerceEarnings + xToYEarnings
        val grandCash = commerceCash + xToYCash
        val grandBilled = commerceBilled + xToYBilled
        val grandTips = commerceTips + xToYTips
        val grandDeliveryFees = commerceDeliveryFees + xToYDeliveryFees
        val grandProducts = commerceProducts
        val grandAddCharges = commerceAddCharges + xToYAddCharges
        val grandDistKm = commerceDistKm + xToYDistKm
        val grandDistEarnings = commerceDistEarnings + xToYDistEarnings
        val grandBonusEarnings = commerceBonusEarnings + xToYBonusEarnings
        val grandCompensated = commerceCompensated + xToYCompensated

        return CourierFinancesState(
            selectedFilter = filter,
            customStartDateMs = customStart,
            customEndDateMs = customEnd,
            commerceSummary = LineOfBusinessSummary(
                lineName = "Delivery Comercio",
                serviceType = "COMMERCE_DELIVERY",
                count = commerceCompleted.size,
                totalEarnings = commerceEarnings,
                totalBilled = commerceBilled,
                totalCashReceived = commerceCash,
                totalTips = commerceTips,
                totalDeliveryFees = commerceDeliveryFees,
                totalProductsAmount = commerceProducts,
                totalAdditionalCharges = commerceAddCharges,
                totalOutstandingSettlement = commerceCash,
                totalDistanceKm = commerceDistKm,
                totalDistanceEarnings = commerceDistEarnings,
                totalBonusEarnings = commerceBonusEarnings,
                totalCompensated = commerceCompensated
            ),
            xToYSummary = LineOfBusinessSummary(
                lineName = "Punto A → Punto B",
                serviceType = "X_TO_Y_DELIVERY",
                count = xToYCompleted.size,
                totalEarnings = xToYEarnings,
                totalBilled = xToYBilled,
                totalCashReceived = xToYCash,
                totalTips = xToYTips,
                totalDeliveryFees = xToYDeliveryFees,
                totalProductsAmount = 0.0,
                totalAdditionalCharges = xToYAddCharges,
                totalOutstandingSettlement = xToYCash,
                totalDistanceKm = xToYDistKm,
                totalDistanceEarnings = xToYDistEarnings,
                totalBonusEarnings = xToYBonusEarnings,
                totalCompensated = xToYCompensated
            ),
            totalGeneralEarnings = grandEarnings,
            totalGeneralCashReceived = grandCash,
            totalGeneralBilled = grandBilled,
            totalGeneralTips = grandTips,
            totalGeneralDeliveryFees = grandDeliveryFees,
            totalGeneralProductsAmount = grandProducts,
            totalGeneralAdditionalCharges = grandAddCharges,
            totalGeneralOutstandingSettlement = grandCash,
            totalGeneralDistanceKm = grandDistKm,
            totalGeneralDistanceEarnings = grandDistEarnings,
            totalGeneralBonusEarnings = grandBonusEarnings,
            totalGeneralCompensated = grandCompensated,
            totalGeneralPayableBalance = 0.0,
            totalGeneralRequiredDeposit = Math.max(0.0, grandCash - grandCompensated),
            totalGeneralCount = commerceCompleted.size + xToYCompleted.size,
            items = financialItems,
            overduePendingClosure = overdueNotice,
            isLoading = false,
            errorMessage = null
        )
    }
}
