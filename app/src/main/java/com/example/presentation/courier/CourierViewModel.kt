package com.example.presentation.courier

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.dao.OfflineOrderDao
import com.example.data.local.entity.OfflineOrderEntity
import com.example.data.sync.SyncManager
import com.example.domain.engine.courier.*
import com.example.domain.model.courier.*
import com.example.domain.security.TrustAssessment
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class CourierViewModel(
    private val offlineOrderDao: OfflineOrderDao,
    private val syncManager: SyncManager,
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    val shiftEngine: ShiftEngine = ShiftEngine(),
    val incidentEngine: IncidentEngine = IncidentEngine(),
    val podEngine: ProofOfDeliveryEngine = ProofOfDeliveryEngine(),
    val settlementEngine: SettlementEngine = SettlementEngine(),
    val vehicleEngine: VehicleEngine = VehicleEngine(),
    val performanceEngine: PerformanceEngine = PerformanceEngine(),
    val trustEngine: CourierTrustEngine = CourierTrustEngine(),
    val notificationEngine: CourierNotificationEngine = CourierNotificationEngine(),
    val rewardEngine: CourierRewardEngine = CourierRewardEngine(),
    val availabilityEngine: CourierAvailabilityEngine = CourierAvailabilityEngine(),
    val mapIntelligenceEngine: MapIntelligenceEngine = MapIntelligenceEngine()
) : ViewModel() {

    private val firebaseManager = com.example.FirebaseManager()
    private val _motorizadoId = MutableStateFlow<String>("")

    private var courierProfileListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var userProfileListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var profileRequestsListener: com.google.firebase.firestore.ListenerRegistration? = null

    private val _officialProfile = MutableStateFlow<CourierOfficialProfile?>(null)
    val officialProfile: StateFlow<CourierOfficialProfile?> = _officialProfile.asStateFlow()

    private val _profileRequests = MutableStateFlow<List<CourierProfileRequest>>(emptyList())
    val profileRequests: StateFlow<List<CourierProfileRequest>> = _profileRequests.asStateFlow()

    val activePendingRequest: StateFlow<CourierProfileRequest?> = _profileRequests
        .map { list -> list.firstOrNull { it.isPending } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun setMotorizadoId(id: String) {
        android.util.Log.d("COURIER_VM", "setMotorizadoId called: id=[$id] current=[${_motorizadoId.value}]")
        if (id.isNotBlank() && _motorizadoId.value != id) {
            _motorizadoId.value = id
            android.util.Log.d("COURIER_VM", "Starting profile observing for uid=$id")
            startProfileObserving(id)
        } else {
            android.util.Log.d("COURIER_VM", "SKIPPED - id blank or same as current")
        }
    }

    private fun startProfileObserving(uid: String) {
        android.util.Log.d("COURIER_VM", "startProfileObserving: uid=$uid")
        courierProfileListener?.remove()
        userProfileListener?.remove()
        profileRequestsListener?.remove()

        // 1. Escuchar /couriers/{uid}
        android.util.Log.d("COURIER_VM", "Attaching listener to /couriers/$uid")
        courierProfileListener = firestore.collection("couriers").document(uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("COURIER_VM", "Firestore /couriers error: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot == null || !snapshot.exists()) {
                    android.util.Log.w("COURIER_VM", "Firestore /couriers snapshot null or does not exist")
                    return@addSnapshotListener
                }
                android.util.Log.d("COURIER_VM", "Firestore /couriers snapshot received. Fields: ${snapshot.data?.keys}")
                val data = snapshot.data ?: return@addSnapshotListener
                val vehicleMap = data["vehicle"] as? Map<*, *> ?: emptyMap<String, Any>()
                val brand = (data["vehicleBrand"] as? String) ?: (vehicleMap["brand"] as? String) ?: (data["brand"] as? String) ?: ""
                val model = (data["vehicleModel"] as? String) ?: (vehicleMap["model"] as? String) ?: (data["model"] as? String) ?: ""
                val plate = (data["plate"] as? String) ?: (data["vehiclePlate"] as? String) ?: (vehicleMap["plate"] as? String) ?: (data["placa"] as? String) ?: ""
                val rawYear = data["vehicleYear"] ?: vehicleMap["year"] ?: data["year"]
                val year = when (rawYear) {
                    is Number -> rawYear.toInt()
                    is String -> rawYear.toIntOrNull() ?: 2024
                    else -> 2024
                }
                val color = (data["vehicleColor"] as? String) ?: (vehicleMap["color"] as? String) ?: (data["color"] as? String) ?: ""
                android.util.Log.d("COURIER_VM", "Parsed vehicle => brand=[$brand] model=[$model] plate=[$plate] year=[$year] color=[$color]")

                val courierPhoto = (data["photoUrl"] as? String) ?: (data["fotoUrl"] as? String) ?: (data["profilePhotoUrl"] as? String) ?: (data["photoURL"] as? String) ?: ""
                val current = _officialProfile.value ?: CourierOfficialProfile(uid = uid)
                val updated = current.copy(
                    uid = uid,
                    photoUrl = if (courierPhoto.isNotBlank()) courierPhoto else current.photoUrl,
                    name = (data["name"] as? String) ?: current.name,
                    phone = (data["phone"] as? String) ?: current.phone,
                    email = (data["email"] as? String) ?: current.email,
                    nationalId = (data["nationalId"] as? String) ?: current.nationalId,
                    department = (data["departmentName"] as? String) ?: (data["department"] as? String) ?: current.department,
                    city = (data["municipalityName"] as? String) ?: (data["city"] as? String) ?: current.city,
                    vehicleBrand = if (brand.isNotBlank()) brand else current.vehicleBrand,
                    vehicleModel = if (model.isNotBlank()) model else current.vehicleModel,
                    vehiclePlate = if (plate.isNotBlank()) plate else current.vehiclePlate,
                    vehicleYear = year,
                    vehicleColor = if (color.isNotBlank()) color else current.vehicleColor,
                    isActive = (data["isActive"] as? Boolean) ?: (data["active"] as? Boolean) ?: true,
                    isApproved = (data["isApproved"] as? Boolean) ?: true,
                    isAvailable = (data["isAvailable"] as? Boolean) ?: false,
                    rating = (data["rating"] as? Number)?.toDouble() ?: (data["averageRating"] as? Number)?.toDouble() ?: 0.0,
                    completedTripsCount = (data["completedTripsCount"] as? Number)?.toInt() ?: 0,
                    completedCommerceTrips = (data["completedCommerceTrips"] as? Number)?.toInt() ?: 0,
                    completedX2YTrips = (data["completedX2YTrips"] as? Number)?.toInt() ?: 0,
                    completedTotalTrips = (data["completedTotalTrips"] as? Number)?.toInt() ?: 0
                )
                _officialProfile.value = updated

                // Sincronizar VehicleEngine
                vehicleEngine.setVehicle(
                    Vehicle(
                        vehicleId = "veh_$uid",
                        assignedCourierId = uid,
                        brand = updated.vehicleBrand,
                        model = updated.vehicleModel,
                        year = updated.vehicleYear,
                        color = updated.vehicleColor,
                        documents = VehicleDocuments(licensePlate = updated.vehiclePlate)
                    )
                )
            }

        // 2. Escuchar /users/{uid}
        userProfileListener = firestore.collection("users").document(uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || !snapshot.exists()) return@addSnapshotListener
                val data = snapshot.data ?: return@addSnapshotListener
                val photo = (data["photoUrl"] as? String) ?: (data["fotoUrl"] as? String) ?: (data["profilePhotoUrl"] as? String) ?: (data["photoURL"] as? String) ?: ""
                val current = _officialProfile.value ?: CourierOfficialProfile(uid = uid)
                val commerceTrips = if (current.completedCommerceTrips == 0) ((data["completedCommerceTrips"] as? Number)?.toInt() ?: 0) else current.completedCommerceTrips
                val x2yTrips = if (current.completedX2YTrips == 0) ((data["completedX2YTrips"] as? Number)?.toInt() ?: 0) else current.completedX2YTrips
                val totalTrips = if (current.completedTotalTrips == 0) ((data["completedTotalTrips"] as? Number)?.toInt() ?: 0) else current.completedTotalTrips
                _officialProfile.value = current.copy(
                    photoUrl = if (photo.isNotBlank()) photo else current.photoUrl,
                    name = if (current.name.isBlank()) ((data["name"] as? String) ?: (data["nombre"] as? String) ?: "") else current.name,
                    phone = if (current.phone.isBlank()) ((data["phone"] as? String) ?: (data["telefono"] as? String) ?: "") else current.phone,
                    completedCommerceTrips = commerceTrips,
                    completedX2YTrips = x2yTrips,
                    completedTotalTrips = totalTrips
                )
            }

        // 3. Escuchar /courier_profile_requests
        profileRequestsListener = firestore.collection("courier_profile_requests")
            .whereEqualTo("courierId", uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    val oldMap = data["oldValues"] as? Map<*, *> ?: emptyMap<String, Any>()
                    val newMap = data["newValues"] as? Map<*, *> ?: emptyMap<String, Any>()
                    val docsMap = data["documents"] as? Map<*, *> ?: emptyMap<String, Any>()

                    val rawOldYear = oldMap["vehicleYear"] ?: oldMap["year"]
                    val oldYear = when (rawOldYear) {
                        is Number -> rawOldYear.toInt()
                        is String -> rawOldYear.toIntOrNull() ?: 2024
                        else -> 2024
                    }

                    val oldValues = CourierProfileValues(
                        name = oldMap["name"] as? String ?: "",
                        phone = oldMap["phone"] as? String ?: "",
                        email = oldMap["email"] as? String ?: "",
                        nationalId = oldMap["nationalId"] as? String ?: "",
                        vehicleBrand = oldMap["vehicleBrand"] as? String ?: "",
                        vehicleModel = oldMap["vehicleModel"] as? String ?: "",
                        vehiclePlate = oldMap["vehiclePlate"] as? String ?: "",
                        vehicleYear = oldYear,
                        vehicleColor = oldMap["vehicleColor"] as? String ?: "",
                        department = oldMap["department"] as? String ?: "",
                        city = oldMap["city"] as? String ?: ""
                    )

                    val rawNewYear = newMap["vehicleYear"] ?: newMap["year"]
                    val newYear = when (rawNewYear) {
                        is Number -> rawNewYear.toInt()
                        is String -> rawNewYear.toIntOrNull() ?: 2024
                        else -> 2024
                    }

                    val newValues = CourierProfileValues(
                        name = newMap["name"] as? String ?: "",
                        phone = newMap["phone"] as? String ?: "",
                        email = newMap["email"] as? String ?: "",
                        nationalId = newMap["nationalId"] as? String ?: "",
                        vehicleBrand = newMap["vehicleBrand"] as? String ?: "",
                        vehicleModel = newMap["vehicleModel"] as? String ?: "",
                        vehiclePlate = newMap["vehiclePlate"] as? String ?: "",
                        vehicleYear = newYear,
                        vehicleColor = newMap["vehicleColor"] as? String ?: "",
                        department = newMap["department"] as? String ?: "",
                        city = newMap["city"] as? String ?: ""
                    )

                    val documents = docsMap.mapNotNull { (k, v) ->
                        val kStr = k as? String ?: return@mapNotNull null
                        val vMap = v as? Map<*, *> ?: return@mapNotNull null
                        kStr to CourierDocumentRef(
                            name = vMap["name"] as? String ?: "",
                            storagePath = vMap["storagePath"] as? String ?: "",
                            url = vMap["url"] as? String ?: "",
                            contentType = vMap["contentType"] as? String ?: "image/jpeg",
                            size = (vMap["size"] as? Long) ?: 0L,
                            status = vMap["status"] as? String ?: "VALID"
                        )
                    }.toMap()

                    val createdTs = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis()
                    val updatedTs = (data["updatedAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis()

                    CourierProfileRequest(
                        requestId = (data["requestId"] as? String) ?: doc.id,
                        courierId = (data["courierId"] as? String) ?: uid,
                        tenantId = (data["tenantId"] as? String) ?: "",
                        requestType = (data["requestType"] as? String) ?: "VEHICLE_CHANGE",
                        status = (data["status"] as? String) ?: "PENDING_REVIEW",
                        oldValues = oldValues,
                        newValues = newValues,
                        documents = documents,
                        rejectionReason = (data["rejectionReason"] as? String) ?: "",
                        reviewedBy = (data["reviewedBy"] as? String) ?: "",
                        createdAtMs = createdTs,
                        updatedAtMs = updatedTs
                    )
                }.sortedByDescending { it.createdAtMs }

                _profileRequests.value = list
            }

        // 4. Restaurar turno activo si existe
        firestore.collection("courier_shifts")
            .whereEqualTo("courierId", uid)
            .whereIn("currentState", listOf("ONLINE", "WAITING_ORDER", "PAUSED", "GOING_TO_STORE", "AT_STORE", "ORDER_PICKED", "GOING_TO_CUSTOMER", "AT_CUSTOMER", "DELIVERING"))
            .limit(1)
            .get()
            .addOnSuccessListener { querySnap ->
                if (querySnap != null && !querySnap.isEmpty) {
                    val sDoc = querySnap.documents[0]
                    val sId = sDoc.getString("shiftId") ?: sDoc.id
                    val cStateStr = sDoc.getString("currentState") ?: "ONLINE"
                    val cState = try { CourierShiftState.valueOf(cStateStr) } catch (e: Exception) { CourierShiftState.ONLINE }
                    val sTimeMs = sDoc.getLong("startTimeMs") ?: (sDoc.getTimestamp("startTime")?.toDate()?.time ?: System.currentTimeMillis())
                    val initBat = (sDoc.getLong("initialBatteryLevel") ?: 100L).toInt()
                    val initOdo = (sDoc.getDouble("initialOdometerKm") ?: 0.0)

                    val restored = ShiftSession(
                        shiftId = sId,
                        courierId = uid,
                        currentState = cState,
                        startTimeMs = sTimeMs,
                        initialBatteryLevel = initBat,
                        initialOdometerKm = initOdo
                    )
                    shiftEngine.restoreSession(restored)
                    android.util.Log.d("COURIER_VM", "Turno activo restaurado exitosamente: shiftId=$sId, state=$cState")
                }
            }
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val courierOrdersState: StateFlow<com.example.CourierOrdersState> = _motorizadoId
        .filter { it.isNotBlank() }
        .distinctUntilChanged()
        .flatMapLatest { uid ->
            firebaseManager.obtenerFlujoPedidosCourier(uid)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = com.example.CourierOrdersState(status = com.example.CourierUiStatus.LOADING)
        )

    val courierPedidoActivo: StateFlow<com.example.PedidoOfrecido?> = courierOrdersState
        .map { ordersState ->
            when (ordersState.status) {
                com.example.CourierUiStatus.ACTIVE_ROUTE -> ordersState.activeRouteOrder
                com.example.CourierUiStatus.ASSIGNED_ORDERS -> ordersState.assignedOrders.firstOrNull()
                com.example.CourierUiStatus.POOL_ORDERS -> ordersState.poolOrders.firstOrNull()
                else -> null
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val courierHistoryOrders: StateFlow<List<com.example.PedidoOfrecido>> = _motorizadoId
        .filter { it.isNotBlank() }
        .distinctUntilChanged()
        .flatMapLatest { uid ->
            firebaseManager.obtenerHistorialCourier(uid)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val courierRejectedOrders: StateFlow<List<com.example.PedidoOfrecido>> = _motorizadoId
        .filter { it.isNotBlank() }
        .distinctUntilChanged()
        .flatMapLatest { uid ->
            firebaseManager.obtenerHistorialRechazadosCourier(uid)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // --- PROTOCOLO BSD-COURIER-PERFORMANCE-HISTORY-DATA-HOMOLOGATION-001: RESEÑAS REALES ---
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val courierReviews: StateFlow<List<CourierReviewItem>> = _motorizadoId
        .filter { it.isNotBlank() }
        .distinctUntilChanged()
        .flatMapLatest { uid ->
            callbackFlow {
                val reg = firestore.collection("reviews")
                    .whereEqualTo("courierId", uid)
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            android.util.Log.e("COURIER_VM", "Error listening to /reviews for courier $uid: ${error.message}")
                            trySend(emptyList())
                            return@addSnapshotListener
                        }
                        val items = mutableListOf<CourierReviewItem>()
                        val dateFormat = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
                        snapshot?.documents?.forEach { doc ->
                            val cRating = (doc.get("courierRating") as? Number)?.toInt()
                                ?: (doc.get("rating") as? Number)?.toInt()
                                ?: 0
                            if (cRating > 0) {
                                val cComment = doc.getString("courierComments")
                                    ?: doc.getString("comments")
                                    ?: doc.getString("comment")
                                    ?: ""
                                val cName = doc.getString("customerName")
                                    ?: doc.getString("userName")
                                    ?: doc.getString("authorName")
                                    ?: "Cliente"
                                val ts = doc.getTimestamp("createdAt")?.toDate()?.time
                                    ?: doc.getTimestamp("timestamp")?.toDate()?.time
                                    ?: doc.getLong("timestamp")
                                    ?: 0L
                                val dateStr = if (ts > 0L) {
                                    dateFormat.format(java.util.Date(ts))
                                } else {
                                    doc.getString("date") ?: ""
                                }
                                items.add(
                                    CourierReviewItem(
                                        orderId = doc.getString("tripId") ?: doc.getString("orderId") ?: doc.id,
                                        rating = cRating,
                                        comment = cComment,
                                        customerName = cName,
                                        date = dateStr,
                                        timestampMs = ts
                                    )
                                )
                            }
                        }
                        // Deduplicar estrictamente por orderId y ordenar por fecha descendente
                        val deduplicated = items.distinctBy { it.orderId }.sortedByDescending { it.timestampMs }
                        trySend(deduplicated)
                    }
                awaitClose { reg.remove() }
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // --- ACTIVIDAD #13: ESTADO FINANCIERO REACTIVO POR LÍNEA DE NEGOCIO ---
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val courierBalanceFlow: StateFlow<com.google.firebase.firestore.DocumentSnapshot?> = _motorizadoId
        .filter { it.isNotBlank() }
        .distinctUntilChanged()
        .flatMapLatest { uid ->
            callbackFlow {
                val reg = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                    .collection("courier_balances")
                    .document(uid)
                    .addSnapshotListener { snap, err ->
                        if (err != null) {
                            trySend(null)
                            return@addSnapshotListener
                        }
                        trySend(snap)
                    }
                awaitClose { reg.remove() }
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    val overdueClosureNotice: StateFlow<com.example.OverdueClosureNotice?> = courierBalanceFlow
        .map { snap ->
            if (snap == null || !snap.exists()) return@map null
            val state = snap.getString("financialAccessState") ?: "ALLOW"
            val hasOverdue = snap.getBoolean("hasOverdueClosure") ?: false
            val isOverdue = hasOverdue || state == "BLOCKED_OVERDUE_CLOSURE" || state == "BLOCKED_CASH_LIMIT_AND_OVERDUE"
            val cashOutstandingCents = snap.getLong("cashOutstandingCents") ?: 0L
            val limitCents = snap.getLong("effectiveCashLimitCents")
                ?: snap.getLong("cashLimitCents")
                ?: 200000L
            val limitExceeded = (limitCents > 0L && cashOutstandingCents >= limitCents) || state == "BLOCKED_CASH_LIMIT"

            if (isOverdue || limitExceeded) {
                val overdueDate = snap.getString("overdueClosureDate") ?: snap.getString("lastClosureBusinessDate") ?: "Día anterior"
                val limitNio = limitCents / 100.0
                val reason = snap.getString("financialAccessReason") ?: (
                    if (isOverdue) "Depósito pendiente de día anterior" else "Límite de efectivo en mano excedido (C$ ${String.format(java.util.Locale.US, "%,.2f", limitNio)})"
                )
                com.example.OverdueClosureNotice(
                    hasOverdue = true,
                    overdueDate = overdueDate,
                    outstandingAmount = cashOutstandingCents / 100.0,
                    closureId = snap.getString("lastPendingClosureId") ?: "",
                    reason = reason
                )
            } else {
                null
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    private val _financeFilter = MutableStateFlow(com.example.FinanceDateFilter.TODAY)
    val financeFilter: StateFlow<com.example.FinanceDateFilter> = _financeFilter.asStateFlow()

    private val _customStartDate = MutableStateFlow<Long?>(null)
    val customStartDate: StateFlow<Long?> = _customStartDate.asStateFlow()

    private val _customEndDate = MutableStateFlow<Long?>(null)
    val customEndDate: StateFlow<Long?> = _customEndDate.asStateFlow()

    val courierFinancesState: StateFlow<com.example.CourierFinancesState> = combine(
        courierHistoryOrders,
        _financeFilter,
        _customStartDate,
        _customEndDate,
        overdueClosureNotice
    ) { orders, filter, start, end, notice ->
        com.example.domain.engine.courier.CourierFinanceCalculator.computeFinances(
            orders = orders,
            filter = filter,
            customStart = start,
            customEnd = end,
            overdueNotice = notice
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = com.example.CourierFinancesState(isLoading = true)
    )

    fun setFinanceFilter(filter: com.example.FinanceDateFilter, customStart: Long? = null, customEnd: Long? = null) {
        _financeFilter.value = filter
        _customStartDate.value = customStart
        _customEndDate.value = customEnd
    }

    val notifications: StateFlow<List<CourierNotificationItem>> = notificationEngine.notifications
    val unreadNotificationCount: StateFlow<Int> = notifications
        .map { list -> list.count { !it.isRead } }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = 0
        )

    val isOnline = syncManager.isOnline
    val pendingActionsCount = syncManager.pendingActionsCount

    val shiftSession: StateFlow<ShiftSession> = shiftEngine.currentSession
    val trustAssessment: StateFlow<TrustAssessment> = trustEngine.assessment

    val currentMetrics: StateFlow<CourierMetrics> = kotlinx.coroutines.flow.combine(
        _motorizadoId,
        courierHistoryOrders,
        performanceEngine.metrics,
        courierReviews,
        officialProfile
    ) { uid: String, history: List<com.example.PedidoOfrecido>, baseMetrics: CourierMetrics, reviews: List<CourierReviewItem>, profile: CourierOfficialProfile? ->
        val delivered = history.filter {
            val st = it.status.lowercase()
            st in listOf("delivered", "completed", "entregado", "completado")
        }
        val completedCount = if (delivered.isNotEmpty()) delivered.size else baseMetrics.completedOrdersCount
        val totalDistKm = if (delivered.isNotEmpty()) delivered.sumOf { if (it.routeDistanceKm > 0.0) it.routeDistanceKm else it.distanceKm } else baseMetrics.totalDistanceTraveledKm
        val totalEarned = if (delivered.isNotEmpty()) {
            delivered.sumOf { order ->
                if (order.courierTotalEarnings > 0.0) order.courierTotalEarnings else order.gananciaRepartidor
            }
        } else baseMetrics.totalEarningsAmount

        val ratingCount = reviews.size
        val rating = if (reviews.isNotEmpty()) {
            val avg = reviews.map { it.rating }.average()
            kotlin.math.round(avg * 10.0) / 10.0
        } else if (profile != null && profile.rating > 0.0) {
            profile.rating
        } else if (baseMetrics.averageRating > 0.0) {
            baseMetrics.averageRating
        } else {
            0.0
        }

        val effectiveWorkTimeMs = if (baseMetrics.totalEffectiveWorkTimeMs > 0L) baseMetrics.totalEffectiveWorkTimeMs else (completedCount * 15 * 60 * 1000L)

        val kpis = resolveCourierTripKpis(profile, delivered)
        val completedCommerce = kpis.commerce
        val completedX2Y = kpis.x2y
        val completedTotal = kpis.total

        CourierMetrics(
            courierId = uid,
            totalDistanceTraveledKm = totalDistKm,
            totalStoppedTimeMs = baseMetrics.totalStoppedTimeMs,
            totalTimeAtStoreMs = baseMetrics.totalTimeAtStoreMs,
            totalTimeWaitingCustomerMs = baseMetrics.totalTimeWaitingCustomerMs,
            totalEffectiveWorkTimeMs = effectiveWorkTimeMs,
            totalOnlineTimeMs = baseMetrics.totalOnlineTimeMs,
            totalOfflineTimeMs = baseMetrics.totalOfflineTimeMs,
            completedOrdersCount = if (completedTotal > 0) completedTotal else completedCount,
            completedCommerceTrips = completedCommerce,
            completedX2YTrips = completedX2Y,
            completedTotalTrips = if (completedTotal > 0) completedTotal else completedCount,
            cancelledOrdersCount = baseMetrics.cancelledOrdersCount,
            totalEarningsAmount = totalEarned,
            averageRating = rating,
            ratingCount = ratingCount
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CourierMetrics()
    )

    val rewardState: StateFlow<CourierRewardState> = kotlinx.coroutines.flow.combine(
        courierHistoryOrders,
        rewardEngine.rewardState
    ) { history: List<com.example.PedidoOfrecido>, baseReward: CourierRewardState ->
        val delivered = history.filter {
            val st = it.status.lowercase()
            st in listOf("delivered", "completed", "entregado", "completado")
        }
        val totalBonus = delivered.sumOf { it.courierBonusEarnings }
        val streak = if (delivered.isNotEmpty()) delivered.size else baseReward.currentStreakCount

        val defaultMissions = listOf(
            com.example.domain.engine.courier.MissionChallenge(
                id = "m1",
                title = "🎯 Ruta Eficiente",
                description = "Completa 5 entregas en tu turno",
                requiredOrderCount = 5,
                currentOrderCount = minOf(5, delivered.size),
                bonusRewardAmount = 50.0,
                isCompleted = delivered.size >= 5
            ),
            com.example.domain.engine.courier.MissionChallenge(
                id = "m2",
                title = "⚡ Maestro del Delivery",
                description = "Completa 10 entregas en la semana",
                requiredOrderCount = 10,
                currentOrderCount = minOf(10, delivered.size),
                bonusRewardAmount = 120.0,
                isCompleted = delivered.size >= 10
            )
        )

        baseReward.copy(
            currentStreakCount = streak,
            totalBonusEarnedThisWeek = if (totalBonus > 0.0) totalBonus else baseReward.totalBonusEarnedThisWeek,
            activeMissions = if (baseReward.activeMissions.isEmpty()) defaultMissions else baseReward.activeMissions.map { m ->
                val curr = minOf(m.requiredOrderCount, delivered.size)
                m.copy(currentOrderCount = curr, isCompleted = curr >= m.requiredOrderCount)
            }
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CourierRewardState()
    )

    val availability: StateFlow<OperationalAvailability> = availabilityEngine.availability
    val externalApiCallCount: StateFlow<Int> = mapIntelligenceEngine.externalApiCallCount

    private val _uiState = MutableStateFlow(CourierUiState())
    val uiState: StateFlow<CourierUiState> = _uiState.asStateFlow()

    fun rechazarPedido(pedidoId: String, motivo: String = "No especificado") {
        viewModelScope.launch {
            firebaseManager.rechazarPedido(pedidoId, motivo, _motorizadoId.value)
            notificationEngine.enqueueNotification(
                CourierNotificationItem(
                    id = "rej_${System.currentTimeMillis()}_$pedidoId",
                    title = "❌ Pedido Rechazado",
                    body = "Rechazaste el pedido #${pedidoId.takeLast(6)}. Motivo: $motivo",
                    priority = NotificationPriority.NORMAL,
                    category = NotificationCategory.RECHAZO,
                    orderId = pedidoId
                )
            )
        }
    }

    fun markNotificationAsRead(id: String) {
        notificationEngine.markAsRead(id)
    }

    fun markAllNotificationsAsRead() {
        notificationEngine.markAllAsRead()
    }

    fun addNotificationFromFcm(title: String, body: String, category: NotificationCategory, orderId: String? = null) {
        notificationEngine.enqueueNotification(
            CourierNotificationItem(
                id = "notif_${System.currentTimeMillis()}_${(100..999).random()}",
                title = title,
                body = body,
                priority = NotificationPriority.HIGH,
                category = category,
                orderId = orderId
            )
        )
    }

    fun startShift(courierId: String, initialBattery: Int, initialOdometer: Double): Boolean {
        settlementEngine.initializeSession(courierId)
        performanceEngine.initialize(courierId)
        val started = shiftEngine.startShift(courierId, initialBattery, initialOdometer)
        if (started) {
            val session = shiftEngine.currentSession.value
            viewModelScope.launch {
                try {
                    val shiftDocRef = firestore.collection("courier_shifts").document(session.shiftId)
                    val now = com.google.firebase.Timestamp.now()
                    val shiftData = hashMapOf(
                        "shiftId" to session.shiftId,
                        "courierId" to courierId,
                        "startTime" to now,
                        "startTimeMs" to session.startTimeMs,
                        "initialBatteryLevel" to initialBattery,
                        "initialOdometerKm" to initialOdometer,
                        "currentState" to "ONLINE",
                        "status" to "ONLINE",
                        "isOnline" to true,
                        "createdAt" to now,
                        "updatedAt" to now
                    )
                    shiftDocRef.set(shiftData, com.google.firebase.firestore.SetOptions.merge())

                    firestore.collection("couriers").document(courierId).set(
                        mapOf(
                            "isOnline" to true,
                            "isAvailable" to true,
                            "currentOdometerKm" to initialOdometer,
                            "updatedAt" to now
                        ),
                        com.google.firebase.firestore.SetOptions.merge()
                    )
                } catch (e: Exception) {
                    android.util.Log.e("COURIER_VM", "Error persisting shift in Firestore: ${e.message}")
                }
            }
        }
        return started
    }

    fun pauseShift(reason: PauseReason): Boolean {
        val paused = shiftEngine.pauseShift(reason)
        if (paused) {
            val session = shiftEngine.currentSession.value
            viewModelScope.launch {
                try {
                    firestore.collection("courier_shifts").document(session.shiftId).update(
                        mapOf(
                            "currentState" to "PAUSED",
                            "status" to "PAUSED",
                            "pauseReason" to reason.name,
                            "updatedAt" to com.google.firebase.Timestamp.now()
                        )
                    )
                } catch (e: Exception) {
                    android.util.Log.e("COURIER_VM", "Error updating paused shift: ${e.message}")
                }
            }
        }
        return paused
    }

    fun resumeShift(): Boolean {
        val resumed = shiftEngine.resumeShift()
        if (resumed) {
            val session = shiftEngine.currentSession.value
            viewModelScope.launch {
                try {
                    firestore.collection("courier_shifts").document(session.shiftId).update(
                        mapOf(
                            "currentState" to "ONLINE",
                            "status" to "ONLINE",
                            "pauseReason" to null,
                            "updatedAt" to com.google.firebase.Timestamp.now()
                        )
                    )
                } catch (e: Exception) {
                    android.util.Log.e("COURIER_VM", "Error updating resumed shift: ${e.message}")
                }
            }
        }
        return resumed
    }

    fun triggerEmergency(): Boolean {
        return shiftEngine.triggerEmergency()
    }

    fun endShift(finalOdometerKm: Double?): ShiftSession {
        val currentSessionId = shiftEngine.currentSession.value.shiftId
        val courierId = shiftEngine.currentSession.value.courierId
        val endedSession = shiftEngine.endShift(finalOdometerKm)
        viewModelScope.launch {
            try {
                val now = com.google.firebase.Timestamp.now()
                if (currentSessionId.isNotBlank()) {
                    firestore.collection("courier_shifts").document(currentSessionId).update(
                        mapOf(
                            "currentState" to "OFFLINE",
                            "status" to "OFFLINE",
                            "endTime" to now,
                            "endTimeMs" to endedSession.endTimeMs,
                            "finalOdometerKm" to (finalOdometerKm ?: 0.0),
                            "updatedAt" to now
                        )
                    )
                }
                if (courierId.isNotBlank()) {
                    firestore.collection("couriers").document(courierId).set(
                        mapOf(
                            "isOnline" to false,
                            "isAvailable" to false,
                            "currentOdometerKm" to (finalOdometerKm ?: 0.0),
                            "updatedAt" to now
                        ),
                        com.google.firebase.firestore.SetOptions.merge()
                    )
                }
            } catch (e: Exception) {
                android.util.Log.e("COURIER_VM", "Error closing shift in Firestore: ${e.message}")
            }
        }
        return endedSession
    }

    fun reportIncident(
        courierId: String,
        incidentType: CourierIncidentType,
        description: String,
        orderId: String? = null,
        photoUrl: String? = null,
        lat: Double = 0.0,
        lng: Double = 0.0
    ): Result<IncidentReport> {
        return incidentEngine.reportIncident(courierId, incidentType, description, orderId, photoUrl, lat, lng)
    }

    fun evaluateGpsPing(courierId: String, isMock: Boolean, isRooted: Boolean, lat: Double, lng: Double): TrustAssessment {
        val assessment = trustEngine.evaluatePing(courierId, isMock, isRooted, lat, lng)
        availabilityEngine.evaluateAvailability(
            shiftState = shiftSession.value.currentState,
            batteryLevel = shiftSession.value.initialBatteryLevel,
            isOnline = isOnline.value,
            isVehicleRoadworthy = vehicleEngine.assignedVehicle.value?.isRoadworthy ?: true,
            hasActiveIncident = incidentEngine.activeIncidents.value.any { it.status == "REGISTERED" }
        )
        return assessment
    }

    fun calculateLocalEta(currentLat: Double, currentLon: Double, destLat: Double, destLon: Double, speedKmh: Double? = null): LocalEtaEstimate {
        return mapIntelligenceEngine.calculateLocalEta(currentLat, currentLon, destLat, destLon, speedKmh)
    }

    fun loadOrders(courierId: String) {
        viewModelScope.launch {
            if (syncManager.isOnline.value) {
                try {
                    val snapshot1 = firestore.collection("orders")
                        .whereEqualTo("assignedCourierId", courierId)
                        .get()
                        .await()
                    val snapshot2 = firestore.collection("orders")
                        .whereEqualTo("motorizadoId", courierId)
                        .get()
                        .await()
                    val allDocs = (snapshot1.documents + snapshot2.documents).distinctBy { it.id }
                        .filter { doc -> (doc.getString("status") ?: "").lowercase() in listOf("ready", "listo", "assigned", "asignado", "courier_accepted", "picked_up", "recogido", "in_transit", "en_ruta") }

                    val orders = allDocs.mapNotNull { doc ->
                        OfflineOrderEntity(
                            orderId = doc.id,
                            businessName = doc.getString("comercioNombre") ?: "",
                            customerAddress = doc.getString("clienteDireccion") ?: "",
                            status = doc.getString("status") ?: "",
                            isSynced = true
                        )
                    }

                    orders.forEach { offlineOrderDao.insert(it) }

                    _uiState.update { it.copy(orders = orders, isLoading = false) }
                } catch (e: Exception) {
                    loadFromLocal(courierId)
                }
            } else {
                loadFromLocal(courierId)
            }
        }
    }

    private suspend fun loadFromLocal(courierId: String) {
        offlineOrderDao.getActiveOrdersForCourier(courierId)
            .collect { orders ->
                _uiState.update { it.copy(orders = orders, isLoading = false, isOffline = true) }
            }
    }

    fun updateOrderStatus(
        orderId: String,
        newStatus: String,
        courierPhase: Int? = null
    ) {
        viewModelScope.launch {
            offlineOrderDao.updateOrderStatus(
                orderId,
                newStatus,
                courierPhase,
                System.currentTimeMillis()
            )

            val payload = mutableMapOf<String, Any>("status" to newStatus)
            courierPhase?.let { payload["courierPhase"] = it }

            syncManager.queueAction(orderId, "UPDATE_STATUS", payload)

            _uiState.update { state ->
                val updatedOrders = state.orders.map {
                    if (it.orderId == orderId) {
                        it.copy(status = newStatus, courierPhase = courierPhase)
                    } else it
                }
                state.copy(orders = updatedOrders)
            }
        }
    }

    fun updateLocation(orderId: String, latitude: Double, longitude: Double) {
        viewModelScope.launch {
            syncManager.queueAction(
                orderId,
                "UPDATE_LOCATION",
                mapOf("latitude" to latitude, "longitude" to longitude)
            )
        }
    }

    fun forceSync() {
        viewModelScope.launch {
            syncManager.syncPendingActions()
        }
    }

    fun submitProfileUpdateRequest(
        requestType: String = "VEHICLE_CHANGE",
        newValues: CourierProfileValues,
        documents: Map<String, CourierDocumentRef> = emptyMap(),
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val uid = _motorizadoId.value
        if (uid.isBlank()) {
            onError("No se encuentra sesión de motorizado activa.")
            return
        }

        if (activePendingRequest.value != null) {
            onError("Ya tienes una solicitud de modificación pendiente de validación administrativa.")
            return
        }

        viewModelScope.launch {
            try {
                val current = _officialProfile.value ?: CourierOfficialProfile(uid = uid)
                val oldValues = CourierProfileValues(
                    name = current.name,
                    phone = current.phone,
                    email = current.email,
                    nationalId = current.nationalId,
                    vehicleBrand = current.vehicleBrand,
                    vehicleModel = current.vehicleModel,
                    vehiclePlate = current.vehiclePlate,
                    vehicleYear = current.vehicleYear,
                    vehicleColor = current.vehicleColor,
                    department = current.department,
                    city = current.city
                )

                val reqId = "cpr_${System.currentTimeMillis()}_${(1000..9999).random()}"
                val reqMap = hashMapOf<String, Any>(
                    "requestId" to reqId,
                    "courierId" to uid,
                    "requestType" to requestType,
                    "status" to "PENDING_REVIEW",
                    "oldValues" to hashMapOf(
                        "name" to oldValues.name,
                        "phone" to oldValues.phone,
                        "email" to oldValues.email,
                        "nationalId" to oldValues.nationalId,
                        "vehicleBrand" to oldValues.vehicleBrand,
                        "vehicleModel" to oldValues.vehicleModel,
                        "vehiclePlate" to oldValues.vehiclePlate,
                        "vehicleYear" to oldValues.vehicleYear,
                        "vehicleColor" to oldValues.vehicleColor,
                        "department" to oldValues.department,
                        "city" to oldValues.city
                    ),
                    "newValues" to hashMapOf(
                        "name" to newValues.name,
                        "phone" to newValues.phone,
                        "email" to newValues.email,
                        "nationalId" to newValues.nationalId,
                        "vehicleBrand" to newValues.vehicleBrand,
                        "vehicleModel" to newValues.vehicleModel,
                        "vehiclePlate" to newValues.vehiclePlate,
                        "vehicleYear" to newValues.vehicleYear,
                        "vehicleColor" to newValues.vehicleColor,
                        "department" to newValues.department,
                        "city" to newValues.city
                    ),
                    "documents" to documents.mapValues { (_, docRef) ->
                        hashMapOf(
                            "name" to docRef.name,
                            "storagePath" to docRef.storagePath,
                            "url" to docRef.url,
                            "contentType" to docRef.contentType,
                            "size" to docRef.size,
                            "status" to docRef.status
                        )
                    },
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                    "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                )

                firestore.collection("courier_profile_requests").document(reqId).set(reqMap).await()

                notificationEngine.enqueueNotification(
                    CourierNotificationItem(
                        id = "req_$reqId",
                        title = "📋 Solicitud Enviada",
                        body = "Tu solicitud de modificación ha sido enviada a Administración para validación.",
                        priority = NotificationPriority.NORMAL,
                        category = NotificationCategory.SISTEMA
                    )
                )

                onSuccess(reqId)
            } catch (e: Exception) {
                onError(e.localizedMessage ?: "Error al enviar solicitud de modificación.")
            }
        }
    }

    fun cancelPendingProfileRequest(
        requestId: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                firestore.collection("courier_profile_requests").document(requestId).update(
                    mapOf(
                        "status" to "CANCELLED",
                        "cancelledAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                        "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                    )
                ).await()
                onSuccess()
            } catch (e: Exception) {
                onError(e.localizedMessage ?: "Error al cancelar la solicitud.")
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        courierProfileListener?.remove()
        userProfileListener?.remove()
        profileRequestsListener?.remove()
    }

    companion object {
        /**
         * Normalizador canónico unificado de serviceType (Protocolo BSD-X2Y-CUSTOMER-CANCEL-REORDER-COURIER-KPI-UX-ROOT-CAUSE-001).
         * Reconoce todas las variantes históricas y canónicas de Delivery Express X→Y.
         */
        fun isXToYServiceType(serviceType: String): Boolean {
            val normalized = serviceType.trim().uppercase()
            return normalized == "X_TO_Y_DELIVERY" ||
                   normalized == "X_TO_Y" ||
                   normalized == "X2Y" ||
                   normalized == "DELIVERY_EXPRESS" ||
                   normalized == "EXPRESS"
        }

        data class CourierTripKpis(
            val commerce: Int,
            val x2y: Int,
            val total: Int
        )

        /**
         * Resuelve los KPIs de viajes garantizando la regla matemática de consistencia:
         * total = commerce + x2y
         * y la prioridad: Canonical Data > Fallback Computed (sin permitir que fallbacks destruyan datos canónicos
         * ni que desajustes históricos de Firestore oculten viajes X→Y reales entregados).
         */
        fun resolveCourierTripKpis(
            profile: CourierOfficialProfile?,
            deliveredOrders: List<com.example.PedidoOfrecido>
        ): CourierTripKpis {
            val computedX2Y = deliveredOrders.count { isXToYServiceType(it.serviceType) }
            val computedCommerce = deliveredOrders.count { !isXToYServiceType(it.serviceType) }

            val rawProfileX2Y = profile?.completedX2YTrips ?: 0
            val rawProfileCommerce = profile?.completedCommerceTrips ?: 0
            val rawProfileTotal = profile?.completedTotalTrips ?: 0

            // 1. Resolver X→Y: Canonical > Fallback Computed
            val effectiveX2Y = if (rawProfileX2Y > 0) rawProfileX2Y else computedX2Y

            // 2. Resolver Commerce con regla de consistencia matemática
            val effectiveCommerce = if (rawProfileCommerce > 0) {
                if (effectiveX2Y > 0 && rawProfileCommerce == rawProfileTotal) {
                    // Si en Firestore se registró commerce == total antes de desagregar X2Y, corregir
                    (rawProfileTotal - effectiveX2Y).coerceAtLeast(0)
                } else if (effectiveX2Y > 0 && rawProfileCommerce + effectiveX2Y != rawProfileTotal && rawProfileTotal > 0) {
                    (rawProfileTotal - effectiveX2Y).coerceAtLeast(0)
                } else {
                    rawProfileCommerce
                }
            } else {
                computedCommerce
            }

            // 3. Resolver Total
            val effectiveTotal = if (rawProfileTotal > 0 && rawProfileTotal >= (effectiveCommerce + effectiveX2Y)) {
                rawProfileTotal
            } else {
                effectiveCommerce + effectiveX2Y
            }

            return CourierTripKpis(
                commerce = effectiveCommerce,
                x2y = effectiveX2Y,
                total = effectiveTotal
            )
        }
    }
}

data class CourierUiState(
    val orders: List<OfflineOrderEntity> = emptyList(),
    val isLoading: Boolean = true,
    val isOffline: Boolean = false,
    val errorMessage: String? = null
)
